---
title: "让 AI 自己写 Skill：可进化 Agent 的设计原理与最佳实践"
subtitle: "Why procedural memory beats static prompts, and how to build skills that improve over time."
date: 2026-04-10
tags: ["AI", "AI-agents", "skill-design", "agent-architecture", "知识管理", "最佳实践"]
---

今天下午我做了一件听起来有点奇怪的事——让 AI 读完了我自己的 174 篇博客，提炼出写作风格，写成了一份可执行的配置文件，然后告诉它："以后每次写文章就按这个标准来，写完还要自己更新它。"

它真的照做了。不仅生成了一份包含六大风格特征、两种文章模板、四个薄弱环节和改进路线图的 Skill 文档，还自动附加了一条"进化协议"——每次使用完毕后检查是否需要更新。

**这不是 prompt engineering，也不是 RAG。这是给 Agent 建程序性记忆（Procedural Memory）。**

很多人给 AI 配了知识库、写了几百行 system prompt，但用起来总觉得"不长进"。问题不在于模型，而在于记忆的结构。静态 prompt 是一次性指令，而可进化的 Skill 是活的——它会随着使用自动迭代、越用越准、越用越像你自己。

<!--more-->

## 一、为什么静态 Prompt 一定会失效？

2026 年了，大多数人的 AI 工作流依然停留在"写一段很长的 prompt，指望它能覆盖所有场景"。这套方法有三个致命缺陷：

**上下文爆炸。** Prompt 越长，核心指令越容易被后续对话稀释。你精心写了 50 条写作规则，对话进行到第 20 轮时，模型已经开始遗忘前 30 条了。这是注意力机制的物理限制，不是 bug。

**缺乏反馈闭环。** Prompt 写错了没人改，改错了没人记。每次对话都是"入职第一天"状态——没有磨合，没有积累，没有对过往错误的修正。你重复解释了十遍的东西，它第十一次还是会忘。

**知识无法沉淀。** 今天你教会了 AI "我的博客开头要用场景驱动"，这个知识只存在于这次对话的上下文里。下次开新对话，一切归零。

人类学技能的方式完全不同。你不是通过背"写作手册"学会写作的——你是写了 100 篇，收到反馈，修正了 50 个问题，剩下 50 个内化成肌肉记忆。**Agent 也需要这个循环：做 -> 反馈 -> 修正 -> 固化。**

Skill 就是固化的载体。

## 二、可进化 Skill 的解剖学：它和 Prompt 有什么本质不同？

用今天下午刚创建的 `writing-style` Skill 做解剖案例。它不是"更好的 prompt"，而是一个**可执行的配置 + 反馈协议**。

### 六大模块

**1. Trigger（触发条件）**
```yaml
## Trigger
When writing new blog posts for hugozhu.site, reviewing existing posts,
or analyzing blog content strategy.
```
不是每次对话都加载。只有当任务匹配时才注入，避免 context 浪费。这是和 system prompt 的根本区别之一——**条件加载**。

**2. Style Characteristics（风格特征）**
```markdown
### 1. 场景驱动开篇 (Scenario-Driven Openings)
Open with concrete stories, not abstract concepts.
- **Good:** "上周有个做运营的朋友拿着一个 AI 帮他建的销量预测模型来找我..."
- **Pattern:** Real person + specific situation + dialogue → reveals the problem
```
不是"你必须用场景开头"的死板规则。而是给出好例子、坏例子、抽象模式。Agent 拿到的是判断标准，不是检查清单。这让它能在新场景下做类比推理，而不是机械匹配。

**3. Templates（结构化模板）**
```markdown
### For Opinion Posts (观点文)
1. Hook: Real scenario/story (2-4 paragraphs)
2. Thesis: Clear statement of the core argument
3. <!--more-->
4. Section 一: Problem definition / conventional wisdom
5. Section 二: Analysis / why conventional view is incomplete
6. Section 三: Framework or new mental model
7. Section 四: Practical implications
8. Conclusion: Memorable closing thought
```
模板不是限制创造力，而是**降低每次创作的决策成本**。结构是骨架，内容是血肉——Agent 只需要专注于血肉。

