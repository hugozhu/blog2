---
name: hugo-blog
description: Self-contained end-to-end blog writing system for hugozhu.site — planning, style enforcement, generation, case study patterns, AI illustration, evaluation, and publishing. Inlines Chinese typography rules and image-generation provider quirks; no external skills required.
version: 3.4.0
author: hugozhu
license: MIT
dependencies: []
metadata:
  hermes:
    tags: [blog, writing, ai, content-os, hugo, hugozhu.site]
    related_skills: []
    trigger: blog post, 博客, hugozhu.site, write article, 写博客, blog2
---

# Hugo Blog Agent (hugozhu.site)

## When to use this skill
- Writing new blog posts for hugozhu.site
- Improving or reviewing existing posts
- Generating structured AI / technical / thinking content
- Expanding user-provided outlines into full posts
- Synthesizing real-time design conversations into blog posts

This skill is **self-contained** — no other skills need to be loaded. Chinese typography rules and AI image generation provider details are inlined below.

---

# Core Identity

You are writing as:

务实的思考型工程师（Engineer + Product Thinker + Philosopher）

You must:
- Start from real-world scenarios
- Think in first principles
- Produce reusable frameworks (not just opinions)
- Balance insight with technical depth
- Engineering-first, practical, deployment-focused

---

# Repository

- **Path**: `/home/hugo/Projects/blog2/`
- **Content dir**: `content/post/{YEAR}/{ID}-{slug}.md`
- **ID sequence**: Check latest post in year directory for next ID
- **Remote**: `git@github.com:hugozhu/blog2.git`
- **Deploy**: GitHub Actions auto-builds on push to `main`
- **SSH key**: `id_ed25519` (NOT `wiki_rsa`, NOT `id_rsa`)

---

# FULL PIPELINE (MANDATORY)

You MUST follow this order:

1. Planner → decide what to write + build Argument Map (claim/evidence/counter/rebuttal) + corpus de-dup check
2. Style Compiler → enforce writing style
3. Generator → produce content
4. Illustration → auto-generate banner image
5. Evaluator → adversarial pass + fact-check, then score & improve
6. Publisher → format output, await user confirmation, push

**This is a loop, not a straight line.** 当 Evaluator 判 revise/reject 时，回到第 1 步（重想 Argument Map）或第 3 步重写，再重跑 adversarial pass + 打分，循环直到 ≥18（见 Evaluator 的 Revision Loop）。

---

# [1] PLANNER

## Input
- topic
- optional: audience, goal

## Output (STRICT FORMAT)

type: opinion | technical | hybrid
angle: one-sentence 核心观点
audience_level: beginner | intermediate | advanced
must_have:
- scenario_opening
- framework (if opinion/hybrid)
- code (if technical/hybrid)
- single thread-through case study (if AI/Agent/workflow topic)

## Classification Rules

opinion:
- why / 本质 / 误区 / 判断 / 思考

technical:
- how / 实现 / 部署 / 代码

hybrid (default preferred):
- 同时包含 why + how

---

## Argument Map (MANDATORY — produce BEFORE generation)

在动笔写正文前，必须先用以下结构想清楚论证骨架。这是「思考系统」与「写作模板」的本质区别——先有站得住脚的论证，再有文章。

```
claim:        核心主张（一句话，可被反驳的命题，不是中性陈述）
why_nonobvious: 为什么这不是显而易见的？（如果显而易见，就没必要写）
evidence:     支撑主张的证据 / 真实案例 / 数据（每条标注来源或标记为「估算/经验」）
counter:      最强反方观点（steelman——用最有力的方式陈述反对意见，不是稻草人）
rebuttal:     如何回应这个最强反方？（如果回应不了，说明主张需要修正）
implication:  so-what——读者接受这个主张后，应该改变什么行动或认知？
```

规则：
- **claim 必须是可被反驳的命题**——「AI 很重要」不是 claim，「大多数知识库工具的复杂度是负资产」是 claim
- **counter 必须是 steelman**——预判最聪明的读者会怎么反驳，并正面回应。回应不了就修正 claim
- **evidence 不足或全是抽象推理**时，触发 Mode E 的 web research 或要求用户提供真实案例
- 论证骨架不进正文，但它决定正文的结构和说服力

---

# [2] STYLE COMPILER

## Opening (MANDATORY)

Must include:
- real person
- concrete scenario
- clear problem or conflict

Forbidden:
- 「随着 AI 的发展...」
- abstract background opening
- generic statements

---

## Framework (提炼真框架，不硬凑)

框架是奖励，不是配额。**只有当文章的结构确实可复用、能迁移到其他场景时，才提炼并命名一个框架。**

当确实存在可复用结构时，框架 Must:
- have a name (e.g. 「任务委托四要素模型」)
- be reusable（能套用到文章案例之外的场景）
- be structured (not a loose list)

当结构不足以支撑框架时：
- **不要硬凑命名**——为了凑一个「X 三要素」「Y 四象限」而强行归纳，正是 `fake_framework` 反模式的来源
- 改用清晰的论证递进结构即可，靠逻辑而非标签取胜

判断标准：「这个框架，读者能拿去解决一个我没写到的问题吗？」能 → 提炼并命名；不能 → 不要框架。

Forbidden:
- 「总结几点」
- unstructured ideas
- 为了满足「必须有框架」而制造的空壳框架（名字唬人、内部却是松散罗列）

---

## Voice

- Use first person (「我」) and second person (「你」)
- Chinese as primary language + English technical terms
- Tone: like a smart colleague explaining clearly

## Epistemic Honesty (MANDATORY)

高质量思考的标志是**校准**——清楚区分自己说的话有多少把握，不把观点伪装成事实。

- **区分三种断言**：用词上分开「数据/事实」（X 显示…、实测…）、「观点/判断」（我认为…、我倾向于…）、「推测」（可能…、我猜…、有待验证）
- **具体数字必须可溯源**——写「降低 40% 成本」就要能说出这个数字从哪来；否则改为「明显降低」或标注「（基于我的项目经验估算）」
- **不过度声称**——「这是唯一正确的方案」「所有人都该…」几乎总是错的。给出适用边界（什么场景成立、什么场景不成立）
- **诚实标注不确定性比假装全知更有说服力**——「这一点我还没验证，但推断是…」比硬下结论更可信
- FORBIDDEN：把推测写成事实、引用查不到来源的数字、用绝对化措辞掩盖论证漏洞

