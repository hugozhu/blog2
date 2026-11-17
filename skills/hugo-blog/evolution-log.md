# Evolution Log — hugo-blog-agent

记录每次使用后的规则提炼、反模式发现和结构优化。

---

## 2026-11-17: #452 观点升级（外部挑战 → 最小化修正）+ more 位置规则固化

两份对 #452 的挑战（会话内红队 + 外部架构师视角），用户要求「最小化修正」：不推翻原文，把战略命题提高一层。净增 26 行（+44/−18），六节结构、交叉引用、表格、配图全保留。

**有效的动作：**
- 核心论断从「形状不变，只换执行者」升级为三步递进（换执行者 → 重构工作流 → 重构组织），原句保留为「我最初说过、后来修正了自己」的自我迭代——比直接删掉更有说服力，符合 Epistemic Honesty
- 用作者自己的承诺跟进案例做反例（「脑子记」「周会逐项过问」两步消失），不引外部假设案例
- 次要论点各以 1–2 段插入对应章节（组织激励 / 事实→经验→能力 / FDE 编译成 Agent / 运行时治理 + Outcome Economics / 底表依赖倒置），不新增章节、不改编号
- 「判断力再生产断裂」这条刻意不收——会破坏主线，适合单独成篇

**新规则（用户拍板）：**
- `<!--more-->` 统一放在头图正后方（摘要 = 开头钩子 + 头图），不放在论点句后、也不放在正文信息图后。已写入 SKILL.md「Structure → <!--more--> Placement (STRICT)」+ 三种结构大纲 + Pitfalls + 插图步骤。#451/#452 已按此调整
- 用户在 Zed 里同步手改文件：编辑前先重读当前状态；edit 报「already in the file」时不要重复改，顺手清理多余空行

---

## 2026-11-17: #451 AI 重塑企业工作流（演讲稿 → Mode D 扩写）

用户给完整演讲稿（11-17 EC 会议），明确要求「不要大改」。按 Mode D 执行：六节结构、全部金句逐字保留，只加连接 prose、4 处交叉引用（#450/#444/#447+#445/#443）、1 张 ASCII 执行者替换图、1 张传统咨询 vs FDE 对照表。

**有效的动作：**
- 演讲稿转博客的先例对齐 #443（曾鸣公开课整理稿）：编辑性引子交代演讲出处 + 真实实验 grounding，金句用 blockquote/加粗保留原话
- Adversarial Pass 抓到「形状不变」的最强反方（Agent-native 流程会压缩步骤）→ 只补一句骨架粒度澄清（概念澄清，不加新论点），符合「不要大改」约束
- hook 补一个真实冲突细节（台账替我记承诺、到期主动提醒，源自 #444 已发布机制），不编新案例

**新反模式 / 环境教训：**
- `image_generate` 默认 provider 凭证失效（Invalid credential）且 skill 写的 Gemini 代理（192.168.1.1:4000）在本机不可达、无 hermes 时：**用 Pillow 程序化绘制同风格 banner 是可靠 fallback**——Claude 暖色扁平 + Hiragino Sans GB W6/W3 中文渲染零乱码，几何信息图比 AI 生图更可控。脚本模式：2x 画布（2752×1536）→ LANCZOS 缩到 1376 宽 → PNG <1MB + 800px JPG q85 thumb
- litterbox.catbox.moe 返回 `Invalid uploader`（换浏览器 UA 仍失败）→ 预览链接不可用时直接在会话内展示 banner，不死重试

**评分：** hook 5 / insight 4 / framework 5 / technical 4 = 18 → publish 档（opinion 型，technical 评工程具体性而非可运行代码）

**发布验证教训：**
- 本仓库 hugozhu.site 走 **Tencent EdgeOne Pages** 分支（非 GitHub Pages）：历史成功耗时 241-440s，skill 写的「等 ~90s」不够。3 次 URL 检查预算耗尽后不要盲重试——改查 Actions API（runs → jobs → steps）定位部署分支进度，等 deploy job success 后再验一次 URL
- 本机 blog2 remote 是 HTTPS + credential helper，skill 的 `id_ed25519` SSH 条款不适用；远端常有另一台机器的新提交，push 被 reject 时 `pull --rebase` 后重推

