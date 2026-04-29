---
title: "AI 原生产品增长打法：你的预算在烧钱，还是在训练产品？"
subtitle: "Growth equals how fast your agent gets smarter, not how much you spend on ads"
date: 2026-04-29
tags: ["ai-native", "growth", "agent", "product", "rlhf"]
---

两周前，一个做 AI 写作 Agent 的朋友约我吃饭，他刚拿了 A 轮，准备砸 200 万投放抖音和小红书。

我顺嘴问了一句：你们 Agent 的复杂任务成功率是多少？

他愣了一下，说："你这问题问得有点怪，我们看的是 DAU 和留存。"

三个月后我们再见面，他融的钱烧了一半，DAU 涨了三倍，月留存从 18% 掉到了 9%。他叹了口气：**"用户来了，但 Agent 还是那个 Agent。"**

那一刻我意识到一件事：很多 AI 创业团队还在用 SaaS 时代的增长教科书，跑一个根本不是 SaaS 的生意。

<!--more-->

SaaS 时代，"增长"是把一个**已经做好的能力**卖给更多人。产品在工厂里被打磨完成，运营和投放负责把它推到市场。

AI 原生产品不是这样。它的能力**不是出厂时就完整的**——是在和用户的每一次交互中被训练出来的。你今天上线的 Agent，三个月后应该比今天聪明 5 倍，否则就死定了。

这意味着增长公式被彻底重写：

> **增长 = Agent 变聪明的速度（而不是投放预算）**

这篇文章想讲清楚两件事：第一，AI 原生增长的三个维度怎么从根上换思路；第二，从 0 到 1 该怎么分四步把这套打法落地。

---

## 一、本质问题：你卖的是产品，还是产品的成长曲线？

先把传统 SaaS 和 AI 原生产品的底层差异摆出来。

| 维度 | SaaS 产品 | AI 原生产品 |
|------|-----------|-------------|
| 能力来源 | 工程师写死 | 训练数据驱动 |
| 用户角色 | 消费者 | 训练参与者 |
| 增长杠杆 | 投放 + 销售 | 数据飞轮 |
| 边际成本 | 高（人力、算力线性增长） | 递减（每个用户都让产品更强） |
| 护城河 | 功能 + 渠道 | 能力差距（accuracy gap） |
| 失败模式 | 卖不出去 | 卖出去了但不会变聪明 |

很多团队的认知错配在最后一行——他们以为失败是"获客失败"，其实失败是"成长失败"。

获客失败可以靠多花钱解决，成长失败花再多钱也救不回来，因为问题不在分母（用户数），在分子（每个用户带来的能力增量）。

我朋友的例子就是典型：DAU 涨三倍，但 Agent 的复杂任务成功率没动。新用户进来发现"还是不好用"，于是迅速流失，留存掉一半。投放钱在加速**用户对产品的失望速度**，而不是产品的进化速度。

这是 AI 原生时代最贵的一种死法：**用 SaaS 的钱，烧出一条加速贬值曲线**。

---

## 二、传统认知里的三个错误对标

在和十几个 AI 创业团队聊过之后，我发现错误总是相似的——他们都在用旧地图找新大陆。

### 错误 1：把"做功能"当成研发的核心

SaaS 时代的研发节奏是：用户提需求 → PRD → 排期 → 上线。功能数量是研发的产出指标。

AI 原生产品里，功能不是稀缺的——大模型本身就具备绝大多数功能。**稀缺的是"能稳定完成复杂任务"的能力**。

一个能写代码的 Agent 和一个能"在没有人监督的情况下，独立完成一周开发任务"的 Agent，功能列表上看是同一个东西，但商业价值差 100 倍。后者解决的任务空间大一个数量级，能进入的市场也大一个数量级。

研发不该再问"我们还差什么功能"，而要问"我们 Agent 的智商上限是多少"。

### 错误 2：把"做客服"当成运营的核心