**4. Weaknesses（已知缺陷）**
```markdown
### W1. 技术帖缺乏问题上下文
Some infrastructure posts are too thin — 26 lines with zero "why".
- **Fix:** Always add "为什么需要这个方案" paragraph before code
```
这可能是 Skill 和 Prompt 最本质的区别：**显式暴露盲区**。Prompt 假装自己什么都知道；Skill 坦白自己哪里做得不好，并附带修复方案。这种自我认知让 Agent 在使用时主动规避已知陷阱。

**5. Improvement Roadmap（改进路线图）**
```markdown
### Phase 1: Consistency (Immediate)
- [ ] Apply "problem context" paragraph to ALL technical posts
- [ ] Remove AI generation markers from existing posts
```
不是被动等待改进，而是有明确的行动计划。Agent 可以在每次使用后检查 Roadmap，确认哪些已完成、哪些还需要推进。

**6. Evolution Log（演进日志）**
```markdown
| Date | Change |
|------|--------|
| 2026-04-10 | Initial creation. Analyzed 174 posts... |
```
版本历史。Agent 需要知道自己"上次改了啥"，避免覆盖或回退。更重要的是，它提供了上下文连续性——三个月后，Agent 能看到 Skill 的整个进化路径。

## 三、Agent 如何使用并进化 Skill：四步闭环

Skill 不是写完就放着的文档。它活在一个循环里：

### Load -> Use -> Reflect -> Patch

**Load（加载）：** 当任务触发时，Agent 自动加载对应 Skill。比如写一篇新博客时，`writing-style` Skill 被注入上下文。

**Use（使用）：** Agent 按照 Skill 中的模板和风格特征撰写文章。

**Reflect（反思）：** 文章完成后，Agent 对照 Skill 中的 Weaknesses 列表检查——这篇文章有没有犯已知错误？有没有新发现？

**Patch（更新）：** 如果有，直接调用 `skill_manage(action='patch')` 更新 Skill 文件。

以今天下午的会议纪要 Skill 为例：
- 第一次整理时，发现"通义听悟的 speaker 标识混乱"
- 反思后把这个发现记录到 Weaknesses 和 ASR 适配章节
- 用 `patch` 指令更新 Skill 文件
- 下次再遇到通义听悟的转写文本，自动加载更新后的规则，不再犯同样的错误

**这就是"越用越准"的底层机制：把每次出错变成 Skill 的 training data。**

人类的肌肉记忆靠的是重复和反馈。Agent 的程序性记忆靠的是 Skill 文件中的 Weaknesses 列表 + 自动 Patch 能力。原理完全一致。

## 四、`meeting-minutes` 的解剖：为什么依赖系统比单体 Prompt 更聪明？

上面讲的是 `writing-style` 的静态结构。但真正让我意识到 Skill 系统威力的，是第二天创建 `meeting-minutes` 时的发现。

### 一个 Skill 可以依赖另一个 Skill

`meeting-minutes` 的 YAML 头里有一行：
```yaml
dependencies: ["writing-style"]
```

这意味着什么？意味着**会议纪要不需要重新定义"什么是好的写作风格"**。它只需要声明依赖，Agent 加载时会自动把 `writing-style` 一起注入上下文。

这个设计解决了 Prompt 工程里最头疼的问题：**知识重复和不一致**。

如果没有依赖系统，`meeting-minutes` 需要把"场景驱动开篇"、"框架构建"、"中英双语"这些写作规则全部复制一遍。一旦 `writing-style` 更新了（比如发现了新的风格特征），所有复制了这些规则的 Skill 全部过时，必须手动同步——这是维护噩梦。

有了依赖系统，`meeting-minutes` 只关心自己特有的东西：
- ASR 噪声处理（通义听悟的 speaker 混乱、Whisper 的专有名词错误）
- 会议纪要模板（核心结论 TL;DR、议题分组、待办表格）
- 信息提取规则（决策 vs 讨论 vs 待确认的识别和标注）

