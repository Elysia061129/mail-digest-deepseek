/** 排版：一份给人看的控制台输出 + 一份可直接存档的 Markdown。 */

function fmtTime(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function pad(text, width) {
  const s = String(text);
  let len = 0;
  for (const ch of s) len += /[\u4e00-\u9fa5\uff00-\uffef]/.test(ch) ? 2 : 1;
  return s + ' '.repeat(Math.max(0, width - len));
}

function senderLabel(msg) {
  return msg.from.name ? `${msg.from.name} <${msg.from.address}>` : msg.from.address;
}

export function renderConsole(digest, { aiText = '' } = {}) {
  const out = [];
  out.push('');
  out.push(`📮 邮件简报 · 最近 ${digest.rangeDays} 天`);
  out.push('─'.repeat(46));

  if (digest.total === 0) {
    out.push('这段时间没有符合条件的邮件。');
    out.push('');
    return out.join('\n');
  }

  out.push(`共 ${digest.total} 封 · 未读 ${digest.unread} 封 · 带附件 ${digest.withAttachments} 封`);
  out.push(`时间范围：${fmtTime(digest.earliest)} → ${fmtTime(digest.latest)}`);

  out.push('');
  out.push('【高频发件人】');
  digest.topSenders.forEach((s, i) => {
    out.push(`  ${String(i + 1).padStart(2)}. ${pad(s.address, 34)} ${s.count} 封`);
  });

  out.push('');
  out.push('【分类】');
  for (const c of digest.categories) {
    out.push(`  ${pad(c.key, 14)} ${String(c.count).padStart(3)}`);
  }

  out.push('');
  out.push('【每日分布】');
  const max = Math.max(...digest.byDay.map((d) => d.count), 1);
  for (const d of digest.byDay) {
    const bar = '█'.repeat(Math.max(1, Math.round((d.count / max) * 24)));
    out.push(`  ${d.date}  ${pad(bar, 26)} ${d.count}`);
  }

  if (digest.keywords.length) {
    out.push('');
    out.push('【关键词】');
    out.push('  ' + digest.keywords.map((k) => `${k.word}(${k.count})`).join('  '));
  }

  if (digest.unreadTop.length) {
    out.push('');
    out.push(`【未读 ${digest.unread} 封，先看这些】`);
    for (const msg of digest.unreadTop) {
      out.push(`  · ${fmtTime(msg.date)}  ${senderLabel(msg)}`);
      out.push(`      ${msg.subject}${msg.hasAttachments ? '  📎' : ''}`);
    }
  }

  if (digest.highlights.length) {
    out.push('');
    out.push('【值得注意】');
    for (const msg of digest.highlights) {
      out.push(`  [${msg.category}] ${fmtTime(msg.date)} ${msg.subject}`);
    }
  }

  if (aiText) {
    out.push('');
    out.push('【AI 简报】');
    out.push(aiText);
  }

  out.push('');
  return out.join('\n');
}

export function renderMarkdown(digest, { aiText = '' } = {}) {
  const out = [];
  out.push(`# 邮件简报 · 最近 ${digest.rangeDays} 天`);
  out.push('');
  out.push(`> 生成时间：${new Date(digest.generatedAt).toLocaleString('zh-CN')}`);
  out.push('');

  if (digest.total === 0) {
    out.push('这段时间没有符合条件的邮件。');
    return out.join('\n') + '\n';
  }

  out.push(
    `**共 ${digest.total} 封 · 未读 ${digest.unread} 封 · 带附件 ${digest.withAttachments} 封**` +
      `  \n时间范围：${fmtTime(digest.earliest)} → ${fmtTime(digest.latest)}`
  );
  out.push('');

  if (aiText) {
    out.push('## AI 简报');
    out.push('');
    out.push(aiText);
    out.push('');
  }

  out.push('## 高频发件人');
  out.push('');
  out.push('| # | 发件人 | 封数 |');
  out.push('| --- | --- | ---: |');
  digest.topSenders.forEach((s, i) => {
    out.push(`| ${i + 1} | ${s.name ? `${s.name} ` : ''}\`${s.address}\` | ${s.count} |`);
  });
  out.push('');

  out.push('## 分类');
  out.push('');
  out.push('| 分类 | 封数 |');
  out.push('| --- | ---: |');
  for (const c of digest.categories) out.push(`| ${c.key} | ${c.count} |`);
  out.push('');

  out.push('## 每日分布');
  out.push('');
  out.push('| 日期 | 封数 |');
  out.push('| --- | ---: |');
  for (const d of digest.byDay) out.push(`| ${d.date} | ${d.count} |`);
  out.push('');

  if (digest.keywords.length) {
    out.push('## 关键词');
    out.push('');
    out.push(digest.keywords.map((k) => `\`${k.word}\`(${k.count})`).join(' '));
    out.push('');
  }

  if (digest.unreadTop.length) {
    out.push(`## 未读（共 ${digest.unread} 封）`);
    out.push('');
    for (const msg of digest.unreadTop) {
      out.push(`- \`${fmtTime(msg.date)}\` **${msg.subject}** — ${senderLabel(msg)}${msg.hasAttachments ? ' 📎' : ''}`);
    }
    out.push('');
  }

  if (digest.highlights.length) {
    out.push('## 值得注意');
    out.push('');
    for (const msg of digest.highlights) {
      out.push(`- \`${msg.category}\` \`${fmtTime(msg.date)}\` ${msg.subject}`);
    }
    out.push('');
  }

  return out.join('\n') + '\n';
}