传统运营的工作是回答用户问题、处理投诉、维护社区情绪。

AI 原生产品里，**用户的"投诉"和"纠错"是产品最珍贵的训练数据**。一个用户说"这个回答不对，应该是 X"——这条信息如果只进了客服工单系统，那就是浪费；如果进了模型对齐管线，就是黄金。

我见过一家公司，每天有 5000 条用户的差评和修正建议，全部躺在客服系统里没人管。同期他们花 80 万买了一个数据标注外包团队，标的是和用户场景关系不大的公开数据集。这是 2026 年最魔幻的资源错配之一。

运营不该再以"解决用户问题"为终点，而要以"把用户问题转化为对齐信号"为目标。

### 错误 3：把"转化漏斗"当成数据的核心

SaaS 的数据团队天天看的是漏斗：曝光 → 点击 → 注册 → 激活 → 付费。每一步的转化率是核心指标。

AI 原生产品里，漏斗依然存在，但**真正决定生死的是另一条曲线：错误率随时间下降的速度**。

如果你的产品 90 天内复杂任务成功率从 40% 涨到 70%，你的漏斗会自动改善——留存上升，付费率上升，口碑传播带动获客。

如果 90 天内成功率纹丝不动，你优化漏斗每一步只能榨出几个百分点，且边际收益迅速递减。

数据团队真正要建的不是漏斗仪表盘，是**能力增长仪表盘**。

---

## 三、新框架：AI 原生增长三维重定义模型

把上面三个错误的解药结构化，就是这个框架。

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│            AI 原生增长 三维重定义模型                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   维度        旧目标          →   新目标                │
│   ─────────────────────────────────────────────         │
│                                                         │
│   研发    做功能 (Features)   →   提智商 (Inference)    │
│           关键指标:                                     │
│             复杂任务成功率，而非功能数量                 │
│                                                         │
│   运营    做客服 (Support)    →   做裁判 (Judging)      │
│           关键指标:                                     │
│             高质量反馈量，而非 DAU                      │
│                                                         │
│   数据    转化漏斗 (Funnel)   →   能力飞轮 (Flywheel)   │
│           关键指标:                                     │
│             错误率下降速度，而非转化率                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
        三维都对齐时，产品进入"自我训练"状态
        用户越多 → 数据越好 → Agent 越聪明
                    → 解决任务越多 → 用户更多
