---
title: "Claude Tag 的 Agent Identity：为什么这是 Agent 时代的 OAuth"
subtitle: "Agent Identity is the Agent-era OAuth"
date: 2026-06-25
tags: ["ai-agent", "agent-identity", "enterprise-ai", "claude-tag", "dingtalk", "system-design"]
---

上周，一个同事在工作群里 **@了一个 AI Agent**，让它分析最近 30 天的客户退款数据。Agent 查了 CRM、翻了工单、跑了 SQL，两小时后在群里贴出一份报告。

事后审计时，安全团队问了一个问题：

> 「这个操作，日志里记的是谁？」

答案是：那个 **@Agent** 的人。

但实际上，读数据的是 Agent，推理的是 Agent，写报告的是 Agent。人只是说了一句「帮我看看」。

这就是今天几乎所有企业 AI 产品的现状——**Agent 没有身份**。它在借用人的身份做事。

[![Agent Identity：从工具到组织成员](/img/2026/claude-tag-agent-identity-thumb.jpg)](/img/2026/claude-tag-agent-identity.png)

2026 年 6 月 23 日，Anthropic 发布了 Claude Tag——一个运行在 Slack 里的 AI Teammate。表面上看，它是又一个 Slack 集成。但如果你仔细看它的架构设计，会发现一件有意思的事：Anthropic 正在尝试解决一个行业里很少有人正面回答的问题——

> **Agent 到底是谁？**

<!--more-->

## 借用身份的三个坑

今天的企业 AI 产品，无论是 ChatGPT Enterprise、Copilot 还是各种 Agent 框架，底层都遵循同一个模式：

```text
用户登录
  ↓
AI 借用用户权限
  ↓
访问企业系统
```

张三让 AI 帮他改 Jira 任务，Jira 日志写的是「张三修改了任务」。这个模式看起来合理，但会在三个维度上出问题。

**第一，审计断裂。** 日志里看到的是张三的操作，但实际执行者是 AI。出了问题，到底是张三的责任还是 AI 的问题？在金融、医疗、合规要求高的行业，这不是理论问题，是审计员明天就会问的问题。

**第二，权限扩散。** AI 继承了张三的全部权限。张三能看工资单，AI 也能看。张三能审批合同，AI 也能批。但 AI 的判断不一定对，而且它的判断过程是不可解释的。这等于把一个人的全部权限，无差别地给了一个概率性系统。

**第三，协作黑盒。** 李四无法知道 AI 之前帮张三做了什么。每个人都在和自己的 AI 对话，但 AI 之间没有共享记忆，也没有彼此可见的操作历史。组织知识被锁在了 N 个独立的人-AI 对话里。

这三个问题有一个共同的根源： **Agent 没有自己的身份**。

## Agent Identity：不是 IAM 的延伸

有人会问：这不就是权限管理吗？IAM（Identity and Access Management）不是已经解决了几十年了？

我的判断是：传统 IAM 解决的是「 **这个人是谁** 」——OAuth、OpenID、SAML，都是为人类用户设计的协议。Agent Identity 要解决的是「 **这个 Agent 是谁** 」——这是一个全新的问题空间。

区别在哪里？

人类用户：登录 → 操作 → 登出。行为是 session-based 的，权限是 role-based 的。

Agent：持续运行 → 跨会话记忆 → 自主触发 → 独立决策。行为是 **event-driven** 的，权限是 **tool-scoped** 的。

传统 IAM 从未为这种主体设计过。Agent 不是人的代理（proxy），而是一个独立的行为主体——它有自己的记忆、自己的决策链、自己的行为历史。

所以 Agent Identity 至少需要四个传统 IAM 没有的维度：

| 维度 | 传统 IAM | Agent Identity |
|------|----------|---------------|
| **记忆** | 无状态 | 有长期记忆，能解释为什么这样做 |
| **权限粒度** | Role-based | Tool-scoped（读 CRM、读订单、 **不能读工资**） |
| **责任链** | 人 = 操作者 | 人触发 → Agent 执行 → 结果归属 Agent |
| **主动性** | 被动响应 | Event-driven（主动监控、主动报告） |

把这四个维度组合起来，Agent Identity 本质上不是一套权限系统，而是一个 **「数字员工档案」**：

```text
Agent Identity
= Service Account
+ Audit Trail
+ Agent Memory
+ Tool Permissions
+ Responsibility Chain
```

