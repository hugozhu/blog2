---
title: "两个 Agent 的钉钉对话：异构多 Agent 协作的消息总线模式"
subtitle: "Heterogeneous multi-agent orchestration through messaging platforms — why we skipped CrewAI and used DingTalk"
date: 2026-07-08
tags: ["multi-agent", "dingtalk", "opencode", "hermes-agent", "system-design", "ai-agent", "message-bus", "orchestration"]
---

我的桌面上常年跑着两个 Agent。

一个是 OpenCode，配了 GLM 5.2，专职写代码。它的 Server API 挂在远端机器上，通过 HTTP Basic Auth 暴露端点，我可以在任何地方给它发任务。另一个是 Hermes Agent，配了 Qwen 3.7 Max，管我的知识库、笔记、博客——它认识我写的每一篇文章，记得我的每一个偏好。

它们不在同一台机器上，不用同一个框架，甚至不知道对方的「进程」在哪里。但它们每天都在钉钉上协作——有时候单聊发任务，有时候在群里 @ 对方。

上个月我让 Hermes 写一篇关于 Harness 工程的博客。它从知识库里检索素材、搭好大纲、写好正文，但缺一段能跑的 Python 示例代码。Hermes 没有犹豫，直接在钉钉群里 @ OpenCode：「帮我写一个 Agent 反馈循环的 Python 实现，要求用 dataclass + Protocol，带类型注解。」OpenCode 花了 40 秒生成代码，跑通了测试，把结果贴回群里。Hermes 拿到代码，整合进文章，发布。

整个过程，我没有切过一次窗口。

<!--more-->

[![异构 Agent 消息总线协作架构：OpenCode 和 Hermes 通过钉钉消息平台实现异步协作](/img/2026/heterogeneous-multi-agent-message-bus-thumb.jpg)](/img/2026/heterogeneous-multi-agent-message-bus.png)

## 多 Agent 编排的隐藏假设

