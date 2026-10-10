/**
 * 这里刻意不在顶层 import 第三方包：
 * --help / --demo 必须能在「一根依赖都没装」的情况下跑起来。
 * imapflow 和 mailparser 都在真正要连邮箱时才动态加载。
 */

/** 粗暴地把 HTML 转成纯文本，够抓摘要片段用，不引入额外依赖。 */
export function stripHtml(html = '') {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function normalizeText(parsed) {
  const raw = parsed.text || stripHtml(parsed.html || '');
  return String(raw).replace(/\s+/g, ' ').trim();
}

function toMessage(msg, parsed) {
  const fromValue = parsed.from?.value?.[0] || msg.envelope?.from?.[0] || {};
  const toList = (parsed.to?.value || msg.envelope?.to || [])
    .map((item) => String(item.address || '').toLowerCase())
    .filter(Boolean);

  const attachments = (parsed.attachments || [])
    .map((item) => item.filename || '')
    .filter(Boolean);

  return {
    uid: msg.uid,
    date: new Date(parsed.date || msg.envelope?.date || Date.now()).toISOString(),
    from: {
      name: String(fromValue.name || '').trim(),
      address: String(fromValue.address || '').toLowerCase(),
    },
    to: toList,
    subject: String(parsed.subject || msg.envelope?.subject || '(无主题)').replace(/\s+/g, ' ').trim(),
    unread: !(msg.flags instanceof Set ? msg.flags.has('\\Seen') : false),
    hasAttachments: attachments.length > 0,
    attachments: attachments.slice(0, 10),
    text: normalizeText(parsed).slice(0, 800),
  };
}

function friendlyError(error, { host, port, user }) {
  const code = String(error?.code || error?.responseText || '');
  if (/AUTHENTICATIONFAILED|LOGIN failed|Invalid credentials|AUTHENTICATE/i.test(code + error?.message)) {
    return new Error(
      `IMAP 登录失败（${user} @ ${host}:${port}）。常见原因：\n` +
        '  1) 填的是 QQ 登录密码 —— 这里必须填「授权码」；\n' +
        '  2) 邮箱设置里还没开启 IMAP/SMTP 服务；\n' +
        '  3) 账号或授权码抄错了（注意首尾空格）。'
    );
  }
  if (/ENOTFOUND|EAI_AGAIN/i.test(code + error?.message)) {
    return new Error(`找不到主机 ${host}，检查 IMAP_HOST 或网络/代理。`);
  }
  if (/ECONNREFUSED|ETIMEDOUT|CONNECT_TIMEOUT|Timeout/i.test(code + error?.message)) {
    return new Error(`连不上 ${host}:${port}，检查 IMAP_PORT / IMAP_SECURE 以及防火墙。`);
  }
  return error;
}

/**
 * 从 IMAP 邮箱抓取近期邮件。
 * 返回按时间倒序排列的普通对象数组，后面所有处理都不再依赖网络。
 */
export async function fetchMessages({
  host,
  port = 993,
  secure = true,
  user,
  pass,
  mailbox = 'INBOX',
  since,
  limit = 200,
  unreadOnly = false,
  maxBytesPerMail = 131072,
}) {
  let ImapFlow;
  let simpleParser;
  try {
    ({ ImapFlow } = await import('imapflow'));
    ({ simpleParser } = await import('mailparser'));
  } catch {
    throw new Error('缺少依赖，请先在项目目录执行：npm install');
  }

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: { user, pass },
    logger: false,
    // 网易（163 / 126 / yeah.net）要求客户端先自报身份，否则回 "Unsafe Login"；
    // 其它服务商对这个 ID 命令不敏感，所以统一带上。
    clientInfo: { name: 'mail-digest', version: '1.0.0', vendor: 'Elysia061129' },
  });

  try {
    await client.connect();
  } catch (error) {
    throw friendlyError(error, { host, port, user });
  }

  const collected = [];
  let lock;
  try {
    lock = await client.getMailboxLock(mailbox);

    const query = { since };
    if (unreadOnly) query.seen = false;

    const found = await client.search(query, { uid: true });
    const uids = (Array.isArray(found) ? found : []).slice(-limit);

    if (uids.length > 0) {
      for await (const msg of client.fetch(
        uids.join(','),
        { envelope: true, flags: true, source: { maxLength: maxBytesPerMail } },
        { uid: true }
      )) {
        if (!msg?.source) continue;
        try {
          const parsed = await simpleParser(msg.source);
          collected.push(toMessage(msg, parsed));
        } catch {
          // 单封解析失败不该让整趟任务挂掉
        }
      }
    }
  } finally {
    if (lock) lock.release();
    await client.logout().catch(() => client.close());
  }

  collected.sort((a, b) => new Date(b.date) - new Date(a.date));
  return collected;
}