```

这三个维度不是并列关系，是**互为前提**的三角。

研发只追求功能数，运营和数据再努力，新增功能也无法被持续优化——因为没有飞轮接住。
运营只做客服，研发和数据再努力，模型对齐速度也跟不上——因为反馈信号没被挖出来。
数据只看漏斗，研发和运营再努力，决策也会走偏——因为团队的注意力会被错的指标牵着走。

三角任何一条边断掉，整个增长引擎就停转。

下面拆开讲。

---

### 3.1 研发：从"做功能"到"提智商"

提智商的核心是提升 Agent 处理**长尾任务**和**多步推理**的能力。这两件事直接决定了你的产品能进入多大的市场。

类比一下：GPT-3.5 时代能稳定完成的任务大概是"写一封 200 字的邮件"。Claude Opus 时代能稳定完成的是"读完 100 页 PDF 后写一份结构化分析报告"。任务复杂度上一个台阶，可寻址市场（TAM）至少上一个数量级。

落到具体动作，研发该做的是：

1. **定义清楚"任务"的粒度**：你的 Agent 是在做"一句话回答"还是"一周项目"？粒度越大，价值越高，但训练难度越大。
2. **建立任务成功率的客观评测集**：不是看用户主观满意度，是看一组固定的复杂任务，每周跑一次，记录通过率
3. **每个版本对比上一个版本**：发布的唯一标准是"复杂任务成功率提升了 X%"，不是"上线了 Y 个新 feature"

关键指标：**复杂任务成功率（Complex Task Success Rate, CTSR）**。

---

### 3.2 运营：从"做客服"到"做人类裁判"

把用户从"被服务方"变成"裁判员"，让他们的纠错、打分、修正成为模型对齐信号。

这个本质上是把外包标注团队的工作，让真实用户帮你做。但用户做这事是有条件的：

1. **修正的成本必须极低**：不能让用户填三页表格才能反馈一个错误。一键点踩 + 一句话改写就是上限
2. **修正必须看得见效果**：用户报告的问题，下个版本要明显修复，否则反馈热情会断崖式下跌
3. **修正必须有正向激励**：积分、徽章、提前体验权——任何能让用户"参与训练"产生荣誉感的设计

关键指标：**高质量反馈量（High-Quality Feedback Volume, HQFV）**。注意是"高质量"，不是总量——一条用户认真改写的回答 = 100 条无脑点踩。

---

### 3.3 数据：从"转化漏斗"到"能力飞轮"

把用户的每一次成功操作，沉淀成训练数据，回流到下一版模型。

这件事的难度被严重低估。绝大多数团队的数据栈是"事件埋点 → 数据仓库 → 报表"——天生服务于漏斗分析，而不是模型训练。

要建的是另一套管线：用户行为 → 行为意图标注 → 训练样本 → 模型微调/对齐 → 新版本发布 → 效果测量 → 回到第一步。

关键指标：**错误率下降速度（Error Rate Decay Rate, ERDR）**。一个健康的 AI 原生产品，应该能画出一条漂亮的下降曲线，斜率越陡越值钱。

---

## 四、技术实现：飞轮的最小可运行版本

把上面三个维度落到代码层。下面这段是"能力飞轮"的最小骨架——我把它从我们团队的内部脚手架抽出来简化了一下。

要理解为什么这么写：飞轮不是一个一次性的脚本，是一个**持续运行的回路**。每个用户行为都要走这个流程：评估质量 → 决定是否纳入训练集 → 更新能力指标 → 触发下一轮训练。

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

FeedbackType = Literal["thumbs_up", "thumbs_down", "rewrite", "edit"]


@dataclass
class UserInteraction:
    """A single user-agent exchange, the atomic unit of the flywheel."""
    user_id: str
    task_description: str
    agent_output: str
    user_feedback: FeedbackType | None
    user_correction: str | None
    timestamp: datetime
    task_complexity: int  # 1=trivial, 5=long-horizon multi-step

    @property
    def quality_signal_score(self) -> float:
        """Not all feedback is equal — a rewrite is worth ~50 thumbs_up."""
        if self.user_feedback is None:
            return 0.0
        return {
            "thumbs_up": 1.0,
            "thumbs_down": 2.0,    # negative signal is more informative
            "edit": 25.0,          # user fixed it — almost gold
            "rewrite": 50.0,       # user wrote the right answer — pure gold
        }[self.user_feedback] * self.task_complexity


@dataclass
class CapabilityFlywheel:
    """The closed loop: interactions become training data become a smarter agent."""
    interactions: list[UserInteraction] = field(default_factory=list)

    def hqfv(self) -> float:
        """High-Quality Feedback Volume — the only ops metric that matters."""
        return sum(i.quality_signal_score for i in self.interactions)

    def ctsr(self, complexity_threshold: int = 3) -> float:
        """Complex Task Success Rate — the only R&D metric that matters."""
        complex_tasks = [i for i in self.interactions
                         if i.task_complexity >= complexity_threshold]
        if not complex_tasks:
            return 0.0
        successes = sum(1 for i in complex_tasks
                        if i.user_feedback in ("thumbs_up", None))
        return successes / len(complex_tasks)

    def training_corpus(self) -> list[dict[str, str]]:
        """What feeds the next fine-tune — only corrections, never raw outputs."""
        return [
            {"prompt": i.task_description, "completion": i.user_correction}
            for i in self.interactions
            if i.user_correction is not None
        ]

    def burn_or_train_ratio(self, ad_spend_usd: float) -> float:
        """The single most important question: is the budget burning or training?
        Returns USD spent per high-quality training signal acquired.
        Lower = healthier. Above $100 = you're burning, not training.
        """
        signals = self.hqfv()
        return ad_spend_usd / signals if signals > 0 else float("inf")


if __name__ == "__main__":
    flywheel = CapabilityFlywheel(interactions=[
        UserInteraction("u1", "summarize this 50-page PDF", "...", "rewrite",
                        "the corrected summary", datetime.now(), task_complexity=5),
        UserInteraction("u2", "what's 2+2", "4", "thumbs_up", None,
                        datetime.now(), task_complexity=1),
    ])
    print(f"CTSR: {flywheel.ctsr():.1%}")
    print(f"HQFV: {flywheel.hqfv():.1f}")
    print(f"Burn ratio: ${flywheel.burn_or_train_ratio(10000):.2f} per signal")
    # 如果这个值 > 100，你不是在做 AI 原生增长，你是在做传统投放

# generated by hugo AI
```

