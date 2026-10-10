# mail-digest

把**任意 IMAP 邮箱**最近几天的邮件，整理成一份能一眼看完的中文简报 ——
**本地统计 + 可选 DeepSeek AI 总结**。

> 不接 AI 也能用：默认**纯本地**统计，不联网、不需要密钥、连依赖都不用装。
> 加上 `--ai`，才会把邮件清单交给 **DeepSeek** 写一段"今天该处理什么"。
> 本项目是个人作品，**不是 DeepSeek 官方项目**，也没有任何官方背书。

> QQ / 163 / 126 / Gmail / iCloud / 公司自建邮箱都能用，服务器地址会**按邮箱域名自动识别**，
> 你通常只需要填账号和密码（授权码）。唯一的例外是微软系（Outlook / Hotmail / 365），原因见「已知限制」。

```text
📮 邮件简报 · 最近 3 天
──────────────────────────────────────────────
共 13 封 · 未读 3 封 · 带附件 3 封
时间范围：10-02 07:41 → 10-04 11:17

【高频发件人】
   1. noreply@github.com                 2 封
   2. jwc@example.edu.cn                 2 封
   3. order@jd.com                       1 封
   ...

【分类】
  验证码/登录      2
  快递/物流        2
  工作/学习        2
  账单/支付        2
  推广/营销        1

【每日分布】
  10-02  ████████████               3
  10-03  ████████████████           4
  10-04  ████████████████████████   6

【未读 3 封，先看这些】
  · 10-04 11:17  GitHub <noreply@github.com>
      [GitHub] Please verify your device
  · 10-04 10:29  京东 <order@jd.com>
      您的订单 29384756102 已发货
```

## 特性

- **什么邮箱都行**：只要有 IMAP，服务器地址按域名自动识别，识别不到还能查公开的自动配置库。
- **零配置可试**：`node index.mjs --demo` 用内置假数据跑一遍，不用邮箱、不用装依赖。
- **本地摘要**：高频发件人、邮件分类（验证码/账单/快递/工作/营销/订阅/系统）、每日分布、关键词、未读清单、值得注意的条目。
- **可选 DeepSeek AI 简报**：`--ai` 调 DeepSeek 生成"今天该处理什么"，只发送元数据与正文片段，并受字符数上限约束。
- **可存档**：`--out auto` 输出 Markdown，`--json` 输出结构化 JSON 便于接管道。
- **依赖极少**：只有 `imapflow` 和 `mailparser`，且都是**用到才动态加载** —— `--help`、`--demo` 在没装依赖时照样能跑。

## 快速开始

```bash
git clone https://gitee.com/ruan-mei-jiuli/mail-digest.git
cd mail-digest

# 1) 先看效果，不需要邮箱、也不需要装依赖
node index.mjs --demo

# 2) 真要用，装依赖
npm install

# 3) 配置账号（只有这两行是必填的）
copy .env.example .env      # macOS / Linux: cp .env.example .env
#   IMAP_USER=你的邮箱地址
#   IMAP_PASS=密码或授权码

# 4) 跑（服务器地址自动识别）
node index.mjs --days 3
```

> 要求 Node.js >= 20（用到内置 `fetch` 和 `AbortSignal.timeout`）。

## 支持哪些邮箱

**自动识别顺序（从前往后）**：

1. 手动指定 —— `IMAP_HOST` 环境变量或 `--host` 参数，永远优先；
2. 按域名查内置预设 —— 见下表（命中就直接用，不联网）；
3. 预设里没有的域名，依次去问：
   `https://autoconfig.<你的域名>/mail/config-v1.1.xml` → `https://<你的域名>/.well-known/autoconfig/mail/config-v1.1.xml` → Mozilla 的公共配置库（Thunderbird 同款数据源）。这套顺序和 Thunderbird 一样，覆盖了大量自建域名和企业邮箱；
4. 都失败就报错，并告诉你怎么手填。

看全部内置预设：

```bash
node index.mjs --providers
```

| 预设名 | 邮箱 | 服务器 |
| --- | --- | --- |
| `qq` / `foxmail` | QQ 邮箱、Foxmail | `imap.qq.com:993` |
| `exmail` | 腾讯企业邮箱 | `imap.exmail.qq.com:993` |
| `163` / `126` / `yeah` | 网易系列 | `imap.163.com:993` |
| `sina` / `sohu` / `21cn` / `tom` / `263` | 新浪、搜狐、21CN、TOM、263 | 各家 IMAP |
| `aliyun` | 阿里云 / 万网企业邮箱 | `imap.mxhichina.com:993` |
| `139` / `189` | 移动 139、电信 189 | `imap.139.com` / `imap.189.cn` |
| `gmail` | Gmail | `imap.gmail.com:993` |
| `outlook` | Outlook / Hotmail / Live | `outlook.office365.com:993` |
| `icloud` | iCloud / me.com / mac.com | `imap.mail.me.com:993` |
| `yahoo` / `aol` | Yahoo、AOL | `imap.mail.yahoo.com` / `imap.aol.com` |
| `zoho` / `fastmail` / `gmx` / `mailru` / `yandex` | 各家国外邮箱 | 各家 IMAP |
| `naver` / `daum` | Naver、Daum / Hanmail | 各家 IMAP |

不在这张表里的（比如你自己域名的邮箱、学校邮箱），一般会被第 3 层自动配置识别出来；识别不到就手填：

```bash
node index.mjs --user me@example.com --host imap.example.com
```

## 各家的坑（重要）