它不需要重新教 Agent 怎么写中文技术文章——那是 `writing-style` 的事。这种关注点分离，和软件架构里的**依赖注入（Dependency Injection）**是同一个理念。

### ASR 处理的流水线设计

`meeting-minutes` 把会议纪要整理拆成四步流水线：

**Step 1：信息提取（Extraction）**——从原始 ASR 文本中捞出关键要素：参会人、议题、决策点、待办。这是"去噪声"阶段。

**Step 2：结构化整理（Restructuring）**——ASR 是线性的，但会议讨论是树状的。同议题的讨论可能分散在 30 分钟的对话里，需要把它们拼到一起。这是"重组"阶段。

**Step 3：语言重写（Rewriting）**——按照 `writing-style` 的规则重写：简洁、结构化、逻辑递进。这是"提质"阶段。

**Step 4：校验（Validation）**——检查待办是否有负责人、不确定信息是否标注 `[?]`、有没有遗漏重要议题。这是"质检"阶段。

为什么要把这四步写死在 Skill 里？因为**每一步都是踩过坑之后才总结出来的**。

第一次整理会议纪要时，Agent 直接跳到 Step 3——它看到 ASR 文本就开始重写，结果遗漏了散落在闲聊里的关键决策。第二次，加了 Step 1 和 Step 2，先提取再重组，质量显著提升。第三次，遇到通义听悟的 speaker 标识混乱问题，在 Step 4 里加了不确定信息标注规则。

**每一步都是 bug fix 固化成的最佳实践。** 这和写代码时把踩过的坑写进测试用例是一个道理。

### 不确定信息标注：为什么 `[?]` 比瞎猜好

`meeting-minutes` 里有一个看起来很小但极其重要的设计：
```markdown
### 不确定信息标注
- 人名不确定：`张三[?]`
- 数字不确定：`500万[?]`
- 不确定就不编，宁可标注 `[?]` 也不写错
```

这解决了 LLM 最大的顽疾——**幻觉式补全**。当 ASR 把"张三"识别成"章三"时，模型会倾向于"纠正"成它认为正确的名字，但这个"纠正"可能完全是错的。`[?]` 标注强制模型承认不确定性，而不是假装自信。

这个规则不是凭空设计的——是第一次整理会议纪要时，Agent 把一个产品名猜错了，用户发现了这个问题，然后更新到 Skill 里。**这就是"可进化"三个字最朴素的含义：出过错，记住错，下次不错。**

### 多 ASR 工具适配：为什么不需要每个工具写一个 Skill

飞书妙记、Whisper、通义听悟、讯飞听见——每个工具的转写质量、格式、噪声类型都不同。按直觉，可能觉得应该给每个工具写一个专门的 Skill。

但 `meeting-minutes` 的做法是：**一个 Skill + 多工具适配章节**。

```markdown
## ASR 工具适配
### 飞书妙记：有 speaker 标识和标点，质量较高...
### Whisper：无 speaker 标识，需要根据内容推断说话人切换...
### 通义听悟：有 speaker 标识，中文识别好...
### 讯飞听见：标点较准，长会议可能分段...
```

这背后的取舍是：不同工具的差异主要体现在"输入格式和噪声类型"上，而"提取-重组-重写-校验"的核心流水线是一样的。把差异收敛到一个适配章节，既避免了 Skill 爆炸，又保持了可扩展性——新工具来了，加一段适配说明就行。

这也是可进化 Skill 的好处之一：当你用了第五个 ASR 工具，只需要在适配章节加一段描述，Skill 的 Evolution Log 会记录这次扩展，下次 Agent 就知道"这个 Skill 已经适配过 5 种工具了"。

### 为什么这样做好？

回头来看，`writing-style` 和 `meeting-minutes` 这两个 Skill 的组合，展示了一套完整的知识管理范式：

