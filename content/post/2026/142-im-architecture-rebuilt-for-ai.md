---
title: "为 AI 重建的 IM 架构"
subtitle: "从传递消息到管理意图——当 Agent 成为 IM 的一等公民，通信协议需要被重新设计"
date: 2026-03-15
tags: ["AI", "AI-agents", "IM", "architecture", "security", "enterprise", "best-practices"]
ingested: 2026-05-04
sha256: fd31f4c761f84cadc855c0b29d4ef69f99a60513c00aa1235ec9e237f5025a84
---
传统 IM（即时通讯）解决的是一个简单的问题：**让人和人高效地交换信息**。文本、图片、文件、语音——三十年来，IM 的核心架构围绕着"谁说了什么"展开，安全靠端到端加密，权限靠静态角色控制，审计靠消息日志。这套体系服务了几十亿用户，足够成熟。

但当 AI Agent 成为 IM 中的活跃参与者——不仅接收消息，还理解意图、调用工具、执行任务、产生后果——传统 IM 的架构假设就被从根本上打破了。**IM 不再只是信息传递的通道，而是 Agent 协作与执行的操作系统。**

这需要一种全新的 IM 架构。

<!--more-->

## 传统 IM 的四个假设，正在被 AI 打破

传统 IM 的架构基于四个核心假设。这些假设在人与人通信的场景下完全合理，但在 Agent 参与的场景下每一条都不再成立。

### 假设一：消息就是文本

传统 IM 的消息单元是**文本、图片、文件**——本质上是**信息的载体**。接收方（人）自行解读消息的含义，决定是否行动、如何行动。

但 Agent 收到的消息不只是信息，而是**可能触发执行的指令**。一条看似普通的消息："帮我把这份合同发给张总"，对人来说只是一个请求，但对 Agent 来说是一个需要执行的操作链——找到合同文件、确认张总的联系方式、发送消息。

**消息变成了意图（Intent），意图会触发行动（Action），行动会产生后果（Consequence）。** 传统 IM 只需要确保消息被正确传递，而 AI 原生的 IM 需要管理从意图到后果的整个链条。

### 假设二：身份就是账号

传统 IM 的身份验证很简单——你用手机号或邮箱注册一个账号，系统验证你是你。身份 = 认证。

Agent 的身份远比这复杂。一个 Agent 不仅需要证明"我是谁"，还需要证明"我能做什么"。两个同样叫"AI 助手"的 Agent，一个可以读写文件、执行代码，另一个只能回答问题——它们的身份维度完全不同。

**Agent 的身份 = 认证 + 能力声明 + 信任链。** IM 架构需要理解这种更丰富的身份模型。

### 假设三：权限是静态的

传统 IM 的权限模型是 RBAC（基于角色的访问控制）——管理员、普通成员、访客，角色一旦分配就很少变化。这够用，因为人的行为模式相对稳定。

但 Agent 的权限需求是**动态的、任务级的**。同一个 Agent 在"写周报"任务中只需要读取日历和邮件，在"部署代码"任务中需要执行 shell 命令和访问 Git——权限随任务变化。更重要的是，不同会话中 Agent 的权限应该是隔离的——在 A 群里被授权的能力，不应该自动延伸到 B 群。

### 假设四：审计就是记录谁说了什么

传统 IM 的审计日志记录的是消息本身——谁在什么时间发了什么内容。这对合规已经足够了。

但当 Agent 参与对话时，一条消息可能触发了文件修改、API 调用、数据库操作、甚至向其他群发送了消息。**只记录"谁说了什么"远远不够——还需要记录"为什么说、触发了什么动作、产生了什么后果"。**

## AI 原生 IM 架构的四个维度

基于以上分析，为 AI 重建的 IM 架构需要在四个维度上进行根本性的重新设计：

| 维度 | 传统 IM | AI 原生 IM |
|------|---------|-----------|
| 消息单元 | 文本 / 文件 | **结构化意图 + 执行上下文 + 权限声明** |
| 身份验证 | 人的账号 | **Agent 身份 + 能力证明 + 信任链** |
| 权限模型 | RBAC 静态角色 | **动态能力授权 + 任务级隔离** |
| 审计粒度 | 谁发了什么 | **为什么发、触发了什么、产生了什么后果** |

让我逐一展开。

### 维度一：消息单元——从文本到结构化意图

在 AI 原生的 IM 中，一条"消息"不再只是一段文字，而是一个包含多层信息的**结构化对象**：