| 邮箱 | 密码栏填什么 | 注意 |
| --- | --- | --- |
| **QQ / Foxmail** | 授权码 | 设置 → 账号 → 开启 IMAP/SMTP → 生成授权码 |
| **163 / 126 / yeah.net** | 授权码 | 同样在设置里开启 IMAP 服务；网易要求客户端先发 ID 命令，本工具已自动处理 |
| **Gmail** | 应用专用密码 | 先在 Google 账号开启两步验证，再生成 16 位「应用专用密码」；主密码会被拒 |
| **iCloud** | App 专用密码 | 在 Apple ID 安全设置里生成；主密码不可用 |
| **Yahoo / AOL / Fastmail / Yandex / Mail.ru** | 应用密码 | 各家后台都能生成 |
| **企业微信 / 腾讯企业邮** | 授权码或密码 | 视管理员策略而定 |
| **Outlook / Hotmail / Microsoft 365** | —— | ⚠️ 微软已停用基本认证，密码登录会被拒，**需要 OAuth2，本工具暂不支持** |
| **Proton Mail** | —— | ⚠️ 官方不提供 IMAP，要装 Proton Mail Bridge，本工具用不了 |

## 配置

配置都走环境变量，通常写在项目根目录的 `.env` 里（已在 `.gitignore` 中，不会提交）。

| 变量 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- |
| `IMAP_USER` | ✅ | 空 | 邮箱地址，也用来推断服务器 |
| `IMAP_PASS` | ✅ | 空 | 密码 / 授权码 / 应用专用密码 |
| `IMAP_HOST` | — | 自动识别 | 手动指定服务器，填了就不自动识别 |
| `IMAP_PORT` | — | 随服务器 | 通常是 993 |
| `IMAP_SECURE` | — | `true` | 填 `false` 走明文 / STARTTLS |
| `IMAP_PROVIDER` | — | 空 | 直接点名预设，如 `gmail` |
| `DEEPSEEK_API_KEY` | — | 空 | 只有 `--ai` 才需要 |
| `DEEPSEEK_MODEL` | — | `deepseek-chat` | 模型名 |
| `DEEPSEEK_BASE_URL` | — | `https://api.deepseek.com` | 也可以指向兼容的网关 |

## 用法

```text
node index.mjs [选项]

基本：
  --days <N>            统计最近 N 天（默认 1）
  --limit <N>           最多抓取 N 封（默认 200）
  --mailbox <名称>      邮箱文件夹（默认 INBOX）
  --unread              只看未读邮件

账号与服务器：
  --user <邮箱地址>     覆盖 IMAP_USER
  --host <域名>         手动指定 IMAP 服务器
  --port <端口>         手动指定端口
  --provider <名称>     指定服务商预设
  --providers           列出所有内置预设

可选 AI 简报：
  --ai / --ai-model / --ai-max-chars

输出：
  --out <路径|auto>     同时输出 Markdown
  --json                输出结构化 JSON
  --demo                用内置假数据跑一遍
  -h, --help            显示帮助
```

几个例子：

```bash
node index.mjs --demo                         # 看效果
node index.mjs --days 7                       # 最近 7 天（自动识别服务器）
node index.mjs --days 1 --unread              # 只看未读
node index.mjs --provider gmail --days 3      # 点名 Gmail 预设
node index.mjs --user me@school.edu.cn --host imap.school.edu.cn
node index.mjs --days 3 --ai --out auto       # 本地摘要 + AI 简报并存 Markdown
```

退出码：`0` 正常，`1` 运行出错（连不上、解析失败等），`2` 参数或配置不对。

## DeepSeek AI 简报说明

加 `--ai` 时会把下面这些内容发送给 DeepSeek：

- 本地统计结果（总数、未读、高频发件人、分类等）；
- 每封邮件的 **发件人 / 时间 / 主题 / 正文前 240 字**（会标注未读、有附件）；
- 总字符数超过 `--ai-max-chars`（默认 12000）的部分直接截断。

**不会发送**：附件内容、邮箱密码或授权码、完整收件人列表。

如果 API 报错（401 key 无效、402 余额不足等），程序只打印一条警告，本地摘要照常输出。

## 目录结构

```text
mail-digest/
├── index.mjs          # CLI：参数解析与流程编排
├── src/
│   ├── env.mjs        # .env 读取、邮箱打码
│   ├── providers.mjs  # 服务商预设 + 域名识别 + 自动配置查询
│   ├── imap.mjs       # IMAP 拉取 + 解析（依赖在此动态加载）
│   ├── summary.mjs    # 纯本地摘要与分类（纯函数，可单测）
│   ├── ai.mjs         # 可选的 DeepSeek 简报
│   ├── render.mjs     # 控制台 / Markdown 排版
│   └── demo.mjs       # --demo 用的假数据
├── .env.example
└── package.json
```

## 安全建议

- `.env` 已在 `.gitignore` 里，提交前仍建议 `git status` 看一眼，别把授权码带上去。
- 只想试水的话，先用一个不重要的邮箱。
- 本工具只读邮件（不会标记已读、不会删除、不会发送），但抓取正文片段会占用你的流量。

## 已知限制

- **Outlook / Microsoft 365 用不了**：微软停用了基本认证，需要 OAuth2，本工具没实现。
- **Proton Mail 用不了**：官方不提供 IMAP。
- 预设表是"常见默认值"，个别服务商改过地址；不对时用 `IMAP_HOST` 覆盖即可。
- 域名不在预设表里、又要联网查自动配置时，启动会多等几秒（最多三次尝试，各 8 秒超时）；查不到就手填 `IMAP_HOST`。
- 关键词提取是"二字/三字组词频"的土办法，不做中文分词，偶尔会出现"请于"这种无意义片段。
- 只处理一个文件夹（可用 `--mailbox` 换），暂不支持多文件夹合并。
- HTML 邮件走的是粗暴标签剥离，复杂排版的正文可能变成一行。

## License

[MIT](LICENSE)