---

## 2026-10-28: #445 企业上下文编译器（已发布稿 → 优化重写）

原稿是抽象类比开头、无 `<!--more-->`、无反方、与 #439 / #444 部分重复。

**有效的优化动作：**
- 开头换成系列前文的真实 ❌（「今天弄好」），并接住 #444 结尾留下的开放问题，单案例贯穿全文
- 类比当真：把编译器各阶段做成对照表，第三列写同一案例在这一步变成什么——类比从修辞变成框架
- 新增「类比在哪里不成立」：每个不成立点对应一条设计约束，这是全文最强的 insight
- 增量写法：只写相对旧文的新增（链接 / 组织尺度），旧文已讲的流水线、长窗口反方只引用不重复
- 组织尺度未实测的部分显式标注「推测」，查不到出处的量级断言改为观点表述

**确认的模式：**
- 修订已发布稿要重打保护戳：`sha256` = front matter 结束 `---\n` 之后正文的 sha256

---

## 2026-08-26: #369 组织的损失函数（观点稿 → 达标稿）

用户自带锋利观点草稿（朋友讨论整理），按草稿扩写 + 补强达标。

**有效的补强动作：**
- 草稿第三节「试错系统」纯抽象 → 补 Booking.com 实验文化锚点（标注「公开报道」，不带不可溯源数字）
- 「可微」隐喻没落地 → 结论处展开为「可度量、可归因」并回扣三缺陷的反转（可分解/可验证/可归因）
- 论点说「写成损失函数」但没展示形态 → 加 `OrgLossFunction` dataclass + `run_trial` 最小内核，代码实测三用例（有效/无效/超预算）
- framework 维度缺命名 → 「损失函数闭环」四阶段命名 + 两个迁移示例（客服响应、库存周转）证明可复用
- insight 维度补「为什么组织选择许愿」的激励结构洞察（许愿是最便宜的管理动作）

**确认的模式：**
- 用户草稿自带案例（导购执行率/时差）优先保留原样，只补论证不碰案例
- 草稿的锋利金句（「老板的祈祷文」「死得越快」）全部保留进正文

---

## v3.4.0 — 2026-05-29: 流程 / 结构改进

把单向流水线改造成带回路的迭代系统，新增旧文去重，并把篇幅标准从行数代理改为论证驱动。

**Pipeline 改为回路（不再是一条道走到底）：**
- Evaluator 新增 **Revision Loop**：reject (<13) 回到 Argument Map 重想 claim/反方/证据再重写；revise (13-17) 修复后**重跑 adversarial pass + 重新打分**；循环直到 ≥18 或判定选题不成立
- 两轮重写仍 <13 → 说明 claim 本身有问题，换角度或放弃并告知用户
- 旧「Auto Improvement Rules」升级并入回路；修正其中「strengthen contrarian thinking」（与 v3.3.0 新 insight 标准矛盾）→ 改为「让洞见更站得住脚：补证据 + 回应最强反方」
- Pipeline 总览加 ASCII 回路图说明

**Style Compiler 新增 Originality vs Corpus（旧文去重，强制）：**
- Cross-Reference 搜出相关旧文后多一步自我去重，规避 self-plagiarism
- 高度相关旧文已讲过该主张 → 换新角度或只写增量（「在 X 文基础上更进一步」）
- 每篇必须能回答「相对已发布所有文章，这篇新增了什么」，答不上就别写

**Length Guide 从行数代理改为论证驱动：**
- 篇幅由论证决定不由行数决定，唯一标准是「讲透所需，多一句废话都不要」
- 删除测试：每段问「删掉它论证会变弱吗」，不会就删
- 原 60-170 / 800-1300 行数降级为事后描述性参考，不再是写作目标

**Lesson**: 单向流水线把「评估」当终点，导致烂论证靠打补丁过关；行数目标激励注水；只引用不去重导致越写越重复自己。回路 + 去重 + 论证驱动篇幅，三者共同把质量门从「格式达标」抬到「论证达标且不重复」。

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
