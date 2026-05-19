---
title: "构建 Agent 的动态路由决策系统：千人千面的任务执行引擎"
subtitle: "Dynamic Routing Decision System for AI Agents"
date: 2026-05-08
tags: ["llm-agent", "system-design", "routing", "online-learning", "ai-engineering"]
ingested: 2026-05-08
sha256: 1fd47d0a5fa63dbad297f09dc6668c3d7202a3d24402a173e4d63984fb7fd54b
---

团队里的小王和小李都在用同一个 AI Agent 平台。

小王输入：「帮我总结一下今天群里的讨论。」

Agent 调用了 fast/small 模型做意图识别，然后用 medium 模型读取了 200 条消息，生成了摘要。耗时 3 秒，花费 0.02 元。

小李输入了完全相同的指令。

Agent 却调用了 large/reasoning 模型，不仅做了摘要，还自动关联了小李上周的项目文档，识别出了三个待办事项，并推送到了他的日历。耗时 12 秒，花费 0.15 元。

**同样的输入，完全不同的执行路径。**

这不是 bug，而是一个成熟的 Agent 系统应该具备的能力——根据用户画像、历史行为、任务上下文，动态决策每一步该用什么模型、什么工具、注入多少上下文、以什么并发度执行。

当你的 Agent 只有 100 个用户时，这些问题还不明显。你可以手动调几个规则，给 VIP 用户分配更好的模型，给普通用户限流。靠人肉运维，系统也能跑。

但当用户量从 100 涨到 10 万、100 万，当模型供应商从 1 家变成 10 家，当工具调用从几个 API 扩展到上百个——**靠人写规则来调度，系统会直接崩溃**。

不是因为规则写不出来，而是因为规则的组合空间是**指数级**的：

- 7 种任务类型 × 5 个复杂度等级 × 10 个模型 × 4 种用户画像 × 3 种上下文策略 = **4,200 种路由组合**
- 这还只是单节点决策。如果任务被分解为 3-5 个子节点，每个节点独立路由，组合数直接爆炸到 **百万级**

没有人能手动维护百万级的路由规则表。

大多数 Agent 框架把执行路径写死在代码里：先调用 A 模型，再调用 B 工具，最后返回结果。这在 demo 阶段没问题，但一旦面向规模化用户，就会暴露三个致命问题：

1. **成本失控**——所有用户都用最强模型，简单任务也在烧钱，规模化后月账单直接六位数
2. **体验一刀切**——新手和专家拿到相同的结果，没有人觉得「懂我」，留存率上不去
3. **无法进化**——系统上线后不会从用户反馈中学习，规则越写越多，越用越僵化

这篇文章，我们来拆解如何构建一个**动态路由决策系统（Dynamic Routing Decision System, DRDS）**——一套端到端的自进化引擎，让 Agent 的执行路径真正做到千人千面，并且在规模化下持续学习、自动优化。

**核心观点：自进化不是 Agent 的「加分项」，而是规模化后的「必选项」。**

<!--more-->

## 一、问题本质：为什么需要动态路由？

先看一个传统 Agent 的执行路径：

```text
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  User Input  │ ──> │ Intent Class │ ──> │ LLM (fixed)  │ ──> │  Output  │
│             │     │ (hardcoded)  │     │ gpt-4-always │     │          │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────┘
```

问题一目了然：每个节点都是静态的。意图分类用固定的规则或模型，LLM 永远选同一个，工具调用写死在 prompt 里。

而一个动态路由系统的执行路径是这样的：

```text
                        ┌─────────────────────────────────────────────────┐
                        │           Dynamic Router (DRDS)                 │
                        │                                                 │
  User Input            │  ┌──────────┐   ┌───────────┐   ┌────────────┐ │
  ┌──────────┐          │  │  Intent   │   │  Model    │   │  Context   │ │
  │ profile  │ ────────>│  │  Classifier│──>│  Router   │──>│  Injector  │ │
  │ history  │          │  │          │   │           │   │            │ │
  │ context  │          │  └────┬─────┘   └─────┬─────┘   └─────┬──────┘ │
  └──────────┘          │       │               │               │        │
                        │       v               v               v        │
                        │  ┌─────────────────────────────────────────┐   │
                        │  │        Execution Graph Builder          │   │
                        │  │                                         │   │
                        │  │  Node 1 ──> Node 2 ──> Node 3 ──> ...  │   │
                        │  │  (model)   (tool)    (model)           │   │
                        │  │                                         │   │
                        │  │  concurrency: dynamic per node          │   │
                        │  │  context:   dynamic per node            │   │
                        │  └─────────────────────────────────────────┘   │
                        │                       │                       │
                        │                       v                       │
                        │  ┌─────────────────────────────────────────┐   │
                        │  │          Feedback Collector              │   │
                        │  │  (latency, cost, quality, user action)  │   │
                        │  └─────────────────────────────────────────┘   │
                        │                       │                       │
                        │                       v                       │
                        │  ┌─────────────────────────────────────────┐   │
                        │  │         Online Learner                  │   │
                        │  │  (update routing policy in real-time)   │   │
                        │  └─────────────────────────────────────────┘   │
                        └─────────────────────────────────────────────────┘
```

