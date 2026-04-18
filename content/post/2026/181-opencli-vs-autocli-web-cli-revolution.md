---
title: "OpenCLI vs AutoCLI：把网站变成 CLI 的技术革命"
subtitle: "Why OpenCLI and AutoCLI Are Reinventing Web Data Access for AI Agents"
date: 2026-04-18
tags: ["ai-agent", "web-scraping", "cli-tools", "system-design", "rust"]
---

上周给 DingTalk 的一个内部项目做技术调研，需要从知乎、B站、小红书几个平台拉热榜数据做竞品分析。同事的第一反应是写爬虫——打开 Playwright，找 CSS 选择器，处理登录态，和 Cloudflare 斗智斗勇，折腾了两小时还没跑通。我看了看他的代码，说："换个思路，试试 OpenCLI，`opencli zhihu hot` 一行命令就完了。"

他自己研究了一下，GitHub 上 16K stars。再一看 AutoCLI（OpenCLI 的 Rust 重写版），性能数据让我直接放下手里的 Playwright：`bilibili hot` 命令，OpenCLI 要 20 秒，AutoCLI 只要 1.66 秒，**12 倍加速**。

更让我震惊的不是性能数字，而是这两个项目背后的**技术范式转变**——它们不是在"做更好的爬虫"，而是在**重新定义怎么从网站获取数据**。

<!--more-->

## 问题的本质：我们一直在用最笨的方式拿数据

大多数人在网站上提取数据时，走的是这条路：

```
打开页面 → 渲染 DOM → 用 CSS 选择器定位元素 → 提取 text → 解析成结构化数据
```

这套方法的致命弱点在于：**你在从渲染结果反推数据，而不是直接拿数据本身**。

就像你去餐厅吃饭，不直接看菜单，而是观察隔壁桌端上来的菜，然后猜菜单上写了什么。网站改版 = 菜单换了排版 = 你猜不出来了。

OpenCLI 和 AutoCLI 的思路完全不同：**它们拦截浏览器内部的网络请求，直接拿到网站前端调用的同一个 API**。

## 三种技术路线的本质对比

要理解这两个项目的价值，先看它们解决的到底是什么问题，以及和传统方案的区别。

### 路线一：传统 DOM 爬取（Playwright / Puppeteer）

```
渲染页面 → CSS 选择器定位 → 提取文本 → 手动结构化
```

**执行准确度问题**：

- **CSS 选择器极其脆弱** — `div.item-list > div:nth-child(3) > h3`，页面改个 class 就全挂
- **SPA 动态加载** — 需要猜测滚动/等待时机，`sleep(3)` 不可靠
- **反爬对抗** — Cloudflare/WAF 检测到自动化行为直接拦截
- **数据不完整** — 只能拿到渲染后的内容，API 才有的字段（如播放量原始数值、算法推荐权重）拿不到

**Token 消耗**：0（不涉及 LLM）

### 路线二：LLM + 浏览器自动化（Anthropic Computer Use / OpenAI Operator）

```
截图/DOM 快照 → 发给 LLM → LLM 决定下一步 → 循环执行
```

**执行准确度**：

- 能理解页面语义，比 DOM 爬取灵活
- 但 LLM 会"幻觉"——误点按钮、填错字段
- 每次交互都要重新理解页面，一致性差

**Token 消耗（极高）**：

- 每一步都要发送完整 DOM/截图给 LLM
- 一个完整流程（登录 → 搜索 → 提取 10 条数据）通常 **20-50 次 LLM 调用**
- 每次调用消耗 **5K-20K tokens**（DOM 树很大）
- **总成本：一次完整流程 50K-1M+ tokens**

### 路线三：OpenCLI/AutoCLI（网络拦截 + 内部 API 直调）

```
打开浏览器 → 触发页面加载 → 拦截网络请求 → 捕获 API endpoint → 直接复用 API 调用
```

**执行流程**：

1. 打开浏览器（复用用户登录态，Cookie 自动携带）
2. navigate 到页面（触发前端 JS 发起 API 请求）
3. 拦截网络流量 → 捕获 API endpoint
4. 在浏览器上下文中 `fetch` 同一个 API（`credentials: "include"` 自动带 Cookie）
5. 拿到结构化 JSON → 模板映射 → 输出

**执行准确度**：