**1. 原子化（Atomicity）**——每个 Skill 只对一个关注点负责。`writing-style` 管写作风格，`meeting-minutes` 管纪要处理。不越界，不重复。

**2. 可组合（Composability）**——通过 `dependencies` 声明，`meeting-minutes` 组合了 `writing-style` 的能力。这不是复制粘贴，而是真正的组合——`writing-style` 更新，`meeting-minutes` 自动受益。

**3. 可追溯（Traceability）**——每个 Skill 都有 Evolution Log。三个月后回头看，你能完整追溯：为什么加了 `[?]` 标注、为什么区分了决策和讨论、为什么飞书妙记不需要特殊处理。这些上下文在单体 Prompt 里是不可见的——Prompt 没有版本历史，只有"现在长这样"。

**4. 可进化（Evolvability）**——最关键的一条。每个 Skill 末尾都有一条协议："使用完毕后检查是否需要更新"。这意味着 Skill 的维护不是被动等待用户发现问，而是主动闭环：每次出错 -> 自动记录 -> 下次规避。

这和"写一段很长的 prompt 然后希望它能工作"的本质区别在于：**Skill 是活的，Prompt 是死的。** Skill 在每次使用中积累反馈、修正偏差、扩展能力边界。Prompt 从创建的那一刻起就开始过时，因为它无法感知自己哪里做错了。

人类的技能也是这么来的——不是背手册学会开车，而是开了 100 次车、踩了 10 次急刹、修正了 20 个坏习惯之后内化成的肌肉记忆。Skill 就是 Agent 的肌肉记忆，而 `[?]` 标注、依赖声明、Evolution Log 这些设计，就是让 Agent 能够"记住教训、不再犯错"的神经通路。

## 五、设计可进化 Skill 的 4 条最佳实践

经过今天从 0 到 1 创建两个 Skill 的实战，我总结了四条经验：

### 1. Keep it lean（保持精简）
Skill 不是百科全书。只写影响输出的关键规则，不写显而易见的废话。`writing-style` 的 Style Characteristics 只有 6 条——因为超过 7 条，Agent 在长对话中就会开始遗忘。精简不是偷懒，是对注意力机制的尊重。

### 2. Version control the knowledge（版本化知识）
`Evolution Log` 不是可有可无的装饰。它是 Skill 的 git log——记录了每次变更的原因和内容。没有它，Agent 在更新 Skill 时会像没有 commit message 的开发者一样：知道自己改了东西，但不记得为什么改。

### 3. Feedback is fuel（反馈即燃料）
最关键的一条规则写在 Skill 的最后：

> After writing or reviewing blog posts, if a new pattern emerges, add it. If a weakness is resolved, update it. Use `skill_manage(action='patch')` — never let this skill go stale.

这不是建议，是协议。**你必须明确告诉 Agent "用完后必须检查并更新 Skill"**。把 `patch` 作为工作流的标准结尾，否则闭环就断了。

### 4. Separate concerns（关注点分离）
风格归 style，工具归 tool，流程归 workflow。今天下午我先创建了 `writing-style`，然后创建了 `meeting-minutes`。后者依赖前者的风格定义（`dependencies: ["writing-style"]`），但没有把写作风格的内容复制进去——它只引用，不重复。

这和软件架构的原则一样：**每个 Skill 只对一个关注点负责，通过依赖关系组合能力。**

## 附录：两个 Skill 的完整源代码

以下是这两个 Skill 的完整 SKILL.md 文件原文。

### writing-style

路径：`skills/productivity/writing-style/SKILL.md`

```yaml
---
name: writing-style
description: Hugo Zhu's blog writing style guide for hugozhu.site — style characteristics, structural templates, weaknesses, and improvement roadmap. Evolves with each use.
version: 1.0.0
author: hugozhu
license: MIT
dependencies: []
metadata:
  hermes:
    tags: [blog, writing, content-strategy, hugo, chinese, english]
    related_skills: []
---
```

