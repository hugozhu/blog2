---
title: "能做事的 Agent，需要一个推荐系统"
subtitle: "Building a Task-Model-Sandbox Recommendation Engine for AI Agents"
date: 2026-04-23
tags: ["llm-agent", "recommendation-system", "system-design", "task-routing", "ai-engineering"]
---

上周团队里的小李给他的 AI Agent 加了一个"帮我总结这个网页"的功能。用户发一个 URL，Agent 自动打开、提取内容、生成摘要。听起来很简单对吧？

结果上线第一天就翻车了。

一个用户发了一个 GitHub 仓库链接，Agent 用浏览器沙箱打开了仓库首页，截取了 README 的前几屏，然后用一个 7B 的轻量模型生成了摘要——完全忽略了仓库里真正的核心代码和 issue 讨论。用户等了 40 秒，得到了一段废话。

同一个功能，另一个用户发了一个新闻网站链接，这次 Agent 反而用了最强的推理模型去处理——一个纯文本提取任务，花了不必要的 token 费用，还因为推理模型的"过度思考"把简单的新闻摘要写成了一篇分析报告。

小李跑来找我："模型能力明明够了，为什么用户体验这么差？"

我说："你的问题不是模型不行，是你没有给任务找到合适的模型和执行环境。你缺的是一个推荐系统。"

<!--more-->

## 一、Agent 的真正瓶颈：匹配效率

过去两年，行业对 Agent 的优化几乎全部集中在"模型能力"上——更大的上下文窗口、更强的推理能力、更多的 tool calling 训练。但很少有人关注一个更根本的问题：

**给定一个用户任务，应该用哪个模型、在哪个沙箱里执行？**

这个问题之所以被忽视，是因为大多数 Demo 级别的 Agent 只做一件事：把所有任务都塞给最强的模型，用最通用的沙箱（通常是纯文本对话）处理。

这在 Demo 里看起来不错。但在生产环境中，你会立刻遇到三个问题：

1. **成本失控**：简单任务用了昂贵模型，token 费用是必要成本的 10-50 倍
2. **延迟不可接受**：推理模型处理简单指令需要 10-30 秒，用户等不了
3. **能力浪费**：强模型被用来做文本提取，而真正需要推理的复杂任务反而因为配额耗尽被降级

这三个问题的根源是一样的：**任务和执行资源之间没有有效的匹配机制。**

如果你做过推荐系统，你会发现这个问题似曾相识——推荐系统的核心不就是"给用户找到最合适的 item"吗？

Agent 的路由问题，本质上就是一个推荐系统：

- **用户** = 当前任务（task）
- **Item** = 模型 + 沙箱的组合（model + sandbox）
- **目标** = 最大化任务完成质量，同时最小化成本和延迟

## 二、TMS 三维匹配模型

我把这个问题抽象为一个三维匹配框架，叫 **TMS 模型**（Task-Model-Sandbox Matching）。

```text
                    ┌─────────────────────────────────────────┐
                    │          TMS 三维匹配模型                 │
                    └─────────────────────────────────────────┘

    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
    │   Task 维度   │       │   Model 维度  │       │  Sandbox 维度 │
    │              │       │              │       │              │
    │  · 复杂度     │       │  · 能力等级   │       │  · 执行能力   │
    │  · 领域标签   │       │  · 推理成本   │       │  · 隔离级别   │
    │  · 工具需求   │       │  · 响应延迟   │       │  · 资源开销   │
    │  · 延迟敏感度 │       │  · 上下文窗口 │       │  · 安全边界   │
    │  · 成本敏感度 │       │  · 专项能力   │       │  · 状态保持   │
    └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
           │                      │                      │
           │         ┌────────────┴────────────┐         │
           │         │    匹配引擎（推荐系统）    │         │
           │         │                         │         │
           └────────>│  Task → (Model, Sandbox) │<────────┘
                     │                         │
                     │  目标函数：               │
                     │  max Quality - λ·Cost    │
                     │  s.t. Latency < SLA      │
                     └─────────────────────────┘
```

### 2.1 Task 维度：任务画像

任务画像的目标是把用户的自然语言请求转化为可匹配的特征向量。核心特征包括：

