# Evolution Log — hugo-blog-agent

记录每次使用后的规则提炼、反模式发现和结构优化。

---

---

## v3.3.0 — 2026-05-29: 思考质量内核增强

把 skill 从「写作模板」往「思考系统」推进，新增论证严谨性、反方预判、事实核查、认知诚实四道护栏，并修正会激励「为反而反」和「假框架」的评分导向。

**Planner 新增 Argument Map（强制，动笔前完成）：**
- 写正文前必须先产出论证骨架：claim / why_nonobvious / evidence / counter(steelman) / rebuttal / implication
- claim 必须是可被反驳的命题，counter 必须是 steelman（最强反方而非稻草人）
- 证据不足时触发 web research 或要求用户提供真实案例

**Style Compiler — Framework 从配额改为奖励（修复假框架激励）：**
- 原「MANDATORY for opinion/hybrid」要求每篇都有命名框架，与 `fake_framework` 反模式自相矛盾
- 改为：只有结构确实可复用时才提炼并命名；判断标准「读者能拿这框架解决我没写到的问题吗」
- 结构不足时不硬凑命名，靠逻辑递进取胜

**Style Compiler — 新增 Epistemic Honesty（认知诚实）：**
- 区分「事实/观点/推测」三种断言的用词
- 具体数字必须可溯源，否则降级为定性表述或标注估算
- 不过度声称，给出适用边界；诚实标注不确定性

**Evaluator — 新增 Adversarial Pass + Fact-Check（评分前强制）：**
- 红队视角主动找毛病：最弱论点、最套话段落、无证据断言、案例真实性
- 编造数字 / 查无实据引用 / 张冠李戴案例 → 直接 reject 重写
- 解决自评虚高问题：先证伪再打分

**Evaluator — 重写 insight 与 framework 评分标准：**
- insight：满分要求「非显而易见 + 站得住脚 + 回应最强反方」；为反而反（contrarian-for-its-own-sake）扣到 2 分
- framework：加注「框架是奖励不是配额」，本不需要框架的文章改评论证结构清晰度，空壳框架扣分

**Pipeline 总览同步更新**（step 1 加 Argument Map，step 5 加 adversarial pass + fact-check）。

**Lesson**: 之前 skill 重排版机械规则、轻论证质量；insight 只奖励反直觉、framework 强制命名，都会把 AI 推向「正确的废话」和「唬人的空壳」。真正的思考质量来自：先有可被反驳的主张和最强反方的回应，再写；写完先证伪再打分。

---

## v3.2.1 — 2026-05-29: 一致性修复

修复三处自相矛盾 / 脱节问题（不改动仓库路径与 Gemini 尺寸说明）。

**版本号对齐：**
- frontmatter `version` 从 `3.1.0` 提升到 `3.2.1`，此前一直落后于 v3.2.0 配图风格大改的实际状态