```markdown
# Hugo Zhu's Blog Writing Style Guide

## Trigger
When writing new blog posts for hugozhu.site, reviewing existing posts, or analyzing blog content strategy.

## Author Profile
- **Name:** Hugo Zhu
- **Blog:** hugozhu.site (Hugo + beautifulhugo theme)
- **Content languages:** Primarily Chinese (2026+), previously English
- **Topics:** AI/ML thinking, product methodology, personal cloud infrastructure (Tailscale, CoreDNS, Armbian), Raspberry Pi, networking, software engineering
- **Audience:** Chinese-speaking tech professionals, engineers transitioning to AI, product-minded technologists
- **Publishing rhythm:** ~2-3 posts/week in 2026

## Core Writing Identity: 务实的思考型工程师

Three facets:
- **Engineer:** Deep technical understanding, writes from hands-on experience
- **Product thinker:** User-centric, problem-first, frames things in terms of value and trade-offs
- **Philosopher:** Abstract thinking, first principles, willing to question assumptions

## Style Characteristics (Strengths to Maintain)

### 1. 场景驱动开篇 (Scenario-Driven Openings)
Open with concrete stories, not abstract concepts.
- **Good:** "上周有个做运营的朋友拿着一个 AI 帮他建的销量预测模型来找我，特别兴奋：'你看，R² = 0.89，是不是挺准的？'"
- **Good:** "上周，一个做 ToB SaaS 的朋友跟我吐槽：他花了两周让 AI 帮忙写了一套完整的 CRM 后端..."
- **Pattern:** Real person + specific situation + dialogue → reveals the problem

### 2. 框架构建者 (Framework Builder)
Don't just describe — structure into reusable mental models.
- **Examples:** "任务委托四要素"、"Token 能力边界"、"万物皆可建模吗"
- **Goal:** Create frameworks readers can apply to their own situations

### 3. 反直觉但接地气 (Contrarian But Grounded)
Challenge conventional wisdom with clear reasoning.
- **Examples:** "AI 落地的瓶颈不是技术，是你不会派活"、"不是所有东西都值得建模"
- **Rule:** Back every contrarian claim with real examples AND logical chains

### 4. 结构清晰 (Clear Structure & Logical Flow)
- Numbered sections (一、二、三)
- Bold key takeaway sentences
- Pattern: Problem -> Analysis -> Framework -> Implications/Action items
- Use `<!--more-->` after opening paragraph(s) for Hugo excerpt

### 5. 中英双语标题 (Bilingual Titles)
- Chinese main title + English subtitle (or vice versa)
- Body language: Chinese primary with English technical terms
- This is the established style since 2025

### 6. 有辨识度的文风 (Distinctive Voice)
- Conversational but rigorous — like a smart colleague explaining something
- Uses "我" (first person) and direct address "你" to create intimacy
- Ends with thought-provoking questions or philosophical extensions
- Not afraid of being wrong — values the thinking process over authority

## Post Structure Templates

### For Opinion/Thinking Posts (观点文)
```
1. Hook: Real scenario/story (2-4 paragraphs) that illustrates the problem
2. Thesis: Clear statement of the core argument (1-2 sentences)
3. <!--more-->
4. Section 一: Problem definition / conventional wisdom / why this matters
5. Section 二: Analysis / why conventional view is incomplete
6. Section 三: Framework or new mental model (the core contribution)
7. Section 四: Practical implications / how to apply / examples
8. Conclusion: Memorable closing thought, question, or philosophical extension
```

### For Technical/Infrastructure Posts (技术文)
```
1. Hook: What problem am I solving and why? (2-3 paragraphs with context)
2. What alternatives were considered? Why this approach?
3. <!--more-->
4. Background: Brief intro to the tool/technology (only if not widely known)
5. Solution: Step-by-step with code/config blocks
   - Each code block preceded by WHY, not just WHAT