```
传统 IM 消息:
{
  "from": "user123",
  "to": "group456",
  "content": "帮我查一下上个月的销售数据",
  "timestamp": "2026-03-15T10:00:00Z"
}

AI 原生 IM 消息:
{
  "from": "user123",
  "to": "agent:sales-assistant",
  "intent": {
    "action": "query_sales_data",
    "parameters": { "period": "last_month" },
    "urgency": "normal"
  },
  "context": {
    "session_id": "sess_abc123",
    "conversation_id": "conv_group456",
    "prior_context_hash": "sha256:...",
    "data_classification": "internal"
  },
  "permissions": {
    "granted": ["read:sales_database", "read:crm"],
    "denied": ["write:*", "execute:*", "network:external"],
    "scope": "this_task_only",
    "expires": "2026-03-15T11:00:00Z"
  },
  "audit": {
    "triggered_by": "user_explicit_request",
    "approval_required": false
  }
}
```

这不只是格式上的丰富——它从根本上改变了消息的语义。每条消息自带：

- **执行上下文**：Agent 知道自己在什么场景下工作（哪个群、哪个任务、数据什么密级）
- **权限声明**：Agent 被明确告知可以做什么、不可以做什么
- **审计元数据**：系统知道这个请求为什么被发起、是否需要审批

**消息即合约。** 发送方通过消息声明意图和授权范围，接收方（Agent）在授权范围内执行，审计系统记录全过程。

### 维度二：身份验证——从账号到能力证明

在传统 IM 中，身份验证回答的是一个简单问题："你是谁？" 在 AI 原生 IM 中，身份验证需要回答三个问题：

```
1. 你是谁？      → Agent 身份认证
2. 你能做什么？   → 能力证明 (Capabilities)
3. 谁信任你？     → 信任链 (Trust Chain)
```

**Agent 身份**不只是一个 ID，而是一个包含能力声明的身份证明：

```
Agent 身份证明:
{
  "agent_id": "sales-assistant-v2",
  "provider": "openclaw",
  "capabilities": [
    "read:sales_database",
    "read:crm",
    "write:reports",
    "tool:search"
  ],
  "constraints": [
    "no_external_network",
    "no_code_execution",
    "memory_isolation:per_session"
  ],
  "trust_chain": [
    { "issuer": "admin@company.com", "granted": "2026-01-01", "scope": "sales_data_read" },
    { "issuer": "security@company.com", "granted": "2026-02-15", "scope": "crm_read" }
  ],
  "model": "qwen3-plus",
  "sandbox": "level3"
}
```

当这个 Agent 加入一个群聊时，IM 系统可以：

1. 验证 Agent 的身份是否合法
2. 检查 Agent 是否具备该群所需的能力
3. 追溯 Agent 的能力是由谁在什么时候授予的
4. 向群成员展示 Agent 的能力边界（"这个 Agent 可以查看销售数据，但不能执行代码"）

这就像人类世界中的职业资格证——不仅证明你是你，还证明你有能力做什么、谁为你背书。

### 维度三：权限模型——从静态角色到动态能力

传统 IM 的权限模型：

```
角色: 管理员
  → 可以做所有事（永久有效）

角色: 普通成员
  → 可以发消息、查看历史（永久有效）

角色: 访客
  → 只能查看消息（永久有效）
```

AI 原生 IM 的权限模型：

```
任务: 查询销售数据
  → 临时授予 read:sales_database
  → 范围: 仅限当前会话
  → 有效期: 1 小时
  → 审批: 不需要

任务: 修改客户信息
  → 临时授予 write:crm
  → 范围: 仅限指定客户 ID
  → 有效期: 单次操作
  → 审批: 需要主管确认

任务: 部署代码
  → 临时授予 execute:deploy_script
  → 范围: 仅限 staging 环境
  → 有效期: 本次部署
  → 审批: 需要 DevOps 团队确认
```

关键差异在于**权限的四个属性**：

- **临时性**：权限按需授予，任务完成即收回
- **范围性**：权限绑定到具体的资源和操作，不是全局的
- **时效性**：权限有明确的过期时间
- **可审批性**：高风险操作需要人类审批才能执行

在[之前的文章](/post/2026/140-agent-session-isolation-multi-group-security/)中，我详细讨论了 OpenClaw 如何通过 Bindings 机制实现不同群路由到不同 Agent 实例。这本质上就是动态能力授权的一种实现——不同的群（不同的信任级别）映射到不同的 Agent（不同的能力集合）。

```json
{
  "bindings": [
    {
      "agentId": "internal-full",
      "match": { "peer": { "kind": "group", "id": "cid_core_team" } }
    },
    {
      "agentId": "external-readonly",
      "match": { "peer": { "kind": "group", "id": "*" } }
    }
  ]
}
```