几个关键点要解释清楚：

**第一**，`quality_signal_score` 把不同类型反馈做了非线性加权。一个用户主动 rewrite 一段答案，价值是一次 thumbs_up 的 50 倍——因为它直接产出了"理想输出"，可以作为 SFT 训练样本。绝大多数团队把所有反馈一视同仁地丢进数据库，这是巨大的浪费。

**第二**，`burn_or_train_ratio` 是我自己常用的健康度指标。把每月广告支出除以高质量反馈分数，得到"每个训练信号的获取成本"。这个值小于 10 美金，说明增长在自我加强；超过 100 美金，说明你在做传统投放，AI 只是个噱头。

**第三**，`training_corpus` 只采集"用户做了修正的样本"，不采集原始输出。原因是：原始输出可能正好是错的，盲目用它训练会让模型固化错误。**只有被人类裁判过的数据，才是飞轮燃料**。

---

## 五、框架 × 技术：四步增长路径打穿市场

把三维框架对齐到模型训练生命周期，AI 原生产品的增长路径就清晰了——它和大模型本身的训练阶段是同构的。

```text
   阶段        模型类比         用户角色          关键动作
─────────────────────────────────────────────────────────────
   ①  Demo    Pre-training    旁观者           用强能力打爆认知
   ②  内测    SFT             专家训练员       让 KOL 喂高质量数据
   ③  公测    RLHF            裁判员           普通用户大规模纠错
   ④  生态    Multi-Agent     Agent 创造者     用户自己造 Agent

   时间轴 ───────────────────────────────────────────────►
            T+0      T+3 个月      T+9 个月       T+18 个月
```

### 5.1 Demo 引爆：用强能力打爆认知

第一阶段不是"做小做精"，是"展示一个让人震惊的能力"。

ChatGPT 的爆发不是因为它好用——2022 年底它其实挺难用的——而是因为它展示了一个让普通人下巴掉下来的能力。Sora、Cursor、Claude Code 都是同一个剧本：用一个让人震惊的 demo 撕开认知，建立"这事可以做到"的预期。

这个阶段不要追求商业化，不要追求用户数，**追求的是"被讨论的频次"**。一个 demo 视频在推特和 B 站被反复转发，价值远高于 1 万个付费用户。

### 5.2 小圈子打磨：用专家用户喂数据（SFT）

第二阶段引入一小批高质量用户——通常是行业 KOL、技术发烧友、早期种子。他们的特点是愿意花时间反馈、修正、提建议。

这个阶段对应 SFT（Supervised Fine-Tuning）：你用少量但高质量的样本，把模型的能力定向打磨到某个垂直场景。

数量不重要，质量极其重要。100 个深度参与的种子用户，胜过 10000 个浅尝辄止的下载量。

