/**
 * 邮箱服务商识别：目标是「除了账号和密码/授权码，别的都不用填」。
 *
 * 三层兜底：
 *   1. IMAP_HOST 手动指定 —— 永远优先；
 *   2. 按邮箱域名查内置预设（QQ、163、Gmail、iCloud……）；
 *   3. 预设里没有的域名，去问 Mozilla 的公开自动配置库
 *      （Thunderbird 用的那套，覆盖大量自建域名和企业邮箱）。
 *
 * 预设只是「常见默认值」，任何一项都能用 IMAP_HOST / IMAP_PORT / IMAP_SECURE 覆盖。
 */

export const PRESETS = {
  qq: {
    label: 'QQ 邮箱',
    host: 'imap.qq.com',
    port: 993,
    secure: true,
    note: 'IMAP_PASS 填「授权码」，不是 QQ 密码：设置 → 账号 → 开启 IMAP/SMTP → 生成授权码',
  },
  foxmail: { label: 'Foxmail', host: 'imap.qq.com', port: 993, secure: true },
  exmail: { label: '腾讯企业邮箱', host: 'imap.exmail.qq.com', port: 993, secure: true },
  '163': {
    label: '网易 163',
    host: 'imap.163.com',
    port: 993,
    secure: true,
    note: '需要授权码；网易要求客户端先发 ID 命令，本工具已自动处理',
  },
  '126': { label: '网易 126', host: 'imap.163.com', port: 993, secure: true, note: '需要授权码' },
  yeah: { label: '网易 yeah.net', host: 'imap.163.com', port: 993, secure: true, note: '需要授权码' },
  sina: { label: '新浪邮箱', host: 'imap.sina.com', port: 993, secure: true },
  sohu: { label: '搜狐邮箱', host: 'imap.sohu.com', port: 993, secure: true },
  aliyun: { label: '阿里云/万网企业邮箱', host: 'imap.mxhichina.com', port: 993, secure: true },
  '139': { label: '中国移动 139', host: 'imap.139.com', port: 993, secure: true },
  '189': { label: '中国电信 189', host: 'imap.189.cn', port: 993, secure: true },
  '21cn': { label: '21CN 邮箱', host: 'imap.21cn.com', port: 993, secure: true },
  tom: { label: 'TOM 邮箱', host: 'imap.tom.com', port: 993, secure: true },
  '263': { label: '263 邮箱', host: 'imap.263.net', port: 993, secure: true },
  gmail: {
    label: 'Gmail',
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    note: '先在 Google 账号里开启两步验证，再生成「应用专用密码」当 IMAP_PASS',
  },
  outlook: {
    label: 'Outlook / Hotmail',
    host: 'outlook.office365.com',
    port: 993,
    secure: true,
    note: '微软已停用基本认证，用密码登录会被拒；需要 OAuth2，本工具暂不支持',
  },
  icloud: {
    label: 'iCloud',
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    note: '需要用 Apple ID 生成「App 专用密码」，不能用主密码',
  },
  yahoo: { label: 'Yahoo 邮箱', host: 'imap.mail.yahoo.com', port: 993, secure: true, note: '需要生成应用密码' },
  zoho: { label: 'Zoho Mail', host: 'imap.zoho.com', port: 993, secure: true },
  fastmail: { label: 'Fastmail', host: 'imap.fastmail.com', port: 993, secure: true, note: '需要生成应用密码' },
  gmx: { label: 'GMX', host: 'imap.gmx.com', port: 993, secure: true },
  mailru: { label: 'Mail.ru', host: 'imap.mail.ru', port: 993, secure: true, note: '需要生成外部应用密码' },
  yandex: { label: 'Yandex', host: 'imap.yandex.ru', port: 993, secure: true, note: '需要生成应用密码' },
  naver: { label: 'Naver', host: 'imap.naver.com', port: 993, secure: true },
  daum: { label: 'Daum / Hanmail', host: 'imap.daum.net', port: 993, secure: true },
  aol: { label: 'AOL', host: 'imap.aol.com', port: 993, secure: true, note: '需要生成应用密码' },
};

/** 域名 → 预设 key。只收常见域名，其余走自动配置。 */
export const DOMAIN_MAP = {
  'qq.com': 'qq',
  'vip.qq.com': 'qq',
  'foxmail.com': 'foxmail',
  'exmail.qq.com': 'exmail',
  '163.com': '163',
  '126.com': '126',
  'yeah.net': 'yeah',
  'sina.com': 'sina',
  'sina.cn': 'sina',
  'sohu.com': 'sohu',
  'aliyun.com': 'aliyun',
  'mxhichina.com': 'aliyun',
  '139.com': '139',
  '189.cn': '189',
  '21cn.com': '21cn',
  'tom.com': 'tom',
  '263.net': '263',
  'gmail.com': 'gmail',
  'googlemail.com': 'gmail',
  'outlook.com': 'outlook',
  'hotmail.com': 'outlook',
  'live.com': 'outlook',
  'live.cn': 'outlook',
  'msn.com': 'outlook',
  'icloud.com': 'icloud',
  'me.com': 'icloud',
  'mac.com': 'icloud',
  'yahoo.com': 'yahoo',
  'yahoo.com.cn': 'yahoo',
  'ymail.com': 'yahoo',
  'zoho.com': 'zoho',
  'zoho.com.cn': 'zoho',
  'fastmail.com': 'fastmail',
  'gmx.com': 'gmx',
  'gmx.net': 'gmx',
  'mail.ru': 'mailru',
  'bk.ru': 'mailru',
  'inbox.ru': 'mailru',
  'list.ru': 'mailru',
  'yandex.ru': 'yandex',
  'ya.ru': 'yandex',
  'naver.com': 'naver',
  'daum.net': 'daum',
  'hanmail.net': 'daum',
  'aol.com': 'aol',
};

