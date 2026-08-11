---
title: "三步上线一个数字员工：开源脚手架背后的交付范式"
subtitle: "From Harness Theory to an Open-Source Scaffold Anyone Can Fork"
date: 2026-07-19
tags: ["digital-workforce", "harness-engineering", "open-source", "dingtalk", "ai-coding", "agent-scaffold"]
ingested: 2026-07-20
sha256: 71d0c2f92e86f50d3017d7133cf08e63bedc2665d61288844662e06616c60167
---

上周一个 FDE 跟我说：「我在客户现场搭一个群聊数字员工，从建账号到调通花了两天。其中一天半在处理断线重连、图片下载、消息去重这些脏活。」

我给他看了 [dingtalk-opencode-tag](https://github.com/hugozhu/dingtalk-opencode-tag)：下载 opencode + 装 dws + 钉钉扫码授权，三步上线。跑在免费模型上，起步成本为零。

他试了一下，十分钟就通了。然后说了一句让我印象很深的话：**「这不只是一个脚手架，这是一种交付范式。」**

他说得对。这个项目的意义不在于它做了什么——文本对话、图片识别、文件解读，这些功能谁都能写。意义在于它 **把生产环境的脏活封装成了可复制的 Harness**，让数字员工的上线门槛从「一周的工程工作」降低到「三分钟的配置」。

<!--more-->

[![数字员工完整生态：能力插件 + 知识库 + 工具 + 学习进化](/img/2026/three-steps-digital-worker-scaffold-thumb.jpg)](/img/2026/three-steps-digital-worker-scaffold-1200.png)

## 为什么需要一个脚手架

在前三篇三部曲中，我讨论了数字员工驱动工作流的战略逻辑：

- [#296](https://hugozhu.site/post/2026/296-model-agent-boundary-data-sovereignty/)：生产型 Agent 的价值在数据主权
- [#297](https://hugozhu.site/post/2026/297-dingtalk-moat-org-graph-collaboration-flywheel/)：组织图谱与协同飞轮是护城河
- [#298](https://hugozhu.site/post/2026/298-digital-native-workflow-turning-point/)：工作流主语从人变成 Agent 是转折点

但战略落地需要载体。FDE 到客户现场，不可能每次都从零搭一个 Agent——那是在做项目，不是在做产品。

我曾在 [用完备的 Harness 工程实现 AI 原生协同](https://hugozhu.site/post/2026/294-harness-engineering-dingtalk-ai-native-workflow/) 中讨论过 Harness 的 7 个组件。但理论到交付之间还有一步： **把 Harness 做成一个可 fork、可扩展、可组装的开源脚手架。**

这就是 `dingtalk-opencode-tag` 的定位——它不是帮开发者写业务，而是提供 **数字员工的开发范式**。

## core/custom 分层：改得动 + merge 得回

这个脚手架最核心的设计决策不是功能，而是 **分层**。

```text
src/
├── core/          ← Harness 核心（不改）
│   ├── event_watcher.py   ← 事件监听主进程（SSE 重连 + 能力分发）
│   ├── capabilities.py    ← 能力注册表（插件框架）
│   ├── inbound.py         ← 消息归一化
│   └── agent_common.py    ← 共享工具
├── custom/        ← FDE 改这里
│   ├── capabilities/      ← 能力插件
│   ├── brain.py           ← 调 opencode serve 生成回复
│   └── replier.py         ← 发回钉钉
config/            ← 填真实值（gitignored）
```

这个分层的设计意图很直接：

| 层 | FDE 改？ | merge 回 upstream |
|---|---------|------------------|
| **core** | ❌ 不改 | ✅ bug fix 贡献回 |
| **custom** | ✅ 在这里改 | ❌ 业务特定 |
| **config** | ✅ 填真实值 | ❌ gitignored |

为什么这很重要？因为它解决了一个生态扩展的根本矛盾：

- **如果不分层**——FDE 在 fork 上改了业务代码，upstream 修复 Bug 时 merge 冲突不断，最终 fork 越走越远，生态无法复用
- **如果分层**——FDE 只在 `custom/` 里加能力插件，`core/` 的 Bug fix 和新功能可以干净 merge 回来。每个 FDE 的业务定制不影响主干的稳定性

**这个设计让数字员工的开发从「一次性项目」变成了「可组合的生态」。** 你在 A 客户做的能力插件，FDE B 可以直接复用——只要它也遵循 `Capability` 的注册契约。

## 六个能力插件：按需组装

`src/custom/capabilities/` 下的每个文件就是一个能力插件，用 `CAP_<NAME>_ENABLED` 开关控制：

| 能力 | 做什么 | 默认 |
|------|--------|------|
| **文本对话** | 群里发消息 → LLM 回复 | 开 |
| **图片识别** | 发图片 → 多模态模型识别 → 基于内容回应 | 开 |
| **文件解读** | 发文档 → 受控下载读正文 → 解读 | 开 |
| **合并转发** | 转发聊天记录 → 反查逐条解析 → 总结 | 开 |
| **Question 交互** | Agent 反问时，群里回复序号作答 | 开 |
| **群消息聚合** | 短时多条消息合并成一次回复 | 关 |

每个能力都是 **受控处理**——Harness 主动下载、识别、注入上下文，不让 Agent 自己乱下东西或执行 shell。这在生产环境里是安全底线。

关键设计： **能力可组装、可选配**。一个只做文本对话的轻量数字员工，和需要处理图片、文件、转发的全功能数字员工，用的是同一套 Harness，只是开关不同。

## 三步上线：从理论到可执行

整个上线流程刻意做到了极简：

### 第 1 步：钉钉授权

```bash
dws auth login --device
dws contact account create --name "数字员工小王"
```

数字员工本质是一个 **企业里的钉钉账号**——有身份、有权限、可审计。这和 [当 Agent 有了工牌](https://hugozhu.site/post/2026/273-claude-tag-dingtalk-agent-iam-architecture/) 中讨论的 Agent IAM 理念一致：Agent 不是匿名 AI，是组织的一员。

### 第 2 步：填配置

```bash
# config/constants.local.sh
AGENT_GROUP_IDS="cid_xxx"
AGENT_SELF_NAMES="数字员工小王"
```

### 第 3 步：上线

```bash
# Linux systemd
bash bin/custom/install-service.sh
systemctl --user enable --now dingtalk-agent
```

`monitor.sh` 负责进程守护——开机自启 + 崩溃自愈。它会自动拉起 opencode serve + 群消息订阅 + 事件监听。

**从扫码到群里收到第一条回复，十分钟。** 这就是我在 [#298](https://hugozhu.site/post/2026/298-digital-native-workflow-turning-point/) 中说的「创建成本趋零」的具体体现——数字员工的供给瓶颈不再是工程能力，而是业务抽象能力。

## 零成本起步：免费模型够用吗

一个容易被忽视的设计决策： **默认全用免费模型，起步成本为零。**

| 用途 | 模型 | 效果 |
|------|------|------|
| 文本对话 | `deepseek-v4-flash-free` | 日常对话够用 |
| 图片识别 | `mimo-v2.5-free` | 能读图里的文字/内容 |

为什么不用更强的付费模型？因为 **入门门槛决定了生态的宽度**。如果一个 FDE 到客户现场还需要先搞定 API key、计费配置、成本审批，那这个脚手架的「三步上线」就名不副实了。

免费模型让 FDE 能 **当场演示**——在客户面前扫码、填配置、发消息、收到回复。这五分钟的现场效果，比任何 PPT 都有说服力。

想换更强的模型？一行配置的事：`AGENT_OPENCODE_MODEL=claude-sonnet-4`。脚手架的模型层是可替换的——这和 [#296](https://hugozhu.site/post/2026/296-model-agent-boundary-data-sovereignty/) 中的判断一致：模型可以换，Harness 不动，企业资产一直都在。

## 100% AI Coding：项目本身就是案例

这个脚手架有一个有趣的特征： **功能全部由 AI 编码完成**。人给方向和验收，AI 探查、实现、测试、提 PR。

这不是噱头，而是架构设计的自然结果。当 `core/custom` 分层清晰、`AGENTS.md` 写好了边界（哪些能改、哪些不能改、约定是什么），Coding Agent 读了就知道怎么改不越界。

加一个新能力的提示词只需要一句话：

> 在 `src/custom/capabilities/` 下新增一个能力：收到含关键词「排班」的群消息时，查考勤 API 并回复本周排班表。参照现有能力写法，声明 Capability 并 register()，加开关，加单测。

Agent 照着现有 6 个能力的范式写代码、写测试、跑验证。 **开发者从「写代码的人」变成了「给方向 + 验收的人」**——这就是 [#298](https://hugozhu.site/post/2026/298-digital-native-workflow-turning-point/) 中讨论的工作流主语迁移的具体实践。

我在 [让钉钉机器人自己开发自己](https://hugozhu.site/post/2026/293-dingtalk-agent-develops-itself/) 中第一次验证了这个模式。这个项目把它从实验变成了工程实践——77 个 commits，全部由 AI 编码。

## 从脚手架到生态飞轮

回到 [#297](https://hugozhu.site/post/2026/297-dingtalk-moat-org-graph-collaboration-flywheel/) 中讨论的生态问题：谁来建这些数字员工？

`dingtalk-opencode-tag` 给出了一个具体的答案：

```text
开源脚手架（降低门槛）
    ↓
FDE 三步上线（快速交付）
    ↓
客户验证（当场演示）
    ↓
FDE 加能力插件（业务定制）
    ↓
好的插件 merge 回 upstream（生态复用）
    ↓
更多 FDE 使用（飞轮启动）
```

core/custom 分层不只是工程纪律——它是 **生态飞轮的机械结构**。每个 FDE 的业务创新，都有机会变成整个生态的共享资产。

这也回应了 [#297](https://hugozhu.site/post/2026/297-dingtalk-moat-org-graph-collaboration-flywheel/) 中「数据主权与共享学习的张力」： **私有知识留在 custom/ 里（不出企业），通用模式沉淀在 core/ 里（生态共享）。** 分层本身就是解法。

## 所以这个脚手架到底在做什么

表面上看，它是一个开源的钉钉数字员工脚手架——让你用免费模型三步上线。

但如果放在三部曲的框架里看：

- 它验证了 **生产型 Agent 不需要强模型** （免费模型 + 好 Harness 就够）
- 它实现了 **Agent 嵌入组织** （通过 dws 连接钉钉身份、群、通讯录）
- 它降低了 **数字员工的创建成本** （从一周到三分钟）
- 它建立了 **生态可复制性** （core/custom 分层 + 能力插件市场）

一句话总结： **这不是一个工具，这是一种交付范式——把 Harness 工程的理论变成了任何人都能 fork 的开源产品。**

你的企业，也许只需要十分钟，就能拥有第一个数字员工。

---

*项目地址：[github.com/hugozhu/dingtalk-opencode-tag](https://github.com/hugozhu/dingtalk-opencode-tag)。欢迎 fork、提 issue、贡献能力插件。*
