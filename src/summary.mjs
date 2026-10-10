/**
 * 本地摘要：纯函数，不联网、不依赖密钥。
 * 输入标准化的邮件数组，输出一份结构化 digest，交给 render.mjs 排版。
 */

export const CATEGORY_RULES = [
  { key: '验证码/登录', re: /(验证码|校验码|动态码|登录提醒|新设备|异地登录|安全提醒|verification code|one[- ]?time|sign[- ]?in code|verify your)/i },
  { key: '账单/支付', re: /(账单|发票|扣款|支付|付款|退款|续费|到期|账单已出|invoice|receipt|payment|refund|billing)/i },
  { key: '快递/物流', re: /(快递|物流|派送|派件|签收|取件|丰巢|菜鸟|shipping|delivery|parcel)/i },
  { key: '工作/学习', re: /(作业|考试|课程|教务|实训|论文|答辩|会议|面试|招聘|简历|offer|通知.*报名|deadline)/i },
  { key: '推广/营销', re: /(促销|优惠|折扣|限时|秒杀|领取|红包|满减|优惠券|退订|sale|discount|promo|coupon)/i },
  { key: '订阅/周刊', re: /(订阅|周刊|周报|newsletter|weekly|digest|unsubscribe)/i },
  { key: '系统通知', re: /(no[- ]?reply|noreply|notification|系统通知|自动发送|请勿回复|CI|workflow|run failed)/i },
];

export const IMPORTANT_CATEGORIES = ['验证码/登录', '账单/支付', '快递/物流', '工作/学习'];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'with', 'this', 'that', 'from', 'have', 'has', 'are',
  'was', 'were', 'will', 'not', 'but', 'can', 'all', 'any', 'our', 'out', 'new', 'now',
  'use', 'get', 'see', 'via', 'com', 'www', 'http', 'https', 'html', 'mail', 'email', 'click',
  'here', 'more', 'please', 'been', 'they', 'their', 'about', 'into', 'than', 'then', 'when',
  '如果', '已经', '可以', '一个', '这个', '进行', '以及', '或者', '谢谢', '您的', '我们', '您有',
  '请勿', '回复', '邮件', '通知', '链接', '点击', '以上', '如下', '各位', '同学', '尊敬', '用户',
]);

/** 极简关键词提取：英文词 + 中文二/三字组，不做分词，够看出热点就行。 */
export function extractKeywords(messages, { limit = 12, minCount = 2 } = {}) {
  const counter = new Map();
  const add = (token) => {
    if (STOP_WORDS.has(token)) return;
    counter.set(token, (counter.get(token) || 0) + 1);
  };

  for (const msg of messages.slice(0, 40)) {
    const bag = `${msg.subject} ${msg.text}`;

    for (const word of bag.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || []) add(word);

    for (const run of bag.match(/[\u4e00-\u9fa5]{2,}/g) || []) {
      for (let n = 2; n <= 3; n += 1) {
        for (let i = 0; i + n <= run.length; i += 1) add(run.slice(i, i + n));
      }
    }
  }

  const frequent = [...counter.entries()].filter(([, count]) => count >= minCount);

  // 长词优先：短词若被计数不低于它的长词包含（"见附" ⊂ "见附件"），就丢掉短的那条。
  const kept = frequent.filter(([token, count]) => {
    if (token.length !== 2) return true;
    return !frequent.some(
      ([other, otherCount]) => other.length > 2 && otherCount >= count && other.includes(token)
    );
  });

  return kept
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

export function categorize(message) {
  const bag = `${message.subject}\n${message.text}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(bag)) return rule.key;
  }
  return '其他';
}

function dayKey(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function buildDigest(messages, { days = 1 } = {}) {
  const list = [...messages].sort((a, b) => new Date(b.date) - new Date(a.date));

  const senderMap = new Map();
  const domainMap = new Map();
  const dayMap = new Map();
  const categoryMap = new Map();
  const annotated = [];

  for (const msg of list) {
    const address = msg.from.address || '(未知发件人)';
    const sender = senderMap.get(address) || { name: msg.from.name, address, count: 0 };
    sender.count += 1;
    if (!sender.name && msg.from.name) sender.name = msg.from.name;
    senderMap.set(address, sender);

    const domain = address.includes('@') ? address.split('@')[1] : '(未知)';
    domainMap.set(domain, (domainMap.get(domain) || 0) + 1);

    const key = dayKey(msg.date);
    dayMap.set(key, (dayMap.get(key) || 0) + 1);

    const category = categorize(msg);
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);

    annotated.push({ ...msg, category });
  }

  const unread = annotated.filter((m) => m.unread);
  const important = annotated.filter((m) => IMPORTANT_CATEGORIES.includes(m.category));

  return {
    generatedAt: new Date().toISOString(),
    rangeDays: days,
    total: annotated.length,
    unread: unread.length,
    withAttachments: annotated.filter((m) => m.hasAttachments).length,
    earliest: annotated.length ? annotated[annotated.length - 1].date : null,
    latest: annotated.length ? annotated[0].date : null,
    topSenders: [...senderMap.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    topDomains: [...domainMap.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    byDay: [...dayMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    categories: [...categoryMap.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count),
    keywords: extractKeywords(annotated),
    unreadTop: unread.slice(0, 12),
    highlights: (unread.length ? [...unread, ...important] : important)
      .filter((msg, index, arr) => arr.findIndex((m) => m.uid === msg.uid) === index)
      .slice(0, 10),
  };
}