警惕的反模式：在这个阶段就开始投放。投放进来的普通用户，反馈质量低，会污染你的训练信号。**SFT 阶段的纯净度，决定了后续 RLHF 阶段的天花板**。

### 5.3 大规模纠错：用普通用户做反馈（RLHF）

第三阶段才能放大规模。这时模型在小圈子打磨过的能力已经稳定，可以承接大流量。

这个阶段对应 RLHF（Reinforcement Learning from Human Feedback）：让大量普通用户通过点踩、点赞、修正，让模型在更广泛的真实场景里持续对齐。

这个阶段的关键设计是**降低反馈成本**。任何需要用户多走一步的反馈机制都是失败的。理想状态是：用户在正常使用流程中，反馈数据自然产生。

例如：一个 AI 写作产品，用户最终发布的版本和 Agent 给出的初稿之间的 diff，就是天然的对齐信号——不需要用户主动做任何事。

### 5.4 生态扩张：用户创造 Agent（Multi-Agent）

第四阶段是终局：让用户基于你的能力底座，创造他们自己的 Agent。

这个阶段对应 Multi-Agent 时代：你不再是单一产品，而是一个 Agent 操作系统。每个用户创造的 Agent 都在贡献新的训练数据、新的使用场景、新的能力边界。

OpenAI 的 GPTs 和 Anthropic 的 Claude Skills 都是在试这条路。这个阶段做对的公司，护城河会指数级加深——因为别人复制你的功能容易，复制你的生态几乎不可能。

---

## 六、最常见的两个落地坑

我把团队最近半年踩过的坑总结成两条，供参考。

### 坑 1：把第三阶段当第二阶段做

最常见的错误是产品还没经过 SFT 阶段的小圈子打磨，就直接砸钱做 RLHF 阶段的大规模投放。

后果：大量普通用户进来发现产品不好用，给出的反馈大部分是"这个不行"——这种粗粒度的负反馈对模型训练几乎没用，但会拖累产品口碑。

正确节奏：先用 100 个种子用户把 CTSR 打到 60% 以上，再启动大规模投放。否则就是把钱倒进一个漏的桶里。

### 坑 2：用 SaaS 的运营 KPI 考核 AI 团队

很多公司把 AI 产品塞给原来的 SaaS 团队管，KPI 还是 DAU、MAU、付费转化。

这套 KPI 直接导向"短期获客 + 留存优化"，但 AI 原生产品需要的是"长期数据飞轮 + 能力对齐"。两者经常冲突——做对长期能力的事，短期 DAU 可能下降。

如果不重新设计 KPI，团队会本能地选短期目标，飞轮永远转不起来。

---

## 七、升维总结：每一个用户进来时，问自己一个问题

回到我那个朋友的故事。

他烧的钱并不冤——冤的是他烧的方式。同样的 200 万，如果一半投在挑选 200 个深度种子用户、一半投在搭建用户反馈→数据清洗→模型对齐的管线，三个月后他的 Agent 会真的变聪明，留存曲线会反过来上扬。

AI 原生增长和 SaaS 增长有一个根本不同：

**SaaS 时代，用户是收入；AI 时代，用户是燃料。**

SaaS 时代你卖一份能力给一个用户，能力不变；AI 时代你卖一份能力给一个用户，**能力会因为这个用户变得更强**。如果你没有让能力变强的机制，你就是在贱卖一个会过期的资产。

所以每次有新用户进来，你只需要问自己一个问题：

> **这个新增的用户，是在消耗资源，还是在训练我的产品？**

只有后者，才是 AI 原生增长。

如果你做不到后者，无论你的 PPT 写得多漂亮，你做的本质上还是一个 SaaS 公司——只不过用了 AI 做卖点而已。AI 不是你的产品，是你的成本。这种公司在 2026-2027 年这个窗口期，会被真正做对的玩家迅速碾过。

---

你的产品现在处在哪一个阶段？三维框架里哪一维最薄弱？欢迎在评论里聊聊你团队踩过的坑。
