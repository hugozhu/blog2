---
title: "Agent-as-a-Judge：自进化Agent的眼睛"
subtitle: "Why self-evolving agents need automated evaluation to survive long-horizon tasks"
date: 2026-05-07
tags: ["ai-agent", "self-evolution", "agent-evaluation", "recursive-self-improvement", "agent-as-a-judge"]
ingested: 2026-05-19
sha256: be77fb1f395b685dd3a6234db8e992110ddc511a6847a2953fd2e18699de9ccb
---

上周，一个朋友的团队遇到了这样一件事：他们部署了一个 Coding Agent，让它独立完成一个微服务模块的重构。Agent 跑了整整 6 个小时，提交了 47 个 commit，改了 2000 多行代码。第二天早上，Tech Lead 打开 PR，看着满屏的 diff，沉默了五分钟，说了一句："我怎么知道它中间做对了什么、做错了什么？"

这不是个例。随着 Agent 能处理的任务越来越长、越来越复杂，一个被忽略的问题浮出水面：**谁来评估 Agent 的工作？**

<!--more-->

## 一、被忽视的瓶颈：长时程任务的评估真空

### 1.1 传统评估的局限

过去我们评估 AI 系统，用的是固定 benchmark：

```text
┌─────────────────────────────────────────────┐
│          传统 Benchmark 评估模式              │
│                                             │
│   Input ──→ Agent ──→ Output ──→ Rubric     │
│                            │                │
│                            ▼                │
│                    Score (0-100)            │
│                                             │
│  特点：                                      │
│  • 任务短（几分钟到几十分钟）                   │
│  • 有标准答案                                │
│  • 评估是一次性的                             │
└─────────────────────────────────────────────┘
```

这种模式在短任务上运作良好。GSM8K 数学题有标准答案，HumanEval 编程题有单元测试。但当 Agent 开始处理**长时程任务**（long-horizon tasks）时，这套体系彻底失效：

- **没有标准答案**：重构一个微服务、调研一个技术方向、运营一个社交媒体账号——这些任务没有"正确答案"
- **过程比结果重要**：Agent 跑了 6 小时，最终结果可能看起来还行，但中间可能走了大量弯路，甚至引入了隐蔽的 bug
- **人类评估成本太高**：让一个高级工程师花 2 小时 review Agent 6 小时的工作，ROI 是负的

### 1.2 评估四象限模型

我把 Agent 任务按两个维度划分：**任务时长**和**评估复杂度**。这形成了一个四象限模型：

```text
  评估复杂度
     ↑
  高 │  第四象限          │  第三象限
     │  长时程 + 高复杂度  │  短时程 + 高复杂度
     │  ──────────────────┼──────────────────
     │  • 微服务重构       │  • 算法竞赛题
     │  • 技术调研报告     │  • 系统设计面试
     │  • 产品方案设计     │  • 代码安全审计
     │                    │
     │  ← 评估真空区       │  ← Benchmark 覆盖
  ───┼────────────────────┼──────────────────→ 任务时长
     │                    │
     │  第一象限          │  第二象限
     │  长时程 + 低复杂度  │  短时程 + 低复杂度
     │  ──────────────────┼──────────────────
     │  • 数据批量处理     │  • 数学计算题
     │  • 日志分析         │  • 简单编程题
     │  • 定时报表生成     │  • 文本翻译
     │                    │
     │  ← 规则可覆盖       │  ← Benchmark 成熟
  低 │                    │
     └────────────────────┴────────────────────
```

**关键洞察**：第三象限（短时程 + 高复杂度）已经被现有 benchmark 覆盖得很好。真正的问题在**第四象限**——长时程 + 高复杂度任务。这里是**评估真空区**，也是 Agent-as-a-Judge 要解决的核心问题。

## 二、Agent-as-a-Judge 是什么

### 2.1 核心概念

Agent-as-a-Judge 由 KAUST 诸葛鸣晨博士在 2024 年提出。核心思想很简单但深刻：**让另一个 Agent 来评估执行 Agent 的工作**。

```text
┌──────────────────────────────────────────────────────────┐
│              Agent-as-a-Judge 评估闭环                     │
│                                                          │
│  ┌──────────┐    task     ┌──────────┐                   │
│  │  Human   │────────────→│ Executor │                   │
│  │ (optional)│             │  Agent   │                   │
│  └──────────┘             └────┬─────┘                   │
│       ↑                        │                         │
│       │  final review          │  intermediate states     │
│       │                        ▼                         │
│       │               ┌──────────────┐                   │
│       │               │    Judge     │                   │
│       │               │    Agent     │                   │
│       │               └──────┬───────┘                   │
│       │                      │                           │
│       │                      │ feedback/score            │
│       │                      ▼                           │
│       │               ┌──────────────┐                   │
│       └───────────────│   Feedback   │                   │
│                       │    Loop      │                   │
│                       └──────────────┘                   │
│                                                          │
│  关键区别：                                                │
│  • Judge 不只看最终结果，还评估中间过程                      │
│  • 反馈是持续的，不是一次性的                               │
│  • 不要求 100% 精准，只要有方向性即可                       │
└──────────────────────────────────────────────────────────┘
```

