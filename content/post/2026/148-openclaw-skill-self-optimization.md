---
title: "自我进化的AI助手：OpenClaw如何用Heartbeat实现Skill自动优化"
subtitle: "从autoresearch到Agent自闭环优化——执行产生数据，数据驱动优化，优化改善执行"
date: 2026-03-21
tags: ["AI", "AI-agents", "OpenClaw", "architecture", "autoresearch", "prompt-engineering", "best-practices"]
---

在[上一篇文章](/post/2026/147-autoresearch-token-optimization-paradigm/)中，我从 Karpathy 的 autoresearch 项目提炼了一个范式：**人写规则，Token 做实验**。我们用 AI 客服 Prompt 优化作为案例，验证了这个范式在业务场景中的可行性。但那个方案有一个前提——你需要预先准备评估数据集。

OpenClaw 的场景让我意识到，还有一种更彻底的可能：**Agent 用自己的真实执行数据作为评估信号，在用户无感知的情况下持续自我优化。** 不需要人工标注测试集，不需要离线批处理，每一次真实使用都是一条训练数据。

<!--more-->

## 从 autoresearch 到自优化 Agent

先回顾 autoresearch 的核心循环：

```
人写 program.md（策略）
    → AI 修改 train.py（假设）
    → 跑 5 分钟训练（实验）
    → 检查 val_bpb（评估）
    → 保留或回滚（决策）
    → 重复
```