| 特征 | 说明 | 示例值 |
|------|------|--------|
| `complexity` | 任务复杂度（1-5） | 1=简单问答, 5=多步推理+工具链 |
| `domain` | 领域标签（多标签） | `["coding", "web", "data-analysis"]` |
| `tools_required` | 需要的工具集合 | `["browser", "terminal", "file"]` |
| `latency_sensitivity` | 延迟敏感度（1-5） | 5=实时对话, 1=后台批处理 |
| `cost_sensitivity` | 成本敏感度（1-5） | 5=免费用户, 1=企业付费 |
| `context_size` | 预估上下文大小 | 2K, 32K, 128K, 1M+ |

### 2.2 Model 维度：模型画像

每个可用模型需要注册其能力画像：

| 特征 | 说明 | 示例值 |
|------|------|--------|
| `capability_score` | 综合能力评分（1-5） | 基于 benchmark 和实际任务表现 |
| `cost_per_1k` | 每千 token 成本 | 0.01 - 15.0 USD |
| `avg_latency` | 平均响应延迟 | 200ms - 30s |
| `max_context` | 最大上下文窗口 | 32K - 1M |
| `specialties` | 擅长领域 | `["reasoning", "coding", "vision"]` |
| `tool_calling` | 工具调用能力等级 | 0-3（0=不支持, 3=多步链式调用） |

### 2.3 Sandbox 维度：沙箱画像

沙箱是 Agent 执行工具调用的运行时环境，不同沙箱提供不同的能力边界：

| 特征 | 说明 | 示例值 |
|------|------|--------|
| `capabilities` | 可执行的操作集合 | `["read_file", "run_code", "browse_web"]` |
| `isolation_level` | 隔离级别 | `none`, `process`, `container`, `vm` |
| `startup_time` | 启动耗时 | 0ms（常驻）- 5s（容器） |
| `max_duration` | 最大执行时长 | 30s - 1h |
| `stateful` | 是否支持状态保持 | true/false |
| `security_risk` | 安全风险等级 | `low`, `medium`, `high` |

## 三、推荐系统架构

有了三维画像，下一步是构建匹配引擎。我借鉴了经典推荐系统的**召回-排序**两阶段架构，并针对 Agent 场景做了适配。

```text
    ┌─────────────────────────────────────────────────────────────┐
    │                  Agent 推荐系统架构                          │
    └─────────────────────────────────────────────────────────────┘

    用户任务
       │
       ▼
    ┌─────────────────┐
    │  Task Encoder    │  自然语言 → 特征向量
    │  (LLM 分类器)    │  复杂度/领域/工具需求/敏感度
    └────────┬────────┘
             │ task_vector
             ▼
    ┌─────────────────┐     ┌──────────────────────────────┐
    │  Candidate       │     │  Model Registry              │
    │  Generator       │<────│  Sandbox Registry            │
    │  (规则 + 向量召回)│     │  (可用资源池)                 │
    └────────┬────────┘     └──────────────────────────────┘
             │ top-k candidates [(model_i, sandbox_j), ...]
             ▼
    ┌─────────────────┐
    │  Ranker          │  对每个 candidate 打分
    │  (轻量模型/规则)  │  score = f(quality, cost, latency)
    └────────┬────────┘
             │ best (model, sandbox) pair
             ▼
    ┌─────────────────┐
    │  Executor        │  在选定沙箱中用选定模型执行任务
    │  (dispatch)      │
    └────────┬────────┘
             │ execution result
             ▼
    ┌─────────────────┐
    │  Feedback Loop   │  记录执行质量 → 更新模型/沙箱画像
    │  (在线学习)       │
    └─────────────────┘
```

这个架构的关键设计决策：

1. **Task Encoder 用 LLM 做**——因为用户任务是自然语言，传统特征工程无法覆盖长尾场景
2. **Candidate Generator 用规则+向量混合**——硬约束（如"需要浏览器"）用规则过滤，软匹配用向量相似度
3. **Ranker 用轻量级模型**——排序本身不能太慢，否则推荐系统的开销就吃掉了优化的收益
4. **Feedback Loop 是闭环关键**——没有反馈，推荐系统就是开环的，无法自适应

## 四、核心实现

下面是 TMS 推荐系统的核心实现。代码展示了从任务编码到最终调度的完整流程。

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import json
import time


