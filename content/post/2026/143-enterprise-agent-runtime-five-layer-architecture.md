---
title: "构建企业级Agent Runtime：从Skill到Workspace的五层架构"
subtitle: "Agent 负责规划，Sub-Agent 负责执行，Skill 负责方法，MCP 负责连接，Workspace 负责上下文"
date: 2026-03-16
tags: ["AI", "AI-agents", "architecture", "enterprise", "best-practices", "MCP"]
ingested: 2026-05-04
sha256: 5a8d164e177a7773bb8be06829c92e02834f5fe16d2eb3a6e2fa33b1629d6d2c
---
很多团队对 Agent 的理解还停留在"LLM + Prompt + 几个工具调用"。这种理解能跑通 Demo，但一旦进入企业级场景——多任务并行、多系统集成、多角色协作、安全审计——就会发现：**Agent 系统的核心挑战不是让 LLM 更聪明，而是构建一个可扩展、可治理、可审计的运行时架构。**

Agent 系统本质上在解决五个问题：用户要做什么（Agent）、谁来执行（Sub-Agent）、如何执行（Skill）、从哪里获取数据（MCP）、执行过程的状态存在哪里（Workspace）。这五个问题对应了系统的五个核心层次。

本文将这套架构完整展开。

<!--more-->

## 一句话理解 Agent 架构

在展开细节之前，先用一张表建立全局认知：

| 问题 | 系统组件 |
|------|----------|
| 用户要做什么 | Agent / Orchestrator |
| 谁来执行 | Sub-Agent |
| 如何执行 | Skills |
| 从哪里获取数据 | MCP |
| 执行过程的数据在哪里 | Workspace |

一句话概括：

**Agent 负责规划，Sub-Agent 负责执行，Skill 负责方法，MCP 负责连接，Workspace 负责上下文。**

或者用更直觉的类比：

```
Agent     = 指挥官
Sub-Agent = 执行者
Skill     = 方法
Project   = 知识
Workspace = 运行环境
MCP       = 外部连接
```

## 五层架构总览

系统从上到下分为五个层次：

```
┌──────────────────────────────────┐
│       用户交互层 (Interaction)     │  Chat / API / Webhook / Workflow
├──────────────────────────────────┤
│       任务编排层 (Orchestration)   │  任务解析 → 规划 → 权限检查
├──────────────────────────────────┤
│       能力层 (Capability)         │  Prompt / Skills / Projects
├──────────┬───────────────────────┤
│          │  执行层 (Execution)    │  Sub-Agent / Runtime / Tools
│ Workspace├───────────────────────┤
│          │  连接层 (Connection)   │  MCP → CRM / DB / SaaS / API
└──────────┴───────────────────────┘
```

注意一个关键细节：**Workspace 横跨能力层与执行层**。这不是画图方便，而是架构必然——Skill 需要读写文件，Sub-Agent 需要共享上下文，Runtime 需要运行环境，这些全部落在 Workspace 里。

下面逐层展开。

## 第一层：用户交互层

职责很简单：**接收用户请求，路由到任务编排层。**

典型入口包括：

- **Chat**：对话式交互，最常见的入口
- **API**：程序化调用，适合系统集成
- **Webhook**：事件驱动，外部系统触发
- **Workflow**：流程编排，定时或条件触发

一个典型的用户请求：

```
分析日本手机壳市场趋势，并生成报告
```

这条请求看似简单，但它隐含了数据采集、趋势分析、竞品对比、报告生成等多个子任务。系统接收后进入下一层处理。

## 第二层：任务编排层——Agent 的大脑

这一层是整个系统的决策中枢，负责三件事：

### 1. 任务分解与规划

将复杂的用户请求拆解为可执行的子任务。

```
用户请求：分析日本手机壳市场趋势

拆解结果：
  1. 获取市场数据（搜索 + 爬取）
  2. 分析价格趋势（数据处理）
  3. 分析竞品格局（对比分析）
  4. 生成报告（文档生成）
```

任务拆解的质量直接决定了系统的执行效率。好的拆解应该让每个子任务**独立、可并行、输出明确**。

### 2. 权限与治理

企业场景下，不是所有 Agent 都能访问所有系统、调用所有 Skill。编排层必须在执行前完成权限校验：

- **Agent 可以访问哪些系统？** ——系统级权限
- **哪些 Skill 可以调用？** ——能力级权限
- **哪些数据可以读取？** ——数据级权限

