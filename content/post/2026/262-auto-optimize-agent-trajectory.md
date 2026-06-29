---
ingested: 2026-06-29
sha256: f6b2de946d9408bfe28c0d241ccbf5cdf4890b282013da0ff6d6d0f299b7eade
title: "自动优化 Agent 的执行轨迹"
subtitle: "Trajectory Optimization and Skill Distillation for AI Agents"
date: 2026-06-09
tags: ["ai-agent", "trajectory-optimization", "llm-agent", "system-design", "skill-distillation", "evaluation"]
---

上个月有人问我一个问题：「我已经有 LLM-as-Judge 做 eval 了，能不能用它来自动优化 Agent 的执行路径？在不降质量的前提下，找到最省钱的轨迹，然后让 Agent 记住？」

这个问题的答案值得展开。答案是能，而且这可能是当前 Agent 优化里最值得投入的方向。但大多数团队理解错了「优化」的对象。

[![Agent 轨迹优化：从零规划到 Skill 蒸馏](/img/2026/auto-optimize-agent-trajectory-thumb.jpg)](/img/2026/auto-optimize-agent-trajectory.png)

<!--more-->

## 一、问题：Agent 每次都在从零开始

上周，我观察悟空处理一个「分析 1000 个商品并生成选品报告」的任务。

第一次执行，Agent 的轨迹是这样的：

```text
Trajectory A
├── web_search × 5（淘宝、小红书、京东、抖音、亚马逊）
├── python_analysis × 3（销量聚合、评论分析、竞品对比）
├── markdown_report × 1
├── Eval: 92 分
├── Cost: $0.80
└── Time: 120s
```

然后我用同一组参数配置跑了 20 次，发现有一条轨迹是这样的：

```text
Trajectory B
├── web_search × 2（综合电商数据源 + 社交媒体趋势）
├── python_analysis × 1（一次性聚合分析）
├── markdown_report × 1
├── Eval: 91 分
├── Cost: $0.20
└── Time: 35s
```

91 分已经满足业务要求（门槛是 90 分）。但 Agent 第一次不会选 B，因为它的规划器倾向于「全面搜索」——这是预训练行为，不是针对这个任务的最优策略。

如果没有轨迹采集和对比机制，团队永远不会知道 B 的存在。Agent 会一直用 A 的成本产出 A 的质量，而你根本不知道 75% 的钱是浪费的。

这就是大多数团队面临的真实问题： **不是 Agent 不够好，而是没有人去找过更好的路径。**

## 二、大多数团队优化错了对象

当 Agent 效果不理想时，常见的优化手段有三个：

1. **改 prompt**——加更多指令、更多约束、更多 few-shot 示例
2. **换模型**——从 GPT-4o 切到 Claude Sonnet，或者反过来
3. **加工具**——给 Agent 更多 API、更多数据源

这些确实是优化，但它们优化的不是同一样东西。

改 prompt 优化的是 **指令质量**——让 Agent 更好地理解你想干什么。换模型优化的是 **推理能力**——让 Agent 的思考更深更准。加工具优化的是 **能力边界**——让 Agent 能做更多事。

但没有人优化 **执行轨迹**——同一个 Goal，Agent 可以走出完全不同的路径，成本差 4 倍，质量只差 1 分。

这才是真正的优化空间。

### Prompt 编码的是静态知识，轨迹模式是动态经验

一个常见的反驳是：「好的 prompt 自然会产生好的轨迹。」

这在一定程度上是对的。如果你的 prompt 写了「先查销量，再查评论，最后做竞品分析」，Agent 确实会按这个顺序执行。但 prompt 做不到的是：

- 告诉 Agent **搜索几次就够了**——这取决于数据源的丰富度和任务的具体要求
- 告诉 Agent **哪两个工具调用可以合并**——这取决于中间结果的形状和下游步骤的输入需求
- 告诉 Agent **什么时候该停**——这取决于产出的边际质量增益