核心差异在于：**每个节点的决策都是运行时计算的**，而不是编译时写死的。

## 二、规模化瓶颈：为什么必须端到端？

在深入架构细节之前，我们需要先回答一个关键问题：**为什么规模化后，必须构建端到端的自进化系统，而不是继续打补丁？**

### 2.1 规则系统的崩溃曲线

几乎所有 Agent 项目都是从「写规则」开始的：

```python
# Day 1: 看起来很简单
if task_type == "summarization":
    model = "gpt-4o-mini"
elif task_type == "code_generation":
    model = "claude-sonnet"
else:
    model = "gpt-4o"
```

到了第 30 天，规则变成了这样：

```python
# Day 30: 还能维护
if task_type == "summarization":
    if user_tier == "enterprise" and context_length > 10000:
        model = "gpt-4o"
    elif user_tier == "free" and is_peak_hour():
        model = "fast-model"
    else:
        model = "gpt-4o-mini"
elif task_type == "code_generation":
    if language == "rust" and user_history.get("rust_expert"):
        model = "claude-opus"
    elif complexity == "simple":
        model = "gemini-flash"
    else:
        model = "claude-sonnet"
# ... 还有 20 个 elif
```

到了第 180 天，规则文件超过 2000 行，没有人敢动它。改一条规则，可能影响三个业务线。新模型上线？要改 50 个地方。新供应商接入？没人知道该怎么集成。

这就是**规则系统的崩溃曲线**：

```text
维护成本
   ^
   |                          / 规则系统
   |                        /
   |                      /  ← 崩溃点 (约 500 条规则)
   |                    /
   |                  /
   |                /
   |              /
   |            /        __________ DRDS (自进化系统)
   |          /         /
   |        /          /
   |      /           /
   |    /            /
   |  /             /
   |/_____________/
   +----------------------------------> 规模
    100    1K     10K    100K    1M
    用户   用户   用户   用户    用户
```

规则系统的根本问题是：**它的维护成本随规模线性（甚至超线性）增长**，而自进化系统的维护成本几乎不变——因为系统自己在学习和优化。

### 2.2 端到端的必要性：为什么不能只做「模型路由」？

很多人会想：我不需要端到端，我只加一个模型路由器不就行了？

问题在于，**路由决策的各个维度是强耦合的**。单独优化任何一个维度，都会在其他维度产生副作用：

```text
维度耦合示例：

  模型选择 ──> 影响 ──> 上下文窗口需求
     │                      │
     │                      v
     │              影响 ──> Token 成本
     │                      │
     │                      v
     影响 ──> 延迟 ──> 影响 ──> 用户体验
                                │
                                v
                         影响 ──> 用户行为反馈
                                │
                                v
                         影响 ──> 学习信号质量
                                │
                                v
                         影响 ──> 下一轮模型选择
```

**如果你只做了模型路由，没做上下文注入优化：**
- 选了便宜的小模型，但注入了 32K 的冗余上下文
- 结果：token 成本反而更高，且小模型被噪声淹没，质量更差

**如果你只做了上下文优化，没做并发控制：**
- 上下文精准了，但所有工具串行调用
- 结果：延迟从 3 秒变成 15 秒，用户流失

**如果你做了前三层，但没有反馈闭环：**
- 系统初始配置不错，但模型供应商更新了定价、新模型上线、用户行为变化
- 结果：策略在 2 周内过时，需要人工重新调参

这就是为什么必须**端到端**：五个层级（L1-L5）构成一个完整的控制回路，缺一不可。