这部分通常由 Policy Engine（策略引擎）、RBAC（角色访问控制）和 Audit Log（审计日志）联合控制。

### 3. 资源调度

根据任务类型和优先级，决定分配哪些 Sub-Agent、使用哪些 Skill、连接哪些外部系统。

## 第三层：能力层——Agent 的技能树

能力层提供 Agent 可调用的三类能力：**Prompt、Skills、Projects**。

### Prompt：即时指令上下文

Prompt 是临时的、与当前任务相关的指令上下文。

```
You are a financial analyst.
Analyze the following dataset and identify key trends.
Focus on year-over-year growth rates.
```

Prompt 的特点是**临时性**——它随任务创建、随任务结束而消失，不持久化。

### Skills：过程知识

Skill 是整个能力层的核心。它描述的是**任务如何执行**——不是"知道什么"，而是"怎么做"。

典型的 Skill 包括：

```
send_dingtalk_message   → 发送钉钉消息
query_order             → 查询订单
generate_report         → 生成报告
search_web              → 搜索网页
analyze_data            → 分析数据
```

Skill 的本质可以用一个公式表达：

```
Skill = Tool + Script + Procedure
```

Skill 的关键特征：

- **输入输出结构化**：每个 Skill 都有明确的参数定义和返回格式
- **可重复调用**：同一个 Skill 可以被不同 Agent、不同任务反复使用
- **行为确定**：给定相同输入，Skill 的执行逻辑是确定的

这是 Skill 与 Prompt 的本质区别：Prompt 是模糊的自然语言指令，Skill 是精确的可执行过程。

### Projects：长期知识库

Projects 为 Agent 提供长期、持久的知识上下文。

它包含：

- **文档**：产品说明、API 文档、操作手册
- **数据**：历史分析结果、基准数据
- **代码**：参考实现、模板代码
- **历史记录**：过往任务的执行日志和结论

如果说 Skill 是"怎么做"，Projects 就是"知道什么"。两者结合，Agent 才具备完整的执行能力。

## Workspace——贯穿全局的运行容器

Workspace 是 Agent Runtime 中最容易被低估、也最关键的组件。

**它不是一个"层"，而是横跨能力层与执行层的运行容器。** 可以理解为：

```
Workspace = Agent 的文件系统 + 上下文容器
```

Workspace 解决四个核心问题：

### 问题一：持久上下文

LLM 本身没有长期记忆，Context Window 有限。当任务涉及大量中间数据时，必须有地方存储。

Workspace 保存任务执行过程中的所有数据：原始输入、中间结果、生成的文件、最终输出。

### 问题二：Agent 协作

多个 Sub-Agent 执行不同子任务时，如何共享信息？答案是通过 Workspace。

```
ResearchAgent → 写入 workspace/research.md
    ↓
DataAgent     → 读取 workspace/research.md，写入 workspace/analysis.json
    ↓
ReportAgent   → 读取 workspace/analysis.json，生成 workspace/report.pdf
```

Workspace 就是 Sub-Agent 之间的**共享文件系统**。

### 问题三：可审计

企业场景要求每一步操作都可追溯。Workspace 天然保留了完整的执行历史——谁写了什么文件、什么时候写的、内容是什么。类似 Git History 的效果。

### 问题四：运行环境

Skill 执行时需要的临时文件、脚本、缓存、配置，都存放在 Workspace 中。

### 推荐目录结构

```
workspace/
├── context/           # 项目上下文
│   ├── project.md     # 项目说明
│   └── knowledge.json # 知识库索引
├── skills/            # Skill 运行时资源
│   ├── analysis.py    # 数据分析脚本
│   └── report_gen.py  # 报告生成脚本
├── memory/            # Agent 状态
│   └── agent_state.json
├── outputs/           # 最终输出
│   └── report.pdf
└── temp/              # 临时文件
    └── scratchpad.md
```

## 第四层：执行层——Sub-Agent 与 Runtime

### Sub-Agent：任务执行单元

Sub-Agent 是编排层分配任务后的实际执行者。每个 Sub-Agent 负责一个独立的子任务。

```
MainAgent（编排层）
├── ResearchAgent      → 负责数据搜集
├── DataAnalysisAgent  → 负责数据分析
└── ReportWriterAgent  → 负责报告生成
```

Sub-Agent 的三个关键特征：

- **独立上下文**：每个 Sub-Agent 有自己的 Context Window，不会相互干扰
- **独立工具**：每个 Sub-Agent 只加载自己需要的 Skill 和 MCP 连接
- **独立任务**：每个 Sub-Agent 只关注自己的子任务