这些模式只在实际执行中才能被发现。它们是 **经验**，不是 **知识**。

这就像给一个新员工一本完美的操作手册。他能照做，但他不会自动选择最优的工作节奏——那是干了一百次之后才有的直觉。Agent 也需要积累这种「直觉」，而轨迹就是经验的载体。

## 三、轨迹优化闭环

把问题想清楚后，架构就自然出来了：

```text
┌──────────────────────────────────────────────────────────────┐
│                    轨迹优化闭环架构                            │
│                                                              │
│   用户 Goal                                                  │
│      ↓                                                       │
│   Agent Runtime ────────→ Trajectory Store                   │
│      ↓                         │                             │
│   产出物                       │ 批量分析                      │
│      ↓                         ↓                             │
│   LLM Judge（Eval）     轨迹搜索（Best-of-N）                 │
│      ↓                         │                             │
│   Reward Score           Pareto 最优轨迹                      │
│                                │                             │
│                                ↓                             │
│                          Skill 蒸馏                          │
│                                │                             │
│                                ↓                             │
│                          Skill Library                       │
│                                │                             │
│                                ↓                             │
│                     下次任务优先调用 Skill ──→ 反馈 ──┘        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

这个系统有五个关键组件：

| 组件 | 职责 | 类比 |
|------|------|------|
| Agent Runtime | 执行任务，产生轨迹 | 程序运行 |
| Trajectory Store | 存储完整执行轨迹 | 执行日志 |
| LLM Judge | 对产出物评分 | 单元测试 |
| Best-of-N Search | 在轨迹空间中找最优 | 编译器优化 pass |
| Skill Library | 存储蒸馏后的可复用技能 | 函数库 |

注意，这不是一个线性流水线，而是一个 **闭环**。Skill 被使用后的新轨迹会再次进入 Store，形成持续优化的飞轮。

### Best-of-N：在轨迹空间中搜索

核心思路很简单：对同一个 Goal 执行 N 次，每次探索不同的参数组合。

```python
from dataclasses import dataclass
import random

@dataclass
class TrajectoryRecord:
    goal: str
    steps: list[str]          # ["search", "search", "python", "report"]
    tool_calls: list[dict]    # 每次工具调用的详细参数和结果
    cost_usd: float
    latency_s: float
    eval_score: float         # LLM Judge 评分 (0-100)

def collect_trajectories(goal: str, n: int = 20) -> list[TrajectoryRecord]:
    """对同一 Goal 执行 N 次，收集完整轨迹。"""
    records: list[TrajectoryRecord] = []
    for i in range(n):
        # 每次用不同的探索参数
        config = {
            "temperature": random.uniform(0.0, 0.8),
            "max_searches": random.randint(1, 6),
            "thinking_depth": random.choice(["shallow", "medium", "deep"]),
        }
        trajectory = agent.execute(goal, config=config)
        score = llm_judge.evaluate(trajectory.output)
        records.append(TrajectoryRecord(
            goal=goal,
            steps=trajectory.steps,
            tool_calls=trajectory.tool_calls,
            cost_usd=trajectory.cost,
            latency_s=trajectory.latency,
            eval_score=score,
        ))
    return records
# generated by hugo AI
```

N 次执行后，你得到一张轨迹表：

| Run | Steps | Cost | Time | Eval |
|-----|-------|------|------|------|
| #1 | 5S+3P+1R | $0.80 | 120s | 92 |
| #2 | 2S+1P+1R | $0.20 | 35s | 91 |
| #3 | 4S+2P+1R | $0.60 | 90s | 89 |
| #4 | 3S+2P+1R | $0.55 | 78s | 93 |
| #5 | 2S+1P+1R | $0.25 | 40s | 87 |

### Reward 函数：质量不是唯一目标

有了轨迹数据，下一步是定义什么是「好」。

```python
@dataclass
class RewardConfig:
    min_quality: float = 90.0     # 质量门槛
    alpha: float = 10.0           # 成本惩罚权重
    beta: float = 0.1             # 延迟惩罚权重

