#!/usr/bin/env node
/**
 * mail-digest —— 把近期邮件整理成一份中文简报。
 *
 * 邮箱类型不限：只要有 IMAP 就行。
 * 服务器地址按域名自动识别（QQ / 163 / Gmail / iCloud / 自建域名…），
 * 识别不到可以用 IMAP_HOST 或 --host 手动指定。
 *
 * 默认纯本地统计（不联网、不需要密钥）；
 * 加 --ai 才会调用 DeepSeek API 额外写一段总结。
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { loadEnvFile, maskAddress } from './src/env.mjs';
import { fetchMessages } from './src/imap.mjs';
import { buildDigest } from './src/summary.mjs';
import { summarizeWithAI } from './src/ai.mjs';
import { renderConsole, renderMarkdown } from './src/render.mjs';
import { demoMessages } from './src/demo.mjs';
import { resolveConnection, providerTable } from './src/providers.mjs';

const USAGE = `
mail-digest —— 近期邮件中文简报（支持任意 IMAP 邮箱）

用法：
  node index.mjs [选项]

基本选项：
  --days <N>            统计最近 N 天（默认 1）
  --limit <N>           最多抓取 N 封（默认 200）
  --mailbox <名称>      邮箱文件夹（默认 INBOX）
  --unread              只看未读邮件

账号与服务器：
  --user <邮箱地址>     覆盖 IMAP_USER
  --host <域名>         手动指定 IMAP 服务器（覆盖自动识别）
  --port <端口>         手动指定端口（默认随服务器，通常 993）
  --provider <名称>     指定服务商预设（qq、163、gmail、icloud…）
  --providers           列出所有内置预设后退出

可选 AI 简报：
  --ai                  额外调用 DeepSeek API 生成中文简报
  --ai-model <模型名>   默认 deepseek-chat
  --ai-max-chars <N>    送给 AI 的清单最大字符数（默认 12000）

输出：
  --out <路径|auto>     同时输出 Markdown；auto = out/digest-YYYY-MM-DD.md
  --json                输出结构化 JSON
  --demo                用内置假数据跑一遍，不需要邮箱和密钥
  -h, --help            显示本帮助

环境变量（通常写在 .env 里，见 .env.example）：
  IMAP_USER IMAP_PASS                     账号 + 密码/授权码（必填）
  IMAP_HOST IMAP_PORT IMAP_SECURE         服务器（不填就自动识别）
  IMAP_PROVIDER                           服务商预设名
  DEEPSEEK_API_KEY DEEPSEEK_MODEL DEEPSEEK_BASE_URL

示例：
  node index.mjs --demo
  node index.mjs --days 7 --unread
  node index.mjs --days 3 --ai --out auto
  node index.mjs --user me@example.com --host imap.example.com
`;

function fail(message, code = 2) {
  console.error(`\n[错误] ${message}\n`);
  console.error('用 node index.mjs --help 查看用法。\n');
  process.exit(code);
}

function parseArgs(argv) {
  const opts = {
    days: 1,
    daysSet: false,
    limit: 200,
    mailbox: 'INBOX',
    unreadOnly: false,
    user: '',
    host: '',
    port: undefined,
    provider: '',
    providers: false,
    ai: false,
    aiModel: undefined,
    aiMaxChars: undefined,
    out: '',
    json: false,
    demo: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) fail(`参数 ${arg} 后面需要一个值`);
      i += 1;
      return v;
    };

    switch (arg) {
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '--days':
        opts.days = Number(value());
        opts.daysSet = true;
        break;
      case '--limit':
        opts.limit = Number(value());
        break;
      case '--mailbox':
        opts.mailbox = value();
        break;
      case '--unread':
        opts.unreadOnly = true;
        break;
      case '--user':
        opts.user = value();
        break;
      case '--host':
        opts.host = value();
        break;
      case '--port':
        opts.port = Number(value());
        break;
      case '--provider':
        opts.provider = value();
        break;
      case '--providers':
        opts.providers = true;
        break;
      case '--ai':
        opts.ai = true;
        break;
      case '--ai-model':
        opts.aiModel = value();
        break;
      case '--ai-max-chars':
        opts.aiMaxChars = Number(value());
        break;
      case '--out':
        opts.out = value();
        break;
      case '--json':
        opts.json = true;
        break;
      case '--demo':
        opts.demo = true;
        break;
      default:
        fail(`不认识的参数：${arg}`);
    }
  }
  return opts;
}

function printProviders() {
  const rows = providerTable();
  const width = Math.max(...rows.map((r) => r.key.length), 4);
  console.log('\n内置服务商预设（也可以用 IMAP_HOST 手动指定任意服务器）：\n');
  for (const row of rows) {
    console.log(
      `  ${row.key.padEnd(width)}  ${row.label.padEnd(16)}  ${row.address}` +
        (row.note ? `\n  ${' '.repeat(width)}  ⚠ ${row.note}` : '')
    );
  }
  console.log('\n用法：node index.mjs --provider gmail\n');
}

/** 环境变量里的端口/加密开关；没写就是 undefined，交给自动识别。 */
function envPort() {
  const raw = process.env.IMAP_PORT;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function envSecure() {
  const raw = process.env.IMAP_SECURE;
  if (raw === undefined || raw === '') return undefined;
  return String(raw).toLowerCase() !== 'false';
}

function missingCredentials(user) {
  console.error('\n[错误] 缺少邮箱账号或密码，没法连邮箱。\n');
  console.error('  在项目目录复制一份配置再填：');
  console.error('    copy .env.example .env      (macOS / Linux 用 cp)');
  console.error('');
  console.error('  最少只要这两行：');
  console.error(`    IMAP_USER=你的邮箱地址${user ? `（当前是 ${maskAddress(user)}）` : ''}`);
  console.error('    IMAP_PASS=密码或授权码');
  console.error('');
  console.error('  服务器地址会按域名自动识别，识别不到才需要补 IMAP_HOST。');
  console.error('  想先看效果、不连邮箱：node index.mjs --demo\n');
  process.exit(2);
}

function stamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

async function main() {
  loadEnvFile();
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    console.log(USAGE);
    return;
  }
  if (opts.providers) {
    printProviders();
    return;
  }
  if (!Number.isFinite(opts.days) || opts.days <= 0) fail('--days 需要是一个正数');
  if (!Number.isFinite(opts.limit) || opts.limit <= 0) fail('--limit 需要是一个正数');
  if (opts.port !== undefined && (!Number.isFinite(opts.port) || opts.port <= 0)) {
    fail('--port 需要是一个正数');
  }

  const effectiveDays = opts.demo && !opts.daysSet ? 3 : opts.days;
  const since = new Date(Date.now() - effectiveDays * 86400 * 1000);

  let messages;
  if (opts.demo) {
    console.log('[演示模式] 使用内置假数据，不会连接任何邮箱。');
    messages = demoMessages.filter((m) => new Date(m.date) >= since);
  } else {
    const user = opts.user || process.env.IMAP_USER || '';
    const pass = process.env.IMAP_PASS || '';
    if (!user || !pass) missingCredentials(user);

    const conn = await resolveConnection({
      user,
      explicitHost: opts.host || process.env.IMAP_HOST || '',
      explicitPort: opts.port ?? envPort(),
      explicitSecure: envSecure(),
      providerKey: opts.provider || process.env.IMAP_PROVIDER || '',
    });

    console.error(`账号：${maskAddress(user)}`);
    console.error(`服务器：${conn.host}:${conn.port}（${conn.source}）`);
    if (conn.note) console.error(`提示：${conn.note}`);
    console.error(
      `正在抓取 ${opts.mailbox} 最近 ${effectiveDays} 天的邮件${opts.unreadOnly ? '（只看未读）' : ''}…`
    );

    messages = await fetchMessages({
      host: conn.host,
      port: conn.port,
      secure: conn.secure,
      user,
      pass,
      mailbox: opts.mailbox,
      since,
      limit: opts.limit,
      unreadOnly: opts.unreadOnly,
    });
    console.error(`抓到 ${messages.length} 封。\n`);
  }

  const digest = buildDigest(messages, { days: effectiveDays });

  let aiText = '';
  if (opts.ai) {
    try {
      console.error('正在请求 DeepSeek 生成简报…');
      aiText = await summarizeWithAI(digest, messages, {
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        model: opts.aiModel || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        maxChars: opts.aiMaxChars || 12000,
      });
    } catch (error) {
      console.error(`\n[警告] AI 简报生成失败，下面只给本地摘要：${error.message}\n`);
    }
  }

  if (opts.json) {
    console.log(JSON.stringify({ digest, aiText }, null, 2));
  } else {
    console.log(renderConsole(digest, { aiText }));
  }

  if (opts.out) {
    const target = opts.out === 'auto' ? `out/digest-${stamp()}.md` : opts.out;
    mkdirSync(dirname(target) || '.', { recursive: true });
    writeFileSync(target, renderMarkdown(digest, { aiText }), 'utf8');
    console.log(`已写入：${target}\n`);
  }
}

main().catch((error) => {
  console.error(`\n[错误] ${error.message}\n`);
  process.exit(1);
});