6. Caveats: Known limitations, edge cases, gotchas
7. References: Related posts on this blog, official docs
```

## Current Weaknesses (Areas to Improve)

### W1. 技术帖缺乏问题上下文
Some infrastructure posts are too thin — e.g., tailscale-hostapd post is 26 lines with zero "why".
- **Fix:** Always add "为什么需要这个方案" paragraph before code
- **Good example:** The CoreDNS short DNS post already does this naturally

### W2. 零可视化内容
174 posts with almost no diagrams, screenshots, or architecture visuals.
- **Fix:** Add at least one visual per post
- For technical posts: network topology diagram, terminal screenshot
- For opinion posts: framework diagram (2x2 matrix, flow chart, conceptual model)

### W3. 缺少交叉引用和主题聚合
Overlapping topics don't reference each other — Tailscale, CoreDNS, AI Agent posts are scattered.
- **Fix:** Create topic series ("个人云基础设施"系列, "AI 思考录"系列)
- Add related-post links at the bottom of each article

### W4. AI 生成代码标注
Some posts contain `# generated by AI` comments, undermining credibility.
- **Fix:** Remove generation markers; verify and rewrite any AI-generated code
- If referencing AI-generated concepts, integrate them naturally without attribution

## Improvement Roadmap

### Phase 1: Consistency (Immediate)
- [ ] Apply "problem context" paragraph to ALL technical posts going forward
- [ ] Remove AI generation markers from existing posts
- [ ] Ensure every post has `<!--more-->` in the right place

### Phase 2: Visuals (Near-term)
- [ ] Add at least one diagram/screenshot per new post
- [ ] Retrofit visuals to top 10 most-viewed existing posts
- [ ] Create reusable diagram templates (network topology, framework 2x2, flow chart)

### Phase 3: Knowledge System (Medium-term)
- [ ] Create "个人云基础设施" series page
- [ ] Create "AI 思考录" series page
- [ ] Add related-posts links to existing articles
- [ ] Consider creating topic tags that map to series

## Code Example Conventions
- Python code blocks: use `python` language tag
- Bash/config: use appropriate language tag (bash, yaml, toml)
- Code should illustrate a concept, not just exist — add a 1-line explanation before each block

## Evolution Log

| Date | Change |
|------|--------|
| 2026-04-10 | Initial creation. Analyzed 174 posts across 2013-2026. Identified 6 style strengths, 4 weaknesses, 3 improvement areas. |

## How to Evolve This Skill

After writing or reviewing blog posts:
1. If a new pattern emerges (successful or unsuccessful), add it to Style Characteristics or Current Weaknesses
2. If a weakness is resolved, move it from Current Weaknesses to a "Resolved" section
3. If a new improvement is identified, add it to Improvement Roadmap
4. Update the Evolution Log with the date and what changed
5. Use `skill_manage(action='patch')` to update — never let this skill go stale
```

### meeting-minutes

路径：`skills/productivity/meeting-minutes/SKILL.md`

```yaml
---
name: meeting-minutes
description: 从 ASR 录音转写文本整理会议纪要 — 噪声清洗、结构化提取、按 Hugo 写作风格输出。适用于飞书妙记、Whisper、通义听悟等 ASR 产物。
version: 1.0.0
author: hugozhu
license: MIT
dependencies: ["writing-style"]
metadata:
  hermes:
    tags: [meeting, minutes, ASR, transcription, summarization, chinese, agenda, action-items]
    related_skills: [writing-style, lark-minutes]
---
```

```markdown
# 会议纪要整理 Skill

## Trigger
当用户提供 ASR 转写文本（飞书妙记、Whisper、通义听悟、讯飞等），要求整理会议纪要时加载。

## 核心设计哲学

会议纪要不是录音的文字搬运，而是**信息压缩 + 决策提取**。这和 Hugo 的博客写作风格一致：框架化、结构化、可执行。

> **好纪要的标准：没参会的人看一遍就知道发生了什么、决定了什么、接下来要做什么。**

## ASR 转写文本的典型问题