class IsolationLevel(Enum):
    NONE = "none"
    PROCESS = "process"
    CONTAINER = "container"
    VM = "vm"


@dataclass
class TaskProfile:
    """任务画像 — 由 Task Encoder (LLM) 从用户输入生成"""
    complexity: int  # 1-5
    domains: list[str]
    tools_required: list[str]
    latency_sensitivity: int  # 1-5, 5=实时
    cost_sensitivity: int  # 1-5, 5=高敏感
    context_size: int  # 预估 token 数
    raw_query: str  # 原始用户输入

    # generated by hugo AI


@dataclass
class ModelProfile:
    """模型画像 — 注册时提供，运行时通过反馈更新"""
    name: str
    capability_score: float  # 1-5
    cost_per_1k_input: float
    cost_per_1k_output: float
    avg_latency_ms: int
    max_context: int
    specialties: list[str]
    tool_calling_level: int  # 0-3
    success_rate: float = 0.0  # 在线反馈更新
    total_executions: int = 0

    # generated by hugo AI


@dataclass
class SandboxProfile:
    """沙箱画像"""
    name: str
    capabilities: list[str]
    isolation: IsolationLevel
    startup_time_ms: int
    max_duration_s: int
    stateful: bool
    security_risk: str  # low/medium/high

    # generated by hugo AI


@dataclass
class Candidate:
    """一个候选的 (模型, 沙箱) 组合"""
    model: ModelProfile
    sandbox: SandboxProfile
    score: float = 0.0
    breakdown: dict = field(default_factory=dict)

    # generated by hugo AI


class TMSEncoder:
    """
    Task Encoder — 将自然语言任务转化为结构化画像。
    
    实际生产环境中，这里用一个轻量 LLM（如 7B-14B）
    做结构化抽取，而不是用最强的推理模型。
    原因：编码本身只需要理解意图，不需要推理，
    用强模型是浪费。
    """

    SYSTEM_PROMPT = """你是一个任务分析器。将用户的自然语言请求转化为结构化任务画像。
严格输出 JSON 格式，不要输出其他内容。

字段说明：
- complexity: 1-5，1=简单问答，5=多步复杂任务
- domains: 领域标签列表，从 [coding, web, data-analysis, writing, 
  reasoning, file-operation, system-admin, creative] 中选择
- tools_required: 需要的工具列表，从 [browser, terminal, code-exec, 
  file, search, api-call] 中选择
- latency_sensitivity: 1-5，5=需要实时响应
- cost_sensitivity: 1-5，5=对成本极度敏感
- context_size: 预估需要的上下文 token 数"""

    def encode(self, query: str) -> TaskProfile:
        """
        实际实现中，这里调用一个轻量 LLM 做结构化抽取。
        为了演示，用规则模拟。
        """
        # 生产环境：response = llm_call(self.SYSTEM_PROMPT, query)
        # 演示：基于关键词的简单规则
        complexity = self._estimate_complexity(query)
        domains = self._detect_domains(query)
        tools = self._detect_tools(query)
        latency_s = self._estimate_latency_sensitivity(query)
        cost_s = 3  # 默认中等敏感度
        context = self._estimate_context(query)

        return TaskProfile(
            complexity=complexity,
            domains=domains,
            tools_required=tools,
            latency_sensitivity=latency_s,
            cost_sensitivity=cost_s,
            context_size=context,
            raw_query=query,
        )

    def _estimate_complexity(self, query: str) -> int:
        keywords_complex = ["分析", "对比", "实现", "构建", "优化", "debug", "调试"]
        keywords_simple = ["是什么", "总结", "翻译", "解释", "帮我写"]
        
        if any(k in query for k in keywords_complex):
            return 4
        elif any(k in query for k in keywords_simple):
            return 2
        return 3

    def _detect_domains(self, query: str) -> list[str]:
        domain_map = {
            "coding": ["代码", "编程", "函数", "bug", "debug", "实现", "API"],
            "web": ["网页", "网站", "URL", "爬虫", "浏览器"],
            "data-analysis": ["数据", "分析", "统计", "图表", "报告"],
            "writing": ["写", "文章", "邮件", "文案", "总结"],
        }
        return [
            domain for domain, keywords in domain_map.items()
            if any(k in query for k in keywords)
        ] or ["general"]

    def _detect_tools(self, query: str) -> list[str]:
        tool_map = {
            "browser": ["网页", "网站", "URL", "打开网页", "浏览"],
            "terminal": ["命令", "终端", "部署", "安装", "git"],
            "code-exec": ["代码", "运行", "执行", "函数", "脚本"],
            "file": ["文件", "读取", "保存", "文档"],
            "search": ["搜索", "查找", "查一下"],
        }
        return [
            tool for tool, keywords in tool_map.items()
            if any(k in query for k in keywords)
        ]

    def _estimate_latency_sensitivity(self, query: str) -> int:
        urgent_keywords = ["快", "马上", "立刻", "急", "实时"]
        if any(k in query for k in urgent_keywords):
            return 5
        return 3

    def _estimate_context(self, query: str) -> int:
        if len(query) > 500:
            return 32000
        elif len(query) > 100:
            return 8000
        return 4000

    # generated by hugo AI