这个范式能 work 需要五个前提条件（详见[#147](/post/2026/147-autoresearch-token-optimization-paradigm/)）：指标可量化、反馈快、搜索空间有约束、变异智能、成本低可逆。

AI 客服 Prompt 优化满足全部五个条件，但它本质上是一个**离线批处理**流程——你需要先准备好评估数据集，然后一夜跑 500 轮。这对于 OpenClaw 这样的个人 AI 助手来说不太自然：你不会为"帮我搜新闻"、"帮我发消息"这些日常任务预先标注 500 条测试用例。

但换个角度想：**OpenClaw 每天都在执行真实任务，每次执行都有可观测的结果。** 这些真实执行记录，天然就是评估数据集。

## OpenClaw 已经具备的基础设施

对照 autoresearch 的三个核心文件，OpenClaw 不需要额外建设任何东西：

| autoresearch | OpenClaw 已有 | 作用 |
|---|---|---|
| `prepare.py` — 评估工具 | 会话记录 + memory 日志 | 真实任务执行的完整历史 |
| `train.py` — 被修改的代码 | `SKILL.md` — 技能定义 | Agent 可自主修改的执行逻辑 |
| `program.md` — 人定义策略 | `SOUL.md` — 行为宪法 | 定义优化方向和不可逾越的边界 |

更关键的是，OpenClaw 还有两个 autoresearch 没有的东西：

**Heartbeat 机制**——每 30 分钟一次的主动检查周期，天然就是优化循环的触发器。不需要额外写 `while True` 循环。

**Memory 系统**——两层记忆架构（每日日志 + 长期记忆）天然就是实验日志的存储。不需要额外建数据库。

## 核心设计：Per-Skill 优化

OpenClaw 的任务是多样化的——搜索新闻、写代码、发消息、分析数据。不可能用一个 val_bpb 衡量所有任务。

解法是：**每个 Skill 独立优化，各有各的指标。**

```
workspace/skills/
├── search-and-summarize/
│   ├── SKILL.md            ← 被优化的对象
│   ├── eval/
│   │   ├── cases.jsonl     ← 从真实执行中自动积累
│   │   └── metrics.json    ← 当前指标基线
│   └── experiments/
│       └── log.md          ← 实验日志
│
├── code-review/
│   ├── SKILL.md
│   ├── eval/
│   └── experiments/
│
└── report-generation/
    ├── SKILL.md
    ├── eval/
    └── experiments/
```

每个 Skill 的优化指标由 Skill 自身定义：

```markdown
# SKILL.md — search-and-summarize

## 执行逻辑
搜索 5 个数据源，提取关键信息，生成结构化简报...

## 自优化配置
metrics:
  - name: coverage      # 信息覆盖率
    weight: 0.5
    judge: "对比源文档，评估简报是否覆盖了核心信息"
  - name: conciseness   # 简洁度
    weight: 0.3
    judge: "评估简报是否简洁，无冗余信息"
  - name: actionability # 可操作性
    weight: 0.2
    judge: "评估简报是否包含可行动的要点"

baseline_score: 0.72
target_score: 0.85
```

指标的评估方式是 **LLM-as-Judge**——用另一个 LLM（或同一个 LLM 的独立调用）来评分。这和 autoresearch 中 val_bpb 的作用完全等价，只是从数学指标变成了语义评分。

## 数据从哪来：执行即评估

这是 OpenClaw 自优化和 AI 客服 Prompt 优化的最大区别：**不需要预先准备评估数据集。**

每次任务执行时，自动记录：

```json
{
  "skill": "search-and-summarize",
  "timestamp": "2026-03-21T09:15:00Z",
  "input": "搜索今天的 AI 技术新闻",
  "output": "1. OpenAI 发布... 2. Google 宣布...",
  "sources_used": ["techcrunch", "arxiv", "twitter"],
  "token_cost": 2847,
  "user_signal": "follow_up_question",
  "execution_time_ms": 12400
}
```

`user_signal` 是隐式反馈，不需要用户主动评分：

| 用户行为 | 信号解读 | 评分 |
|---|---|---|
| 没有追问，直接转到下一话题 | 满意 | +1 |
| 追问细节（"XX 的具体数据呢？"） | 覆盖率不足 | 0 |
| 否定（"不对"、"重新搜"） | 执行失败 | -1 |
| 说"记住这个" | 高质量输出 | +2 |

这些执行记录积累到 `eval/cases.jsonl`，构成该 Skill 的评估数据集。**用了就有数据，用得越多数据越好。**

## 优化循环：复用 Heartbeat

不需要额外构建优化循环。在现有的 Heartbeat 机制中增加一个检查项：

```markdown
# HEARTBEAT.md

## 常规检查
- [ ] 检查未读消息
- [ ] 检查日历事件
- [ ] 检查 GitHub 通知

## Skill 自优化（每 4 次心跳执行一次）
- [ ] 回顾最近 24 小时的任务执行日志
- [ ] 识别表现最差的 Skill（失败率最高或用户负反馈最多）
- [ ] 如果该 Skill 的 eval cases ≥ 10 条，执行一轮优化实验
```

完整的优化流程：

```
Heartbeat 触发（每 30 分钟）
    │
    ▼
回顾最近的任务执行日志
    │
    ▼
按 Skill 聚合表现数据
    │
    ├── search-and-summarize: 成功率 70%, 追问率 40%
    ├── code-review: 成功率 90%, 追问率 10%
    └── dingtalk-messaging: 成功率 95%, 追问率 5%
    │
    ▼
选择表现最差的 Skill（search-and-summarize）
    │
    ▼
分析失败模式
    │
    ├── 5 次追问中有 4 次是"具体数据呢？"
    └── 结论：输出缺少定量信息
    │
    ▼
提出修改假设：在 SKILL.md 中增加规则
"每条摘要必须包含至少一个数字（金额/百分比/日期）"
    │
    ▼
用最近 10 条 eval cases 回放测试
    │
    ├── 修改前综合评分：0.72
    └── 修改后综合评分：0.81
    │
    ▼
评分提升 → 保留修改，更新 baseline_score
写入 experiments/log.md：
  "轮次 #7: 增加定量信息要求，评分 0.72→0.81，保留"
```

整个过程在一次 Heartbeat 周期内完成。用户不会收到任何通知（因为 Agent 回复 `HEARTBEAT_OK`），但下次搜索新闻时，简报质量已经提升了。

## 一个完整的进化轨迹

以 search-and-summarize Skill 为例，追踪两周的自优化过程：

```
Day 1  SKILL.md v1: "搜索 3 个源，输出 5 条摘要"
       baseline: 0.58
       ──────────────────────────────────────────

Day 2  轮次 #1: 用户多次追问 → 增加搜索源到 5 个
       eval: 0.58 → 0.65 ✅ 保留

Day 3  轮次 #2: 尝试增加到 8 个源 → 输出太长，简洁度下降
       eval: 0.65 → 0.61 ❌ 回滚

Day 4  轮次 #3: 保持 5 源，增加"一句话要点"格式
       eval: 0.65 → 0.71 ✅ 保留

Day 5  轮次 #4: 增加定量信息要求
       eval: 0.71 → 0.81 ✅ 保留

Day 8  轮次 #7: 增加"与用户关注领域的相关性排序"
       eval: 0.81 → 0.79 ❌ 回滚
       （原因：排序导致部分重要但非关注领域的信息被丢弃）

Day 10 轮次 #9: 改为"标注相关性等级但不排除"
       eval: 0.81 → 0.86 ✅ 保留

Day 14 SKILL.md v6: 经过 9 轮实验，6 次保留 3 次回滚
       current: 0.86 (+48% vs Day 1)
       ──────────────────────────────────────────
```

两周后，SKILL.md 和第一天已经完全不同。但用户没有做任何手动调整——只是正常使用，偶尔追问或表示不满意。

## 安全边界：SOUL.md 作为宪法

自优化不是无约束的。就像 autoresearch 中 Agent 不能修改 `prepare.py`，OpenClaw 的自优化也有不可触碰的边界：

```markdown
# SOUL.md — 自优化约束

## 不可修改的规则
- 永远不要在未经确认的情况下发送消息给第三方
- 永远不要删除用户的文件
- 永远不要在群聊中暴露用户的私人信息
- 搜索结果必须标注来源

## 自优化边界
- 每次只修改一个 Skill 的一个方面
- 修改后必须回放至少 10 条历史 case
- 评分下降超过 5% 必须立即回滚
- 每天最多执行 3 轮优化实验
- 所有修改记录在 experiments/log.md 中，用户可审计
```

SOUL.md 定义了优化的"宪法"——Agent 可以在边界内自由探索，但不能逾越红线。这和 autoresearch 中 `program.md` 的角色完全一致。

## 与 autoresearch 的对比

| 维度 | autoresearch | AI 客服 Prompt 优化 | OpenClaw Skill 自优化 |
|---|---|---|---|
| 被优化对象 | train.py | system_prompt.txt | SKILL.md（多个） |
| 评估数据 | 固定验证集 | 人工标注测试集 | 真实执行历史（自动积累） |
| 优化频率 | 5 分钟/轮 | 30 秒/轮（批处理） | 30 分钟/轮（持续） |
| 触发方式 | while True 循环 | 一夜批跑 | Heartbeat 自然触发 |
| 冷启动 | 无需（数据内置） | 需要准备测试集 | 使用几天后自动具备 |
| 优化信号 | 数学指标 | LLM-as-Judge | 用户隐式反馈 + LLM-as-Judge |
| 用户参与 | 写 program.md | 写优化策略 | 正常使用即可（零参与） |

最后一行是关键区别：**OpenClaw 的用户不需要做任何额外的事情。** 正常使用 = 提供优化信号。这是最低摩擦的自优化方案。

## 更深一层：三代优化范式

回顾整个演进，我们实际上在看三代不同的优化范式：

**第一代：人工优化**
```
人观察 → 人假设 → 人实施 → 人评估 → 人决策
周级循环，依赖专家经验
```

**第二代：Token 批处理优化（autoresearch / AI 客服）**
```
人定义规则 → AI 假设 → AI 实施 → AI 评估 → AI 决策
分钟级循环，依赖预设的评估数据集
```

**第三代：Agent 自闭环优化（OpenClaw）**
```
人定义边界 → AI 执行真实任务 → 真实反馈自动积累
→ AI 假设 → AI 用真实数据评估 → AI 决策
持续循环，无需额外数据准备
```

第三代的本质突破在于：**评估数据不是人准备的，而是系统在正常运行中自然产生的。** 这消除了自优化最大的冷启动障碍。

用一个类比：

- 第一代像**手动驾驶**——人控制一切
- 第二代像**自动驾驶测试**——在封闭赛道上自动跑圈
- 第三代像**特斯拉的影子模式**——在真实道路上收集数据，持续改进

## 实施建议

如果你想在类似 OpenClaw 的 Agent 系统中实现自优化，建议分三步走：

**第一步：先记录，不优化。** 在每次 Skill 执行后记录输入、输出、用户后续行为。积累两周数据，建立基线。

**第二步：手动分析，验证指标。** 人工审查执行日志，确认你定义的指标（覆盖率、简洁度等）确实和用户满意度相关。如果指标和真实满意度不相关，优化就是南辕北辙。

**第三步：开启自动优化，保持可审计。** 每天最多 2-3 轮实验，所有修改记录在 `experiments/log.md` 中。定期人工审查实验日志，确保优化方向没有偏离。

**不要急于全自动。** 第二步的人工验证至关重要——它确保你的指标是对的。一个错误的指标会让 Agent 越优化越差，就像用错误的 val_bpb 会让 autoresearch 训出垃圾模型一样。

## 写在最后

autoresearch 证明了"用 Token 替代人做试错循环"是可行的。AI 客服 Prompt 优化证明了这个范式可以迁移到业务场景。而 OpenClaw 的 Skill 自优化展示了一种更进一步的可能：

**Agent 不仅能替人做实验，还能从自己的工作中自动获取评估信号。**

当执行和评估在同一个系统中闭环，自优化就不再是一个需要单独启动的流程，而是系统运行的自然副产品。你的 AI 助手每天在帮你工作的同时，也在悄悄地让自己变得更好。

这是 autoresearch 范式的终极形态——**不是"一夜跑 500 轮实验"，而是"每一天的使用都是一轮实验"。**