```text
端到端 = 完整的控制回路

  感知层 (L1 意图分类)
     │
     v
  决策层 (L2 模型路由 + L3 上下文注入 + L4 并发控制)
     │
     v
  执行层 (Agent Execution Graph)
     │
     v
  观测层 (L5 反馈收集)
     │
     v
  学习层 (L5 在线学习) ──────> 更新策略 ──────> 感知层/决策层
     │                                                │
     └────────────────── 闭环 ────────────────────────┘
```

### 2.3 自进化的复利效应

端到端自进化系统在规模化下会产生**复利效应**：

| 阶段 | 数据量 | 路由质量 | 成本节省 | 用户体验 |
|------|--------|----------|----------|----------|
| 冷启动（Day 1） | 0 次决策 | 随机/规则 | 0% | 基线 |
| 学习期（Week 2） | 10K 次决策 | 初步收敛 | 20-30% | +10% |
| 成熟期（Month 2） | 500K 次决策 | 稳定优化 | 40-60% | +25% |
| 复利期（Month 6） | 10M+ 次决策 | 持续进化 | 60-80% | +40% |

关键在于：**数据越多 → 路由越准 → 体验越好 → 用户越多 → 数据更多**。这是一个正向飞轮。

而规则系统没有飞轮。规则系统的曲线是平的——上线第一天是什么样，半年后还是什么样，甚至更差（因为规则腐化）。

**自进化不是「加分项」，而是规模化 Agent 系统的核心竞争力。** 没有自进化能力的 Agent，在规模化后会因为成本和体验的双重压力被市场淘汰。

## 三、DRDS 框架：五层决策架构

动态路由决策系统由五个核心组件构成，每一层解决一个决策维度：

| 层级 | 组件 | 决策问题 | 输入信号 |
|------|------|----------|----------|
| L1 | 意图分类引擎 | 用户想做什么？复杂度如何？ | 输入文本、用户画像、历史会话 |
| L2 | 模型路由器 | 用哪个模型？能力/价格/速度如何权衡？ | 意图标签、SLA 要求、成本预算 |
| L3 | 上下文注入器 | 注入多少上下文？哪些相关？ | 用户历史、知识库、RAG 检索结果 |
| L4 | 并发控制器 | 节点间如何并行？并发度多少？ | 任务依赖图、系统负载、速率限制 |
| L5 | 在线学习器 | 上次决策效果如何？策略怎么调整？ | 延迟、成本、质量评分、用户行为 |

### 3.1 L1：意图分类引擎

意图分类是整个路由链的第一环。它的输出不是简单的「分类标签」，而是一个**结构化的意图描述**：

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

class TaskDomain(Enum):
    SUMMARIZATION = "summarization"
    CODE_GENERATION = "code_generation"
    DATA_ANALYSIS = "data_analysis"
    CREATIVE_WRITING = "creative_writing"
    REASONING = "reasoning"
    INFORMATION_RETRIEVAL = "information_retrieval"
    WORKFLOW_AUTOMATION = "workflow_automation"

class ComplexityLevel(Enum):
    TRIVIAL = 1      # 简单查天气、翻译单词
    SIMPLE = 2       # 摘要、格式转换
    MODERATE = 3     # 代码生成、数据分析
    COMPLEX = 4      # 多步推理、架构设计
    EXPERT = 5       # 需要深度推理+多工具协作

@dataclass
class IntentProfile:
    """结构化意图描述——路由决策的核心输入"""
    domain: TaskDomain
    complexity: ComplexityLevel
    requires_tools: bool = False
    requires_reasoning: bool = False
    requires_context: bool = False
    estimated_tokens: int = 0
    latency_sensitivity: float = 0.5  # 0.0=不在乎, 1.0=极度敏感
    quality_requirement: float = 0.5  # 0.0=草稿即可, 1.0=必须精准
    confidence: float = 0.0           # 分类置信度
    # generated by hugo AI
```

关键在于：**意图分类器本身也需要被路由**。

- 简单场景：用规则匹配或 fast 模型（<50ms）
- 中等场景：用 small 模型做 zero-shot 分类（<200ms）
- 复杂/模糊场景：用 medium 模型做 few-shot 分类（<500ms）

这就是「元路由」（meta-routing）——路由系统首先要决定用什么方式来路由。

### 3.2 L2：模型路由器

模型路由器是 DRDS 的核心。它需要在**能力、价格、速度**三维空间中找到最优解。

```text
                  能力 (Quality)
                      ^
                      |
              gpt-4o  |  claude-opus
                      |     \
                      |      \
                      |       claude-sonnet
              gpt-4o-mini      \
                      |         \
                      |          gemini-flash
                      |         /
              fast-model ------/
                      |
                      +------------------------> 速度 (Latency)
                     /
              价格 (Cost)