- **远高于 DOM 爬取** — 拿的是原始 JSON 数据，不是渲染后的 HTML
- **API 接口比 UI 更稳定** — 网站改版 UI 不改 API 是常态
- **数据结构化** — 拿到就是 JSON，不需要 HTML parsing

**Token 消耗**：

- **运行时：0 tokens** — 纯 JavaScript/Rust 执行，不调用 LLM
- **生成适配器时：一次性消耗** — AI 自动生成 pipeline，但生成完成后可以无限次使用
- **摊平后：10000 次调用 ≈ 1 次 LLM 成本**

## "数据获取三定律"框架

基于上面的对比，我总结了一个判断框架，帮你决定用什么方案：

```
┌──────────────────────────────────────────────────────────────┐
│                   数据获取三定律                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  定律一：数据在 API 层，不在 DOM 层                           │
│  → 能拦截 API 就不碰 DOM                                     │
│                                                              │
│  定律二：一次性探索用 LLM，重复执行用确定性代码                │
│  → LLM 擅长发现模式，代码擅长重复执行                         │
│  → 先用 LLM 探索生成适配器，之后零 LLM 成本运行               │
│                                                              │
│  定律三：认证在浏览器里，不在代码里                           │
│  → 复用浏览器 Cookie 比管理 token 安全 100 倍                 │
│  → 你的凭证永远不离开浏览器                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

这个框架的核心判断逻辑：

```
                    需要获取网站数据
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        一次性任务     高频重复     需要交互操作
              │           │           │
              ▼           ▼           ▼
        LLM+浏览器    OpenCLI/     浏览器控制
        (Computer    AutoCLI      (browser
         Use)        (确定性)      模式)
              │           │           │
        每次付费      零 LLM 成本    按需付费
        tokens 高      tokens=0     tokens 中
```

## 技术架构深潜

### 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                     OpenCLI / AutoCLI                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   CLI 入口 ──► 注册中心(Registry) ──► Pipeline 引擎     │
│                      │                      │           │
│              ┌───────┼───────┐     ┌────────┼──────┐   │
│              ▼       ▼       ▼     ▼        ▼      ▼   │
│          内置   用户   插件   导航  拦截   映射  输出   │
│         适配器 适配器 适配器  步骤  步骤   步骤  格式化  │
│              │                        │                │
│              └────────┬───────────────┘                │
│                       ▼                                │
│              Browser Bridge / CDP 直连                 │
│                       │                                │
│              ┌────────┴────────┐                       │
│              ▼                 ▼                       │
│        Chrome Extension   Electron Apps               │
│        (复用 Cookie)      (CDP 控制)                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 启动架构差异

**OpenCLI（Node.js）：动态发现 + Fast Path 优化**

```
1. argv 解析 → Fast Path 判断
   version/completion 直接退出，不加载任何模块
2. Dynamic Import → 延迟加载 discovery/cli 模块
3. Promise.all 并行 I/O:
   - 扫描 clis/ 目录加载内置适配器
   - 扫描 ~/.opencli/clis/ 加载用户适配器
   - 加载插件
4. 注册覆盖: user > builtin > plugin
```

关键设计：`globalThis.__opencli_registry__` 保证跨模块单例，npm link 场景下避免多实例冲突。

**AutoCLI（Rust）：编译时嵌入**

```
1. build.rs 编译时扫描 adapters/ 目录
2. YAML 序列化为 Rust 结构体，嵌入二进制
3. 启动时直接从编译产物加载，无需文件系统扫描
4. 运行时仅加载用户自定义适配器
```

这就是为什么 AutoCLI 启动更快——**适配器在编译时已经解析完毕，运行时零解析开销**。

### 浏览器通信层

两个项目都使用 Chrome Extension + Daemon 的架构来复用浏览器登录态：

```
┌─────────────┐     WebSocket      ┌──────────────┐
│  CLI/Binary │ ◄────────────────► │   Daemon     │
│  (Node/Rust)│     端口 19825      │  (持久进程)   │
└─────────────┘                    └──────┬───────┘
                                          │ CDP/Extension
                                          ▼
                                   ┌──────────────┐
                                   │Chrome Extension│
                                   │ (复用 Cookie)  │
                                   └──────────────┘