export function domainOf(address = '') {
  const at = String(address).lastIndexOf('@');
  return at < 0 ? '' : String(address).slice(at + 1).trim().toLowerCase();
}

export function presetByKey(key) {
  const preset = PRESETS[String(key || '').toLowerCase()];
  if (!preset) {
    throw new Error(
      `不认识的服务商「${key}」。可用：${Object.keys(PRESETS).join('、')}\n` +
        '  或者直接指定 IMAP_HOST / IMAP_PORT / IMAP_SECURE。'
    );
  }
  return preset;
}

export function presetByDomain(domain) {
  const key = DOMAIN_MAP[domain];
  return key ? { key, ...PRESETS[key] } : null;
}

/**
 * 问 Mozilla 的公开自动配置库（Thunderbird 同款数据源）。
 * 返回 null 表示查不到，调用方自己决定怎么报错。
 */
export async function lookupAutoconfig(domain, { timeoutMs = 8000 } = {}) {
  // 顺序照搬 Thunderbird：先问服务商自己托管的配置，最后才落到 Mozilla 的公共库。
  const candidates = [
    `https://autoconfig.${domain}/mail/config-v1.1.xml`,
    `https://${domain}/.well-known/autoconfig/mail/config-v1.1.xml`,
    `https://autoconfig.thunderbird.net/v1.1/${domain}`,
  ];

  for (const url of candidates) {
    let xml;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) continue;
      xml = await res.text();
    } catch {
      continue;
    }

    const block = xml.match(/<incomingServer[^>]*type=["']imap["'][\s\S]*?<\/incomingServer>/i);
    if (!block) continue;

    const host = (block[0].match(/<hostname>([^<]+)<\/hostname>/i) || [])[1];
    if (!host) continue;

    const port = Number((block[0].match(/<port>(\d+)<\/port>/i) || [])[1] || 993);
    const socketType = ((block[0].match(/<socketType>([^<]+)<\/socketType>/i) || [])[1] || 'SSL')
      .trim()
      .toUpperCase();

    return {
      host: host.trim(),
      port: Number.isFinite(port) && port > 0 ? port : 993,
      secure: socketType !== 'PLAIN',
      source: `自动配置（${url}，${socketType}）`,
    };
  }

  return null;
}

/**
 * 定下最终连接参数。
 * 优先级：手动 host > --provider/IMAP_PROVIDER > 域名预设 > 自动配置。
 */
export async function resolveConnection({
  user,
  explicitHost = '',
  explicitPort,
  explicitSecure,
  providerKey = '',
  useAutoconfig = true,
} = {}) {
  const override = (base) => ({
    ...base,
    port: explicitPort ?? base.port,
    secure: explicitSecure ?? base.secure,
  });

  if (explicitHost) {
    return {
      host: explicitHost,
      port: explicitPort ?? 993,
      secure: explicitSecure ?? true,
      source: '手动指定（IMAP_HOST）',
      note: '',
    };
  }

  if (providerKey) {
    const preset = presetByKey(providerKey);
    return {
      ...override(preset),
      source: `预设：${preset.label}`,
      note: preset.note || '',
    };
  }

  const domain = domainOf(user);
  if (domain) {
    const preset = presetByDomain(domain);
    if (preset) {
      return {
        ...override(preset),
        source: `按域名识别：${domain} → ${preset.label}`,
        note: preset.note || '',
      };
    }
  }

  if (domain && useAutoconfig) {
    const found = await lookupAutoconfig(domain);
    if (found) return { ...override(found), note: '' };
  }

  throw new Error(
    `没能自动识别 ${domain || '这个'} 邮箱的服务器地址。\n` +
      '  请手动填上（写在 .env 里，或用命令行参数）：\n' +
      '    IMAP_HOST=imap.example.com\n' +
      '    IMAP_PORT=993\n' +
      '    IMAP_SECURE=true\n' +
      '  或者从预设里挑一个：node index.mjs --providers'
  );
}

export function providerTable() {
  // 排序：JS 会把 163 / 126 这种纯数字键提到最前面，这里统一按 key 排一遍，列出来才整齐。
  return Object.entries(PRESETS)
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([key, preset]) => ({
      key,
      label: preset.label,
      address: `${preset.host}:${preset.port}${preset.secure ? ' (SSL)' : ''}`,
      note: preset.note || '',
    }));
}
