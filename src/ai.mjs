/**
 * 可选的 AI 简报：把「元数据 + 正文片段」交给 DeepSeek，让它写一段中文总结。
 *
 * 隐私边界（重要）：
 *   - 只发送 发件人 / 时间 / 主题 / 正文前若干字，以及本地统计结果；
 *   - 不发送附件内容、不发送邮箱密码或授权码、不发送完整收件人列表；
 *   - 总字符数受 maxChars 限制，超出部分直接截断。
 */

function fmtTime(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function buildPrompt(digest, messages, { maxChars = 12000, snippetChars = 240 } = {}) {
  const lines = [];
  lines.push(`统计范围：最近 ${digest.rangeDays} 天`);
  lines.push(
    `总计 ${digest.total} 封，未读 ${digest.unread} 封，带附件 ${digest.withAttachments} 封`
  );
  if (digest.topSenders.length) {
    lines.push(
      '高频发件人：' +
        digest.topSenders.map((s) => `${s.address}(${s.count})`).join('、')
    );
  }
  lines.push('');
  lines.push('邮件清单（时间 | 发件人 | 主题 | 正文片段）：');

  let used = lines.join('\n').length;
  for (const msg of messages) {
    const snippet = String(msg.text || '').replace(/\s+/g, ' ').slice(0, snippetChars);
    const line =
      `- ${fmtTime(msg.date)} | ${msg.from.name || msg.from.address} <${msg.from.address}> | ` +
      `${msg.subject}${msg.unread ? ' [未读]' : ''}${msg.hasAttachments ? ' [有附件]' : ''}\n  ${snippet}`;
    if (used + line.length > maxChars) {
      lines.push(`…（其余 ${messages.length - messages.indexOf(msg)} 封因长度限制省略）`);
      break;
    }
    lines.push(line);
    used += line.length;
  }

  lines.push('');
  lines.push(
    '请输出一份简体中文简报，包含：1) 一句话总览；2) 需要我今天处理的 3-6 件事（按优先级）；' +
      '3) 明显是营销/订阅类、可以忽略的；4) 如果发现登录验证码或安全提醒，单独点出来。' +
      '不要编造清单里没有的信息，直接输出正文，不要写"好的"之类的开场白。'
  );

  return lines.join('\n');
}

export async function summarizeWithAI(
  digest,
  messages,
  { apiKey, baseUrl = 'https://api.deepseek.com', model = 'deepseek-chat', maxChars = 12000, timeoutMs = 60000 } = {}
) {
  if (!apiKey) {
    throw new Error('没有找到 DEEPSEEK_API_KEY —— 用 --ai 需要先在 .env 里填上它。');
  }

  const url = `${String(baseUrl).replace(/\/+$/, '')}/chat/completions`;
  const body = {
    model,
    stream: false,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content:
          '你是一个严谨的邮件助理。只依据用户给出的邮件清单做归纳，用简体中文输出，' +
          '不编造内容，不输出 Markdown 代码块之外的多余客套。',
      },
      { role: 'user', content: buildPrompt(digest, messages, { maxChars }) },
    ],
  };

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new Error(`请求 DeepSeek API 失败：${error.message}`);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    if (res.status === 401) throw new Error('DeepSeek API 返回 401：API key 无效。');
    if (res.status === 402) throw new Error('DeepSeek API 返回 402：账户余额不足。');
    if (res.status === 429) throw new Error('DeepSeek API 返回 429：请求太频繁，稍后再试。');
    throw new Error(`DeepSeek API 返回 ${res.status}：${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('DeepSeek API 没有返回内容。');
  return String(text).trim();
}