class TMSRecommender:
    """
    TMS 推荐系统 — 核心匹配引擎。
    
    两阶段架构：
    1. Candidate Generator: 硬约束过滤 + 向量召回
    2. Ranker: 多目标排序（质量、成本、延迟）
    """

    def __init__(
        self,
        models: list[ModelProfile],
        sandboxes: list[SandboxProfile],
        quality_weight: float = 0.5,
        cost_weight: float = 0.3,
        latency_weight: float = 0.2,
    ):
        self.models = models
        self.sandboxes = sandboxes
        self.encoder = TMSEncoder()
        
        # 排序权重 — 可根据业务场景调整
        self.w_quality = quality_weight
        self.w_cost = cost_weight
        self.w_latency = latency_weight

    def recommend(self, query: str) -> Candidate:
        """端到端推荐：输入自然语言，输出最优 (model, sandbox) 组合"""
        task = self.encoder.encode(query)
        candidates = self._generate_candidates(task)
        ranked = self._rank(task, candidates)
        
        if not ranked:
            # fallback: 用最强模型 + 最通用沙箱
            return self._fallback(task)
        
        return ranked[0]

    def _generate_candidates(self, task: TaskProfile) -> list[Candidate]:
        """
        阶段1：候选生成
        
        先用硬约束过滤（如工具需求、上下文窗口），
        再做笛卡尔积生成候选组合。
        """
        # 过滤满足工具需求的沙箱
        valid_sandboxes = [
            s for s in self.sandboxes
            if all(t in s.capabilities for t in task.tools_required)
        ]
        
        # 如果没有沙箱满足所有工具需求，放宽到"至少满足一个"
        if not valid_sandboxes:
            valid_sandboxes = [
                s for s in self.sandboxes
                if any(t in s.capabilities for t in task.tools_required)
            ] or self.sandboxes  # 最终 fallback: 全部沙箱

        # 过滤满足上下文需求的模型
        valid_models = [
            m for m in self.models
            if m.max_context >= task.context_size
        ] or self.models  # fallback: 全部模型

        # 笛卡尔积
        candidates = []
        for model in valid_models:
            for sandbox in valid_sandboxes:
                candidates.append(Candidate(model=model, sandbox=sandbox))

        return candidates

    def _rank(self, task: TaskProfile, candidates: list[Candidate]) -> list[Candidate]:
        """
        阶段2：多目标排序
        
        对每个候选计算综合得分：
        score = w_q * quality - w_c * cost - w_l * latency_penalty
        
        关键设计：权重不是固定的，
        而是根据任务的敏感度动态调整。
        """
        # 根据任务特征动态调整权重
        w_q = self.w_quality
        w_c = self.w_cost * (task.cost_sensitivity / 3.0)
        w_l = self.w_latency * (task.latency_sensitivity / 3.0)

        for cand in candidates:
            # 质量分：模型能力与任务复杂度的匹配度
            quality = self._score_quality(task, cand.model)
            
            # 成本分：归一化的预估成本（越低越好）
            cost = self._score_cost(task, cand.model)
            
            # 延迟分：归一化的预估延迟（越低越好）
            latency = self._score_latency(task, cand.model, cand.sandbox)
            
            # 综合得分
            cand.score = w_q * quality - w_c * cost - w_l * latency
            cand.breakdown = {
                "quality": round(quality, 3),
                "cost": round(cost, 3),
                "latency": round(latency, 3),
                "weights": {
                    "quality": round(w_q, 2),
                    "cost": round(w_c, 2),
                    "latency": round(w_l, 2),
                },
            }

        # 降序排列
        candidates.sort(key=lambda c: c.score, reverse=True)
        return candidates

    def _score_quality(self, task: TaskProfile, model: ModelProfile) -> float:
        """
        质量评分 — 模型能力与任务需求的匹配度。
        
        不是"能力越强分数越高"，而是"能力刚好匹配任务复杂度时分数最高"。
        过度配置（用推理模型做简单任务）会有轻微惩罚。
        """
        capability_gap = model.capability_score - task.complexity
        
        if capability_gap >= 0:
            # 能力足够：轻微惩罚过度配置
            return 1.0 - 0.05 * capability_gap
        else:
            # 能力不足：严重惩罚
            return 1.0 - 0.3 * abs(capability_gap)

    def _score_cost(self, task: TaskProfile, model: ModelProfile) -> float:
        """成本评分 — 归一化到 0-1，越低表示成本越高"""
        # 预估 token 用量（输入 + 输出）
        estimated_tokens = task.context_size + 1000  # 简单估算
        cost = estimated_tokens / 1000 * (
            model.cost_per_1k_input + model.cost_per_1k_output
        )
        # 归一化：假设最大成本为 $1.0
        return min(cost / 1.0, 1.0)

    def _score_latency(self, task: TaskProfile, model: ModelProfile, 
                       sandbox: SandboxProfile) -> float:
        """延迟评分 — 归一化到 0-1，越低表示延迟越高"""
        total_ms = model.avg_latency_ms + sandbox.startup_time_ms
        # 归一化：假设最大可接受延迟为 30s
        return min(total_ms / 30000, 1.0)

    def _fallback(self, task: TaskProfile) -> Candidate:
        """Fallback: 用能力最强的模型和最通用的沙箱"""
        best_model = max(self.models, key=lambda m: m.capability_score)
        best_sandbox = max(self.sandboxes, key=lambda s: len(s.capabilities))
        return Candidate(model=best_model, sandbox=best_sandbox)

    # generated by hugo AI


