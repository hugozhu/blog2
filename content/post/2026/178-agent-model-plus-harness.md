---
title: "Agent = Model + Harness：从 Anthropic Managed Agents 看 Agent 架构演进"
subtitle: "Why Agent Architecture is About Stable Interfaces, Not Just Better Models"
date: 2026-04-16
tags: ["ai-agents", "agent-loop", "system-architecture", "anthropic", "LLM", "managed-agents", "harness-design", "context-engineering"]
---

如果把 Agent 拆解成一个公式，最简单的表达就是：

**Agent = Model + Harness**

Model 负责思考、推理、决策；Harness 负责循环控制、工具路由、状态管理。过去一年，社区的目光几乎全部聚焦在 Model 上——谁的能力强、谁更便宜、谁上下文更大。但 Anthropic 工程团队最近发布的 [Managed Agents 架构文章](https://www.anthropic.com/engineering/managed-agents)揭示了一个被忽视的事实：

> *"Harnesses encode assumptions about what Claude can't do on its own. Those assumptions go stale as models improve."*

Harness 编码了关于"模型做不到什么"的假设，而这些假设会随着模型能力提升而迅速过时。一个更有趣的推论是：**模型越强，Harness 的设计就越重要**——因为越强的模型需要越精密的控制结构，才能把能力转化为可靠的产出。

这篇文章从 Anthropic 的工程实践出发，拆解 Agent 架构的核心设计模式，以及"面向未来的 Harness"到底长什么样。

<!--more-->

## Agent 的四个基本组件

先看 Agent 系统的全貌。一个生产级 Agent 不只是"调 API + 循环"，它至少包含四个独立组件：

```
┌────────────────────────────────────────────────────────────┐
│                     Agent System                            │
│                                                             │
│  ┌─────────────┐   ┌────────────────┐   ┌───────────────┐  │
│  │   Session   │◄─▶│    Harness     │◄─▶│    Sandbox    │  │
│  │ (事件日志)   │   │ (循环/路由/状态) │   │ (执行环境)     │  │
│  │             │   │                │   │               │  │
│  │ getEvents() │   │ emitEvent()    │   │ execute()     │  │
│  │ wake()      │   │ wake(session)  │   │ → string      │  │
│  └─────────────┘   └───────┬────────┘   └───────────────┘  │
│                            │                                │
│                            ▼                                │
│                   ┌────────────────┐                        │
│                   │     Model      │                        │
│                   │ (Claude / LLM) │                        │
│                   │  思考 · 推理 · 决策  │                    │
│                   └────────────────┘                        │
└────────────────────────────────────────────────────────────┘
```

| 组件 | 职责 | 类比 |
|------|------|------|
| **Model** | 思考、推理、生成行动计划 | 大脑 |
| **Harness** | 循环控制、工具路由、上下文管理 | 神经系统 |
| **Session** | 持久化事件日志，append-only | 记忆体 |
| **Sandbox** | 代码执行、文件编辑、网络请求 | 手脚 |

大多数人只关注 Model，但 Anthropic 的工程实践表明：**Harness 才是 Agent 从 demo 走向 production 的关键**。

## Harness 的根本困境：假设注定会过时

Anthropic 给出了一个真实案例：

> 在之前的工作中，他们发现 Claude Sonnet 4.5 会在接近上下文限制时过早结束任务——一种被称为"context anxiety"的行为。他们在 Harness 中加入了 context reset 来解决这个问题。但当你把同一个 Harness 用到 Claude Opus 4.5 上时，这个行为消失了。Context reset 变成了死代码。

这就是 Harness 的根本困境：

```
Model 能力弱  ──▶  Harness 加各种 workaround
                      │
                      ▼
Model 能力提升  ──▶  Workaround 变成死代码 / 甚至副作用
                      │
                      ▼
新 Model 新行为  ──▶  Harness 需要重新设计
                      │
                      ▼
        ┌──────────────────────┐
        │  死循环：假设永远在过时  │
        └──────────────────────┘
```

Anthropic 的解法是：**不要设计"今天最好的 Harness"，而是设计"未来也能用的接口"**。

他们的思路借鉴了操作系统的设计哲学——操作系统能活几十年，靠的不是优化特定硬件，而是把硬件虚拟化成通用抽象（process、file），让还没被想出来的程序也能跑在上面。`read()` 不在乎你读的是 70 年代的磁盘还是今天的 SSD。

Managed Agents 也是这个思路：把 Agent 组件抽象为稳定接口，实现层可以随意替换。

## 核心架构模式：解耦 Brain 和 Hands

### 从 Pet 到 Cattle

Anthropic 最初把所有组件塞进一个容器：

```
┌─────────────────────────────────────┐
│  ❌ 耦合架构 (Pet)                   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Harness + Sandbox + Tokens │    │
│  │  + Session + Model          │    │
│  │                             │    │
│  │  容器挂了 = 会话全丢         │    │
│  │  需要工程师 SSH 进去抢救     │    │
│  └─────────────────────────────┘    │
│                                     │
│  "这是一个 pet，不能丢，丢了就完了"   │
└─────────────────────────────────────┘
```

问题显而易见：容器一挂，会话数据全丢。工程师只能 SSH 进去抢救——但如果容器里还有用户数据，调试本身就变得危险。

解耦之后：

```
┌──────────────────────────────────────────────────────┐
│  ✅ 解耦架构 (Cattle)                                 │
│                                                      │
│  ┌───────────┐   execute(name, input)→string          │
│  │  Harness  │──────────▶ [Sandbox A] (container)     │
│  │ (stateless)│──────────▶ [Sandbox B] (MCP server)   │
│  └─────┬─────┘                                         │
│        │                                               │
│        ▼                                               │
│  [Session Log]  ◀── append-only, durable               │
│  getEvents()    ◀── 按需读取事件切片                    │
│  wake(sessionId)◀── 崩溃恢复入口                        │
│                                                      │
│  "这是 cattle，死了一个，启动新的就行"                      │
└──────────────────────────────────────────────────────┘
```

Harness 变成了无状态的——因为它不持有会话状态，状态全在 Session 里。如果 Harness 崩溃，新的 Harness 用 `wake(sessionId)` 恢复，用 `getSession(id)` 读取事件日志，从中断处继续。

### 三个核心接口

解耦后的架构靠三个接口运转：

```python
class Session(ABC):
    """持久化事件日志——不依赖任何 Model 或 Harness"""

    @abstractmethod
    def emit_event(self, session_id: str, event: Event) -> None: ...

    @abstractmethod
    def get_events(self, session_id: str, slice: slice | None = None) -> list[Event]: ...

    @abstractmethod
    def wake(self, session_id: str) -> str:
        """恢复会话，返回最后事件 ID"""


class Sandbox(ABC):
    """执行环境——Harness 不知道背后是容器、VM 还是 MCP 服务"""

    @abstractmethod
    def execute(self, name: str, input: str) -> str: ...


class AgentHarness:
    """Agent 循环——唯一有状态但可替换的组件"""

    def __init__(self, session: Session, sandbox: Sandbox) -> None:
        self.session = session
        self.sandbox = sandbox

    def run(self, session_id: str, model: Any) -> None:
        """主循环：读取事件 → 构建 prompt → 调用模型 → 执行工具 → 写回"""
        last_id = self.session.wake(session_id)
        events = self.session.get_events(session_id)

        while True:
            prompt = self._build_prompt(events)
            response = model.generate(prompt)

            for action in response.actions:
                if action.type == "tool_call":
                    result = self.sandbox.execute(action.name, action.input)
                    self.session.emit_event(session_id, Event(
                        event_id=f"result_{action.id}",
                        event_type="tool_result",
                        content=result,
                        timestamp=action.timestamp,
                    ))
                    events = self.session.get_events(session_id)


@dataclass
class Event:
    event_id: str
    event_type: str  # "user_message", "assistant", "tool_call", "tool_result"
    content: Any
    timestamp: float


# generated by hugo AI
```

这三个接口的精妙之处在于：它们定义了"形状"，不定义"实现"。Sandbox 可以是 Docker 容器、E2B 沙箱、甚至是一个手机模拟器——Harness 不在乎。

## 安全边界：Token 永远不该到 Agent 手里

耦合架构中有一个经典的安全漏洞：

```
Prompt Injection
    │
    ▼
说服 Claude 读取自己的环境变量
    │
    ▼
拿到 API Token
    │
    ▼
用 Token 启动新的无限制 Session
    │
    ▼
┌──────────────────────────────┐
│  Agent 获得了无限权限，游戏结束 │
└──────────────────────────────┘
```

"把 Token 的作用域缩小"是一个缓解措施——但这仍然在编码一个假设："Claude 拿有限的 Token 做不了什么坏事"。而 Claude 正变得越来越聪明。

Anthropic 采用了**结构性修复**：让 Token 永远不可达。

### 模式一：Git Token 初始化注入

```
Harness                    Sandbox                    Git Remote
  │                           │                           │
  │── provision({repo_url}) ─▶│                           │
  │                           │── clone (with token) ────▶│
  │                           │                           │
  │                           │  git push / pull ────────▶│
  │                           │  (Token 在 .git 配置里，    │
  │                           │   Agent 代码无法读取)       │
  │                           │                           │
```

Sandbox 初始化时，Harness 用 Token 完成 `git clone` 并配置好 remote。之后的 `git push` / `git pull` 都在 Sandbox 内正常工作，但 Agent 的代码根本拿不到 Token 本身。

### 模式二：MCP + Vault 代理

```
Claude/Harness              MCP Proxy              Vault              External API
     │                         │                     │                    │
     │── call MCP tool ───────▶│                     │                    │
     │  (带 session token)      │                     │                    │
     │                         │── fetch credentials ─▶│                    │
     │                         │                     │                    │
     │                         │── call with OAuth ──────────────────────▶│
     │                         │                     │                    │
     │                         │◀── response ─────────────────────────────│
     │◀── result ──────────────│                     │                    │
     │                         │                     │                    │
     └─────────────────────────┴─────────────────────┴────────────────────┘
                Harness 对 OAuth Token 完全无感知
```

Claude 通过 session token 调用 MCP 代理，代理从 Vault 中取出真实凭证，对外部服务发起请求。Harness 从头到尾没见过 OAuth Token。

### Python 实现骨架

```python
class MCPServerProxy:
    """MCP 工具代理——OAuth Token 对用户代码不可见"""

    def __init__(self, vault: CredentialVault) -> None:
        self._vault = vault

    def handle_call(
        self,
        session_token: str,
        tool_name: str,
        tool_input: dict[str, Any],
    ) -> str:
        """代理 MCP 工具调用，从 Vault 获取真实凭证"""
        # 1. 根据 session token 查找对应的服务凭证
        credentials = self._vault.get_credentials(session_token, tool_name)

        # 2. 用凭证调用外部服务
        response = self._call_external_service(
            tool_name=tool_name,
            tool_input=tool_input,
            credentials=credentials,
        )

        # 3. 返回结果（不暴露凭证）
        return response


class GitSandboxInitializer:
    """Git Sandbox 初始化——Token 注入后对 Agent 不可见"""

    def __init__(self, token: str) -> None:
        self._token = token

    def provision(self, repo_url: str, sandbox_path: str) -> None:
        """克隆仓库并配置 remote，Token 写入 .git 配置后删除"""
        subprocess.run(
            ["git", "clone", self._with_token(repo_url), sandbox_path],
            check=True,
        )
        # Token 写入 .git/config 后，从 Harness 内存中清除
        self._token = None  # type: ignore[assignment]


# generated by hugo AI
```

核心原则：**结构化的安全比策略性的安全更可靠**。不要假设"Agent 拿了这个 Token 也不会乱用"——直接让 Agent 拿不到。

## Session ≠ Context Window：持久化上下文的新范式

长期运行的 Agent 任务通常会超出模型的上下文窗口。传统的应对策略有：

- **Compaction**：让模型总结当前上下文，压缩后替换原始消息
- **Context Trimming**：选择性删除旧的工具结果或思考过程
- **Memory Tool**：让模型把重要信息写入文件

这些方法的共同问题是：**都是不可逆决策**。你很难预知未来的哪一步需要哪些 token。一旦消息被 compaction 转换并从上下文窗口移除，除非额外存储，否则就找不回来了。

Managed Agents 的做法是把上下文存在 Session 日志里——一个独立于上下文窗口的持久化对象：

```
┌──────────────────────────────────────────────────────────┐
│              Context Architecture                        │
│                                                          │
│  Claude Context Window          Session Log (Durable)    │
│  ┌────────────────────┐         ┌────────────────────┐  │
│  │  [最近的几条消息]    │         │  [事件 1] user_msg  │  │
│  │  [当前工具结果]     │         │  [事件 2] assistant │  │
│  │  [系统 prompt]     │         │  [事件 3] tool_call │  │
│  │                    │         │  [事件 4] tool_rslt │  │
│  │  ← 有限大小，       │         │  [事件 5] user_msg  │  │
│  │    会被覆盖/替换     │         │  [事件 6] assistant │  │
│  └────────────────────┘         │  [事件 N] ...       │  │
│         ▲                       └────────────────────┘  │
│         │                                ▲               │
│         │  Harness 做上下文工程            │ getEvents()   │
│         │  (缓存优化/选择性传递)           │ (按需读取)     │
│         └────────────────────────────────┘               │
│                                                          │
│  "Session 保证数据不丢，Harness 决定给 Claude 看什么"      │
└──────────────────────────────────────────────────────────┘
```

`getEvents()` 接口足够灵活：

- 从上次停止的位置继续读取
- 回溯几条事件，查看某个操作的前因后果
- 在执行关键动作前重新读取上下文

Harness 可以对取出的事件做任意转换——缓存优化以提高 prompt cache 命中率、选择性传递以节省 token——但 Session 保证原始数据永远可恢复。

**关注点分离**：Session 负责持久化存储，Harness 负责上下文工程。因为我们无法预测未来的模型需要什么样的上下文管理策略，所以接口把上下文管理推给了 Harness，只保证 Session 是持久且可查询的。

## 性能启示：按需创建 vs 预分配

解耦架构带来了一个意外的性能收益——TTFT（Time to First Token，首 token 延迟）的大幅下降。

在耦合架构中，每个 Session 都必须先完成完整的容器初始化：克隆代码库、启动进程、拉取事件……即使这个 Session 可能根本不需要 Sandbox。这些"死等待"直接体现在 TTFT 上——这是用户最直观感受到的延迟。

解耦之后，容器仅在需要时才通过 `execute()` 调用创建。不需要 Sandbox 的 Session 可以直接开始推理。结果是：

| 指标 | 改善幅度 |
|------|---------|
| p50 TTFT | **↓ ~60%** |
| p95 TTFT | **↓ >90%** |

这个数据对自建 Agent 系统的人很有启发。用 E2B 或 Docker 搭建 Agent 时，常见的反模式是"先启动容器，再调 API"。正确的做法应该是"先开始推理，需要时才启动容器"。

## Many Brains, Many Hands

解耦架构的另一个好处是可以扩展到"多个 Brain"和"多个 Hands"。

### Many Brains

当 Harness 不再和容器耦合，Scale 多个 Brain 就只是启动多个无状态的 Harness 进程，按需连接到 Session。不同团队的 Agent 可以各自连接到自己 VPC 里的资源，不再需要网络对等连接。

### Many Hands

Claude 需要推理多个执行环境，决定把工作分发到哪里——这比在单一 Shell 里操作更难。但解耦后，每个 Hand 都变成 `execute(name, input) → string` 的工具调用。Harness 不知道 Sandbox 是容器、手机还是宝可梦模拟器。而且因为 Brain 和 Hand 没有耦合关系，Brain 之间可以互相传递 Hands——一个 Agent 完成的部分工作可以交接给另一个 Agent 继续。

## 给我们的启发：如何设计自己的 Agent Harness

从 Anthropic 的实践中，可以提炼出设计 Agent Harness 的 5 个原则：

### 1. 接口稳定，实现可变
Harness 的接口应该假设"模型会变强"。今天需要的 workaround，明天可能就是死代码。把实现层和接口层分开，替换实现时不破坏接口。

### 2. Brain 和 Hands 解耦
不要把执行环境和循环控制塞进同一个进程。让 Harness 通过统一的 `execute()` 接口调用所有工具，这样 Sandbox 挂了只是工具调用失败，不会导致整个会话丢失。

### 3. Session 独立于上下文窗口
事件日志应该持久化且 append-only。Compaction 和 trimming 可以发生在 Harness 层，但原始数据永远可恢复。

### 4. Token 不可达
结构性隔离比策略性隔离更可靠。Git Token 初始化注入、MCP Vault 代理——让 Agent 代码永远接触不到敏感凭证。

### 5. 按需创建，不要预分配
TTFT 是用户最敏感的延迟指标。容器/沙箱仅在需要时启动，不要为每个 Session 预付初始化成本。

### 最小化 Agent Harness 完整实现

```python
"""
最小化 Agent Harness 实现
展示 Session/Sandbox 接口和 Agent 循环的核心逻辑
"""

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class Event:
    """会话中的单个事件"""
    event_id: str
    event_type: str
    content: Any
    timestamp: float


class Session(ABC):
    """持久化事件日志接口"""

    @abstractmethod
    def emit_event(self, session_id: str, event: Event) -> None: ...

    @abstractmethod
    def get_events(
        self, session_id: str, after_id: str | None = None,
    ) -> list[Event]: ...

    @abstractmethod
    def wake(self, session_id: str) -> str: ...


class Sandbox(ABC):
    """执行环境接口"""

    @abstractmethod
    def execute(self, name: str, input: str) -> str: ...


class AgentHarness:
    """Agent 循环控制"""

    def __init__(self, session: Session, sandbox: Sandbox) -> None:
        self.session = session
        self.sandbox = sandbox
        self.max_iterations: int = 50

    def run(self, session_id: str, model: Any) -> None:
        """主循环：读取 → 推理 → 执行 → 记录"""
        last_id = self.session.wake(session_id)

        for _ in range(self.max_iterations):
            # 1. 读取最新事件
            events = self.session.get_events(session_id, after_id=last_id)
            if not events:
                break

            # 2. 构建 prompt（Harness 可以做上下文工程）
            prompt = self._build_prompt(events)

            # 3. 调用模型
            response = model.generate(prompt)

            # 4. 处理工具调用
            for action in response.actions:
                if action.type == "tool_call":
                    result = self.sandbox.execute(action.name, action.input)
                    result_event = Event(
                        event_id=f"result_{action.id}",
                        event_type="tool_result",
                        content=result,
                        timestamp=time.time(),
                    )
                    self.session.emit_event(session_id, result_event)
                    last_id = result_event.event_id

            # 5. 模型表示完成，退出循环
            if response.is_done:
                break

    def _build_prompt(self, events: list[Event]) -> list[dict[str, str]]:
        """将事件转换为模型 prompt——这里可以做缓存优化、选择性传递"""
        messages: list[dict[str, str]] = []
        for event in events:
            if event.event_type == "user_message":
                messages.append({"role": "user", "content": str(event.content)})
            elif event.event_type == "tool_result":
                messages.append({"role": "user", "content": str(event.content)})
            elif event.event_type == "assistant":
                messages.append({"role": "assistant", "content": str(event.content)})
        return messages


# generated by hugo AI
```

## 结论

Agent = Model + Harness，但大多数人只关注 Model。Anthropic 的 Managed Agents 架构提醒我们：

> **好的 Agent 不是模型越强越好，而是 Harness 设计得越能适配模型变化越好。**

Harness 的假设会随着模型能力提升而过时——这不是 bug，是 feature。真正好的 Harness 设计不是优化今天的性能，而是定义一组足够通用的接口，让未来的模型、未来的 Harness 实现、未来的 Sandbox 都能无缝接入。

操作系统活了半个世纪，靠的不是优化某一代硬件，而是定义了 process 和 file 这样的通用抽象。Agent 架构要活到下一个模型迭代周期，也需要同样的设计哲学。

---

**你怎么看？** 你在搭建 Agent 时遇到过"模型升级导致 Harness 失效"的情况吗？欢迎在评论区分享你的经验。你觉得 Agent 架构中最难设计的部分是 Model、Harness、Session 还是 Sandbox？