```

CDP 直连模式则跳过 Extension，直接连 Chrome DevTools Protocol WebSocket，用于控制 Electron 桌面应用。

**OpenCLI 的 CDP 实现**（`src/browser/cdp.ts`）：
- 基于 `ws` 库的 WebSocket 客户端
- 自实现 CDP 协议：消息 ID 计数器 + pending Map + 30s 超时
- 注入 stealth.js 反检测脚本

**AutoCLI 的 CDP 实现**（`crates/autocli-browser/src/cdp.rs`）：
- 基于 `tokio_tungstenite` 的异步 WebSocket
- `AtomicU64` 命令 ID + `RwLock<HashMap>` pending 映射
- `oneshot::channel` 请求-响应匹配，比 Promise 更高效

### Pipeline 执行引擎

两个项目使用**完全相同的 Pipeline 概念**，只是实现语言不同：

```yaml
pipeline:
  - navigate: "https://www.bilibili.com"
  - evaluate: |
      (async () => {
        const res = await fetch('https://api.bilibili.com/x/web-interface/popular', {
          credentials: 'include'
        });
        return (await res.json()).data.list;
      })()
  - map:
      title: "${{ item.title }}"
      author: "${{ item.owner.name }}"
      views: "${{ item.stat.view }}"
  - limit: "${{ args.limit }}"
```

执行流程：
```
数据流: null → [navigate] → [evaluate:JSON] → [map:结构化] → [limit:过滤] → 输出
```

每个步骤接收上一步的输出，产生新的输出，像 Unix pipeline 一样串联。

### 适配器自动生成

这是最精彩的部分——**不需要手动写适配器，AI 自动发现并生成**。

OpenCLI 的 `explore` + `synthesize` 流程：

```
1. explore: 打开页面，自动滚动触发 lazy loading
2. 捕获所有网络请求，分析 JSON 响应体
3. 自动推断：
   - 数据结构（itemPath, detectedFields）
   - 分页参数（pn, ps, offset）
   - 搜索参数
   - 框架类型（Vue/React/Pinia）
4. synthesize: 基于分析结果生成候选 pipeline
5. 验证执行：确保生成的 pipeline 能跑通
```

AutoCLI 更激进，加了 `--ai` 模式：

```
autocli generate https://www.example.com --goal hot --ai
```

这会调用 autocli.ai 的 LLM 服务分析页面，自动生成完整的适配器，甚至支持 Chrome 扩展的可视化选择器——在页面上点选你需要的数据元素，AI 自动补全相关字段。

## OpenCLI vs AutoCLI：该选哪个？

| 维度 | OpenCLI | AutoCLI |
|------|---------|---------|
| **语言** | JavaScript/TypeScript | Rust |
| **Stars** | 16,280 | 2,235 |
| **站点覆盖** | 90+ | 55+ |
| **命令数** | 500+ | 333+ |
| **二进制大小** | ~50MB (node_modules) | 4.7MB |
| **内存占用** | 95-99MB | 9-15MB |
| **bilibili hot** | 20.1s | **1.66s (12x)** |
| **zhihu hot** | 20.5s | **1.77s (11.6x)** |
| **Electron 支持** | 深（Cursor/Codex/Notion 等） | 浅 |
| **AI 云端市场** | 无 | 有 (autocli.ai) |
| **Chrome 可视化选择器** | 无 | 有 (v0.3.2) |

**选择建议**：

- **需要广泛站点覆盖 / Electron 控制 / 快速原型** → OpenCLI
- **追求极致性能 / CI/CD 集成 / 资源受限环境** → AutoCLI
- **AI Agent 集成** → 两者都可以，OpenCLI skills 更成熟，AutoCLI 云端市场有潜力

## 升维思考：从"爬取"到"集成"

OpenCLI 和 AutoCLI 真正的价值不在于"能更快爬数据"，而在于**重新定义了 AI Agent 与 Web 的交互方式**。

在 AI Agent 时代，agent 需要和成百上千个网站交互。传统的做法是每个网站写一套爬虫逻辑，维护成本极高。OpenCLI 的思路是：

```
把每个网站变成一个 CLI 命令 → 所有网站统一成一个接口 → Agent 只需学会一个调用方式
```

这正是 `AGENT.md` 集成的核心思想——在 AI Agent 的配置文件中写入 `autocli list` 或 `opencli list`，agent 就能自动发现所有可用工具，无需为每个网站单独适配。

**这不是爬虫工具的升级，这是 Web 集成范式的切换。**

你在实际落地中用过这类工具吗？遇到过什么坑？欢迎留言讨论。