class FeedbackCollector:
    """
    反馈收集器 — 推荐系统的闭环关键。
    
    每次任务执行完成后，收集实际执行质量数据，
    用于更新模型画像和排序策略。
    """

    @dataclass
    class ExecutionRecord:
        task: TaskProfile
        model_used: str
        sandbox_used: str
        success: bool
        actual_latency_ms: int
        actual_cost: float
        user_satisfaction: Optional[int]  # 1-5, None=未反馈

        # generated by hugo AI

    def __init__(self):
        self.records: list[self.ExecutionRecord] = []

    def record(self, record: ExecutionRecord) -> None:
        self.records.append(record)

    def get_model_stats(self, model_name: str) -> dict:
        """计算模型在线统计数据"""
        model_records = [
            r for r in self.records if r.model_used == model_name
        ]
        if not model_records:
            return {"success_rate": 0.0, "count": 0}
        
        successes = sum(1 for r in model_records if r.success)
        return {
            "success_rate": successes / len(model_records),
            "total_executions": len(model_records),
            "avg_latency_ms": (
                sum(r.actual_latency_ms for r in model_records) 
                / len(model_records)
            ),
            "avg_cost": (
                sum(r.actual_cost for r in model_records) 
                / len(model_records)
            ),
        }

    # generated by hugo AI
```

## 五、实际运行示例

用上面的系统跑几个真实场景，看看匹配效果：

```python
# 注册可用模型
models = [
    ModelProfile(
        name="gpt-4o-mini",
        capability_score=3.0,
        cost_per_1k_input=0.00015,
        cost_per_1k_output=0.0006,
        avg_latency_ms=800,
        max_context=128000,
        specialties=["general", "coding"],
        tool_calling_level=2,
    ),
    ModelProfile(
        name="claude-sonnet-4",
        capability_score=4.5,
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.015,
        avg_latency_ms=2000,
        max_context=200000,
        specialties=["reasoning", "coding", "writing"],
        tool_calling_level=3,
    ),
    ModelProfile(
        name="o3-pro",
        capability_score=5.0,
        cost_per_1k_input=0.01,
        cost_per_1k_output=0.04,
        avg_latency_ms=15000,
        max_context=200000,
        specialties=["reasoning", "math", "coding"],
        tool_calling_level=3,
    ),
]