`internal-full` Agent 有完整能力，`external-readonly` Agent 只有只读能力。**权限不是附加在 Agent 上的标签，而是通过不同的 Agent 实例来体现的。** 不同能力 = 不同 Agent = 不同 Workspace = 物理隔离。

### 维度四：审计——从消息日志到因果链

传统 IM 的审计日志：

```
[10:00:01] user123 → group456: "帮我查一下上个月的销售数据"
[10:00:05] agent → group456: "上个月销售总额为 1,234 万元..."
```

这告诉你发生了什么，但没有告诉你**为什么**发生、**怎么**发生、**产生了什么影响**。

AI 原生 IM 的审计日志应该是一条**因果链**：

```
[审计事件 evt_001]
  触发: user123 在 group456 发送消息
  意图: 查询销售数据 (action=query_sales_data, period=last_month)
  Agent: sales-assistant-v2
  权限检查: ✓ read:sales_database (granted by admin@company.com)
  执行:
    - [10:00:02] 连接 sales_database (host=db.internal:5432)
    - [10:00:03] 执行查询: SELECT SUM(amount) FROM sales WHERE month='2026-02'
    - [10:00:03] 查询结果: 12,340,000
  输出: 向 group456 发送消息 "上个月销售总额为 1,234 万元..."
  数据分类: internal (未包含个人数据)
  风险评估: 低 (只读操作，无外部网络访问)
  耗时: 4 秒
```

这条审计记录回答了所有关键问题：

- **谁发起的？** user123
- **为什么？** 用户显式请求查询销售数据
- **谁执行的？** sales-assistant-v2 Agent
- **有没有权限？** 有，read:sales_database 由管理员授予
- **具体做了什么？** 连接数据库，执行了一条 SQL 查询
- **结果是什么？** 返回了销售总额
- **有没有风险？** 低风险，只读操作

在合规审计时，这种级别的审计日志可以精确回答"AI 做了什么"的问题。而且不仅仅是事后追溯——审计系统可以**实时监控**因果链，在高风险操作执行前拦截并要求人类审批。

## AI 原生 IM 的核心价值

### 安全天生内建（Security by Design）

传统 IM 的安全是**附加的**——先设计通信协议，再加上加密、权限、审计。这导致安全措施总是在"打补丁"。

AI 原生 IM 的安全是**内建的**——权限声明在消息层面就被定义，身份验证包含能力证明，审计覆盖从意图到后果的完整链条。**安全不是 IM 的附加功能，而是通信协议本身的一部分。**

```
传统 IM:
  消息 → 传输 → 接收 → （附加安全检查）

AI 原生 IM:
  意图 + 权限声明 → 安全验证 → 受控执行 → 审计记录
  （安全嵌入每一步）
```

这就像[上一篇文章](/post/2026/139-enterprise-agent-runtime-sandbox-security/)中讨论的操作系统级沙箱——安全不是在应用层做检查，而是在内核层强制执行。AI 原生 IM 把这个理念延伸到通信层：安全不是在 Agent 应用层做检查，而是在消息协议层就被约束。

### 协作即执行（Collaboration as Execution）

传统 IM 中，通信和执行是分离的——人在 IM 里讨论决策，然后去另一个系统执行操作。

AI 原生 IM 中，**通信就是执行**。一条消息不只是传递信息，它本身就能触发 Agent 的行动。IM 不再只是"聊天工具"，而是 Agent 协作和业务执行的总线。

```
传统工作流:
  IM 讨论 → 打开浏览器 → 登录系统 → 执行操作 → 回到 IM 汇报

AI 原生工作流:
  IM 中发送意图 → Agent 在 IM 内执行 → 结果在 IM 中返回
  （一切发生在同一个平面）
```

OpenClaw 的钉钉集成就是这个理念的体现——用户在钉钉群里发一条消息，Agent 在后台执行搜索、写代码、查数据、生成报告，结果直接以 AI Card 的形式流式返回到群里。**IM 就是操作界面。**

### 决策可审计（Auditable Decisions）

每一步操作、每个 Agent 的能力使用都有完整记录，形成可回溯、可分析的决策链。

这对企业的价值是巨大的：

- **合规**：监管部门要求证明"AI 做了什么决策"时，可以精确回答
- **复盘**：当 Agent 的行为出现问题时，可以从因果链中找到根因
- **优化**：通过分析审计数据，发现哪些 Agent 最有效、哪些工作流可以改进
- **责任**：明确每个 Agent 的行为可以追溯到谁授权、谁批准

## 架构实现：从理论到实践