这种隔离设计带来三个好处：**提高并行度、降低上下文复杂度、增强可扩展性**。

### Runtime：执行引擎

Sub-Agent 通过 Runtime 执行具体操作。Runtime 提供实际的计算环境：

- **Shell**：命令行操作
- **Python / Node.js**：脚本执行
- **Docker / VM**：隔离沙箱
- **File System**：文件读写

Runtime 的安全隔离在企业场景中至关重要——Agent 执行的代码必须运行在受控环境中，避免影响宿主系统。

## 第五层：连接层——MCP 统一外部访问

连接层通过 **MCP（Model Context Protocol）** 统一管理所有外部系统访问。

MCP 提供标准化的连接接口：

```
Agent ──→ MCP Server ──→ CRM
                    ──→ 数据库
                    ──→ 企业 SaaS
                    ──→ 内部 API
```

MCP 的核心价值在于**统一抽象**。无论底层是 REST API、GraphQL、数据库查询还是 RPC 调用，Agent 看到的都是标准化的 MCP 工具接口。这让 Agent 不需要关心"怎么连"，只需要关心"连什么"。

一个关键的架构原则：**所有外部系统访问必须通过 MCP**。这不是技术洁癖，而是安全和治理的需要——只有收口到统一的连接层，才能做到统一的权限控制、流量监控和审计日志。

## 完整执行流程

以"分析日本手机壳市场趋势"为例，完整的执行链：

```
用户请求："分析日本手机壳市场趋势，并生成报告"
    ↓
[用户交互层] 接收请求，路由到编排层
    ↓
[任务编排层] 解析意图，拆解为4个子任务
    ↓
[任务编排层] 权限检查：确认 Agent 可访问市场数据源
    ↓
[能力层] 匹配所需 Skills：search_web, analyze_data, generate_report
    ↓
[能力层] 加载 Projects：市场分析模板、历史报告
    ↓
[执行层] 创建3个 Sub-Agent：Research / Analysis / Report
    ↓
[执行层] ResearchAgent 调用 search_web Skill
    ↓
[连接层] MCP 连接市场数据 API，获取原始数据
    ↓
[Workspace] 原始数据写入 workspace/temp/market_data.json
    ↓
[执行层] DataAnalysisAgent 读取数据，执行分析
    ↓
[Workspace] 分析结果写入 workspace/outputs/analysis.json
    ↓
[执行层] ReportAgent 读取分析结果，生成报告
    ↓
[Workspace] 报告写入 workspace/outputs/report.pdf
    ↓
[用户交互层] 返回报告给用户
```

## 架构设计原则

在工程落地时，建议遵循以下五条原则：

### 原则一：Skill 多，Agent 少

一个成熟的 Agent 系统通常只有 10~30 个 Agent，但会有 200+ 个 Skill。

原因很简单：Agent 是昂贵的（每个 Agent 占用一个 LLM 会话），而 Skill 是廉价的（只是一个函数调用）。应该把尽可能多的能力封装为 Skill，而不是创建更多 Agent。

### 原则二：复杂任务必须拆分为 Sub-Agent

当一个任务涉及多个领域、需要不同的工具集、或者上下文过于复杂时，必须拆分为多个 Sub-Agent。

试图让一个 Agent 处理所有事情，结果就是 Context Window 爆炸、工具选择混乱、执行质量下降。

### 原则三：Workspace 是系统核心

所有执行状态必须写入 Workspace。不要依赖 LLM 的上下文记忆来传递中间结果——那既不可靠，也不可审计。

### 原则四：Skill 必须结构化

每个 Skill 必须有清晰的输入参数、输出格式和稳定的行为。模糊的 Skill 定义会导致 LLM 调用出错，这是生产环境中最常见的问题之一。

### 原则五：MCP 是唯一外部入口

所有外部系统访问必须通过 MCP。直接在 Skill 中硬编码外部调用会绕过权限控制和审计，在企业场景中是不可接受的。

## 结语

Agent 系统的本质不是：

```
Chat + Prompt
```

而是：

```
Workspace + Skills + Agents
```

**Agent 系统是一种新的计算操作系统。** 用户交互层是它的 Shell，编排层是它的 Scheduler，能力层是它的系统调用，Workspace 是它的文件系统，MCP 是它的设备驱动。

理解了这一点，才能跳出"给 LLM 加几个工具"的思维，真正构建可扩展、可治理、可审计的企业级 Agent 架构。