### 噪声类型
1. **无标点/错标点**：ASR 输出往往没有正确断句
2. **专有名词错误**：人名、产品名、技术术语经常被识别错
3. **口语化冗余**：嗯、啊、这个、那个、重复表达
4. **多人交叉发言**：没有明确 speaker 标识，或标识混乱
5. **中英混杂**：技术讨论中大量英文术语夹杂
6. **跑题和闲聊**：会议中常有偏离主题的讨论
7. **上下文缺失**：参会人都知道但没明说的背景知识

### 处理原则
- **保留原意，改写表达**：不改写核心信息，但大幅改写表达方式（去口语化、补逻辑）
- **不确定就标注**：人名、数字等关键信息不确定时用 `[?]` 标注，不瞎猜
- **区分事实和观点**：明确哪些是共识决定，哪些是某人观点
- **跑题内容直接删**：不记录闲聊、不相关的讨论

## 会议纪要结构模板

### 标准模板（适用于大多数会议）

```markdown
# [会议主题] 会议纪要

**时间：** YYYY-MM-DD HH:MM
**时长：** XX 分钟
**参会人：** 人名列表
**转写来源：** [ASR 工具名称]

---

## 一、核心结论（TL;DR）

用 3-5 条 bullet points 概括本次会议最重要的结论和决定。
没参会的人只看这一节应该就能知道发生了什么。

- 决定：XXX
- 风险：XXX
- 变更：XXX

## 二、议题讨论

### 议题 1：[标题]

**背景：** 一句话说明为什么要讨论这个。

**讨论要点：**
- [论点/发现/数据]
- [不同意见，如有]

**结论/决定：** 明确的结论或下一步方向。

### 议题 2：[标题]

...

## 三、待办事项（Action Items）

| # | 事项 | 负责人 | 截止时间 | 备注 |
|---|------|--------|----------|------|
| 1 | [具体可执行的动作] | @人名 | YYYY-MM-DD | 可选 |
| 2 | ... | ... | ... | ... |

## 四、遗留问题（Open Questions）

- [ ] 需要后续确认/研究的问题 1
- [ ] 需要后续确认/研究的问题 2

## 五、下次会议

- 时间：[如有]
- 议题：[如有]
```

### 轻量模板（适用于站会/简短对齐会）

```markdown
# [会议主题] 纪要 — YYYY-MM-DD

## 结论
- 结论 1
- 结论 2

## 待办
- @人名：事项（截止 XX）
- @人名：事项（截止 XX）

## 待确认
- 待确认事项 1
```

## 处理流程

### Step 1：信息提取
从 ASR 文本中提取：
- 会议主题、日期（如果文本中包含）
- 参会人（从发言内容推断）
- 讨论的议题数量及切换点
- 关键决策点和结论
- 明确的待办事项（谁、做什么、什么时候）
- 遗留问题和未决事项

### Step 2：结构化整理
- 按议题分组相关内容（ASR 文本通常是线性的，需要把同一议题的碎片拼起来）
- 识别并标记决策 vs 讨论 vs 待确认
- 合并重复讨论，消除冗余

### Step 3：语言重写
- 按 Hugo 写作风格重写：简洁、结构化、逻辑递进
- 去除口语化表达，保留技术术语
- 中英文混写：中文为主，技术术语保留英文
- 每段加粗关键句

### Step 4：校验
- 检查待办事项是否有明确负责人和截止时间（如果有）
- 检查结论是否有事实依据（不是推断）
- 检查不确定信息是否标注 `[?]`
- 确认没有遗漏重要议题

## 输出风格规范

### 语言风格
- **中文为主，技术术语保留英文**：和博客写作风格一致
- **简洁直接**：不用"可能"、"大概"、"似乎"等模糊词（除非原文确实不确定）
- **动词优先**："决定采用 X 方案" 比 "关于 X 方案的讨论达成了采用 X 的共识" 更好
- **编号结构**：一、二、三 的层级和博客一致