```

模型路由器的决策逻辑：

```python
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class ModelSpec:
    """模型能力规格"""
    name: str
    quality_score: float      # 0-1，基于基准测试
    latency_ms: float         # P95 延迟
    cost_per_1k_tokens: float # 每千 token 成本
    max_context: int          # 最大上下文窗口
    supports_tools: bool      # 是否支持工具调用
    supports_json: bool       # 是否支持结构化输出
    provider: str             # 供应商

@dataclass
class RoutingDecision:
    """路由决策结果"""
    primary_model: str
    fallback_model: Optional[str] = None
    reasoning: str = ""
    estimated_cost: float = 0.0
    estimated_latency_ms: float = 0.0
    # generated by hugo AI
```

**路由策略示例：**

```python
def route_model(
    intent: IntentProfile,
    available_models: List[ModelSpec],
    user_budget: float = 0.1,
    user_latency_sla_ms: float = 5000.0,
) -> RoutingDecision:
    """
    基于意图画像选择最优模型。

    策略：在满足质量和延迟要求的前提下，选择成本最低的模型。
    """
    # Step 1: 过滤——排除不满足硬性约束的模型
    candidates = [
        m for m in available_models
        if m.latency_ms <= user_latency_sla_ms
        and (not intent.requires_tools or m.supports_tools)
    ]

    # Step 2: 评分——计算每个候选模型的综合得分
    scored = []
    for m in candidates:
        quality_gap = max(0, intent.quality_requirement - m.quality_score)
        latency_ratio = m.latency_ms / user_latency_sla_ms
        cost_ratio = m.cost_per_1k_tokens * intent.estimated_tokens / 1000 / max(user_budget, 0.01)

        # 加权评分：质量差距惩罚 > 延迟 > 成本
        score = (
            -quality_gap * 10.0          # 质量不满足是硬伤
            -latency_ratio * 2.0         # 延迟影响体验
            -cost_ratio * 1.0            # 成本影响利润
        )
        scored.append((score, m))

    scored.sort(key=lambda x: x[0], reverse=True)

    if not scored:
        return RoutingDecision(
            primary_model="fallback-default",
            reasoning="No model satisfies constraints",
        )

    best = scored[0][1]
    return RoutingDecision(
        primary_model=best.name,
        fallback_model=scored[1][1].name if len(scored) > 1 else None,
        reasoning=f"Selected {best.name}: quality={best.quality_score}, "
                  f"latency={best.latency_ms}ms, cost=${best.cost_per_1k_tokens}/1k",
        estimated_cost=best.cost_per_1k_tokens * intent.estimated_tokens / 1000,
        estimated_latency_ms=best.latency_ms,
    )
    # generated by hugo AI
```

这个路由策略的关键洞察：**不是所有任务都需要最强模型**。

- 意图分类？fast 模型就够了（quality 0.6 即可）
- 代码生成？需要 medium 以上（quality 0.8+）
- 复杂推理？必须上 reasoning 模型（quality 0.9+）

模型路由器让每一分钱都花在刀刃上。

### 3.3 L3：上下文注入器

上下文注入决定了 Agent 「知道多少」关于用户的信息。注入太少，回答不个性化；注入太多，浪费 token 且可能引入噪声。

```text
                    上下文注入策略矩阵
┌──────────────────┬──────────────┬──────────────┬──────────────┐
│                  │  新用户      │  活跃用户     │  资深用户     │
├──────────────────┼──────────────┼──────────────┼──────────────┤
│ 简单任务         │  零注入      │  最近3条对话  │  偏好配置     │
│                  │  (zero-shot) │  (few-shot)  │  (profile)   │
├──────────────────┼──────────────┼──────────────┼──────────────┤
│ 中等任务         │  系统提示    │  对话+RAG     │  全量画像     │
│                  │  (system)    │  (hybrid)    │  (full)      │
├──────────────────┼──────────────┼──────────────┼──────────────┤
│ 复杂任务         │  系统+示例   │  全量+RAG     │  全量+RAG    │
│                  │  (few-shot)  │  (full+rag)  │  +项目历史   │
└──────────────────┴──────────────┴──────────────┴──────────────┘
```

上下文注入器的核心是一个**相关性排序 + 预算控制**的算法：

```python
@dataclass
class ContextItem:
    """一条上下文信息"""
    content: str
    source: str            # "history", "profile", "rag", "workspace"
    relevance_score: float # 与当前任务的相关度
    token_count: int       # token 数量
    recency: float         # 时间衰减因子 (1.0=最新, 0.0=很久以前)
    # generated by hugo AI