### 2.2 与 RL Reward 的本质区别

很多人第一反应是："这不就是 RL 里的 reward 吗？"

不是。两者解决的问题维度完全不同：

| 维度 | RL Reward | Agent-as-a-Judge |
|------|-----------|------------------|
| **阶段** | 训练阶段 | 推理/执行阶段 |
| **目标** | 更新策略参数 | 提供持续评估反馈 |
| **粒度** | 标量信号（一个数字） | 结构化评估（多维度） |
| **时效** | episode 结束时 | 任务执行过程中持续 |
| **用途** | 优化模型权重 | 长期演化和多主体协作 |

打个比方：RL Reward 像是考试分数，用来改进学习方法；Agent-as-a-Judge 像是导师的日常指导，告诉你"这个方向对了""那个思路有问题"。

### 2.3 为什么不需要 100% 精准

这是 Agent-as-a-Judge 最反直觉的设计原则：**评估不需要完美，只需要有方向性**。

AlphaGo 的 Move 37 是个经典例子。当时所有人类棋手都认为那是一步臭棋，但 AlphaGo 的内部评估显示这步棋的胜率很高。最终证明它是对的。

Agent-as-a-Judge 同理。它的评估可能有偏差，但只要偏差是**系统性的**（不是一会儿高估一会儿低估），就足以支撑迭代闭环。就像指南针不需要精确到 0.1 度，只要大致指向北方，就能引导你到达目的地。

## 三、Agent-as-a-Judge 的工程实现

### 3.1 评估维度设计

一个实用的 Judge Agent 需要从多个维度评估执行 Agent 的工作。以下是一个典型的评估框架：

```python
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class ConfidenceLevel(Enum):
    """评估置信度等级"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class EvaluationDimension:
    """单个评估维度"""
    name: str
    score: float  # 0.0 - 10.0
    weight: float  # 权重
    rationale: str  # 评分理由
    evidence: Optional[str] = None  # 证据引用


@dataclass
class JudgeVerdict:
    """Judge 的最终裁决"""
    overall_score: float
    dimensions: list[EvaluationDimension]
    confidence: ConfidenceLevel
    actionable_feedback: str
    critical_issues: list[str] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)

    def is_passing(self, threshold: float = 6.0) -> bool:
        """是否通过评估"""
        return self.overall_score >= threshold

    def weighted_score(self) -> float:
        """计算加权分数"""
        total_weight = sum(d.weight for d in self.dimensions)
        if total_weight == 0:
            return 0.0
        return sum(
            d.score * d.weight for d in self.dimensions
        ) / total_weight
# generated by hugo AI
```

### 3.2 Judge Agent 的核心流程

Judge Agent 的工作流程可以分为三个阶段：**观察 → 分析 → 裁决**。

```python
from dataclasses import dataclass
from typing import Protocol


class ExecutionTrace(Protocol):
    """执行轨迹 — Agent 的工作记录"""

    def get_steps(self) -> list[dict]:
        """获取所有执行步骤"""
        ...

    def get_intermediate_outputs(self) -> list[dict]:
        """获取中间输出"""
        ...

    def get_final_output(self) -> dict:
        """获取最终输出"""
        ...


@dataclass
class JudgeAgent:
    """Agent-as-a-Judge 核心实现"""

    evaluation_prompt_template: str
    dimensions: list[str]
    threshold: float = 6.0

    def evaluate(
        self,
        task_description: str,
        trace: ExecutionTrace,
    ) -> JudgeVerdict:
        """
        评估执行轨迹。

        Args:
            task_description: 原始任务描述
            trace: Agent 的执行轨迹

        Returns:
            JudgeVerdict: 结构化评估结果
        """
        # Step 1: 观察 — 收集执行证据
        observations = self._observe(trace)

        # Step 2: 分析 — 逐维度评估
        dimensions = []
        for dim_name in self.dimensions:
            dim_eval = self._analyze_dimension(
                dim_name, task_description, observations
            )
            dimensions.append(dim_eval)

        # Step 3: 裁决 — 综合判断
        verdict = self._render_verdict(dimensions, observations)
        return verdict

    def _observe(self, trace: ExecutionTrace) -> dict:
        """观察执行轨迹，提取关键信息"""
        steps = trace.get_steps()
        outputs = trace.get_intermediate_outputs()
        final = trace.get_final_output()

        return {
            "step_count": len(steps),
            "key_decisions": [
                s for s in steps if s.get("type") == "decision"
            ],
            "intermediate_outputs": outputs,
            "final_output": final,
            "error_count": sum(
                1 for s in steps if s.get("type") == "error"
            ),
        }

    def _analyze_dimension(
        self,
        dimension: str,
        task: str,
        observations: dict,
    ) -> EvaluationDimension:
        """
        对单个维度进行评估。

        实际实现中，这里会调用 LLM 来生成
        评分和理由。
        """
        # 简化示例 — 实际应调用 LLM
        return EvaluationDimension(
            name=dimension,
            score=7.5,
            weight=1.0,
            rationale="示例评估理由",
        )

    def _render_verdict(
        self,
        dimensions: list[EvaluationDimension],
        observations: dict,
    ) -> JudgeVerdict:
        """综合各维度生成最终裁决"""
        weighted = sum(
            d.score * d.weight for d in dimensions
        ) / sum(d.weight for d in dimensions)

        return JudgeVerdict(
            overall_score=round(weighted, 1),
            dimensions=dimensions,
            confidence=ConfidenceLevel.MEDIUM,
            actionable_feedback="综合评估反馈...",
        )
# generated by hugo AI
```