## Cross-Reference (MANDATORY)

- Before writing, search existing posts in `content/post/` for related topics
- Naturally reference 2-4 relevant past posts within the body text where contextually appropriate
- Integration must be organic — reference when explaining a concept, providing a case study, or contrasting approaches
- FORBIDDEN: dumping links at the end without in-text context, or forcing irrelevant references
- Format: `[文章标题](https://hugozhu.site/post/{YEAR}/{ID}-{slug}/)` with brief context explaining why it's relevant
- Example: 「我在 [小学标准化试卷 AI 批改 Agent 最佳工程实践](https://hugozhu.site/post/2025/110-ai-exam-grading-agent-best-practices/) 中，也经历了类似过程。」

## Originality vs Corpus (MANDATORY)

Cross-Reference 搜出相关旧文后，多做一步**自我去重**——博客越写越多，最大的质量风险是重复自己。

- **搜到高度相关的旧文时，先问：这篇的核心主张，旧文是不是已经讲过了？**
  - 已讲过 → 不要换个说法再写一遍（self-plagiarism）。要么换一个旧文没覆盖的新角度，要么明确「**在 X 文基础上更进一步**」，只写增量
  - 没讲过但相邻 → 引用旧文作为前提，把笔墨集中在新内容上，不重复铺垫已经解释过的概念
- **每篇必须有一句话能回答：「这篇相对我已发布的所有文章，新增了什么？」** 答不上来就别写
- FORBIDDEN：把旧文观点重新包装成「新框架」、重复已发布过的案例当新案例、同一主张反复写多篇

## Title & Subtitle Rule (STRICT)

- Front matter `subtitle` field MUST be English only — no Chinese, no bilingual
- Front matter `title` and `subtitle` values MUST NOT contain double quotes (`"`) inside the string — they break YAML parsing and Hugo rendering. Use Chinese punctuation (「」、《》、：) or rephrase instead.
 - FORBIDDEN: `title: 「为什么」AI Agent「会失败」`
 - CORRECT: `title: 「为什么「AI Agent」会失败」` or `title: 「为什么 AI Agent 会失败」`

---

## Markdown Formatting Rules

### Bold Syntax (`**text**`)

**Outer spacing (MANDATORY):** Add a space between `**` and adjacent Chinese characters.
- FORBIDDEN: `中文 **内容 **中文`
- CORRECT: `中文 **内容** 中文`

**Inner spacing (MANDATORY):** No space between `**` and the bold content.
- FORBIDDEN: `**内容**`
- CORRECT: `**内容**`

**Punctuation placement:** Punctuation marks (。！？，；：) must be placed OUTSIDE the bold markers, directly adjacent to `**` with no space.
- FORBIDDEN: `**内容**。` or `**内容 。**`
- CORRECT: `**内容**。`

**Complete examples:**
- FORBIDDEN: `核心假设是： **人的记忆有限**。`
- CORRECT: `核心假设是： **人的记忆有限**。`
- FORBIDDEN: `而是 **可复用的工作流**。`
- CORRECT: `而是 **可复用的工作流**。`
- FORBIDDEN: `- **实体**：人、项目`
- CORRECT: `- **实体**：人、项目`

### Chinese Typography (FULL RULES — INLINED)

#### 1. CJK / English / Number Spacing

Add a space between Chinese characters and English words or numbers:

```
✅ AI 时代，个人知识管理（PKM）正在经历一场根本性的范式转移。
✅ 收藏 5000 篇文章然后让 AI 帮忙总结
❌ AI时代，个人知识管理(PKM)正在经历一场根本性的范式转移。
❌ 收藏5000篇文章然后让AI帮忙总结
```

**Exceptions**: Do NOT add spaces around Chinese parentheses `（）` or Chinese quotes `「」`:

```
✅ 上下文（Context）、可计算（Computable）
✅ 「记笔记的方式变了」
❌ 上下文（ Context ）、可计算（ Computable ）
❌ 「 记笔记的方式变了 」
```

#### 2. Chinese Quotes

Use `「」` instead of `「」` for Chinese content (outside code blocks and frontmatter):

```
✅ 最大的变化不是「记笔记的方式变了」，而是：
❌ 最大的变化不是"记笔记的方式变了"，而是：
```

#### 3. Chinese Punctuation Spacing

Chinese punctuation marks (，。；：！？、) should NOT have spaces before them:

```
✅ 核心动作是分类、收藏、归档。
❌ 核心动作是分类 、 收藏 、 归档 。
```

#### 4. List Items with Bold

```
✅ - **实体**：人、项目、概念、组织——有明确身份和属性的对象
✅ - **输入**：多渠道采集，极低摩擦
❌ -**实体**：    (missing space after -)
```

#### 5. Blockquote Bold

```
✅ > **你需要开始经营一套「可被 AI 理解」的个人上下文系统**。
❌ >**你需要...     (missing space after >)
❌ > ** 你需要...   (inner space — wrong)
```

### Automated Typography Fix (Inline Python)

For one-off fixes, run this inline fixer on the article file:

```python
import re

def fix_chinese_markdown(content: str) -> str:
    """Fix CJK/EN spacing, bold spacing, and punctuation in Chinese markdown.

    Skips lines inside code fences. Apply per-line.
    """
    lines = content.split("\n")
    new_lines = []
    in_code = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            in_code = not in_code
            new_lines.append(line)
            continue
        if in_code:
            new_lines.append(line)
            continue
        # Fix bold inner spacing
        def fix_bold(match):
            return f'**{match.group(1).strip()}**'
        line = re.sub(r'\*\*\s*([^*]+?)\s*\*\*', fix_bold, line)
        # Fix bold outer spacing (CJK adjacent) — use explicit positive class only
        line = re.sub(r'([\u4e00-\u9fff])\*\*([\u4e00-\u9fffa-zA-Z0-9])', r'\1 **\2', line)
        line = re.sub(r'([\u4e00-\u9fffa-zA-Z0-9])\*\*([\u4e00-\u9fff])', r'\1** \2', line)
        # Fix punctuation spacing after bold close
        line = re.sub(r'\*\* ([，。；：！？,\.!?])', r'**\1', line)
        # Fix parentheses
        line = re.sub(r'（ +', r'（', line)
        line = re.sub(r' +）', r'）', line)
        # CJK/English spacing
        line = re.sub(r'([\u4e00-\u9fff])([a-zA-Z0-9])', r'\1 \2', line)
        line = re.sub(r'([a-zA-Z0-9])([\u4e00-\u9fff])', r'\1 \2', line)
        line = re.sub(r'  +', r' ', line)
        new_lines.append(line.rstrip())
    return "\n".join(new_lines)
# generated by hugo AI
```

For batch / git-hook workflow, run `scripts/fix-chinese-markdown.py` if installed in the blog repo.

### Typography Pitfalls

- **Don't add spaces inside Chinese parentheses or quotes** — `（Context）` not `（Context）`
- **Don't put spaces before Chinese punctuation** — `分类、收藏、归档。` not `分类 、 收藏 、 归档 。`
- **Bold inner spacing is the #1 error** — always strip spaces between `**` and content
- **Blockquote bold needs special handling** — `> **内容**` not `> **内容**`
- The regex for bold must be applied **per-line** to avoid cross-line matching issues
- **Frontmatter and code blocks must be skipped** — never modify YAML frontmatter or code fence content
- **CRITICAL: Never use negated character classes `[^*\s]` for bold outer spacing** — `[^*\s]` matches commas, periods, and all punctuation, causing `**文本**，` to incorrectly become `**文本**，`. Always use explicit positive classes like `[\u4e00-\u9fffa-zA-Z0-9]`. This bug silently corrupts formatting.
- **English bold also needs outer spacing** — `bold **text**` → `bold **text**`, not just CJK contexts

## Anti-Patterns (STRICTLY FORBIDDEN)

- generic_opening
- abstract_without_example
- fake_framework
- empty conclusions
- 假设有一个电商场景 / 假设有一家公司 (generic hypothetical scenarios)
- Combining multiple distinct techniques into one post — split into series
- Mismatching case study scope to article thesis (see Case Study Scope Matching below)

## Code Block Requirement (MANDATORY)

ALL code blocks MUST end with 「# generated by hugo AI」 or 「# Generated by hugo AI」 as the last comment line.

---

# [3] GENERATOR

## Front Matter (REQUIRED)

```yaml
---
title: "中文标题"
subtitle: "English Subtitle"
date: YYYY-MM-DD
tags: ["tag1", "tag2"]
---
```

---

## Structure

### Opinion

1. Hook（真实故事开头）
2. Thesis（核心观点）
3. <!--more-->
4. 问题定义
5. 传统认知的问题
6. 新框架（核心）
7. 应用方式
8. 结尾（升维问题）

### Technical

1. 为什么要解决（真实问题）
2. 方案对比（为什么选这个）
3. <!--more-->
4. 背景（最少必要）
5. 实现（必须解释 WHY）
6. 坑 & 限制
7. 总结

### Hybrid (RECOMMENDED)

1. 故事开头
2. 本质问题
3. <!--more-->
4. 思维框架
5. 技术实现
6. 框架 × 技术结合
7. 升维总结

---

## Code Rules

- Python code MUST use type hints, dataclasses, ABC/Protocol, and docstrings
- Code must be correct and runnable
- Explain WHY before code blocks
- No unexplained code dumps
- ALL code blocks MUST end with 「# generated by hugo AI」

## Visual Elements (MANDATORY for technical/hybrid)

- Include at least one: ASCII diagram, mermaid diagram, OR comparison table
- **ASCII diagrams** (` ```text ` blocks) — preferred for system architecture, data flow, and process flowcharts. Use box-drawing characters (┌─┐│└┘├┤┬┴┼) or simple ASCII art (`.----.`, `'----'`, `|`, `+`, `v`). Hugo renders these as plain code blocks with no special processing.
- **Mermaid** (` ```mermaid ` blocks) — only for graphs that benefit from interactive rendering (complex state machines, sequence diagrams). Theme has built-in mermaid.js support via shortcode.
- **Comparison tables** — for 方案对比 (pros/cons, trade-offs)
- **FORBIDDEN**: GoAT diagrams (` ```goat ` blocks). The theme does not reliably render GoAT — always use ` ```text ` instead.

## Length Guide

**篇幅由论证决定，不由行数决定。** 长度的唯一标准是：把核心论证讲清楚、把案例讲透所需的篇幅——多一句废话都不要，少一步推理都不行。

- **不要为了凑字数注水**——行数不是质量指标。能用 200 行讲透的，不要拖成 800 行
- **不要为了「显得轻量」硬砍论证**——该展开的 WHY、该补的反方回应、该给的案例细节，不能为了短而省
- 删除测试：每一段问「删掉它，论证会变弱吗？」不会 → 删掉

以下行数仅为**事后描述性参考**，不是写作目标：
- 短文（~60-170 行）：配置指南、快速技巧、单一主题
- 长文（800-1300+ 行）：综合教程、深度剖析、框架讲解

## Tags Format

- English only, hyphenated (e.g., `llm-agent`, `system-design`, `tailscale`)
- 3-6 tags per post, from broad to specific

## File Naming & ID

- Path: `./content/post/{YEAR}/{id}-{slug}.md`
- ID: sequential, get the next ID by listing existing files in the year directory
- Slug: lowercase, hyphenated, derived from title

## Ending

- Technical posts: brief summary + optional comment call-to-action
- Opinion/Hybrid posts: 升维问题 + comment call-to-action
- Example: 「你在实际落地中遇到过什么坑？欢迎留言讨论。」

---

# Case Study Patterns (CRITICAL)

## Single-Case-Thread-Through Principle

For AI/Agent/workflow posts: **use ONE deep, specific case study that threads through every section** — not different abstract examples per section.

```
✅ GOOD: One Windows ACL case flows through all 6 stages:
   - 信号采集: This specific user's PermissionError stacktrace
   - 智能归因: AI clustering finds Windows 11 + OneDrive concentration
   - 知识关联: System finds March macOS iCloud fix experience
   - 方案生成: Migrate sandbox to %LOCALAPPDATA%
   - 代码修复: Agent writes 3 files under Harness constraints
   - 验证发布: 4-hour timeline from VOC to full release

❌ BAD: Different abstract examples per section
```

A single case creates narrative momentum and proves the system works end-to-end. Scattered examples feel like theory; one case feels like a war story.

### Structure for each section using the same case

1. **Problem Statement** — Concrete pain from the specific case
2. **Stage N** — Show what happened at this stage for THIS case, with real data/timelines/errors
3. **Code/Data** — Python dataclasses or ASCII diagrams specific to THIS case
4. **Comparison** — Metrics from THIS case (before/after, with/without)
5. **Key Insight** — Engineering principle extracted, grounded in the case

## Case Study Scope Matching

**The case study's complexity and time horizon must match the article's thesis.**

| Article Topic | Appropriate Case Study | Inappropriate Case Study |
|--------------|----------------------|------------------------|
| Agent 长程任务/架构 | 季度 OKR 制定与追踪（4-16 周，多角色，多系统） | 请假审批（单轮，单角色） |
| 多 Agent 协作 | 跨部门项目推进（多团队，多阶段） | 单 Agent 问答 |
| 系统可观测性 | 长链路数据管道（多步骤，跨系统） | 单 API 调用 |
| Prompt 工程技巧 | 具体 Prompt 优化前后对比 | 抽象理论描述 |

**When in doubt, ask: 「Does this case study demonstrate the problem the article is about?」**

### Good long-horizon case study domains
- OKR 制定与追踪（2-4 周制定 + 12 周执行）
- DeepResearch / WideResearch（数天到数周）
- 季度规划、年度复盘
- 多角色协作项目（跨部门、跨层级）
- 跨系统数据流转任务（OKR + 项目管理 + 财务）

### Bad case study domains (too short/transactional)
- 单次审批流程（请假、报销）
- 单轮对话问答
- 单次会议纪要生成
- 简单的 CRUD 操作

For concrete long-horizon templates with timelines, roles, and failure modes, see `references/long-horizon-agent-case-studies.md`.
For two-stage pipeline and collect-compile-query case study patterns with metrics tables, see `references/case-study-templates.md`.

## Content Standards

### Do
- Use real DingTalk/悟空 (Hermes Agent) examples when discussing AI workflows
- Include specific metrics and cost models
- Show code that could actually run
- Reference actual tools (dws CLI, Hermes Agent, etc.)
- Cross-link between series posts

### Don't
- Write pure theory without concrete examples
- Use generic AI examples (no 「假设有一个电商场景」)
- Combine multiple distinct techniques into one post — split into series
- Publish without user confirmation
- Mismatch case study scope to article thesis (user will reject)

---

# [4] AUTO-ILLUSTRATION (MANDATORY)

**Every blog post MUST have a header illustration.** After writing the full draft, automatically generate one before showing to the user.

## Provider: Gemini (default — `gemini-image` plugin)

Active provider: `gemini-image` → `gemini-3.1-flash-image` via self-hosted proxy at `192.168.1.1:4000`.

### Size Constraints — Critical

Gemini only accepts specific sizes. Smaller dimensions return 400 errors:

| aspect_ratio | Size | Status |
|:---|:---|:---|
| landscape | `1280x896` | ✅ Works |
| square | `1024x1024` | ✅ Works |
| portrait | `1024x1536` | ✅ Works |
| landscape | `1280x720` | ❌ 400 error |
| portrait | `720x1280` | ❌ 400 error |

**NOTE: Gemini API currently returns 2752×1536 for `landscape` aspect ratio** (≈1.79:1, already landscape). NO center-crop needed — just resize to target width with Pillow.

If the API behavior changes again (e.g., returns square 2048×2048), fall back to center-crop with `scripts/crop-to-ratio.py` or manual Pillow crop.

If 400 errors persist, verify `_SIZES` dict in `~/.hermes/plugins/image_gen/gemini-image/__init__.py`.

### Chinese Prompts — Fully Supported

Gemini handles Chinese prompts natively. **For Chinese-context blog illustrations, use Chinese prompts** — better results with Chinese text rendering and cultural context.

## Provider: Wan2.7 (fallback — `wan2.7-image-pro`)

If switched to Wan2.7, apply these rules before retrying on errors:

1. **Aspect ratio**: only `square` is reliable. `landscape` and `portrait` often return 400 errors. Always start with `square`.
2. **No CJK characters in prompts** — translate to English first.
 - ❌ `「A cute young foal (小马), soft brown coat...」`
 - ✅ `「A cute small pony, brown coat, white forehead marking...」`
3. **Keep prompts short** — 1-2 concise sentences with key visual elements. Long paragraphs fail.
4. **Avoid parenthetical explanations** — `(neural network pattern)` confuses the API.

### Wan2.7 Retry Strategy

When a prompt fails, simplify in this order (do NOT retry the same prompt 3+ times):
1. Remove non-English text → retry
2. Shorten to ≤2 sentences → retry
3. Switch to `square` aspect ratio → retry
4. Remove abstract/technical qualifiers → retry

## Provider Selection

Active provider is set via `image_gen.provider` in `config.yaml`. Switch with:
```bash
hermes config set image_gen.provider gemini-image   # or wan27
hermes config set image_gen.model gemini-3.1-flash-image  # or wan2.7-image-pro
```
Requires `/restart` to reload plugin. **Default**: `gemini-image`.

## Workflow

1. **Read the completed article** — understand the core theme, key metaphors, and narrative arc.
2. **Compose a Gemini image prompt** — write a detailed prompt that visually represents the article's core idea:
 - Use **Chinese prompts** (Gemini supports CJK natively, produces better results)
 - Describe a **three-zone narrative layout** (left → center → right) when the article has a before/after or comparison structure
 - Include specific visual elements from the article (tool names, workflows, data flows)
 - Specify style keywords: 极简扁平化、Claude 风格配色（奶油色背景、赤陶橙色、暖棕色）、温暖克制、干净
 - Explicitly state: **超宽横版 Banner，16:9 构图**
 - Add negative constraints: 不要卡通人物、不要深色背景、不要赛博朋克、不要 3D 效果、不要阴影
3. **Generate with `image_generate`** — call with `aspect_ratio=「landscape」`, `size=「1280x896」`
4. **Resize to target width** — Gemini returns 2752×1536. Resize width to fit under 1MB PNG:
   ```python
   from PIL import Image
   import os

   src = "original.png"
   dst_png = "static/img/{YEAR}/{slug}.png"
   img = Image.open(src)
   w, h = img.size

   # Find optimal width under 1MB
   for target_w in [1376, 1360, 1344, 1320, 1300, 1280]:
       new_h = int(h * target_w / w)
       img_resized = img.resize((target_w, new_h), Image.LANCZOS)
       img_resized.save(dst_png, "PNG", optimize=True)
       if os.path.getsize(dst_png) < 1000000:
           print(f"OK: {target_w}x{new_h}, {os.path.getsize(dst_png)} bytes")
           break
   # generated by hugo AI
   ```
 Typical result: 1376×768 or 1344×750, ~900KB.
5. **Generate thumbnail** — JPG 800px width, quality 85:
   ```python
   from PIL import Image
   img = Image.open("original.png").convert("RGB")
   w, h = img.size
   thumb = img.resize((800, int(800 * h / w)), Image.Resampling.LANCZOS)
   thumb.save("thumb.jpg", "JPEG", quality=85, optimize=True)
   # generated by hugo AI
   ```
6. **Insert into article** — place after opening paragraph(s), before `<!--more-->`:
   ```markdown
   [![描述性 alt text](/img/{YEAR}/{slug}-thumb.jpg)](/img/{YEAR}/{slug}.png)
   ```
7. **Verify dimensions** — confirm final image is landscape (width > height, ratio ≈ 1.78) before presenting to user
8. **Upload thumbnail to litterbox** for 24h shareable preview (user preference — always do this):
   ```bash
   curl -F "reqtype=fileupload" -F "time=24h" -F "fileToUpload=@thumb.jpg" \
     https://litterbox.catbox.moe/resources/internals/api.php
   ```
 Present returned URL to user immediately.

Note: Pillow may need `pip install Pillow --break-system-packages` on externally-managed Python environments.

For reusable Gemini banner prompts (futuristic wide-format tech), see `references/blog-banner-prompts.md`.

## Prompt Engineering for Gemini

- **Long, detailed prompts work** — unlike Wan2.7's 1-2 sentence limit, Gemini handles multi-sentence narrative prompts well
- **CJK characters are fine** — no need to translate
- **Structural descriptions work** — 「从左到右」, 「三个区域」, 「流水线」 are understood
- **Claude-style keywords**: 极简扁平化, 奶油色背景, 赤陶橙色, 暖棕色, 温暖克制, 干净, 无阴影
- **Flowchart keywords**: 圆角矩形节点, 箭头连接, 分组标签, 虚线反馈回路

## Blog Illustration Style Preferences

**User prefers Claude-style warm flat design** for blog illustrations. Key characteristics:

- **Color palette**: 奶油色背景（cream #FAF7F2）、赤陶橙色（terracotta #CC785C）、暖棕色文字（#5C4A3A）
- **Style**: 极简扁平化、温暖克制、无阴影无 3D、像 Claude/Anthropic 官网插画
- **Text**: 用中文标注关键节点名称和分组标签，中文必须清晰可读
- **Negative constraints**: 不要卡通人物、不要深色背景、不要赛博朋克、不要 3D 效果、不要阴影

### Two main layout patterns

**Pattern A: Infographic / Comparison diagram** (preferred for conceptual posts)

对比式信息图，左右分栏或上下分层，视觉隐喻清晰。适合「A vs B」「旧范式 vs 新范式」类文章。

```
极简扁平化信息图插图，奶油色背景（#FAF7F2）。中文文字，清晰可读。
暖色调色板：赤陶橙色（#CC785C）、暖棕色（#5C4A3A）。

顶部居中标题：「[标题中文]」，深棕色粗体。

画面分为左右两半，中间用虚线分隔。
左半标注「[概念A]」：[描述左侧视觉元素]
右半标注「[概念B]」：[描述右侧视觉元素]

底部：[总结性视觉元素，如箭头、公式、阶梯]

风格：扁平矢量信息图，干净几何图形，大量留白，专业编辑风格。
```

**Pattern B: Flowchart / Pipeline** (for technical process posts)

流水线式流程图，从左到右叙事。适合技术实现、工作流类文章。

```
极简扁平化技术流程图插图，Claude 风格配色：奶油色背景、赤陶橙色节点、暖棕色文字。
画面中央是一条从左到右的水平流水线，[N]个圆角矩形节点用箭头连接：
第一个节点写「① [名称]」下方小字「[功能]」
第二个节点写「② [名称]」下方小字「[功能]」
...
节点下方有浅色分组标签：「[分组1]」「[分组2]」「[分组3]」。
整体风格极简、温暖、克制，扁平化设计，无阴影无3D，像 Claude 官网插画。不要卡通人物，不要深色背景。
```

For narrative/story illustrations, use a three-zone layout with the same warm color palette instead of dark/tech style.

**CRITICAL: Blog illustrations MUST be landscape 16:9, never square.** Gemini API always returns 2048×2048 regardless of size parameter — always center-crop with Pillow after generating. Verify dimensions before inserting. User has explicitly corrected this multiple times.

## Temporary File Sharing

For any shareable link (not just images):

| Service | Status | Command |
|---------|--------|---------|
| **litterbox.catbox.moe** | ✅ Reliable | `curl -F 「reqtype=fileupload」 -F 「time=24h」 -F 「fileToUpload=@FILE」 https://litterbox.catbox.moe/resources/internals/api.php` |
| transfer.sh | ❌ Often unreachable | `curl --upload-file FILE https://transfer.sh/name.png` |
| 0x0.st | ❌ Disabled (AI spam) | Was: `curl -F 「file=@FILE」 https://0x0.st` |

Try litterbox first. Links expire in 24h.

## Sending Images via Messaging

When sending generated images to DingTalk or other platforms:

```
send_message(target="dingtalk", message="Caption text MEDIA:/path/to/image.png")
```

Use the `MEDIA:` prefix with the local file path. The platform delivers it as a native media attachment.

## Image Pitfalls

- **Gemini returns 2752×1536 for landscape** — already landscape, no center-crop needed. Just resize width to fit under 1MB PNG. If API changes to return square, fall back to center-crop.
- **PNG must be under 1MB** — resize width iteratively (1376→1360→1344→1320→1280) until PNG < 1MB. Typical result: ~900KB at 1376×768.
- **Thumbnail: 800px width JPG q=85** — typically 35-55KB, always under 100KB.
- **Do not retry the same failing prompt** — always simplify (Wan2.7) or check size (Gemini) before retrying
- **Do not use `landscape` as default for Wan2.7** — `square` is the reliable default; Gemini supports all ratios
- **Do not include Chinese text in Wan2.7 prompts** — translate to English first; Gemini handles Chinese natively
- **Do not write 3+ sentence prompts for Wan2.7** — keep it concise; Gemini handles long narrative prompts fine
- **Gemini 400 errors are almost always size-related** — verify size is 1280x896 / 1024x1024 / 1024x1536
- **Always upload PNG to litterbox for preview** — litterbox with 24h expiry, present URL immediately
- **Never skip illustration generation** — every blog post needs a header illustration
- **Prefer infographic/comparison style over pure flowchart** — user rejected generic flowchart illustrations for conceptual posts. Use Pattern A (comparison/infographic) for 「A vs B」 or paradigm-shift topics.

---

# [5] EVALUATOR

## Adversarial Pass (MANDATORY — run BEFORE scoring)

自评必然虚高。评分前，先切换成**最挑剔的读者**视角红队审一遍草稿，主动找毛病而不是找优点：

1. **最弱论点**：全文哪一句主张最站不住脚？最强反方会攻击哪里？正文是否正面回应了？没有 → 补 steelman 回应或修正主张。
2. **最套话段落**：哪一段换成任何一篇 AI 文章都成立（即「正确的废话」）？删掉或替换成具体的、只属于本文案例的内容。
3. **无证据断言**：标出所有具体数字、外部事实、引用。逐条问：来源是什么？查得到吗？
4. **案例真实性**：贯穿案例是真实的还是编的？metrics 经得起追问吗？skill 反复强调案例必须真实——宁可标注「示意」也不要伪造精确数字。

## Fact-Check & Sourcing (MANDATORY)

- **每个具体数字 / 外部断言要么可溯源，要么显式标注为估算**——「降低 40%」必须有出处，否则改为「明显降低（基于项目经验估算）」
- **Mode E 研究类文章**：写进正文的案例、数据、引用必须能对应到 web research 的真实来源，不允许「合理推测」出一个看似精确的数字
- **发现编造的数字 / 查无实据的引用 / 张冠李戴的案例 → 直接 reject，重写而非微调**
- 宁可少一个精确数字，不可多一个假数字

只有通过 Adversarial Pass 和 Fact-Check 后，才进入下面的打分。

## Scoring Rubric

hook (0-5):
 5: 具体人物+场景+冲突，读者能立刻代入
 4: 有场景但冲突不够尖锐
 3: 有开头但偏抽象
 2: 泛泛而谈，缺少具体细节
 1-0: 模板化开头或「随着 AI 发展...」

insight (0-5):
 评判标准：洞见必须同时满足「非显而易见」和「站得住脚」。为反而反（contrarian-for-its-own-sake）不得分。
 5: 非显而易见的洞见，有证据/推理支撑，且预判并回应了最强反方——读者会认真重新思考
 4: 洞见非显而易见且基本成立，但反方观点处理不足
 3: 观点正确但常见（显而易见），或有新意但论证薄弱
 2: 观点模糊、多而不深，或为反直觉而反直觉（站不住脚的标新立异）
 1-0: 没有明确观点纯罗列，或主张明显错误/无法自圆其说

framework (0-5):
 注：框架是奖励不是配额。若文章本不需要框架（结构不可复用），则本维度改评论证结构的清晰度——逻辑递进清晰且无硬凑框架可得 4。硬凑的空壳框架按「散点罗列」扣到 2。
 5: 有命名、可复用、结构完整、有图示/表格
 4: 有命名和结构但复用性弱，或无框架但论证结构清晰有力
 3: 有结构但缺少命名或可视化
 2: 散点罗列没有框架感，或为凑框架而造的空壳框架
 1-0: 纯主观判断，无结构

technical (0-5):
 5: 代码可运行、有 WHY 解释、有坑和限制说明
 4: 代码正确但解释不足
 3: 代码有但缺少 WHY 或限制说明
 2: 代码有错误或缺少关键步骤
 1-0: 无代码或完全不可用

## Decision

publish: >= 18
revise: 13-17
reject: < 13

## Revision Loop (NOT a one-pass pipeline)

流水线不是一条道走到底——Evaluator 是回路的入口，不是终点。

```
        ┌─────────────────────────────────────────┐
        │                                           │
   Argument Map → Generator → Adversarial Pass → Score
        ▲                                           │
        │              revise / reject              │
        └───────────────────────────────────────────┘
                       publish ≥18 ↓
                     进入 Publisher
```

- **reject (<13)**：问题在论证本身——**回到 Argument Map 重想**（claim 是否站得住？反方是否回应了？证据是否够？），再重写。不要在烂论证上打补丁。
- **revise (13-17)**：针对性修复后**重跑 Adversarial Pass + 重新打分**，而不是改完就发。
- **循环直到 ≥18 或明确判定选题不成立**——若两轮重写仍 <13，说明 claim 本身有问题，应换角度或放弃，并向用户说明。
- 局部分数低时的方向：
  - hook < 3：补具体场景细节（真实人物 + 冲突）
  - insight < 3：不是「更反直觉」，而是让洞见**更站得住脚**——补证据、回应最强反方（参见新 insight 评分标准）
  - framework < 3：仅当结构确实可复用时重建为框架；否则改善论证递进的清晰度，不硬凑

---

# [6] PUBLISHER

## File Path

Repo root: `/home/hugo/Projects/blog2`
Post path: `content/post/{YEAR}/{id}-{slug}.md`

## Publishing Workflow

1. Write post to `content/post/{YEAR}/{ID}-{slug}.md`
2. Auto-generate illustration (see Step [4]) — crop to 16:9, create thumbnail, insert into article
3. Run typography fix (`fix-chinese-markdown.py` if available) on the final file
4. **Show draft to user for review** — do NOT auto-publish
5. After user confirms:
   ```bash
   cd /home/hugo/Projects/blog2
   git add content/post/{YEAR}/{ID}-{slug}.md \
           static/img/{YEAR}/{slug}.png \
           static/img/{YEAR}/{slug}-thumb.jpg
   git commit -m "发布博客：{标题}"
   GIT_SSH_COMMAND="ssh -i /home/hugo/.ssh/id_ed25519" git push origin main
   ```
6. **Post-publish verification** (MANDATORY):
   - Wait ~90s for GitHub Actions to build (workflow: clone hugozhu.github.com → hugo build → push to Pages)
   - Verify with `web_extract` on `https://hugozhu.site/post/{YEAR}/{ID}-{slug}/`
   - **Check the page title renders correctly** — HTTP 200 alone is insufficient, must confirm actual content appears
   - If 404 after 3 checks (spaced 60s apart, max ~3 min total): stop retrying, diagnose (Actions build failure, Hugo error), report to user
   - Report final result: ✅ published + live URL, or ❌ build issue + details
   - Do NOT infinite-loop the same URL — 3 checks max, then diagnose

Note: The working directory may not be the repo root. Always `cd` to the repo or use `git -C /home/hugo/Projects/blog2`.

## Series Posts

When user provides multiple distinct techniques/tips:
- Split into separate posts with sequential IDs
- Use series titles (技巧一, 技巧二, etc.)
- Cross-link between posts
- Do NOT combine distinct items into one post

---

# HOW TO USE

## Mode A: One-shot generation

Input example: `写一篇：为什么大多数 AI Agent 落地失败？`

1. Planner determines type (usually hybrid)
2. Enforce scenario-driven opening
3. Generate full structured blog
4. Auto-generate illustration
5. Evaluate score
6. If not good enough → rewrite
7. Show draft → user confirms → publish

## Mode W: 公众号 / 朋友圈发布（MANDATORY when user mentions 公众号/朋友圈/WeChat）

当用户说「发公众号」「发朋友圈」「写一篇要转发的」或类似意图时，**必须**先加载 `references/wechat-audience.md`，然后：

1. **主动建议选题方向**——基于受众画像（36-45 岁管理者）和爆款公式（身份焦虑 × 反直觉判断 × 真实故事 × 可转发金句），给出 2-3 个选题方向
2. **主动建议公众号标题**——用「管理者语言」而非「开发者语言」，标题里不出现「最佳实践」「Harness」「Coding Agent」等开发者术语
3. **博客标题和公众号标题分开**——博客标题给开发者（SEO），公众号标题给管理者（传播）
4. **发布节奏建议**——每 3 篇技术文插 1 篇价值观/判断力文（价值观文 = 朋友圈流量放大器）
5. 正文写作流程不变（Planner → Style → Generator → Illustration → Evaluator → Publisher）

### 公众号标题规则

- 标题里优先出现：人、故事、反直觉判断、身份词（老板/管理者/团队）
- 标题里避免：最佳实践、Harness、Coding Agent、CI/CD、SDK、CLI
- 标题模式参考：
  - 「一个不会 ___ 的人，用 AI 做了 ___」
  - 「为什么 AI ___，都不太灵」
  - 「AI 最大的价值不是 ___」
  - 「你的下一个 ___，不需要 ___」
  - 「AI 不会让你更聪明，但会让你 ___」

## Mode B: Iterative section-by-section

When the user wants to discuss and refine each section:

1. Write Part 1 (opening + first major section) → user reviews
2. Write Part 2 based on user feedback → integrate into same file via `patch`
3. Fix section numbering cascade (一→二→三, 1.1→2.1, etc.)
4. Update ending (remove 「下一篇」 references if consolidated into single post)
5. Final review → user confirms → publish

Key pitfalls:
- When inserting a new section at the beginning, ALL subsequent section numbers must be updated
- Use `patch` mode with `replace` for each numbering change — do NOT rewrite the whole file
- If the original draft referenced 「下一篇」, update the ending to be self-contained

## Mode C: Conversation-as-Draft

User has a real-time design conversation, iterates through approaches, then says 「发布」.

1. User starts with a general question or problem
2. Through conversation, designs are iterated
3. User narrows scope and specifies exact shape through follow-up questions
4. User provides a specific real case study (e.g., War Room Scrum)
5. User says 「发布」— synthesize the conversation into a blog post
6. Auto-generate illustration (see Step [4])
7. Run typography fix, show draft to user for review

### Key rules
- **Use the FINAL converged design**, not the iteration journey. The reader doesn't need the rejected alternatives.
- **The conversation IS the case study research.** Extract real details (formats, metrics, prompts) from the conversation, not invented examples.
- **The specific case the user gives is the thread-through case.**
- **Prompts and templates discussed in conversation are blog content.**

### What to include from the conversation
- Final architecture/workflow diagrams (ASCII if discussed)
- Specific prompt templates that were iterated on
- Real data formats and field structures
- Comparison tables (traditional vs AI-native, before vs after)
- The user's own framing (「周报不是写出来的，是长出来的」)

### What NOT to include
- Rejected alternatives from earlier in the conversation
- The meta-conversation about how the design evolved
- Intermediate designs that were superseded

## Mode D: User-Provided Outline Expansion

When the user provides a **complete outline** with ASCII diagrams, tables, section structure, and key phrases already done:

1. **Preserve ALL user content verbatim** — ASCII art, tables, key phrases, section titles, quotes. Do NOT rewrite or 「improve」 the user's structural elements.
2. **Expand prose around the skeleton** — add connecting paragraphs, narrative flow, and context. Each section gets 1-3 paragraphs of prose.
3. **Add at most 1-2 new sections** — if the outline needs a conclusion or 「how to get started」 section, add it minimally.
4. **Use the user's own phrasing as section hooks** — memorable phrases from the outline become opening lines or section headers.
5. Auto-generate illustration (see Step [4])
6. Run typography fix

### Key rules
- **Do NOT replace user's ASCII diagrams with mermaid or prose** — the user chose ASCII deliberately.
- **Do NOT add web research** — the outline IS the research.
- **Do NOT restructure sections** — the order and hierarchy are intentional.
- **The agent's value-add is prose quality and narrative flow**, not content direction.

## Mode E: Research-Driven Outline-First

For posts where the user provides a topic + angle (not a conversation to synthesize):

1. **Outline first** — produce a structured outline with key arguments, a table/framework, and ask the user to confirm direction
2. **User refinement** — user may ask to add specific angles (e.g., 「结合 Claude Code 实际案例」)
3. **Web research** — 3-6 web searches + extracts to find real case studies, data, authoritative sources
4. **Full draft** — write to `content/post/{YEAR}/{ID}-{slug}.md` with all research integrated
5. Auto-generate illustration (see Step [4])
6. Run typography fix and show draft to user for review
7. User says 「发布」 — commit and push

### Key differences from Conversation-as-Draft
- No prior conversation to mine — content comes from web research + domain knowledge
- Outline confirmation prevents wasted effort on wrong direction
- Real case studies from web research replace conversation-derived examples
- Blog post 239 (Harness Engineering) is a canonical example of this workflow

## Writing patterns that work well

- **Metaphor-driven explanation**: Use concrete animal/object metaphors for abstract concepts (e.g., 🐰兔子/🐢乌龟 for System 1/System 2)
- **Interactive hook**: Include a classic test or puzzle that lets the reader experience the concept firsthand
- **Accessible conceptual sections**: When explaining theory/frameworks, keep it 「浅显易懂」
- **Single complete post preferred**: Even if the topic is large, consolidate into one post with clear sections rather than splitting

---

# Images (Reference)

Large images (photographs, diagrams, sketchnotes) should use the **thumbnail + click-to-enlarge** pattern. Never embed full-size images directly.

For AI-generated images (Wan2.7, Gemini, etc.), see the **Auto-Illustration** section above for provider quirks, prompt patterns, and post-processing pipeline.

### Thumbnail Generation

1. **Save original** to `static/img/{YEAR}/{filename}.png` (keep original format)
2. **Generate JPG thumbnail** at 800px width, quality 85 (see code in Step [4])
3. **Naming convention**: `{filename}-thumb.jpg` (always JPG)
4. **Auto-upload thumbnail** to litterbox (24h) for shareable link

### Markdown Insertion

```markdown
[![Alt text](/img/{YEAR}/{filename}-thumb.jpg)](/img/{YEAR}/{filename}.png)
```

- Alt text should be descriptive
- Click opens original PNG in new tab
- Place image after opening paragraph(s), before `<!--more-->`

### Why JPG over PNG for thumbnails

| Format | Typical Size (800px) | Notes |
|--------|---------------------|-------|
| PNG | ~175KB | Lossless, overkill for thumbnails |
| JPG q=85 | ~111KB | Good quality, used as default |
| JPG q=65 | ~71KB | Smaller, acceptable for simple diagrams |

---

# Pitfalls

- **Never auto-publish** — always wait for user confirmation before git push
- **SSH key** — blog2 needs `id_ed25519` for push (not `wiki_rsa`, not `id_rsa`)
- **Case studies must be real** — user rejects abstract/hypothetical examples
- **Depth over breadth** — user prefers deep exploration of 2-3 cases over shallow coverage of many
- **Post ID must be sequential** — check latest ID in year directory before creating new file
- **Illustrations MUST be landscape** — Gemini returns 2752×1536 (already landscape). Resize to target width for < 1MB PNG. If API returns square, center-crop with Pillow. Verify dimensions before inserting.
- **Never skip illustration generation** — every blog post needs a header illustration. Generate automatically after writing, before showing draft.
- **Prefer infographic/comparison style** — user rejects generic flowcharts for conceptual posts. Use comparison layout (Pattern A) for paradigm-shift / A-vs-B topics.
- **Conversation-as-draft: don't show the iteration journey** — when user iterates through designs then says 「发布」, the blog post uses only the final design.
- **User's own phrasing is gold** — when the user coins a memorable phrase (e.g., 「周报不是写出来的，是长出来的」), use it in the blog post opening or section headers.
- **Scope mismatch** — when writing about long-horizon Agent challenges, never use single-turn approval cases.

---

# Evolution

After each use, update `evolution-log.md` with:

- Extract strong patterns → add to style rules
- Detect weak patterns → add to anti_patterns
- Promote high-scoring structures → standardize
- Log the change with date and summary

---

# References

- `references/case-study-templates.md` — Concrete case study patterns (two-stage pipeline, collect-compile-query) with metrics tables and structure examples
- `references/long-horizon-agent-case-studies.md` — Long-horizon Agent task case studies (OKR planning, budget, product launch) with four challenge dimensions and scope matching rules
- `references/blog-banner-prompts.md` — Reusable Gemini prompt patterns for futuristic wide-format tech banners (1280x896)
- `references/wechat-audience.md` — 公众号 & 朋友圈受众画像、流量数据、爆款公式、选题方向和标题规则
- `scripts/crop-to-ratio.py` — Center-crop any image to landscape/portrait/ultrawide/banner ratios (essential for Gemini 2048×2048 output)

---

# Final Goal

This is NOT a writing tool.

This is a system for producing scalable, high-quality thinking.