理论说完了，如何在实际系统中落地？以 OpenClaw 接入钉钉的架构为例，看看 AI 原生 IM 的四个维度是如何实现的。

### 消息层：SessionContext

每条消息进入系统时，IM 插件会构建一个结构化的 SessionContext：

```typescript
interface SessionContext {
  channel: 'dingtalk-connector';    // 消息来源通道
  accountId: string;                // 账号标识
  chatType: 'direct' | 'group';    // 会话类型
  peerId: string;                   // 会话唯一标识
  conversationId?: string;          // 群会话 ID
  senderName?: string;              // 发送者名称
  groupSubject?: string;            // 群名称
}
```

这个 Context 携带了消息的完整来源信息，用于后续的路由、隔离和审计。

### 路由层：Bindings

基于 SessionContext，Bindings 机制将消息路由到正确的 Agent 实例：

```
消息来源              路由规则                  目标 Agent
────────             ────────                  ──────────
核心团队群     →   peer.id = cid_core    →   internal (完整能力)
合作伙伴群     →   peer.id = cid_partner →   partner (受限能力)
其他任何群     →   peer.id = *           →   public (只读能力)
所有私聊       →   peer.kind = direct    →   internal (完整能力)
```

### 隔离层：Session + Agent + Sandbox

三层隔离同时工作：

```
第一层 (会话隔离):
  separateSessionByConversation: true
  → 每个群有独立的对话历史

第二层 (记忆隔离):
  sharedMemoryAcrossConversations: false
  → 每个群有独立的 MEMORY.md

第三层 (Agent 隔离):
  不同群路由到不同 Agent 实例
  → 独立的 Workspace、工具权限、模型

第四层 (沙箱隔离):
  Agent 的命令执行在 OS 级沙箱中
  → 文件系统限制 + 网络限制
```

### 审计层：全链路日志

从消息接收到 Agent 执行再到结果返回，每一步都有日志：

```
[Session] context={"channel":"dingtalk-connector","chatType":"group",
  "peerId":"cid_core","senderName":"张三"}
[Bindings] 匹配: peer.kind=group, peer.id=cid_core → agentId=internal
[Gateway] 请求: agent=internal, session=sess_abc123
[Agent] 工具调用: search_database(query="上月销售数据")
[Agent] 结果: 12,340,000
[Response] 流式返回到群 cid_core
```

## 与传统 IM 安全模型的根本区别

让我做一个更完整的对比，帮助理解"为 AI 重建"到底意味着什么：

```
传统 IM 安全                          AI 原生 IM 安全
═══════════════                      ═══════════════

端到端加密                            端到端加密
  防止第三方窃听                         + 执行过程中的数据隔离

静态 RBAC 角色                        动态能力授权
  管理员/成员/访客                       + 任务级权限 + 时效性 + 可审批

消息级审计                            因果链审计
  谁在何时发了什么                       + 触发了什么、执行了什么、结果是什么

用户认证                              Agent 身份 + 能力证明
  手机号/邮箱验证                        + 能力声明 + 信任链 + 沙箱级别

群级权限                              会话级 + Agent级 + 任务级隔离
  群内所有人同等权限                      + 不同群不同 Agent 不同能力

无执行上下文                           结构化执行上下文
  消息就是消息                           + 意图、数据分级、权限范围
```

**核心区别用一句话概括：传统 IM 管理的是"谁能看到什么信息"，AI 原生 IM 管理的是"谁能让 Agent 做什么事"。**

前者是信息访问控制，后者是能力执行控制。这是一个维度上的跃迁。

## 结论

**为 AI 重建的 IM 架构，本质上是把 IM 从"信息传递通道"升级为"Agent 协作与执行的操作系统"。**

这个升级涉及四个维度的根本重构：

1. **消息单元**：从文本升级为结构化意图 + 执行上下文 + 权限声明
2. **身份验证**：从账号认证升级为 Agent 身份 + 能力证明 + 信任链
3. **权限模型**：从静态 RBAC 升级为动态能力授权 + 任务级隔离
4. **审计粒度**：从"谁说了什么"升级为"为什么、做了什么、后果是什么"

这不是在传统 IM 上打补丁。当 AI Agent 成为 IM 中的一等公民，通信协议的核心假设发生了根本变化——**IM 传递的不再只是信息，而是意图、能力与执行的安全管理。**

企业如果只是在现有 IM 上"接入一个 AI 机器人"，那只是在旧瓶里装新酒。**真正的 AI 原生 IM，是从通信协议层就为 Agent 的安全协作而设计。** 安全天生内建，协作即是执行，决策全程可审计——这才是 AI 时代 IM 架构该有的样子。