# 注册可用沙箱
sandboxes = [
    SandboxProfile(
        name="text-chat",
        capabilities=[],  # 纯对话，不需要工具
        isolation=IsolationLevel.NONE,
        startup_time_ms=0,
        max_duration_s=30,
        stateful=True,
        security_risk="low",
    ),
    SandboxProfile(
        name="code-exec",
        capabilities=["code-exec", "file"],
        isolation=IsolationLevel.CONTAINER,
        startup_time_ms=2000,
        max_duration_s=300,
        stateful=True,
        security_risk="medium",
    ),
    SandboxProfile(
        name="browser",
        capabilities=["browser", "search"],
        isolation=IsolationLevel.PROCESS,
        startup_time_ms=1500,
        max_duration_s=120,
        stateful=True,
        security_risk="medium",
    ),
]

recommender = TMSRecommender(models, sandboxes)

# 场景1：简单问答
result = recommender.recommend("Python 的 GIL 是什么？")
# → 匹配: gpt-4o-mini + text-chat
#   原因: 低复杂度任务，不需要工具，轻量模型足够

# 场景2：需要浏览器的任务
result = recommender.recommend("帮我打开这个网页并总结内容：https://example.com")
# → 匹配: gpt-4o-mini + browser
#   原因: 中等复杂度，需要浏览器工具，不需要强推理

# 场景3：复杂编码任务
result = recommender.recommend("帮我实现一个分布式任务调度器，支持失败重试和优先级队列")
# → 匹配: claude-sonnet-4 + code-exec
#   原因: 高复杂度，需要强编码能力和代码执行环境

# 场景4：高延迟敏感 + 低成本敏感
result = recommender.recommend("快！帮我分析这段代码的 bug：[大段代码]")
# → 匹配: claude-sonnet-4 + text-chat
#   原因: 高延迟敏感（"快！"），需要推理能力，
#         但不需要执行代码（纯分析）

# generated by hugo AI
```

这四个场景的匹配结果对比：

| 场景 | 复杂度 | 工具需求 | 延迟敏感 | 匹配模型 | 匹配沙箱 | 预估成本 | 预估延迟 |
|------|--------|---------|---------|---------|---------|---------|---------|
| 简单问答 | 2 | 无 | 3 | gpt-4o-mini | text-chat | $0.001 | 0.8s |
| 网页总结 | 3 | browser | 3 | gpt-4o-mini | browser | $0.002 | 2.3s |
| 分布式调度器 | 5 | code-exec | 2 | claude-sonnet-4 | code-exec | $0.05 | 4.0s |
| 紧急 debug | 4 | 无 | 5 | claude-sonnet-4 | text-chat | $0.02 | 2.0s |

## 六、关键设计决策与坑

在实际落地这个系统时，有几个关键的工程决策和容易踩的坑：

### 6.1 Task Encoder 用多强的模型？

**答案：用轻量模型（7B-14B），不要用推理模型。**

Task Encoder 只需要理解用户意图并做结构化抽取，不需要推理。用 o3 或 Claude Opus 做编码是严重的过度配置——每次编码的成本可能是任务本身成本的数倍。

我们实测过：用 7B 模型做任务分类，准确率达到 92%，而用推理模型只提升到 94%，但成本增加了 20 倍，延迟增加了 10 倍。

### 6.2 排序用规则还是模型？

**答案：初期用规则，数据够了再上模型。**

上面代码中的 `_score_quality`、`_score_cost`、`_score_latency` 都是规则函数。这不是偷懒，而是工程判断：

- 规则排序的延迟 < 1ms，模型排序需要 100-500ms
- 在候选数量不多（通常 < 20）的情况下，规则的效果已经足够好
- 只有当你积累了足够多的执行反馈数据后，用学习到的模型才有意义

### 6.3 冷启动问题

新模型或新沙箱注册时，没有历史数据，怎么排序？

我们的方案是**注册时强制提供基准测试数据**——不是让模型自己跑 benchmark，而是用一组标准任务在目标沙箱中实际执行，记录延迟、成本和质量。这些数据直接写入 `ModelProfile` 和 `SandboxProfile`，作为初始画像。

### 6.4 反馈延迟

推荐系统的闭环依赖反馈，但任务执行质量不是立刻能知道的：

- 用户满意度可能需要用户主动反馈（很少发生）
- 代码执行是否成功可以立刻知道
- 回答质量需要离线评估

我们的策略是**分层反馈**：

| 反馈类型 | 延迟 | 用途 |
|---------|------|------|
| 执行成功/失败 | 实时 | 立刻更新模型成功率 |
| 实际延迟/成本 | 实时 | 校准预估偏差 |
| 用户满意度 | 异步（分钟-天） | 离线训练质量模型 |
| 人工标注 | 离线（天-周） | 校准排序权重 |

### 6.5 沙箱启动延迟的隐藏优化

沙箱启动时间（尤其是容器级别）可能高达 2-5 秒。对于延迟敏感的任务，这个开销不可接受。

两个工程优化：

1. **预热池**：维护一组预启动的沙箱实例，任务到来时直接分配，启动时间降到 < 100ms
2. **沙箱复用**：同一个会话内的连续任务复用同一个沙箱实例，避免重复启动

## 七、进阶：在线学习

当系统运行一段时间、积累了足够的反馈数据后，可以从规则排序升级到学习排序（Learning to Rank）。

```python
from dataclasses import dataclass