**GoAT 状态与日志对齐：**
- 现状澄清：当前 `SKILL.md` Visual Elements 部分将 ` ```goat ` 标记为 **FORBIDDEN**，原因是主题无法可靠渲染 GoAT，一律改用 ` ```text `
- v2.3.0 曾把 GoAT 提升为首选并「移除 FORBIDDEN 标记」，但后续又回退为 FORBIDDEN **却未记录日志**，导致日志与 SKILL.md 脱节
- 本条正式登记该回退：**GoAT = FORBIDDEN，ASCII ` ```text ` 为流程图/架构图首选**，v2.3.0 的提升决定作废

**评分边界空洞修复：**
- Evaluator Decision 原为 `publish ≥18 / revise 14-17 / reject <13`，13 分既不属于 reject 也不属于 revise，落在缝里
- 修正为 `revise: 13-17`，使三档区间连续且无空洞（reject <13 / revise 13-17 / publish ≥18）

---

## v3.2.0 — 2026-05-26: Illustration Style Overhaul

**Trigger**: User rejected dark/cyberpunk/futuristic illustration style. Requested Claude-style warm flat design.

**Changes**:
- Replaced all 「未来感、深色背景、蓝紫色光效、电影级 UI」 style keywords with 「极简扁平化、奶油色背景、赤陶橙色、暖棕色、温暖克制」
- Replaced 漫画分镜 (manga panel) style preference with Claude-style warm flat design
- Updated Blog Illustration Style Preferences section with full Claude-style prompt template (flowchart + three-zone narrative)
- Updated `references/blog-banner-prompts.md` — replaced English cinematic prompts with Chinese flat design prompts
- Updated negative constraints: 「不要卡通人物、不要深色背景、不要赛博朋克、不要 3D 效果、不要阴影」
- Added specific color palette with hex values: cream #FAF7F2, terracotta #CC785C

**Lesson**: User prefers clean, warm, readable illustrations over flashy dark-tech aesthetics. The illustration should serve the content (show the flow/diagram clearly) not be a standalone art piece.

---

## v3.1.0 — 2026-05-26 (内联外部 skill 依赖)

将原本 optional 引用的两个 skill 内容完整内联进 SKILL.md，使本 skill 完全自包含。

**内联 `chinese-markdown-typography`：**
- 完整 5 条排版规则（CJK/EN spacing, 中文引号, 标点间距, 列表 bold, blockquote bold）
- 内联 `fix_chinese_markdown(content)` Python 函数（per-line 处理、跳过 frontmatter 和 code fence）
- 完整 Typography Pitfalls 列表（特别强调禁用 `[^*\s]` 负向字符类）

**内联 `ai-image-generation`：**
- Gemini provider 完整规格（size 约束表、2048×2048 强制返回的坑）
- Wan2.7 fallback provider 规则（square 优先、纯英文 prompt、≤2 句话、retry 策略）
- Provider 切换命令（`hermes config set`）
- Litterbox/transfer.sh/0x0.st 临时分享对比表
- DingTalk MEDIA: 发送语法
- 完整 Image Pitfalls 列表

**新增 `scripts/crop-to-ratio.py`：**
- 从 ai-image-generation skill 复制
- 支持 landscape/portrait/ultrawide/banner 四种 ratio
- 中心裁剪 Gemini 2048×2048 输出到目标比例

**清理：**
- `related_skills` 改为 `[]`
- 移除所有 "optionally load X skill" 引用
- 顶部 When to use 加上 "self-contained" 声明
- description 强调 inlines + no external skills required

---

## v3.0.0 — 2026-05-26 (合并 hugo-blog2)

将 `~/.hermes/skills/productivity/hugo-blog2` 内容合并进本 skill，hugo-blog2 保留不动。

**新增章节：**
- Repository（仓库路径、SSH key、deploy 方式）
- Case Study Patterns（Single-Case-Thread-Through 原则 + Scope Matching 表）
- Auto-Illustration（强制步骤 [4]，Gemini 16:9 裁剪流程）
- Mode C: Conversation-as-Draft（实时设计对话 → 博客）
- Mode D: User-Provided Outline Expansion（用户提供大纲 → 扩展）
- Mode E: Research-Driven Outline-First（话题 + 角度 → 调研 → 写作）
- Images 章节（缩略图 + click-to-enlarge 模式）
- Pitfalls（汇总跨场景的踩坑记录）

**Pipeline 升级：**
- 5 步 → 6 步（插入 Illustration 作为强制步骤 [4]）
- Publisher 从简单 git 命令扩展为完整发布工作流（含 typography fix + 用户确认）

**新增 references/（3 个文件，从 hugo-blog2 复制）：**
- `case-study-templates.md`
- `long-horizon-agent-case-studies.md`
- `blog-banner-prompts.md`

**保留并强化：**
- 原 5 阶段 Pipeline 框架不变（Planner/Style Compiler/Generator/Evaluator/Publisher）
- 原 Evaluator rubric 完整保留
- 原 Markdown Formatting Rules 完整保留
- 原 Anti-Patterns 扩展（加入 case study scope mismatch、generic 假设场景）

---

## v2.4.0 — 2026-05-07

**Title & Subtitle 双引号禁用：**
- `title` 和 `subtitle` 字段值内部不允许出现双引号 `"`，否则破坏 YAML 解析和 Hugo 渲染
- 改用中文标点（「」、《》、：）或重写句子规避
- 原 Subtitle Rule 升级为 Title & Subtitle Rule，覆盖两个字段

---

## v2.3.0 — 2026-04-14

**GoAT diagrams 替代 ASCII 作为首选：**
- Hugo 0.108+ 原生支持 GoAT 渲染器（```goat 代码块自动转为 SVG）
- 将 GoAT 提升为流程图/架构图的首选格式，ASCII text 降级为 fallback
- SKILL.md 中 Visual Elements 部分更新：GoAT preferred, ASCII fallback
- 移除 GoAT 的 FORBIDDEN 标记

---

## v2.2.0 — 2026-04-14

**Visual Elements 精确化：**
- ASCII 流程图使用 ` ```text ` 代码块（不是 ` ```goat `，主题不支持 GoAT shortcode）
- ASCII 使用 box-drawing 字符 (┌─┐│└┘) 构建框线和箭头
- Mermaid 仅在需要交互式渲染时使用，主题是内置支持的
- 在 SKILL.md 中明确标注 GoAT 语法为 FORBIDDEN

---

## v2.1.0 — 2026-04-13 (全面优化)

**与 memory 对齐：**
- 新增 Visual Elements 规范（ASCII 架构图/mermaid/对比表格）
- 新增 Python 代码风格（type hints, dataclasses, docstrings）
- 新增 Length Guide（短文 60-170 行 / 长文 800-1300+ 行）
- 新增 Tags Format（英文、连字符、3-6 个）
- 新增 File Naming & ID（顺序编号、slug 规则）
- 新增 Ending 规范（技术总结/升维问题 + 评论引导）

**Evaluator 升级：**
- 评分从抽象维度改为具体 0-5 分 rubric，每个分数有明确描述
- 可操作：3 分和 5 分的区别一目了然

**Anti-Patterns 修复：**
- 移除 「AI-generated markers」，新增明确的 Code Block Requirement

---

## v2.0.0 — 2026-04-13 (初始版本)

- 统一 5 阶段 Pipeline: Planner → Style Compiler → Generator → Evaluator → Publisher
- 新增 Code Block Requirement: 所有代码块必须以 `# generated by AI` 结尾
- 移除原 Anti-Patterns 中的 「AI-generated markers」（与 memory 冲突）

---

_后续使用本 skill 后，请在此文件顶部追加变更记录。_