def compute_reward(record: TrajectoryRecord, config: RewardConfig) -> float:
    """多目标奖励函数。低于质量门槛直接淘汰。"""
    if record.eval_score < config.min_quality:
        return float("-inf")
    return (
        record.eval_score
        - config.alpha * record.cost_usd
        - config.beta * record.latency_s
    )

def find_pareto_frontier(
    records: list[TrajectoryRecord],
    config: RewardConfig,
) -> list[TrajectoryRecord]:
    """找出 Pareto 最优轨迹集合。"""
    scored = [(r, compute_reward(r, config)) for r in records]
    scored.sort(key=lambda x: x[1], reverse=True)
    # 过滤掉低于质量门槛的
    valid = [(r, s) for r, s in scored if r.eval_score >= config.min_quality]
    return [r for r, _ in valid[:3]]  # 返回 Top-3
# generated by hugo AI
```

Reward 函数的设计决定了系统优化的方向。如果 `alpha` 很大，系统会极端偏好低成本路径；如果 `beta` 很大，系统会偏好快速路径。这个配置本身就是一个业务决策——不同场景对成本和延迟的容忍度不同。

## 四、该记住什么

找到最优轨迹只是一半。更难的问题是： **Agent 应该记住什么？**

### 记住实例 vs 记住规律

很多团队的第一反应是把整条最优轨迹塞进 Memory。效果通常很差。

为什么？因为原始轨迹包含大量 **具体但不通用** 的细节——特定的搜索词、特定的数据值、特定的时间戳。这些信息没有泛化价值。

```text
❌ 记住实例：
「分析商品 A 时，先搜淘宝关键词"夏季连衣裙 2026"，
再搜小红书"穿搭推荐"，然后用 Python 做 sentiment analysis...」

✅ 记住规律：
「选品分析任务：
 1. 聚合销量数据（1-2 次搜索）
 2. 聚合评论情感（1 次搜索）
 3. 竞品趋势对比（1 次搜索）
 4. 一次性分析并生成报告
 预期：减少 60% 搜索次数，质量损失 < 2 分」
```

这就像导航系统。你不会记住「昨天从 A 到 B 走了中山路，用了 45 分钟」——你会记住「早高峰走二环转高架，避开学校和医院路段，能省 40% 时间」。前者是一次经历，后者是一条可复用的规律。

### 蒸馏成 Skill

最优轨迹中的规律，应该被提取为 **Skill**——不是原始日志，而是可复用的执行模板。

```python
from dataclasses import dataclass, field

@dataclass
class Skill:
    name: str
    trigger_pattern: str          # 什么类型的任务触发这个 Skill
    input_type: str               # 输入数据的结构描述
    output_type: str              # 产出物的结构描述
    steps: list[str]              # 最优步骤序列
    expected_success_rate: float  # 基于历史轨迹的成功率
    avg_cost_usd: float           # 平均成本
    avg_latency_s: float          # 平均耗时
    source_trajectories: list[str] = field(default_factory=list)  # 溯源

