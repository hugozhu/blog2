---
title: "Agent 产物即应用，分享协作即对话"
subtitle: "From Text Output to Living Application — Why Every AI Agent Needs Publish and Feedback"
date: 2026-06-11
tags: ["ai-agent", "collaboration", "feedback-loop", "pwa", "ai-coding", "hermes-agent"]
---

昨天晚上，我在 AI Notepad 里写完一篇技术笔记，点了一下「📢 发布」，3 秒后拿到一个 URL：`https://hugozhu.site/notes/p/a3f8b2c1`。

我把链接丢到钉钉群里。10 分钟后，同事在页面上选中一段话，点「📝 批注」写了句：「这里是不是可以加个 error handling 的例子？」这条批注没有变成一条消息淹没在群聊里——它被存进了数据库，等我对悟空说「看看读者怎么说的」，AI 就把所有批注拉出来，当作下一轮优化的上下文。

这不是一个笔记应用的 feature。这是一种新的协作范式： **Agent 产物即应用，分享协作即对话**。

[![Agent 产物即应用：发布、批注、反馈闭环](/img/2026/agent-output-is-app-thumb.jpg)](/img/2026/agent-output-is-app.png)

<!--more-->

## 一、从「输出」到「应用」的跃迁

大多数 AI Agent 的产物是什么？一段文本。你让它写报告、写代码、写邮件，它给你一串字符，你复制到剪贴板，粘贴到别的地方。Agent 的工作到此结束。

这个模式有一个根本问题： **产物是死的**。

一篇 AI 生成的报告，贴到飞书文档里，同事的评论你看到了，但 AI 看不到。下次你想让 AI 根据反馈修改，你得把评论内容手动复制回来。信息在人与 AI 之间断裂了。