### 决策记录规则
- 明确写了"决定"、"定了"、"就这样" -> 记录为 **决定**
- 表达了倾向但没最终确定 -> 记录为 **倾向**
- 只讨论了没有结论 -> 记录为 **讨论** 并标注未决
- 如果有分歧 -> 记录双方论点和最终结论

### 待办事项提取规则
- 必须包含：动作描述 + 负责人
- 如果有明确时间：加上截止时间
- 没有明确负责人的 -> 标注 `[待分配]`
- 模糊的"后续再看看" -> 移到"遗留问题"，不算待办

### 不确定信息标注
- 人名不确定：`张三[?]`
- 数字不确定：`500万[?]`
- 产品/项目名不确定：`Project X[?]`
- 不确定就不编，宁可标注 `[?]` 也不写错

## ASR 工具适配

### 飞书妙记
- 有 speaker 标识和标点，质量较高
- 直接使用即可，重点关注议题切分
- 飞书妙记 URL 格式：`https://applink.feishu.cn/client/minutes/detail?token=xxx`

### Whisper / OpenAI Whisper
- 无 speaker 标识，标点可能不准
- 需要根据内容推断说话人切换
- 专有名词错误率较高，需要特别注意

### 通义听悟
- 有 speaker 标识，中文识别好
- 可能有 AI 摘要，但通常不够结构化
- 需要重新按模板整理

### 讯飞听见
- 标点较准，speaker 标识一般
- 长会议可能有分段
- 注意口语化冗余较多

## 特殊场景处理

### 技术方案评审会
- 重点关注：技术选型结论、架构变更、风险评估
- 代码/架构讨论要提取核心结论，不记录逐行讨论

### 产品需求讨论
- 重点关注：需求优先级变更、用户反馈、上线计划
- 需求描述要结构化，用 bullet points 而非段落

### 项目进度同步
- 重点关注：进度偏差、阻塞项、资源调整
- 用表格对比"计划 vs 实际"

### Brainstorm / 创意讨论
- 重点关注：产生的创意、筛选标准、下一步验证计划
- 不记录发散过程，只记录收敛结果

## 长度控制

- 30 分钟会议 -> 纪要不超过 500 字
- 60 分钟会议 -> 纪要不超过 800 字
- 2 小时+ 会议 -> 纪要不超过 1500 字
- **核心原则：信息密度 > 篇幅**。宁可删掉不重要的，也不要让纪要太长没人看。

## Evolution Log

| Date | Change |
|------|--------|
| 2026-04-10 | 初始创建。基于 Hugo 写作风格，适配 ASR 转写场景。定义标准模板、处理流程、输出规范。 |

## How to Evolve This Skill

After generating meeting minutes:
1. If a new ASR tool is used, add its characteristics to "ASR 工具适配"
2. If a new meeting type is encountered, add a "特殊场景处理" entry
3. If the user provides feedback on format/style, update the templates
4. If a better extraction pattern is discovered, add it to the processing flow
5. Update the Evolution Log with the date and what changed
6. Use `skill_manage(action='patch')` to update — keep it current
```

## 结语

AI 时代的"知识管理"不是建 Notion 文档库，也不是写 5000 字的 system prompt。是训练可执行的、能自我更新的 Skill——它们像肌肉记忆一样，在每次使用中积累反馈，在每次反馈中进化。

今天下午创建这两个 Skill 的过程中，我突然意识到：**真正有价值的不是 Skill 文档本身，而是设计 Skill 的那套元能力——知道哪些规则该写进去、哪些不该写，知道在哪里留白让 Agent 自己判断，知道如何在"约束"和"自由"之间找到那个恰到好处的平衡点，知道如何让一个 Skill 依赖另一个 Skill 而不是重复造轮子，知道把每次踩坑固化成可复用的流水线步骤。**

这才是 AI 时代人类的核心竞争力：不是你会不会用 AI，而是你会不会教 AI 学会自己学习。

最后留一个思考题：如果你的 Agent 每天自动更新自己的 Skill，三个月后，它还是同一个 Agent 吗？或者更准确地说——**它已经变成了你。**