# 从选品案例蒸馏出的 Skill 示例
product_analysis_skill = Skill(
    name="选品分析报告",
    trigger_pattern="商品分析|选品|品类调研",
    input_type="商品列表（含品类、价格区间）",
    output_type="Markdown 选品报告（含数据表格）",
    steps=[
        "聚合销量数据（1-2 次搜索，优先综合数据源）",
        "聚合评论情感分析（1 次搜索）",
        "竞品趋势对比（1 次搜索）",
        "一次性 Python 分析，生成结构化报告",
    ],
    expected_success_rate=0.91,
    avg_cost_usd=0.20,
    avg_latency_s=35.0,
    source_trajectories=["traj_20260601_002", "traj_20260603_015"],
)
# generated by hugo AI
```

这个 Skill 就是蒸馏后的产物。它不再包含任何具体的搜索词或数据值，只保留了 **步骤结构和预期效果**。任何满足 `trigger_pattern` 的新任务都可以直接加载这个 Skill，跳过从零规划的过程。

在 [SKILL.md 不是文档，是编译器](https://hugozhu.site/post/2026/242-skill-as-compiler/) 中我详细讲过 Skill 作为 Agent 运行时规范的效果——一个 SKILL.md 文件让 Agent 的行为从概率分布变成确定性流水线。这里讨论的是另一面： **Skill 不应该全靠人写，而应该从 Agent 的成功执行中自动蒸馏出来。**

## 五、Skill 优先于规划

有了 Skill Library，Agent 的决策顺序变了：

```text
收到 Goal
   ↓
Skill 检索：是否有匹配的 Skill？
   ├── 有（success_rate > 0.85，cost 在可接受范围内）
   │      ↓
   │   直接加载 Skill，跳过规划
   │      ↓
   │   执行，成本极低，延迟极低，质量稳定
   │
   └── 没有
          ↓
       正常规划 + 执行
          ↓
       轨迹存入 Store，等待蒸馏
```

**这个顺序很关键。** 它意味着 Agent 不会每次都从零开始思考。当一个任务已经有成熟的 Skill，Agent 直接走 Skill 路径——就像一个资深工程师修一个常见 bug，不会重新推导整个调试方法论，而是直接匹配模式、走最短路径。

这也是 Claude Code 和 Codex 正在做的事，只是它们的方式是 **隐式** 的：当你反复让 Claude Code 修类似的 bug，它会在上下文中自然地跳过不必要的文件读取和搜索，直接定位问题。这是隐式轨迹压缩——模型在单次会话的上下文内学会了更高效的路径。

但隐式压缩有两个硬伤：

1. **无法跨会话持久化**——新对话里，一切从零开始
2. **无法被审查和修正**——你不知道它跳过了什么，也不知道跳过是否正确

显式的 Skill 蒸馏解决了这两个问题：Skill 是持久化的、可审查的、可手动修正的。

## 六、工程挑战与诚实评估

说完了理想架构，讲几个实现中的真实挑战。

### 轨迹的存储成本

每执行一次任务就产生一条完整轨迹，包含所有工具调用的输入输出、思考过程、中间结果。如果任务量大，轨迹库会快速膨胀。

我的建议是分层的存储策略：

- **短期** （1 周内）：保留完整轨迹，用于近期分析和 Skill 蒸馏
- **中期** （1-3 个月）：只保留轨迹摘要（步骤序列 + Reward 分数），用于趋势分析
- **长期**：只保留蒸馏后的 Skill，原始轨迹删除

这和日志系统的冷热分层是同一个思路。

### Eval 一致性

LLM-as-Judge 本身有随机性。同一条轨迹跑 3 次 eval，分数可能波动 ±3 分。如果 Best-of-N 搜索依赖 eval 分数排序，波动会导致选错最优。

解法有两个方向：

1. **多次评估取中位数**——每条轨迹评 3 次取 median，牺牲 3x eval 成本换稳定性
2. **结构化 eval 标准**——在 eval prompt 中明确质量维度和评分锚点，减少主观波动

关于 eval 系统的设计，我在 [悟空技巧十：评估与度量](https://hugozhu.site/post/2026/225-wukong-prompt-evaluation-and-metrics/) 中有更详细的讨论。核心原则不变： **eval 的可靠性直接决定了整个优化闭环的有效性。** 垃圾 eval 产出垃圾 Skill。

### Skill 的泛化边界

一个从「分析 1000 个女装商品」蒸馏出的 Skill，用在「分析 500 个电子产品」上效果如何？

答案是：不一定。Skill 有泛化边界，这个边界需要被显式管理。

我的做法是给 Skill 加 `scope` 标签：

```python
@dataclass
class SkillScope:
    category: str          # "服装", "电子", "食品"
    min_items: int         # 最少处理多少条数据验证过
    max_items: int         # 最多处理多少条数据验证过
    data_sources: list[str]  # 使用过哪些数据源