2025 年，我写过 [API、MCP 和 Skills 的本质区别](https://hugozhu.site/post/2025/109-api-mcp-skills-explained/)，厘清了单 Agent 与外部工具交互的三种模式。也写过 [Agent Loop 的自我修正机制](https://hugozhu.site/post/2025/113-claude-code-auto-correction-agent-loop/)，讲单个 Agent 怎么通过反馈循环变得可靠。在 [图灵完备的 Agent](https://hugozhu.site/post/2026/288-turing-complete-agent-engineer-deliverable/) 里，我论证了 Agent 正在成为工程师的新交付物。

但所有这些文章都有一个共同的边界： **它们讨论的是单个 Agent**。

当你有了多个 Agent，问题就变了。

翻开 CrewAI、LangGraph、AutoGen 的文档，你会发现一个隐藏假设： **Agent 是同构的**。它们生活在同一个 runtime 里，由同一个调度器分配任务，用同一种进程内通信方式交换信息。CrewAI 给每个 Agent 分配一个 role，LangGraph 用有向图编排节点，AutoGen 让 Agent 在同一个对话流里轮流发言。

这在 Demo 里很漂亮。但在真实生产环境里，Agent 天然是异构的。

想想你公司的 Agent 生态：

- 代码 Agent 可能是 Claude Code 或 OpenCode，跑在 GPU 机器上
- 知识 Agent 可能是 Hermes 或自建 RAG，挂载在向量数据库旁边
- 数据分析 Agent 可能是一个 Jupyter + GPT-4 的组合
- 运维 Agent 可能是一个接了 Prometheus 告警的自治脚本

它们由不同团队构建，用不同模型驱动，部署在不同基础设施上，有各自独立的生命周期。你不可能把它们塞进同一个 CrewAI Crew 里。

这就是本文的核心主张： **异构 Agent 的协作，不应该靠「统一框架」，而应该靠「消息平台」。**

## 四种编排模式的适用边界

在深入消息总线之前，先拉齐一个认知：多 Agent 编排不是只有一种模式。

| 模式 | 结构 | 适用场景 | 局限 |
|------|------|----------|------|
| **管道式（Pipeline）** | A → B → C，单向传递 | 固定流程（ETL、审批链） | 无法回退、无法协商 |
| **广播式（Broadcast）** | 调度器 → [A, B, C]，并行收集 | Map-Reduce 型任务 | Agent 之间不通信 |
| **协商式（Negotiation）** | A ↔ B，多轮对话直到收敛 | 需要反馈和修正的任务 | 需要共享状态 |
| **消息总线（Message Bus）** | A ↔ Bus ↔ B，异步解耦 | 异构 Agent 长期协作 | 需要消息持久化和路由 |

[构建订单文档分类器](https://hugozhu.site/post/2025/111-order-document-classifier-agent-routing/) 里的 Agent Router 本质上是管道式——分类器把任务分发给专业 Agent，单向、不回头。这在明确流程的场景下足够好。

但我和 OpenCode、Hermes 的协作不是管道。Hermes 可能需要 OpenCode 修改三次代码才满意；OpenCode 可能需要 Hermes 补充项目背景才能写对；我可能在中间插一句「别用 async，改成同步的」。这是 **协商**，而且协商的双方是异构的。

消息总线模式就是为这种场景设计的。

## 消息总线模式：把 Agent 当员工

我的核心类比很简单： **Agent 就是员工，消息平台就是他们的办公工具。**

你不会要求公司里所有员工坐在同一张桌子旁边工作。你有远程的、有在办公室的、有在不同时区的。他们协作靠什么？靠 Slack、靠钉钉、靠飞书——靠一个可靠的、异步的、可审计的沟通渠道。

消息平台做 Agent 编排总线，有四个天然优势：

**1. 异步解耦。** Agent A 发完消息就可以去做别的事，不需要阻塞等 Agent B 回复。这对长时间运行的 Agent 任务（比如生成代码、跑测试）尤其重要。

**2. 持久化 + 可审计。** 每条消息都有记录，出了问题可以回溯。不像进程内调用，消息丢了就没了。

**3. 人可介入。** 这是最被低估的优势。当两个 Agent 协作卡住时，人可以无缝插入对话——因为对话本来就在这个平台上，人本来就在看。

**4. 异构友好。** 消息平台不关心 Agent 用什么语言写的、跑在哪里、用什么模型。只要你能发消息、能收消息，就能加入协作。

来看架构图：

```text
┌─────────────────────────────────────────────────────────────────┐
│                         钉钉消息总线                             │
│                                                                 │
│   ┌─────────┐    单聊 DM     ┌─────────┐    单聊 DM     ┌────┐ │
│   │         │ ──────────────→ │         │ ──────────────→ │    │ │
│   │  用户   │                 │  Hermes  │                 │ OC │ │
│   │ (Hugo)  │ ←────────────── │  Agent   │ ←────────────── │    │ │
│   │         │    单聊 DM      │ Qwen3.7  │    单聊 DM      │ GLM│ │
│   └────┬────┘                 └────┬─────┘                 └──┬─┘ │
│        │                           │                          │   │
│        │     ┌─────────────────────────────────────────┐     │   │
│        │     │         协作群（@mention 路由）          │     │   │
│        │     │                                         │     │   │
│        └────→│  @Hermes 帮我查一下 xxx 的设计文档       │←────┘   │
│              │  @OpenCode 根据文档写一个实现            │         │
│              │  @Hermes 代码写好了，整合进博客          │         │
│              └─────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

注意这里没有「中心调度器」。每个 Agent 都能发起对话，每个 Agent 都能响应。路由靠 @mention，上下文靠群聊历史，持久化靠钉钉的消息存储。

## 两个 Agent 的真实配置

让我拆开这两个 Agent 的具体配置，因为「异构」不是抽象概念，是具体的工程选择。

### OpenCode Agent：代码专家

OpenCode 是一个开源的终端 AI 编码工具，我把它配成了 Server 模式，跑在一台远程机器上：

```text
Host:     远端 GPU 机器
Port:     4096
Auth:     HTTP Basic Auth
Model:    GLM 5.2
Harness:  opencode serve（HTTP API Server）
擅长:     代码生成、重构、测试、shell 命令
```

它的 Server API 暴露了完整的 session 管理端点。创建 session、发消息、轮询状态、提取结果，全部通过 HTTP 完成。这意味着任何能发 HTTP 请求的 Agent 都能调用它——包括 Hermes。

在 [一条命令把通用 Agent 接进钉钉](https://hugozhu.net/post/2026/287-opencode-dingtalk-connect-no-admin-console/) 里，我详细写了怎么把 OpenCode 连上钉钉，这里不赘述。关键点是： **OpenCode 的 HTTP API 让它天然可以被其他 Agent 远程调用。**

### Hermes Agent：知识管家

Hermes Agent 是 Nous Research 的开源 AI 助手，我的配置：

```text
Host:     本地 + 远程混合
Model:    Qwen 3.7 Max
Harness:  hermes-agent（CLI + API Server）
能力:     知识库检索、博客写作、笔记管理、Web 搜索、定时任务
记忆:     持久化 memory（跨 session 存活）
```

Hermes 有一个 OpenCode 没有的关键能力： **持久记忆**。它记得我写过的每一篇博客、每一个偏好、每一个踩过的坑。当你让 Hermes 写一篇新文章，它会自动搜索已有文章做交叉引用和去重——这是知识库型 Agent 的核心价值。

### 为什么是这两个模型？

这不是随便选的。模型选择遵循一个原则： **场景适配，不是越贵越好。**

GLM 5.2 在代码生成上的性价比很高，尤其是 Python 和 TypeScript。它的推理成本低，响应速度快，对于「写一段函数、跑通测试」这类明确任务非常合适。

Qwen 3.7 Max 的长上下文能力（1M tokens）和中文理解能力更强，适合需要检索大量文档、综合多个来源、产出长文本的知识型任务。

如果用同一个模型做所有事，要么代码任务为知识能力买单（浪费），要么知识任务为代码能力妥协（不够好）。 **异构的核心价值就是让每个 Agent 用最适合自己的工具。**

## 协作通道：单聊 vs 群聊

两个 Agent 的协作有两种通道，适用场景不同。

### 单聊模式：明确的委派任务

当任务边界清晰、不需要来回协商时，Hermes 直接给 OpenCode 发单聊：

```text
Hermes → OpenCode（单聊）:
「帮我写一个 Python 函数，输入是 markdown 文件路径，
输出是 frontmatter 里的 tags 列表。要求用 pathlib，
带类型注解，处理文件不存在的情况。」

OpenCode → Hermes（单聊）:
「```python
from pathlib import Path
import yaml
...
```
已测试通过，覆盖了文件不存在、frontmatter 缺失、
tags 字段为空三种边界情况。」
```

单聊的好处是**干净**——任务上下文不会和其他对话混在一起。坏处是**没有共享上下文**——如果 OpenCode 需要问「你说的 frontmatter 是什么格式？」，它得在单聊里重新问，Hermes 需要重新解释。

### 群聊 @ 模式：需要上下文的协商

当任务需要来回协商、或者我需要旁观和介入时，用协作群：

```text
[协作群]

Hugo: 我要写一篇关于 Agent 协作的博客，需要一段示意代码

Hermes: 好的，我先搭大纲。需要一个 Python 示例展示 Agent 间
 的消息传递，要求：dataclass 定义消息结构、
 Protocol 定义通信接口、异步发送 + 回调。
 @OpenCode 能帮我生成这段代码吗？

OpenCode: 收到。几个问题：
 1. 消息结构需要支持附件吗？
 2. 回调是同步等待还是异步通知？
 3. 需要错误重试逻辑吗？

Hermes: 1. 不需要，纯文本消息就行
 2. 异步通知，Agent 不阻塞
 3. 加一次重试就行，示意代码不用太复杂

OpenCode: [40 秒后] 代码生成完毕，包含 AgentMessage dataclass、
 MessageBus Protocol、以及 send_with_retry 函数。
 测试全部通过。

Hugo: 不错，把回调改成 Event-based 的，更贴近真实场景

OpenCode: 已改成 Event-based，用 dataclass + asyncio.Event。

Hermes: 拿到，整合进博客。
```

群聊的好处是**上下文共享**——所有参与者（包括我）都能看到完整对话历史，OpenCode 不需要 Hermes 重复解释背景。坏处是**信息密度低**——对于简单任务，群聊太重了。

我的经验法则：**任务明确 → 单聊；需要协商或人要旁观 → 群聊。**

## 三个关键设计决策

把两个异构 Agent 用消息总线连起来，有三个决策值得展开讲。

### 决策一：模型选择是场景适配，不是能力排名

社区里有一个常见误区：「用最强的模型做所有事。」但异构协作的前提是**承认不同任务需要不同能力配置**。

```text
┌──────────────────────────────────────────┐
│ 模型 × 场景适配矩阵 │
├──────────┬──────────┬────────────────────┤
│ │ 代码生成 │ 知识综合 │
├──────────┼──────────┼────────────────────┤
│ GLM 5.2 │ ★★★★★ │ ★★★ │
│ │ 快、准、便宜│ 中文长文本弱 │
├──────────┼──────────┼────────────────────┤
│ Qwen 3.7 │ ★★★ │ ★★★★★ │
│ Max │ 够用但不专│ 1M 上下文 + 中文强 │
├──────────┼──────────┼────────────────────┤
│ GPT-5 │ ★★★★ │ ★★★★ │
│ │ 全面但贵 │ 全面但贵 │
└──────────┴──────────┴────────────────────┘
```

如果我只用一个 Agent + 一个模型，要么为代码任务多付知识能力的溢价，要么为知识任务忍受代码能力的不完美。异构协作让我可以为每个场景选最优解。

### 决策二：独立状态，不共享内存

一个直觉上诱人的方案是让两个 Agent 共享状态——比如共享一个 Redis 或数据库，这样 Hermes 写完大纲，OpenCode 直接去读，不用通过消息传。

我试过，放弃了。原因有三：

**1. 故障耦合。** 共享状态意味着一个 Agent 的 bug 会直接影响另一个。OpenCode 写代码时把共享目录搞乱了，Hermes 的知识库检索就跟着出错。

**2. 版本冲突。** 两个 Agent 同时修改共享状态怎么办？你需要分布式锁、冲突解决——这些在 Agent 场景下是不必要的复杂度。

**3. 独立升级。** 我想把 Hermes 从 Qwen 3.7 Max 换成另一个模型，或者把 OpenCode 从一台机器迁移到另一台，如果它们共享状态，迁移就变成了联合迁移。

**消息总线天然解决了这个问题。** 每个 Agent 只通过消息交换信息，各自维护自己的状态。Hermes 的知识库是 Hermes 的，OpenCode 的文件系统是 OpenCode 的。它们交换的是**信息**，不是**状态**。

```python
from dataclasses import dataclass
from typing import Protocol, Optional


@dataclass
class AgentMessage:
 「」「Agent 间传递的消息——信息，不是状态。」「」
 sender: str # 「hermes」 | 「opencode」
 receiver: str # 「hermes」 | 「opencode」 | 「hugo」
 content: str # 消息正文
 channel: str # 「dm」 | 「group:协作群」
 reply_to: Optional[str] = None # 回复哪条消息


class MessageBus(Protocol):
 「」「消息总线接口——每个 Agent 独立实现。」「」

 async def send(self, msg: AgentMessage) -> None:
 「」「发送消息到总线。」「」
 ...

 async def receive(self, agent_id: str) -> AgentMessage:
 「」「接收发往指定 Agent 的下一条消息。」「」
 ...


# Hermes 的实现：通过 dws CLI 发钉钉消息
class DingTalkMessageBus:
 「」「Hermes 和 OpenCode 共用的钉钉消息总线实现。」「」

 def __init__(self, bot_code: str):
 self.bot_code = bot_code

 async def send(self, msg: AgentMessage) -> None:
 if msg.channel == 「dm」:
 # dws chat send-direct --user <userId> --content <text>
 await self._send_dm(msg.receiver, msg.content)
 else:
 group_id = msg.channel.split(「:」)[1]
 # dws chat send --group <groupId> --at <agent> --content <text>
 await self._send_group(group_id, msg.receiver, msg.content)

 async def _send_dm(self, user_id: str, content: str) -> None:
 # 实际调用 dws CLI
 ...

 async def _send_group(self, group_id: str, at_user: str, content: str) -> None:
 # 实际调用 dws CLI，@mention 指定 Agent
 ...
# generated by hugo AI
```

### 决策三：优雅降级——Agent 不回复时怎么办

异构系统最脆弱的环节是**可用性不对齐**。OpenCode 可能在跑一个长任务，3 分钟没响应；Hermes 可能因为 API 限流在重试。

我的降级策略分三层：

```text
┌─────────────────────────────────────────────────┐
│ 降级策略（三层） │
├──────────┬──────────────────────────────────────┤
│ Layer 1 │ 超时重试 │
│ │ 等待 60s → 重发消息 → 最多重试 2 次 │
├──────────┼──────────────────────────────────────┤
│ Layer 2 │ 自降级 │
│ │ OpenCode 不可用 → Hermes 自己写代码 │
│ │ Hermes 不可用 → OpenCode 提示用户 │
├──────────┼──────────────────────────────────────┤
│ Layer 3 │ 升级到人工 │
│ │ 两层降级都失败 → 在群里 @ Hugo │
│ │ 「OpenCode 已重试 2 次未响应， │
│ │ 需要你确认服务是否正常」 │
└──────────┴──────────────────────────────────────┘
```

这里消息平台的「人可介入」优势就体现出来了——降级到人工不需要切换系统，人本来就在群里看着。如果是进程内的 CrewAI 编排，降级到人工需要额外开发一套通知和接管机制。

## 跟 CrewAI/LangGraph/AutoGen 比什么

写到这里，可能有读者会问：消息总线模式和这些框架到底有什么本质区别？

**核心区别是「编排权归谁」。**

在 CrewAI 里，编排权在 Crew——一个中心化的调度器决定哪个 Agent 什么时候执行什么任务。Agent 是 Crew 的子进程。

在消息总线模式里，**编排权在 Agent 自己**。Hermes 决定什么时候需要 OpenCode 帮忙，OpenCode 决定什么时候回复、回复什么。没有中心调度器，没有全局状态，没有统一的生命周期管理。

这不是说 CrewAI 不好——对于同构 Agent 的固定流程，CrewAI 的声明式编排确实更简洁。但对于**异构 Agent 的长期、动态协作**，消息总线模式的三个特性是不可替代的：

1. **独立部署**——换模型、换机器、换 harness，不影响其他 Agent
2. **故障隔离**——一个 Agent 挂了，其他 Agent 继续工作，优雅降级
3. **人可介入**——任何时候人都可以插入对话，纠正方向，无需额外开发

```text
┌────────────────────────────────────────────────────────────┐
│ 编排模式对比 │
├────────────┬──────────────┬──────────────┬────────────────┤
│ │ CrewAI │ LangGraph │ 消息总线 │
├────────────┼──────────────┼──────────────┼────────────────┤
│ Agent 关系 │ 同构子进程 │ 图中节点 │ 独立进程 │
│ 通信方式 │ 进程内调用 │ 边传递状态 │ 异步消息 │
│ 编排权 │ Crew 中心调度 │ Graph 定义 │ Agent 自主 │
│ 故障影响 │ 全局 │ 沿图传播 │ 局部隔离 │
│ 人工介入 │ 需额外开发 │ 需额外开发 │ 天然支持 │
│ 适用场景 │ 同构固定流程 │ 条件分支流程 │ 异构动态协作 │
└────────────┴──────────────┴──────────────┴────────────────┘
```

## 这件事人类社会早就解决了

回过头看，异构 Agent 协作的最大挑战其实不是技术问题。

分布式系统领域早就解决了异步消息传递、故障隔离、最终一致性。微服务架构早就证明了「独立部署、消息通信」比「大一统单体」更适合长期演进。

Agent 协作真正需要解决的问题是：**怎么让独立进化的个体高效协作？**

这件事，人类社会已经解决了几千年。靠组织——清晰的角色分工；靠沟通协议——异步消息（邮件、即时通讯）比同步会议更可持续；靠信任边界——每个人对自己的领域负责，通过信息交换而非状态共享来协作。

你的 Agent 也应该这样。

不要试图把所有 Agent 塞进一个框架。给它们各自最适合的模型和工具，给它们一个可靠的消息通道，给它们清晰的角色定义。然后让它们在对话中协作——就像你的团队在钉钉群里协作一样。

**Agent 不需要坐在同一间办公室。它们需要的是一个靠谱的沟通渠道。**

你在实际工作中有多个 Agent 协作的经验吗？你是怎么解决异构 Agent 之间的通信和状态管理的？欢迎留言讨论。