def inject_context(
    intent: IntentProfile,
    user_profile: dict,
    context_items: List[ContextItem],
    token_budget: int = 4000,
) -> List[ContextItem]:
    """
    在 token 预算内选择最优的上下文组合。

    策略：综合相关度、时效性、来源多样性排序，贪心填充预算。
    """
    if not intent.requires_context:
        return []

    # 综合评分 = 相关度 * 时效性 * 来源权重
    source_weights = {
        "profile": 1.2,   # 用户画像最可靠
        "rag": 1.0,       # RAG 检索结果
        "history": 0.9,   # 历史对话
        "workspace": 0.8, # 工作空间上下文
    }

    ranked = sorted(
        context_items,
        key=lambda c: (
            c.relevance_score
            * c.recency
            * source_weights.get(c.source, 0.5)
        ),
        reverse=True,
    )

    # 贪心填充
    selected = []
    used_tokens = 0
    for item in ranked:
        if used_tokens + item.token_count <= token_budget:
            selected.append(item)
            used_tokens += item.token_count

    return selected
    # generated by hugo AI
```

### 3.4 L4：并发控制器

当任务被分解为多个子节点时，并发控制器决定哪些节点可以并行执行，以及每个节点的并发度。

```text
任务依赖图 (DAG) 与并发调度

  ┌─────────┐
  │  意图    │
  │  分类    │
  └────┬────┘
       │
       v
  ┌─────────┐     ┌──────────┐     ┌──────────┐
  │ RAG检索  │────>│ 上下文    │     │ 模型选择  │
  └────┬────┘     │ 组装      │     └────┬────┘
       │          └────┬─────┘          │
       │               │                │
       │    ┌──────────┘                │
       v    v                           v
  ┌──────────────┐              ┌──────────────┐
  │  主任务执行   │<─────────────│  工具调用     │
  │  (LLM call)  │              │  (并行)       │
  └──────┬───────┘              └──────────────┘
         │
         v
  ┌──────────────┐
  │  结果聚合     │
  │  + 反馈收集   │
  └──────────────┘

并发策略:
  - 独立节点：并行执行（RAG检索 + 模型选择）
  - 依赖节点：串行等待（上下文组装 → 主任务执行）
  - 工具调用：按用户并发配额并行（新用户=2，老用户=5）
```

并发控制器的核心约束：

1. **用户级别配额**——付费用户更高并发，免费用户限流
2. **系统负载感知**——高峰期自动降级并发度
3. **工具速率限制**——每个 API 有自己的 rate limit，需要自适应

### 3.5 L5：在线学习器

这是 DRDS 区别于静态路由的**最关键组件**。

系统每做一次路由决策，都会收集以下反馈信号：

```python
@dataclass
class FeedbackSignal:
    """一次路由决策的反馈信号"""
    decision_id: str
    user_id: str
    timestamp: float

    # 决策输入
    intent: IntentProfile
    chosen_model: str
    context_size_tokens: int
    concurrency_level: int

    # 结果指标
    actual_latency_ms: float
    actual_cost: float
    output_quality: Optional[float] = None  # 人工/自动评分

    # 用户行为信号（隐式反馈）
    user_accepted: bool = True        # 用户是否接受了结果
    user_edited: bool = False         # 用户是否编辑了结果
    user_regenerated: bool = False    # 用户是否重新生成
    user_copied: bool = False         # 用户是否复制了结果
    session_continued: bool = True    # 用户是否继续使用

    # 计算出的决策质量
    @property
    def decision_quality(self) -> float:
        """综合决策质量评分 (0-1)"""
        score = 1.0
        if self.user_regenerated:
            score -= 0.5  # 重新生成 = 严重不满
        if self.user_edited:
            score -= 0.2  # 编辑 = 部分不满
        if not self.user_accepted:
            score -= 0.4  # 拒绝 = 完全不满
        if self.user_copied:
            score += 0.1  # 复制 = 满意信号
        if self.output_quality is not None:
            score = score * 0.6 + self.output_quality * 0.4
        return max(0.0, min(1.0, score))
    # generated by hugo AI