# generated by hugo AI
```

当新任务的参数超出 scope 时，Agent 应该回退到正常规划路径，而不是强行使用 Skill。这个回退机制是 Skill Library 可靠性的关键。

## 七、和已有架构的关系

这套轨迹优化闭环不是要替代现有的 Agent 架构，而是在上面加一层。

[用 Goal 取代 Graph](https://hugozhu.site/post/2026/248-goal-replaces-graph/) 讨论的是 Agent 的 **执行模式**——给 Agent 一个目标，让它自己规划路径，而不是预定义 DAG。这解决了「怎么执行」的问题，但没有解决「怎么越执行越好」的问题。轨迹优化补上了这一环。

[AI Agent 定时任务的自动优化](https://hugozhu.site/post/2026/247-cron-auto-optimization-for-ai-agents/) 解决的是 **调度层** 的优化——什么时候跑、用什么模型跑。那是调度器的决策。轨迹优化解决的是 **执行层** 的优化——同一个模型、同一个调度配置下，走出更优的步骤序列。两者在不同层次上互补。

[Token 经济学](https://hugozhu.site/post/2026/227-wukong-prompt-token-economics/) 提供了成本优化的工程手段——模型路由、KV Cache、推理瘦身。这些是 **单次执行内** 的成本控制。轨迹优化是 **跨执行** 的成本控制——通过找到更好的路径来从根本上降低成本。

把这几层叠在一起，就是一个完整的 Agent 优化体系：

```text
┌─────────────────────────────────────────────────────┐
│  第 4 层：Skill Library（跨执行的经验积累）           │
├─────────────────────────────────────────────────────┤
│  第 3 层：轨迹优化（跨执行的路径搜索）                │
├─────────────────────────────────────────────────────┤
│  第 2 层：Token 经济学（单次执行内的成本控制）         │
├─────────────────────────────────────────────────────┤
│  第 1 层：Goal-Driven 执行（给目标，不给图）          │
├─────────────────────────────────────────────────────┤
│  第 0 层：调度优化（什么时候跑、用什么跑）            │
└─────────────────────────────────────────────────────┘
```

大多数团队还卡在第 0 层和第 1 层。第 2 层（Token 经济学）有成熟的工具可以用。第 3 层和第 4 层，目前几乎没有团队在做——但这恰恰是 **Agent 从「能用」跳到「好用且便宜」** 的关键层。

## 八、一个更尖锐的问题

如果 Agent 能从历史执行中持续学习，它的 Skill Library 本质上就是组织的流程知识——不是写在文档里、不是画在流程图里，而是 **编码在 Agent 的行为模式中**。

这引出一个我觉得值得思考的问题：当 Skill Library 足够丰富时，Agent 的规划能力还重要吗？

一个有 1000 个高质量 Skill 的普通 Agent，和一个规划能力极强但没有任何 Skill 的顶级 Agent，你会选哪个？

我倾向于选前者。因为规划能力的上限是「从零找到最优路径」，而 Skill Library 的上限是「直接走已知最优路径，把规划能力留给真正没见过的新任务」。

这其实和人类专家的逻辑一样。你不会让一个资深工程师每次修 bug 都从第一性原理推导——那太浪费了。你希望他把经验编码成直觉，把脑力留给真正需要创造力的问题。

Agent 也应该这样。轨迹优化和 Skill 蒸馏，就是在帮 Agent 建立这种直觉。

---

*你在实践中有没有观察过 Agent 的执行轨迹？有没有发现明显浪费的步骤？欢迎留言讨论。*