这个定义，我在之前的 [从 Demo 到生产：AI Agent 的系统工程时代](https://hugozhu.site/post/2026/257-agent-demo-to-production/) 中从平台治理角度提过——Agent Identity、Permission、Approval、Trace、Eval、Audit 应该是一级平台能力，不是事后打补丁。Claude Tag 是第一个在 **产品层面 **落地这个理念的系统。

## Claude Tag 做了什么

Claude Tag 的产品演进路径很清晰：

```text
Claude Code（编程 Agent）
    ↓
Claude Cowork（协作 Agent）
    ↓
Claude Tag（组织成员 Agent）
```

如果说 Claude Code 是「帮人写代码的工具」，Cowork 是「和人一起工作的助手」，那 Tag 的定位是「 **组织里的一个成员** 」。

Anthropic 官方描述说得很直白：

> Claude acts under its own identity in your systems. Claude has its own account, not a borrowed login.

这意味着在 Slack、Jira、GitHub、Gmail 这些系统里，会出现一个 `claude@company` 的身份。和 `alice@company`、`bob@company` 并列。

Tag 的四个设计选择值得关注：

**一、Agent 成为原生成员。** 在 Slack 的组织结构里，Claude 和 Alice、Bob 是同级概念——都是 workspace member。不是 Alice 下面的一个 bot，也不是 Bob 的一个 plugin。

**二、跨线程记忆（Channel Memory）。** Tag 能记住周一讨论的内容、周三的决策、当前负责人、历史结论。不用每次重新解释背景。这实际上把 Slack 的聊天记录变成了 **组织记忆层**——可搜索、可推理、可复用。

**三、长任务执行。** 官方描述是「runs tasks that take days」。一个跨 CRM、工单、财务、邮件的多天分析任务，Tag 能自主拆解、分步执行、定期汇报。

**四、Event-Driven 能力。** Tag 不只是被动回答 @它的问题。它可以持续监控一个频道，发现 P0 故障、新告警、长时间未解决的问题， **主动 **提醒负责人。

第三和第四点合在一起，意味着范式从：

```text
AI = Prompt Driven（被动响应）
```

变成了：

```text
AI = Event Driven（主动感知和行动）
```

这是一个根本性的变化。当 Agent 能主动做事时，它就不再是一个「被提问的工具」，而是一个「参与工作的同事」。

## Agent Identity 是 Agent 时代的 OAuth

回头看互联网的历史，有一个有趣的平行。

互联网时代的核心问题是： **这个人是谁？** 围绕这个问题，诞生了 OAuth、OpenID、SAML 等身份协议。没有这些标准，就没有现代互联网的登录、授权、跨平台协作。

Agent 时代新增了一个问题： **这个 Agent 是谁？**

当 Agent 开始自主读取数据、修改记录、触发工作流、生成报告时，系统必须知道：这个操作是哪个 Agent 做的？它有什么权限？谁对它负责？出了事怎么追溯？

Claude Tag 的 Agent Identity 设计，是目前我看到最接近「 **回答这个问题** 」的产品实践。

当然，这里有一个重要的区分：OAuth 是开放标准，而 Claude Tag 的 Agent Identity 目前是 Anthropic 的产品特性，不是开放协议。我说的「Agent 时代的 OAuth」，指的是它 **定义了问题空间**，而不是说它就是最终的标准答案。真正的 Agent Identity 开放协议可能会出现，也可能不会出现——但这个问题本身已经被正面提出来了。

从 Anthropic 的产品栈看，他们正在构建一个完整的 Agent OS：

```text
┌─────────────────────────┐
│      Claude Tag         │  ← 用户入口（组织成员）
├─────────────────────────┤
│     Claude Runtime      │  ← 推理引擎
├─────────────────────────┤
│    MCP Connectors       │  ← 系统连接
├─────────────────────────┤
│        Skills           │  ← 能力封装
├─────────────────────────┤
│       Plugins           │  ← 应用包
└─────────────────────────┘
```

其中，Skills 是 SOP / Workflow / Expert Prompt 的封装；Plugins 是包含 MCP、Skills、Sub Agent、Slash Commands 的企业应用包。而 **Agent Identity 是把所有层串起来的黏合剂**——没有身份，Skills 不知道谁在执行，MCP 不知道以什么权限连接，Runtime 不知道行为归属。

## 对钉钉和悟空的启示

如果把这个思路映射到钉钉生态，会发现钉钉实际上有一个 **结构性优势**：

Slack 只有 IM。Claude Tag 要访问 CRM、Jira、财务系统，需要通过 MCP 连接外部系统。

钉钉本身已经有：

- IM（消息）
- OA（审批）
- AI 表格（结构化数据）
- 工作流（流程引擎）
- 通讯录（组织身份）
- 日志 / 周报（工作记录）

这意味着在钉钉生态里，一个「悟空 Agent」天然运行在更完整的企业上下文中——不只是消息上下文，还有审批上下文、流程上下文、数据上下文。这一点我在 [AI to B 的最后一公里](https://hugozhu.site/post/2026/269-ai-to-b-last-mile-infrastructure/) 中详细讨论过：没有结构化的数据和标准化的接口，再强的模型也只能「能聊，不能干」。

那么，如果给悟空 Agent 加上 Agent Identity，它应该是什么样子？

**通讯录中的正式成员。** 不是「群机器人」（本质是 Webhook），而是在企业通讯录里有自己的条目：

```text
名称：运营 Agent
部门：运营部
类型：Agent
ID：agent://ops-analysis
权限：读 CRM ✓  读 AI 表格 ✓  读工资 ✗  写审批 ✗
```

**自带审计日志。** 每一次操作，系统记录的不是「Hugo 读取了 CRM」，而是：

```text
Operator: Hugo（触发者）
Executor: 运营Agent（执行者）
Data Source: CRM（数据来源）
Action: 查询最近 30 天退款数据（操作描述）
Result: Report#123（结果引用）
Timestamp: 2026-06-25T14:30:00+08:00
```

**跨会话组织记忆。** 和 Claude Tag 的 Channel Memory 类似，悟空 Agent 能记住这个群上周讨论了什么、做了什么决策、哪些任务还没完成。不同之处在于——钉钉群里的上下文天然比 Slack 更丰富，因为它连着审批流、表格数据、日志。

**主动巡检能力。** Event-Driven 在钉钉场景下更有想象力：

```text
@运营Agent

每天早上 9 点检查退款率
超过阈值自动在群里发预警
每周五自动生成本周运营报告
```

不需要人每天 @它。它自己在跑。

我在 [当 AI Agent 被拉进多个群](https://hugozhu.site/post/2026/140-agent-session-isolation-multi-group-security/) 中讨论过，不同的群应该使用不同的 Agent 实例——不同的行为准则（SOUL.md）、不同的 Workspace、不同的记忆空间。这其实就是 Agent Identity 在隔离层面的具体实现： **每个 Agent 实例都有自己的身份边界**。

## 从工具到员工的组织跃迁

当 Agent 有了身份，一个更深层的问题浮现了： **Agent 在组织架构中的位置是什么？**

如果 Agent 是正式编制——和销售、运营、客服并列——那组织本身需要重新设计。这正是我在 [把组织当成产品来打造](https://hugozhu.site/post/2026/173-ai-native-org-mvp-design/) 中试图回答的问题：组织的「用户」不只是人类员工，还包括 AI Agent。角色不再是固定的「岗位」，而是可组合的「能力包」——由人和 Agent 共同承担。

Claude Tag 实际上在产品层面验证了这个判断：Agent 不是被嵌入了一个聊天窗口的插件，而是工作发生的地方的一个 **成员**。

从 SaaS 演进的角度看：

```text
SaaS 1.0  = 系统记录工作（ERP、CRM、OA）
SaaS 2.0  = 系统自动化工作（RPA、Workflow）
Agent 1.0 = Agent 参与工作（Copilot、Chat Agent）
Agent 2.0 = Agent 成为组织成员（Claude Tag）
```

每一次跃迁，本质上都是系统在组织中扮演的角色在升级。Agent 2.0 的标志不是 Agent 变聪明了，而是 **Agent 有了身份**。

---

## 写在最后

很多人在讨论 Agent 时代的基础设施时，关注的是 MCP、A2A、Skills、Plugins——这些解决的都是「Agent 能干什么」。

但 Claude Tag 提醒我们，有一个更根本的问题需要先回答：

> **Agent 是谁？**

没有 Identity，Agent = 工具。有了 Identity，Agent = 员工。

这是两个时代。

而 Agent Identity 这件事，很可能像当年的 OAuth 一样，成为 Agent 时代的基础协议层。区别在于——OAuth 定义了「这个人是谁」的标准，Agent Identity 要定义「这个 Agent 是谁」的标准。Anthropic 迈出了产品化的第一步，但开放协议的故事才刚刚开始。

对你的企业 AI 平台来说，真正值得思考的不是「怎么让 Agent 更聪明」，而是——

> **你的系统，准备好管理两类主体了吗？**

---

*你对 Agent Identity 有什么看法？你的企业 AI 系统是怎么处理 Agent 身份和审计的？欢迎留言讨论。*
