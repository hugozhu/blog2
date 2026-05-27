# autocli-skill

> The perfect companion for ClaudeCode/OpenClaw/Agent, Give your AI Agent the ability to reach information across the entire web, fetching real-time data from Bilibili, Zhihu, Twitter/X, YouTube, Weibo, Reddit, Facebook, Instagram, TikTok, Notion, Cursor and 55+ platforms with natural language — reusing your Chrome login session, no API keys needed. Blazing fast Rust binary.
>

**[English](#english) | [中文](#中文) | [日本語](#日本語)**

---

<a name="english"></a>
## English

### What is this?

Have you ever wanted OpenClaw/Claude/AI to:
- Browse **Bilibili** trending, search **Zhihu**, check **Weibo** hot topics
- Search **YouTube**, get **Reddit** posts, read **HackerNews**
- Check **stock prices** on Yahoo Finance or Xueqiu
- Post a **tweet** or search your **Twitter** timeline
- Control **Cursor**, **Notion**, **ChatGPT**, **Discord** desktop apps from CLI
- Integrate **GitHub CLI**, **Docker**, **kubectl** through a unified interface

...but OpenClaw/Claude/AI  has no access to these platforms?

**This skill bridges that gap.**

It wraps [autocli](https://github.com/nashsu/AutoCLI) — a blazing fast Rust CLI tool that turns **55+ major platforms into command-line interfaces** by **reusing your existing Chrome login sessions**. No API keys. No re-authentication. Single 4.7MB binary with zero runtime dependencies. Just download and go.


### Prerequisites

Before installation, check that you have all of these:

- [ ] **Chrome browser** open and logged in to your target platforms
- [ ] **autocli Chrome Extension** installed (for browser commands) — [Download from GitHub Releases](https://github.com/nashsu/AutoCLI/releases/latest)


**Step 1 — Install the autocli CLI tool**

See: https://github.com/nashsu/AutoCLI

**Step 2 — Install this skill**

**Method 1: Let Claude/OpenClaw/Any AI agent install for you**

```
Help me install this skill: https://github.com/nashsu/AutoCLI-skill
```

**Method 2: Manual Install**
```bash
npx skills add https://github.com/nashsu/AutoCLI-skill
```

That's it! Restart Claude Code to activate the skill.

### Supported Platforms (55+)

| Platform | Mode | Key Commands |
|----------|------|-------------|
| HackerNews | Public | `top` `new` `best` `ask` `show` `jobs` `search` `user` |
| Dev.to | Public | `top` `tag` `user` |
| Lobsters | Public | `hot` `newest` `active` `tag` |
| StackOverflow | Public | `hot` `search` `bounties` `unanswered` |
| Wikipedia | Public | `search` `summary` `random` `trending` |
| Arxiv | Public | `search` `paper` |
| BBC | Public | `news` |
| Twitter/X | Browser | `trending` `bookmarks` `profile` `search` `timeline` `post` `reply` `like` `follow` `article` ... (24 cmds) |
| Bilibili (B站) | Browser | `hot` `search` `me` `favorite` `history` `feed` `subtitle` `download` ... (12 cmds) |
| Reddit | Browser | `hot` `frontpage` `popular` `search` `subreddit` `upvote` `save` `comment` ... (15 cmds) |
| Zhihu (知乎) | Browser | `hot` `search` `question` `download` |
| Xiaohongshu (小红書) | Browser | `search` `feed` `user` `publish` `creator-notes` ... (11 cmds) |
| YouTube | Browser | `search` `video` `transcript` |
| Weibo (微博) | Browser | `hot` `search` |
| Douban (豆瓣) | Browser | `search` `top250` `subject` `movie-hot` `book-hot` ... (7 cmds) |
| WeRead (微信読書) | Browser | `shelf` `search` `book` `highlights` `notes` `ranking` ... (7 cmds) |
| Xueqiu (雪球) | Browser | `feed` `hot-stock` `hot` `search` `stock` `watchlist` ... (7 cmds) |
| BOSS直聘 | Browser | `search` `detail` `recommend` `greet` `batchgreet` ... (14 cmds) |
| Facebook | Browser | `feed` `profile` `search` `friends` `groups` `events` ... (10 cmds) |
| Instagram | Browser | `explore` `profile` `search` `follow` `like` `comment` ... (14 cmds) |
| TikTok | Browser | `explore` `search` `profile` `follow` `like` `comment` ... (15 cmds) |
| Jike (即刻) | Browser | `feed` `search` `create` `like` `comment` `repost` ... (10 cmds) |
| Google | Public/Browser | `news` `search` `suggest` `trends` |
| V2EX | Public/Browser | `hot` `latest` `topic` `node` `user` `daily` `me` ... (11 cmds) |
| Bloomberg | Public/Browser | `main` `markets` `economics` `tech` `politics` ... (10 cmds) |
| Medium | Browser | `feed` `search` `user` |
| Substack | Browser | `feed` `search` `publication` |
| LinkedIn | Browser | `search` |
| Yahoo Finance | Browser | `quote` |
| Cursor | Desktop | `status` `send` `read` `new` `dump` `composer` `model` `ask` ... (12 cmds) |
| Notion | Desktop | `status` `search` `read` `new` `write` `sidebar` `favorites` `export` |
| ChatGPT | Desktop | `status` `new` `send` `read` `ask` |
| Discord | Desktop | `status` `send` `read` `channels` `servers` `search` `members` |
| Codex | Desktop | `status` `send` `read` `new` `dump` `model` `ask` ... (11 cmds) |
| Other 20+ sites | Various | See `autocli --help` |

> **Mode legend:** Public = No browser needed, calls API directly; Browser = Requires Chrome + extension; Desktop = Requires the desktop app to be running


### Usage

Make sure Chrome is open and you're logged in to the target platforms, then talk to Claude naturally:

```
"Search YouTube for LLM tutorials"
"Get the top 20 stories on HackerNews"
"What's trending on Twitter right now?"
"Search Reddit r/MachineLearning for transformer papers"
"Get BBC news headlines"
"Check AAPL stock price"
"Post a tweet: Just discovered Claude Code skills!"
"What's hot on Bilibili?"
"Search Douban for top-rated movies"
"Check my WeRead highlights"
```

Claude automatically picks the right autocli command, runs it, and displays results in a clean table with translated titles.

### Command Reference

```bash
# Bilibili
autocli bilibili hot --limit 10 --format json
autocli bilibili search --keyword "AI"

# Twitter/X
autocli twitter timeline --format json
autocli twitter post --text "Hello from Claude!"
autocli twitter search "claude AI" --limit 10

# YouTube
autocli youtube search --query "LLM tutorial"

# HackerNews
autocli hackernews top --limit 20 --format json

# Reddit
autocli reddit hot --subreddit MachineLearning

# Yahoo Finance
autocli yahoo-finance quote --symbol AAPL

# Douban
autocli douban top250 --format json


```


### Troubleshooting

| Problem | Fix |
|---------|-----|
| `autocli: command not found` | Re-run the install script; check your PATH |
| Chrome not being controlled | Make sure Chrome is open; verify autocli Chrome extension is loaded |
| Login state not recognized | In Chrome, manually log in to the target site first |
| Browser commands timeout | Check `autocli doctor` for diagnostics |

### Credits

Built on **[nashsu/AutoCLI](https://github.com/nashsu/AutoCLI)** — a complete Rust rewrite of opencli, up to 12x faster with 10x less memory.

---

<a name=「中文」></a>
## 中文

### 这是什么？

你有没有遇到过这种情况：

- 想让 Claude 帮你 **查 B 站热门** 、 **搜知乎** 、 **看微博热搜**，但 Claude 根本没有这些平台的访问权限
- 想让 Claude **控制 Cursor、Notion、ChatGPT** 等桌面应用
- 用 Playwright 自动化太麻烦，还要单独处理登录态
- 各平台 API 要申请资质，普通用户根本用不了

**这个 Skill 解决了这个问题。**

它把 [autocli](https://github.com/nashsu/AutoCLI) 封装成 Claude Code 的能力——autocli 是一个 **用 Rust 重写 **的极速 CLI 工具，把 **55+ 个主流平台 **变成命令行接口， **直接复用你 Chrome 浏览器里已有的登录态**。零配置，零 API Key，零运行时依赖。单个 4.7MB 二进制文件，下载即用。

### 前置条件

安装前，请逐一确认以下条件都已满足：

- [ ] **Chrome 浏览器** 已打开，并已登录目标网站
- [ ] **autocli Chrome 扩展** 已安装（浏览器命令需要）— [从 GitHub Releases 下载](https://github.com/nashsu/AutoCLI/releases/latest)

### 安装配置

**第一步：安装 autocli CLI 工具**

参考：https://github.com/nashsu/AutoCLI

**第二步：安装本 Skill**

**方法一：让 Claude/OpenClaw/任意 AI Agent 帮你安装**

```
帮我安装这个 skill：https://github.com/nashsu/AutoCLI-skill
```

**方法二：手动安装**
```bash
npx skills add https://github.com/nashsu/AutoCLI-skill
```

安装完成后重启 Claude Code，Skill 即可生效。

### 使用方法

确保 Chrome 已打开且已登录目标网站，然后在 Claude Code 中用自然语言说：

```
查下B站今天的热门
搜知乎上关于AI大模型的讨论
看微博热搜前10条
帮我发一条推文：今天天气真好
查一下茅台的股票行情
搜YouTube上的LLM教程
看豆瓣电影Top250
查看我微信读书的笔记
```

Claude 会自动调用 autocli 完成操作，结果以表格形式展示，英文标题附带中文翻译。

### 命令速查

```bash
# B站
autocli bilibili hot --limit 10 --format json
autocli bilibili search --keyword "AI"

# Twitter/X
autocli twitter timeline --format json
autocli twitter post --text "Hello from Claude!"
autocli twitter search "claude AI" --limit 10

# 雪球
autocli xueqiu stock --symbol SH600519   # 茅台行情
autocli xueqiu watchlist                  # 我的自选股

# HackerNews
autocli hackernews top --limit 20 --format json

# 豆瓣
autocli douban top250 --format json

# 桌面应用
autocli cursor status
autocli notion search "会议记录"
```

### 常见问题

| 问题 | 解决方法 |
|------|----------|
| `autocli: command not found` | 重新运行安装脚本，检查 PATH 配置 |
| Chrome 无法被控制 | 确保 Chrome 已打开，且 autocli Chrome 扩展已加载 |
| 登录态未识别 | 在 Chrome 中手动登录目标网站后再试 |
| 浏览器命令超时 | 运行 `autocli doctor` 进行诊断 |

### 致谢

本 Skill 基于 **[nashsu/AutoCLI](https://github.com/nashsu/AutoCLI)** 构建——基于 opencli 的 Rust 完全重写版本，速度提升最高 12 倍，内存减少 10 倍。

---

<a name=「日本語」></a>
## 日本語

### これは何ですか？

こんな経験はありませんか？

- Claudeに**Bilibiliのトレンド確認** 、 **知乎の検索** 、 **微博のホットトピック確認**をさせたいが、Claudeにはこれらのプラットフォームへのアクセス権限がない
- Claudeで**Cursor、Notion、ChatGPT**などのデスクトップアプリを操作したい
- Playwrightの自動化は面倒で、ログイン状態の管理も別途必要
- 各プラットフォームのAPIは申請資格が必要で、一般ユーザーには使えない

**このSkillがその問題を解決します。**

[autocli](https://github.com/nashsu/AutoCLI)をClaude Codeの能力として統合します。autocliは**Rustで完全に書き直された**超高速 CLIツールで、 **55 以上の主要プラットフォーム**をコマンドラインインターフェースに変換し、 **Chromeブラウザの既存のログイン状態をそのまま再利用**します。設定不要、APIキー不要、ランタイム依存なし。たった4.7MBのバイナリファイル1つで、ダウンロードしてすぐに使えます。

### 前提条件

インストール前に、以下の条件を確認してください：

- [ ] **Chromeブラウザ** が起動済みで、対象サイトにログイン済み
- [ ] **autocli Chrome 拡張機能** がインストール済み（ブラウザコマンド用）— [GitHub Releasesからダウンロード](https://github.com/nashsu/AutoCLI/releases/latest)

### インストール

**ステップ1：autocli CLIツールをインストール**

参照：https://github.com/nashsu/AutoCLI

**ステップ2：このSkillをインストール**

**方法 1：Claude/OpenClaw/任意のAI Agentにインストールさせる**

```
このskillをインストールしてください：https://github.com/nashsu/AutoCLI-skill
```

**方法 2：手動インストール**
```bash
npx skills add https://github.com/nashsu/AutoCLI-skill
```

インストール完了後、Claude Codeを再起動するとSkillが有効になります。

### 対応プラットフォーム（55 以上）

| プラットフォーム | モード | 主なコマンド |
|----------------|--------|-------------|
| HackerNews | Public | `top` `new` `best` `ask` `show` `jobs` `search` `user` |
| Dev.to | Public | `top` `tag` `user` |
| Lobsters | Public | `hot` `newest` `active` `tag` |
| StackOverflow | Public | `hot` `search` `bounties` `unanswered` |
| Wikipedia | Public | `search` `summary` `random` `trending` |
| Arxiv | Public | `search` `paper` |
| BBC | Public | `news` |
| Twitter/X | Browser | `trending` `bookmarks` `profile` `search` `timeline` `post` `reply` `like` `follow` `article` ... (24コマンド) |
| Bilibili (B 站) | Browser | `hot` `search` `me` `favorite` `history` `feed` `subtitle` `download` ... (12コマンド) |
| Reddit | Browser | `hot` `frontpage` `popular` `search` `subreddit` `upvote` `save` `comment` ... (15コマンド) |
| Zhihu (知乎) | Browser | `hot` `search` `question` `download` |
| Xiaohongshu (小紅書) | Browser | `search` `feed` `user` `publish` `creator-notes` ... (11コマンド) |
| YouTube | Browser | `search` `video` `transcript` |
| Weibo (微博) | Browser | `hot` `search` |
| Douban (豆瓣) | Browser | `search` `top250` `subject` `movie-hot` `book-hot` ... (7コマンド) |
| WeRead (微信読書) | Browser | `shelf` `search` `book` `highlights` `notes` `ranking` ... (7コマンド) |
| Xueqiu (雪球) | Browser | `feed` `hot-stock` `hot` `search` `stock` `watchlist` ... (7コマンド) |
| BOSS 直聘 | Browser | `search` `detail` `recommend` `greet` `batchgreet` ... (14コマンド) |
| Facebook | Browser | `feed` `profile` `search` `friends` `groups` `events` ... (10コマンド) |
| Instagram | Browser | `explore` `profile` `search` `follow` `like` `comment` ... (14コマンド) |
| TikTok | Browser | `explore` `search` `profile` `follow` `like` `comment` ... (15コマンド) |
| Jike (即刻) | Browser | `feed` `search` `create` `like` `comment` `repost` ... (10コマンド) |
| Google | Public/Browser | `news` `search` `suggest` `trends` |
| V2EX | Public/Browser | `hot` `latest` `topic` `node` `user` `daily` `me` ... (11コマンド) |
| Bloomberg | Public/Browser | `main` `markets` `economics` `tech` `politics` ... (10コマンド) |
| Medium | Browser | `feed` `search` `user` |
| Substack | Browser | `feed` `search` `publication` |
| LinkedIn | Browser | `search` |
| Yahoo Finance | Browser | `quote` |
| Cursor | Desktop | `status` `send` `read` `new` `dump` `composer` `model` `ask` ... (12コマンド) |
| Notion | Desktop | `status` `search` `read` `new` `write` `sidebar` `favorites` `export` |
| ChatGPT | Desktop | `status` `new` `send` `read` `ask` |
| Discord | Desktop | `status` `send` `read` `channels` `servers` `search` `members` |
| Codex | Desktop | `status` `send` `read` `new` `dump` `model` `ask` ... (11コマンド) |
| その他 20 以上 | 各種 | `autocli --help` を参照 |

> **モード説明：** Public = ブラウザ不要、APIを直接呼び出し; Browser = Chrome + 拡張機能が必要; Desktop = デスクトップアプリの起動が必要

### 使い方

Chromeが起動していて対象サイトにログイン済みであることを確認し、Claudeに自然言語で話しかけてください：

```
「YouTubeでLLMチュートリアルを検索して」
「HackerNewsのトップ20記事を取得して」
「Twitterで今何がトレンドか教えて」
「Reddit r/MachineLearningでtransformerの論文を検索して」
「BBCのニュースヘッドラインを取得して」
「AAPLの株価を確認して」
「ツイートを投稿して：Claude Code skillsを発見した！」
「Bilibiliの人気動画は何？」
「豆瓣で高評価の映画を検索して」
「微信読書のハイライトを確認して」
```

Claudeが自動的に適切なautocliコマンドを選択・実行し、結果を見やすいテーブル形式で表示します。

### コマンドリファレンス

```bash
# Bilibili
autocli bilibili hot --limit 10 --format json
autocli bilibili search --keyword "AI"

# Twitter/X
autocli twitter timeline --format json
autocli twitter post --text "Hello from Claude!"
autocli twitter search "claude AI" --limit 10

# YouTube
autocli youtube search --query "LLM tutorial"

# HackerNews
autocli hackernews top --limit 20 --format json

# Reddit
autocli reddit hot --subreddit MachineLearning

# Yahoo Finance
autocli yahoo-finance quote --symbol AAPL

# Douban
autocli douban top250 --format json

# デスクトップアプリ
autocli cursor status
autocli notion search "議事録"
```

### トラブルシューティング

| 問題 | 解決方法 |
|------|----------|
| `autocli: command not found` | インストールスクリプトを再実行し、PATHを確認 |
| Chromeが制御できない | Chromeが起動中で、autocli Chrome 拡張機能がロードされているか確認 |
| ログイン状態が認識されない | Chromeで対象サイトに手動ログインしてから再試行 |
| ブラウザコマンドがタイムアウト | `autocli doctor` で診断を実行 |

### クレジット

**[nashsu/AutoCLI](https://github.com/nashsu/AutoCLI)** をベースに構築——opencliのRust 完全書き直し版で、最大 12 倍高速、メモリ使用量 10 分の1。

---

## License

Apache 2.0