```

在线学习器使用这些反馈信号来持续优化路由策略：

```python
from collections import defaultdict
import math

class OnlineLearner:
    """
    基于多臂老虎机 (Multi-Armed Bandit) 的在线学习器。

    核心思想：探索-利用权衡 (Explore-Exploit Tradeoff)
    - 利用：选择历史表现最好的模型
    - 探索：偶尔尝试其他模型，发现更好的选择
    """

    def __init__(self, exploration_rate: float = 0.1):
        self.exploration_rate = exploration_rate
        # 每个意图-模型组合的统计信息
        self.stats: dict = defaultdict(lambda: {
            "count": 0,
            "total_quality": 0.0,
            "total_cost": 0.0,
            "total_latency": 0.0,
        })

    def record_feedback(self, signal: FeedbackSignal) -> None:
        """记录一次反馈"""
        key = f"{signal.intent.domain.value}:{signal.chosen_model}"
        s = self.stats[key]
        s["count"] += 1
        s["total_quality"] += signal.decision_quality
        s["total_cost"] += signal.actual_cost
        s["total_latency"] += signal.actual_latency_ms

    def get_best_model(self, domain: TaskDomain, candidates: List[str]) -> str:
        """
        使用 UCB1 算法选择最优模型。

        UCB1 = 平均奖励 + 探索奖励
        探索奖励随尝试次数衰减，确保充分探索后收敛到最优。
        """
        import random
        if random.random() < self.exploration_rate:
            return random.choice(candidates)  # 随机探索

        best_score = -float("inf")
        best_model = candidates[0]

        total_trials = sum(
            self.stats[f"{domain.value}:{m}"]["count"]
            for m in candidates
        )

        for model in candidates:
            key = f"{domain.value}:{model}"
            s = self.stats[key]
            if s["count"] == 0:
                return model  # 未尝试过的模型优先探索

            avg_quality = s["total_quality"] / s["count"]
            # UCB1 探索奖励
            exploration_bonus = math.sqrt(
                2 * math.log(max(total_trials, 1)) / s["count"]
            )
            score = avg_quality + exploration_bonus * 0.3

            if score > best_score:
                best_score = score
                best_model = model

        return best_model

    def export_policy(self) -> dict:
        """导出当前学习到的路由策略"""
        policy = {}
        for key, s in self.stats.items():
            if s["count"] > 0:
                policy[key] = {
                    "avg_quality": s["total_quality"] / s["count"],
                    "avg_cost": s["total_cost"] / s["count"],
                    "avg_latency": s["total_latency"] / s["count"],
                    "samples": s["count"],
                }
        return policy
    # generated by hugo AI
```

UCB1 算法的精妙之处在于：**它自动平衡了探索和利用**。

- 初期：探索奖励高，系统会尝试各种模型组合
- 中期：逐渐收敛到表现稳定的模型
- 长期：当某个模型质量下降（如供应商更新），探索奖励会重新升高，触发再探索

这就是**在线学习**的力量——系统不需要人工调参，自己就能找到最优路由策略。

## 四、数据反馈闭环：让系统自己进化

DRDS 的核心竞争力不在于初始路由策略有多好，而在于**系统能否从每一次交互中学习并进化**。

```text
数据反馈闭环架构

  ┌─────────────────────────────────────────────────────────────┐
  │                                                             │
  │  ┌─────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐ │
  │  │  用户    │───>│  DRDS   │───>│  Agent   │───>│  结果    │ │
  │  │  输入    │    │  路由   │    │  执行    │    │  输出    │ │
  │  └─────────┘    └────┬────┘    └──────────┘    └────┬────┘ │
  │                      │                               │      │
  │                      │  路由决策日志                   │      │
  │                      v                               v      │
  │              ┌──────────────┐              ┌──────────────┐ │
  │              │  Decision    │              │  Feedback    │ │
  │              │  Logger      │              │  Collector   │ │
  │              │  (what was   │              │  (what       │ │
  │              │   chosen)    │              │   happened)  │ │
  │              └──────┬───────┘              └──────┬───────┘ │
  │                     │                             │         │
  │                     v                             v         │
  │              ┌──────────────────────────────────────────┐   │
  │              │          Feature Store                   │   │
  │              │  (intent + decision + outcome features)  │   │
  │              └──────────────────┬───────────────────────┘   │
  │                                 │                           │
  │                                 v                           │
  │              ┌──────────────────────────────────────────┐   │
  │              │          Online Learner                  │   │
  │              │  (UCB / Thompson Sampling / Neural)      │   │
  │              │                                          │   │
  │              │  更新路由策略 → 实时生效                   │   │
  │              └──────────────────────────────────────────┘   │
  │                                 │                           │
  │                                 v                           │
  │              ┌──────────────────────────────────────────┐   │
  │              │          Policy Server                   │   │
  │              │  (serve updated routing policy)          │   │
  │              └──────────────────────────────────────────┘   │
  │                                 │                           │
  └─────────────────────────────────┼───────────────────────────┘
                                    │
                                    v
                            ┌──────────────┐
                            │  DRDS Router  │
                            │  (updated!)   │
                            └──────────────┘
