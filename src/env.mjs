import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 读取工作目录下的 .env（如果存在）。
 * 只补齐「当前进程里还没有」的变量，不覆盖真实环境变量 ——
 * 这样 CI 或 `IMAP_PASS=xxx node index.mjs` 的写法永远优先。
 */
export function loadEnvFile(file = '.env') {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return false;

  const text = readFileSync(path, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq < 1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
  return true;
}

/** 把邮箱地址打码，日志和摘要里都不出现完整账号。 */
export function maskAddress(address = '') {
  const at = address.indexOf('@');
  if (at <= 0) return address ? '***' : '';
  const name = address.slice(0, at);
  const domain = address.slice(at);
  const head = name.slice(0, Math.min(2, name.length));
  return `${head}${'*'.repeat(Math.max(1, name.length - head.length))}${domain}`;
}