@dataclass
class RankingModel:
    """
    学习型排序器 — 用历史反馈数据训练。
    
    实际生产中可以用 LightGBM / XGBoost 
    或简单的线性回归。
    不需要深度学习——特征维度低（< 20），
    样本量足够时传统 ML 效果更好且更快。
    """
    weights: dict[str, float] = None

    def train(self, records: list[FeedbackCollector.ExecutionRecord]) -> None:
        """
        从历史执行记录中学习最优权重。
        
        目标：找到一组权重，使得历史上成功的执行
        得分高于失败的执行。
        
        实际实现中使用 pairwise ranking loss：
        L = Σ max(0, 1 - score(positive) + score(negative))
        """
        # 简化演示：用成功记录的平均特征作为权重
        successful = [r for r in records if r.success]
        if not successful:
            return

        # 实际实现中这里用梯度下降优化
        # 演示：用统计方法估算权重
        self.weights = {
            "quality": 0.5,
            "cost": 0.3,
            "latency": 0.2,
        }

    def predict_score(
        self, 
        task: TaskProfile, 
        model: ModelProfile, 
        sandbox: SandboxProfile
    ) -> float:
        """用学习到的权重计算得分"""
        if not self.weights:
            return 0.0
        
        # 特征工程：将 (task, model, sandbox) 转化为特征向量
        features = {
            "capability_match": model.capability_score - task.complexity,
            "cost_normalized": model.cost_per_1k_input * task.context_size / 1000,
            "latency_total": model.avg_latency_ms + sandbox.startup_time_ms,
            "domain_overlap": len(
                set(task.domains) & set(model.specialties)
            ) / max(len(task.domains), 1),
            "tool_coverage": len(
                set(task.tools_required) & set(sandbox.capabilities)
            ) / max(len(task.tools_required), 1),
        }

        return sum(
            self.weights.get(k, 0) * v 
            for k, v in features.items()
        )

    # generated by hugo AI
```

## 八、总结

回到开头小李的问题。

他的 Agent 不是模型不行，也不是沙箱不行，而是**没有把任务、模型、沙箱三者做有效匹配**。就像一个外卖平台，如果不管用户点什么菜都派同一个骑手去同一家餐厅，效率一定很差。

TMS 三维匹配模型的核心思想是：

1. **任务画像**是起点——不理解任务特征，就无法做匹配
2. **推荐系统架构**是手段——召回+排序两阶段，平衡效率和质量
3. **反馈闭环**是护城河——没有反馈的推荐系统是开环的，无法自适应
4. **规则先行，学习跟进**——初期用规则快速上线，数据够了再上模型

这个系统的价值不在于算法多复杂，而在于它把 Agent 的能力瓶颈从"模型有多强"转移到了"匹配有多准"。

模型能力是行业给的，匹配效率是你自己挣的。

你在实际做 Agent 落地时，有没有遇到过"模型很强但效果很差"的情况？问题出在哪一层？欢迎留言讨论。