我在 [我写了一行代码，AI 写了剩下 6773 行](https://hugozhu.site/post/2026/264-i-built-an-app-without-writing-a-single-line/) 里描述了「产品驾驶员」的角色——人做决策，AI 做执行。但那篇只讲了单向的创作流程。今天想往前推一步： **决策不应该只来自人，还应该来自协作者的反馈。**

AI Notepad 的发布功能就是为了解决这个问题。一条笔记点了「发布」之后，它不再是一段文本——它变成了一个 **应用**：有自己的 URL、有自己的渲染页面、能接收输入。

```text
┌──────────┐     ┌──────────┐     ┌──────────┐
│  作者     │     │  AI Agent │     │  协作者   │
│          │────▶│  生成内容  │────▶│  阅读批注  │
│          │     │          │     │          │
│  一句话   │◀────│  拉取批注  │◀────│  选中文字  │
│  获取反馈  │     │  注入上下文 │     │  写评论   │
└──────────┘     └──────────┘     └──────────┘
       │                               │
       └──────── 反馈闭环 ──────────────┘
```

协作者的批注不是「评论」——它是 AI 下一轮优化的 **上下文**。这就把单向创作变成了多向对话。

## 二、一天六个功能的开发实录

这个闭环不是设计出来的，是长出来的。6 月 11 日下午开始集中开发，用 Hermes Agent 做编程搭档，到晚上跑通了 6 个功能。下面是实录。

### Token 数显示

最小的改动，但解决了一个真实痛点：笔记多了之后，你想知道哪篇长、哪篇短。每个笔记卡片底部加了 token 估算——CJK-aware 的算法，中文按 1.5 token/字、英文按 0.25 token/字算。大数字自动显示为 K/M 后缀，4767 显示为 ≈4.8K。

### 发布功能

这是核心。选中一条笔记，点「📢 发布」，系统生成 8 位随机 slug，笔记就以独立页面呈现。

技术栈：Supabase Edge Function（Deno）渲染自包含 HTML，Caddy 做反向代理，页面用 marked.js + highlight.js 做客户端 Markdown 渲染。

踩坑记录：

| 问题 | 根因 | 修复 |
|------|------|------|
| Markdown 渲染失败 | marked.js v15 移除了 `setOptions({ highlight })` API | 降级到 v4.3.0 |
| 代码高亮不生效 | highlight.js CDN 路径 `/lib/common.min.js` 不存在 | 换成 cdnjs |
| 页面空白 | CDN 脚本放在 `<head>` 里，加载顺序早于内联 JS | 移到 `<body>` 末尾 |
| 样式全部丢失 | Supabase `--no-verify-jwt` 注入限制性 CSP headers | Caddy 用 `header_down` 覆盖 |

每一个坑都是「看起来应该 work 但实际上不 work」的类型。AI 能快速定位根因——比如 CSP headers 的问题，我描述了「页面渲染了但样式全没」，AI 立刻想到是 CSP 限制，让我查了 Supabase Edge Function 的 response headers。

### 批注系统

这是最有意思的功能，也是最难调的 bug。

页面上的访问者可以选中文本→点击「📝 批注」→输入评论。技术上不复杂：`selectionchange` 监听选区变化，浮现批注按钮，点击后弹出输入框，提交到数据库。

但有一个 bug 让我卡了半小时：点「批注」按钮时，按钮消失了。

根因：点击按钮触发 `mousedown` → 选区被清除 → `selectionchange` 触发 → 检测到选区消失 → 执行 `cleanup()` 把按钮删了。事件触发顺序决定了按钮在你点它的瞬间就不存在了。

修复方式：给批注按钮加 `mousedown` + `preventDefault()`，阻止默认的焦点转移，保持选区存活。这是一个经典的「事件竞态」问题——你在 UI 层面的操作，被底层的 DOM 事件顺序给破坏了。

批注存进数据库后，笔记所有者在用 AI 功能时，系统自动把所有批注注入为「读者反馈」上下文。这是闭环的关键一步。

### 修订历史扩展

之前只有 shared/collaborative 笔记有修订历史，这次扩展到所有笔记。每次保存自动捕获 before/after diff。改动很小（约 25 行代码），因为 `note_revisions` 表和 RLS 策略在 [用 Claude Code 从零构建离线记事本 PWA](https://hugozhu.site/post/2026/119-building-pwa-notepad-with-claude-code/) 时就已经建好了。

### CLI 工具

写了一个 Python 3 CLI，纯 stdlib 无依赖，支持 `ls / get / create / update / delete / search / publish / annotations`。更重要的是创建了 Hermes skill，让 AI Agent 可以自主管理笔记——我对悟空说「发布最新的那篇笔记」或者「看看最近有哪些批注」，它直接调用 CLI 完成。

这就是我在 [对话即编程](https://hugozhu.site/post/2026/246-conversation-as-programming/) 里说的：说清楚，就是编程。你不需要打开浏览器、登录、找到按钮、点击——你只需要一句话。

### 密码重置修复

Supabase 的密码重置邮件链接不生效。根因是 `onAuthStateChange` 没有处理 `PASSWORD_RECOVERY` 事件。加了 recovery 表单和处理逻辑。这种 bug 没有技术难度，但你不知道就不知道。AI 帮我 5 分钟定位并修复。

## 三、AI 搞不定的事

说完效率，也说说边界。

安全扫描器会截断 JWT token——token 太长，超过了扫描器的输出缓冲区。这导致我没法通过工具自动保存 token，只能手动在终端操作。这种基础设施层面的限制，AI 再怎么推理也绕不过去。

这不是 AI 的「能力不足」，而是 **环境的约束**。就像我在 [Loop Engineering](https://hugozhu.site/post/2026/263-loop-engineering/) 里写的，Agent 在人的框架内执行，而这个框架本身有物理限制。Agent 工程的关键不是让 Agent 更强，而是识别哪些边界是 Agent 能突破的、哪些是必须人来处理的。

## 四、「Agent 产物即应用」的设计原则

回过头看这一天的开发，有几个原则浮现出来：

### 原则一：产物必须有地址

AI 生成的内容不应该只存在于对话框里。它需要一个 URL——可以被链接、被分享、被引用。这是从「消息」到「应用」的最小跃迁。

### 原则二：反馈必须结构化

协作者的输入不能是随意的聊天消息。选中文本→批注→存数据库，这个流程把反馈变成了 **结构化的、可被 AI 消费的上下文**。

### 原则三：闭环必须一句话

作者获取反馈的动作必须极简。不是打开后台、筛选评论、复制粘贴——是一句话：「看看读者怎么说的」。在 [对话即编程](https://hugozhu.site/post/2026/246-conversation-as-programming/) 的框架里，这属于意图层：你说意图，AI 编译成操作。

### 原则四：应用必须可进化

发布不是终态。批注注入 AI 上下文后，下一轮生成的内容天然包含了读者反馈。应用在长，不是在修。这和 [Loop Engineering](https://hugozhu.site/post/2026/263-loop-engineering/) 的理念一脉相承——Agent 不是在执行一次性任务，而是在一个持续的循环里迭代。

## 五、和「协作文档」的本质区别

你可能会问：Google Docs、Notion、飞书文档不都有评论功能吗？

有。但那些是 **人-人协作**——A 写文档，B 评论，A 看到评论后自己修改。AI 不在这个循环里。

「Agent 产物即应用」的模式是 **人-AI-人协作**：

```text
传统协作文档：
  人写 → 人评论 → 人改 → 人评论 → 人改...
  （AI 不参与反馈循环）

Agent 产物即应用：
  人决策 → AI 生成 → 发布为应用 → 人批注
     ↑                                  │
     └──── AI 拉取批注，注入上下文 ◀──────┘
  （AI 在反馈循环内部）
```

区别在于：传统模式下，协作者的反馈是给人看的；新模式下，反馈是给 AI 的上下文。人的认知负担从「理解反馈并执行修改」变成了「判断 AI 的修改是否符合意图」。

前者是执行者，后者是决策者。这就是我在上一篇博客里说的「产品驾驶员」。

## 六、明天做什么

- 验证密码重置流程端到端可用
- 看看批注数据质量，考虑加 CAPTCHA 防刷
- 给笔记列表加批注数量 badge

这三个任务都是「验证-观察-迭代」的节奏。不急，不追求功能多，追求闭环跑通。

---

**你在用 AI Agent 生成内容后，是怎么处理协作和反馈的？有没有遇到过「AI 看不到协作者意见」的痛点？欢迎留言讨论。**