```

### 4.1 反馈信号的类型

| 信号类型 | 来源 | 可靠性 | 延迟 |
|----------|------|--------|------|
| 显式评分 | 用户点赞/踩 | 高 | 实时 |
| 隐式行为 | 复制/编辑/重新生成 | 中 | 实时 |
| 业务指标 | 留存率/使用时长 | 高 | 天级 |
| 自动评估 | LLM-as-Judge 质量评分 | 中 | 分钟级 |
| 成本指标 | 实际 token 消耗 | 精确 | 实时 |

### 4.2 在线学习的三个层次

**Level 1：统计反馈（Bandit）**
- 记录每个路由决策的结果
- 用 UCB/Thompson Sampling 调整选择概率
- 适合：冷启动阶段，快速收敛

**Level 2：特征学习（Contextual Bandit）**
- 将用户画像、任务特征作为输入
- 学习「在什么场景下选什么模型最优」
- 适合：有一定数据积累后

**Level 3：端到端优化（RL / Supervised）**
- 用强化学习或监督学习训练路由策略
- 输入：完整状态（用户+任务+系统）
- 输出：最优路由动作
- 适合：大规模生产环境

大多数团队从 Level 1 开始就够了。关键是**先建立反馈闭环**，而不是追求算法的复杂度。

## 五、落地建议：从静态到动态的迁移路径

如果你正在从静态 Agent 架构迁移到动态路由系统，建议分三步走：

### 第一步：加日志（Day 1）

在现有系统中加入决策日志，记录：
- 每次调用了什么模型
- 花了多少时间和钱
- 用户做了什么（接受/编辑/重新生成）

**不需要改任何路由逻辑**，先收集数据。

### 第二步：加规则（Week 2-4）

基于第一步的数据，写几个简单的路由规则：
- 简单任务 → fast 模型
- 复杂任务 → reasoning 模型
- 新用户 → 少上下文
- 老用户 → 多上下文

这一步就能看到**成本下降 30-50%**的效果。

### 第三步：加学习（Month 2-3）

引入在线学习器，让规则自动进化：
- 用 UCB 替代硬编码规则
- 用隐式反馈自动调整策略
- 定期 review 策略质量

这一步实现的是**系统自我优化**，不再需要人工调参。

## 六、总结

Agent 的未来不在于更强大的单体模型，而在于**更聪明的调度系统**。

动态路由决策系统（DRDS）的核心思想很简单：

> **把「用什么模型、调什么工具、注多少上下文、开多少并发」这些决策，从编译时的硬编码，变成运行时的动态计算。**

但让这套系统真正不可替代的，是它的**自进化能力**：

> **每一次用户交互，都是一次训练样本。系统用得越多，路由越准。数据飞轮一旦转起来，就是最深的护城河。**

这里有一个关键的认知转变：

**在小规模阶段，自进化是「nice to have」——** 你可以靠人写规则来凑合，系统也能跑。

**在规模化阶段，自进化是「must have」——** 规则组合空间爆炸到百万级，没有人能手动维护。只有端到端的自进化系统，才能在规模化下保持成本可控、体验个性化、策略持续优化。

千人千面不是靠产品经理写规则实现的，而是靠系统自己学习出来的。而端到端的闭环，是让这个学习过程持续运转的唯一方式。

**自进化不是 Agent 的加分项，而是规模化后的必选项。** 没有自进化能力的 Agent 系统，在规模化后会被成本和体验的双重压力拖垮；而有自进化能力的系统，规模越大，优势越强。

你在实际落地 Agent 时，有没有遇到过规模化后的路由或成本问题？欢迎留言讨论。