### 3.3 关键设计决策

实现 Agent-as-a-Judge 时，有几个关键设计决策：

**决策一：Judge 用哪个模型？**

Judge 的模型应该**不低于**执行 Agent 的模型能力。如果执行 Agent 用的是 Claude 3.5 Sonnet，Judge 至少要用同等或更强的模型。原因很简单：你不能让一个能力更弱的评判者去评估能力更强的执行者——它会看不懂。

**决策二：评估频率如何设定？**

```text
评估频率 vs 开销的权衡：

  评估质量
     ↑
     │         ● 每步评估
     │        /
     │       /
     │      ● 关键节点评估  ← 推荐
     │     /
     │    /
     │   ● 最终评估
     │  /
     └─┼──────────────────→ 评估开销
       低                    高
```

- **每步评估**：质量最高，但开销巨大，不适合长任务
- **最终评估**：开销最低，但丢失了中间过程信息
- **关键节点评估**（推荐）：在 Agent 做出关键决策、完成重要里程碑时触发评估，平衡质量和开销

**决策三：评估结果如何驱动进化？**

这是 Agent-as-a-Judge 与 RSI（Recursive Self-Improvement）的连接点：

```text
┌─────────────────────────────────────────────────────┐
│         自进化闭环：Judge 驱动的持续改进               │
│                                                     │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐         │
│  │ Execute │───→│  Judge  │───→│ Analyze │         │
│  │  Task   │    │  Score  │    │  Gap    │         │
│  └─────────┘    └─────────┘    └────┬────┘         │
│       ↑                              │              │
│       │                              ▼              │
│       │                        ┌──────────┐         │
│       │                        │  Update  │         │
│       │                        │ Strategy │         │
│       │                        └────┬─────┘         │
│       │                             │               │
│       └─────────────────────────────┘               │
│                                                     │
│  进化路径：                                          │
│  1. Skill 进化 — 将成功经验固化为新 skill             │
│  2. Prompt 进化 — 根据失败案例优化 prompt            │
│  3. Workflow 进化 — 调整任务分解策略                 │
│  4. Tool 进化 — 发现缺失工具并创建                   │
└─────────────────────────────────────────────────────┘
```

## 四、落地挑战与应对策略

### 4.1 Judge 的幻觉问题

Judge 本身也是 LLM 驱动的 Agent，它也会产生幻觉。一个常见的反模式是：Judge 给出了看起来很专业的评估，但评估依据是编造的。

**应对策略**：
- **证据引用**：要求 Judge 的每个评分都必须引用具体的执行步骤或输出
- **多 Judge 投票**：对关键任务使用多个 Judge 独立评估，取共识
- **人类抽检**：定期由人类 review Judge 的评估质量，校准偏差

### 4.2 评估标准的漂移

随着 Agent 能力提升，昨天的"优秀"可能变成今天的"及格"。评估标准需要动态调整。

**应对策略**：
- **锚定样本**：保留一组固定难度的历史任务作为基准
- **相对评估**：不仅给绝对分数，还给出与历史表现的相对比较
- **定期校准**：每月由人类专家重新标注一批样本，校准 Judge 的评分尺度

### 4.3 成本考量

每个任务都跑一个 Judge，成本翻倍。对于高频场景，这是不可接受的。

**应对策略**：
- **分层评估**：简单任务用轻量级规则检查，复杂任务才调用 Judge
- **采样评估**：不是每个任务都评估，而是按一定比例采样
- **异步评估**：Judge 在后台异步运行，不阻塞主流程

## 五、总结

Agent-as-a-Judge 解决的是一个被长期忽视的问题：**当 Agent 能工作 6 小时、24 小时甚至更久时，谁来告诉它做得好不好？**

没有这个问题的答案，自进化就无从谈起。就像一个人如果永远不知道自己做得好不好，就不可能进步。

评估四象限模型告诉我们：第四象限（长时程 + 高复杂度）是当前最大的评估真空区。Agent-as-a-Judge 不是完美的解决方案，但它是目前最务实的方向——不追求 100% 精准，只要有方向性，就能驱动持续进化。

2026 年被很多人称为 Agent 爆发年。但我认为，真正决定 Agent 能否从"能用"走向"好用"的，不是模型有多强，而是**评估闭环有多完整**。

你在实际落地 Agent 评估时遇到过什么坑？欢迎留言讨论。
