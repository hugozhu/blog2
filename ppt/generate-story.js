const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
const shapes = pres.shapes;
pres.layout = "LAYOUT_16x9";
pres.author = "Hugo Zhu";
pres.title = "AI 驱动的博客系统 - 从手工到智能化";

// === Color Palette ===
const BG = "0A0E1A";
const CARD_BG = "141B2D";
const ACCENT_BLUE = "3B82F6";
const ACCENT_CYAN = "06B6D4";
const ACCENT_GREEN = "10B981";
const ACCENT_ORANGE = "F59E0B";
const ACCENT_PURPLE = "8B5CF6";
const ACCENT_PINK = "EC4899";
const TEXT_WHITE = "F8FAFC";
const TEXT_MUTED = "94A3B8";
const TEXT_DIM = "64748B";

function makeShadow() {
  return { type: "outer", color: "000000", blur: 8, offset: 2, angle: 135, opacity: 0.3 };
}

// ============================================================================
// SLIDE 1: Timeline & Volume Story
// ============================================================================
const slide1 = pres.addSlide();
slide1.background = { color: BG };

// Title
slide1.addText("博客进化史", {
  x: 0.6, y: 0.3, w: 5, h: 0.6,
  fontSize: 28, fontFace: "Arial Black", color: TEXT_WHITE,
  bold: true, margin: 0
});
slide1.addText("从手工创作到 AI 驱动的 10 倍效率提升  ·  2013-2026", {
  x: 0.6, y: 0.85, w: 7, h: 0.35,
  fontSize: 12, fontFace: "Calibri", color: TEXT_MUTED, margin: 0
});

// === Bar Chart: Posts per Year ===
const years = ["2013", "2014", "2015", "2016", "2020", "2022", "2024", "2025", "2026"];
const posts = [43, 8, 8, 7, 2, 4, 8, 25, 127];
const maxPosts = 127;
const chartX = 0.6;
const chartY = 1.5;
const chartW = 5.5;
const chartH = 2.8;
const barW = chartW / years.length - 0.15;

// Y-axis labels
for (let i = 0; i <= 4; i++) {
  const val = Math.round((maxPosts / 4) * i);
  const y = chartY + chartH - (chartH / 4) * i;
  slide1.addText(val.toString(), {
    x: chartX - 0.4, y: y - 0.1, w: 0.35, h: 0.2,
    fontSize: 8, fontFace: "Calibri", color: TEXT_DIM,
    align: "right", valign: "middle", margin: 0
  });
  // Grid line
  slide1.addShape(shapes.LINE, {
    x: chartX, y: y, w: chartW, h: 0,
    line: { color: "1E293B", width: 0.5, dashType: "dash" }
  });
}

// Bars
years.forEach((year, i) => {
  const barH = (posts[i] / maxPosts) * chartH;
  const x = chartX + i * (barW + 0.15);
  const y = chartY + chartH - barH;
  
  // Determine color based on era
  let color = ACCENT_BLUE;
  if (year === "2013") color = ACCENT_CYAN;
  if (year === "2024") color = ACCENT_ORANGE;
  if (year === "2025") color = ACCENT_GREEN;
  if (year === "2026") color = ACCENT_PINK;
  
  // Bar
  slide1.addShape(shapes.RECTANGLE, {
    x: x, y: y, w: barW, h: barH,
    fill: { color: color, transparency: 20 },
    line: { color: color, width: 1 }
  });
  
  // Value on top
  slide1.addText(posts[i].toString(), {
    x: x, y: y - 0.25, w: barW, h: 0.2,
    fontSize: 10, fontFace: "Consolas", color: color,
    bold: true, align: "center", valign: "middle", margin: 0
  });
  
  // Year label
  slide1.addText(year, {
    x: x, y: chartY + chartH + 0.05, w: barW, h: 0.2,
    fontSize: 9, fontFace: "Calibri", color: TEXT_DIM,
    align: "center", valign: "top", margin: 0
  });
});

// === Annotations ===
const annotations = [
  { year: "2013", x: 0.85, text: "手工巅峰", sub: "43篇 · 树莓派教程", color: ACCENT_CYAN },
  { year: "2024", x: 4.15, text: "Hugo 迁移", sub: "从 Gor 到 Hugo", color: ACCENT_ORANGE },
  { year: "2026", x: 5.5, text: "AI 爆发", sub: "127篇 · 7x 速度", color: ACCENT_PINK }
];

annotations.forEach(a => {
  slide1.addShape(shapes.RECTANGLE, {
    x: a.x, y: 4.6, w: 1.3, h: 0.7,
    fill: { color: CARD_BG },
    shadow: makeShadow()
  });
  slide1.addShape(shapes.RECTANGLE, {
    x: a.x, y: 4.6, w: 0.05, h: 0.7,
    fill: { color: a.color }
  });
  slide1.addText(a.text, {
    x: a.x + 0.12, y: 4.65, w: 1.1, h: 0.25,
    fontSize: 10, fontFace: "Arial Black", color: a.color,
    bold: true, margin: 0
  });
  slide1.addText(a.sub, {
    x: a.x + 0.12, y: 4.88, w: 1.1, h: 0.35,
    fontSize: 7, fontFace: "Calibri", color: TEXT_MUTED, margin: 0
  });
});

// === Right Side: Key Metrics ===
const metricsX = 6.5;
const metricsW = 3.2;

slide1.addShape(shapes.RECTANGLE, {
  x: metricsX, y: 1.5, w: metricsW, h: 3.8,
  fill: { color: CARD_BG },
  shadow: makeShadow()
});

slide1.addText("关键指标", {
  x: metricsX + 0.2, y: 1.65, w: 2.8, h: 0.35,
  fontSize: 14, fontFace: "Arial Black", color: TEXT_WHITE,
  bold: true, margin: 0
});

const metrics = [
  { label: "产量提升", value: "3.0x", desc: "2026 vs 2013 年度总量", color: ACCENT_PINK },
  { label: "深度提升", value: "2.8x", desc: "每篇文章平均字数", color: ACCENT_CYAN },
  { label: "速度提升", value: "7.1x", desc: "月均发布频率", color: ACCENT_GREEN },
  { label: "综合产出", value: "8.3x", desc: "总量 × 深度", color: ACCENT_ORANGE }
];

metrics.forEach((m, i) => {
  const my = 2.15 + i * 0.75;
  
  slide1.addText(m.value, {
    x: metricsX + 0.2, y: my, w: 1.2, h: 0.35,
    fontSize: 22, fontFace: "Consolas", color: m.color,
    bold: true, margin: 0
  });
  slide1.addText(m.label, {
    x: metricsX + 1.4, y: my, w: 1.6, h: 0.2,
    fontSize: 11, fontFace: "Arial Black", color: TEXT_WHITE,
    bold: true, margin: 0
  });
  slide1.addText(m.desc, {
    x: metricsX + 1.4, y: my + 0.18, w: 1.6, h: 0.2,
    fontSize: 8, fontFace: "Calibri", color: TEXT_MUTED, margin: 0
  });
});

// === Bottom: Mobile & AI ===
slide1.addShape(shapes.RECTANGLE, {
  x: 0.6, y: 5.05, w: 9.1, h: 0.45,
  fill: { color: CARD_BG }
});
slide1.addText([
  { text: "📱 随时随地创作", options: { bold: true, color: ACCENT_CYAN } },
  { text: "  Hermes Agent 支持手机访问，通勤路上、咖啡厅、出差途中都能完成博客  ", options: { color: TEXT_MUTED } },
  { text: "|  ", options: { color: TEXT_DIM } },
  { text: "🤖 AI 质量保障", options: { bold: true, color: ACCENT_GREEN } },
  { text: "  Skills 系统确保代码、图表、排版一致性", options: { color: TEXT_MUTED } }
], {
  x: 0.8, y: 5.1, w: 8.8, h: 0.35,
  fontSize: 9, fontFace: "Calibri", margin: 0
});

// Speaker Notes
slide1.addNotes(`博客进化的关键里程碑：

2013年：手工创作巅峰
- 43篇文章，全部手写
- 主题：树莓派硬件教程（步进电机、温湿度传感器、LCD显示）
- 平均 131 行/篇
- 月均 3.6 篇

2014-2022年：沉寂期
- 工作繁忙（钉钉CTO），博客更新放缓
- 平台老化（Gor模板不支持移动端）

2024年7月：技术栈迁移
- 从 Gor 迁移到 Hugo（现代静态站点生成器）
- 新模板支持移动端、代码高亮
- 仓库从 blog 迁移到 blog2

2025年：AI 辅助创作开始
- 25篇文章，开始使用 Hermes Agent
- 探索 AI 工作流

2026年（1-5月）：AI 驱动爆发
- 127篇文章（5个月超过2013全年）
- 平均 371 行/篇（2.8倍深度）
- 月均 25.4 篇（7.1倍速度）
- 内容质量：代码示例、ASCII架构图、对比表格、真实案例
- Skills 系统确保一致性：中文排版、代码规范、案例选择

核心洞察：
AI 不是替代创作，而是释放创作力。
工程师的价值在于洞察和经验，不在于排版和格式化。`);

// ============================================================================
// SLIDE 2: AI System Architecture
// ============================================================================
const slide2 = pres.addSlide();
slide2.background = { color: BG };

// Title
slide2.addText("AI 驱动的博客系统", {
  x: 0.6, y: 0.3, w: 6, h: 0.6,
  fontSize: 28, fontFace: "Arial Black", color: TEXT_WHITE,
  bold: true, margin: 0
});
slide2.addText("How AI Creates & Publishes Blog Posts  ·  hugozhu.site", {
  x: 0.6, y: 0.85, w: 7, h: 0.35,
  fontSize: 12, fontFace: "Calibri", color: TEXT_MUTED, margin: 0
});

// Tech badges
const badges = ["Hugo", "GitHub Actions", "DingTalk"];
const badgeColors = [ACCENT_CYAN, ACCENT_GREEN, ACCENT_ORANGE];
badges.forEach((b, i) => {
  const bx = 7.4 + i * 0.9;
  slide2.addShape(shapes.ROUNDED_RECTANGLE, {
    x: bx, y: 0.35, w: 0.82, h: 0.28,
    fill: { color: badgeColors[i], transparency: 80 },
    line: { color: badgeColors[i], width: 0.5 },
    rectRadius: 0.05
  });
  slide2.addText(b, {
    x: bx, y: 0.35, w: 0.82, h: 0.28,
    fontSize: 7, fontFace: "Calibri", color: badgeColors[i],
    align: "center", valign: "middle", margin: 0
  });
});

// Pipeline Cards
const cards = [
  { num: "01", title: "对话创作", sub: "Conversation", desc: "Hermes Agent 通过对话\n理解需求，加载 Skills\n生成博客内容", color: ACCENT_BLUE },
  { num: "02", title: "Markdown", sub: "Content", desc: "生成 .md 文件\n含 YAML 前置信息\n代码块 + 架构图", color: ACCENT_CYAN },
  { num: "03", title: "Git Push", sub: "Version Control", desc: "git add → commit\n推送至 main 分支\n触发 CI/CD 流水线", color: ACCENT_GREEN },
  { num: "04", title: "CI/CD", sub: "GitHub Actions", desc: "安装 Hugo CLI\n构建静态站点\n推送至 Pages 仓库", color: ACCENT_ORANGE },
  { num: "05", title: "发布上线", sub: "GitHub Pages", desc: "hugozhu.github.com\n全球 CDN 分发\n自动 HTTPS", color: ACCENT_PURPLE },
  { num: "06", title: "钉钉通知", sub: "DingTalk", desc: "部署开始/结束通知\n成功 ✅ 失败 ❌\n实时反馈闭环", color: ACCENT_PINK }
];

const cardW = 2.7;
const cardH = 2.4;
const gapX = 0.35;
const startX = 0.6;
const row1Y = 1.5;
const row2Y = 4.15;

cards.forEach((c, i) => {
  const row = Math.floor(i / 3);
  const col = i % 3;
  const cx = startX + col * (cardW + gapX);
  const cy = row === 0 ? row1Y : row2Y;

  // Card background
  slide2.addShape(shapes.RECTANGLE, {
    x: cx, y: cy, w: cardW, h: cardH,
    fill: { color: CARD_BG },
    shadow: makeShadow()
  });

  // Left accent bar
  slide2.addShape(shapes.RECTANGLE, {
    x: cx, y: cy, w: 0.06, h: cardH,
    fill: { color: c.color }
  });

  // Number badge
  slide2.addShape(shapes.ROUNDED_RECTANGLE, {
    x: cx + 0.2, y: cy + 0.18, w: 0.45, h: 0.28,
    fill: { color: c.color, transparency: 75 },
    rectRadius: 0.05
  });
  slide2.addText(c.num, {
    x: cx + 0.2, y: cy + 0.18, w: 0.45, h: 0.28,
    fontSize: 10, fontFace: "Consolas", color: c.color,
    bold: true, align: "center", valign: "middle", margin: 0
  });

  // Title
  slide2.addText(c.title, {
    x: cx + 0.75, y: cy + 0.15, w: 1.8, h: 0.35,
    fontSize: 16, fontFace: "Arial Black", color: TEXT_WHITE,
    bold: true, margin: 0
  });

  // Subtitle
  slide2.addText(c.sub, {
    x: cx + 0.75, y: cy + 0.45, w: 1.8, h: 0.22,
    fontSize: 9, fontFace: "Calibri", color: c.color, margin: 0
  });

  // Description
  slide2.addText(c.desc, {
    x: cx + 0.2, y: cy + 0.8, w: cardW - 0.4, h: 1.5,
    fontSize: 10, fontFace: "Calibri", color: TEXT_MUTED,
    lineSpacingMultiple: 1.4, margin: 0
  });
});

// Connecting arrows (row 1)
for (let i = 0; i < 2; i++) {
  const ax = startX + (i + 1) * cardW + i * gapX + gapX * 0.3;
  const ay = row1Y + cardH / 2;
  slide2.addShape(shapes.LINE, {
    x: ax, y: ay, w: gapX * 0.5, h: 0,
    line: { color: "334155", width: 2, endArrowType: "triangle" }
  });
}

// Connecting arrow (row 1 → row 2)
{
  const ax = startX + 2 * (cardW + gapX) + cardW / 2;
  const ay = row1Y + cardH + 0.05;
  slide2.addShape(shapes.LINE, {
    x: ax, y: ay, w: 0, h: row2Y - row1Y - cardH - 0.1,
    line: { color: "334155", width: 2, endArrowType: "triangle" }
  });
}

// Connecting arrows (row 2: right→left)
for (let i = 0; i < 2; i++) {
  const ax = startX + (2 - i) * cardW + (1 - i) * gapX + gapX * 0.3;
  const ay = row2Y + cardH / 2;
  slide2.addShape(shapes.LINE, {
    x: ax, y: ay, w: gapX * 0.5, h: 0,
    line: { color: "334155", width: 2, endArrowType: "triangle" }
  });
}

// Bottom label
slide2.addText("Conversation → Content → Deploy → Feedback    |    Powered by Hermes Agent + Hugo + GitHub Actions", {
  x: 0.6, y: 5.25, w: 8.8, h: 0.3,
  fontSize: 8, fontFace: "Calibri", color: TEXT_MUTED, align: "center", margin: 0
});

slide2.addNotes(`AI 博客系统的 6 步流水线：

1. 对话创作（Hermes Agent）
   - 通过 Telegram/DingTalk/Web 访问
   - 加载 hugo-blog Skill 获取规范
   - 对话理解需求，迭代内容
   - 支持手机随时随地创作

2. Markdown 生成
   - 输出符合规范的 .md 文件
   - YAML 前置信息（title, subtitle, date, tags）
   - <!--more--> 分隔符
   - 代码块带 type hints 和 "# generated by AI"
   - ASCII 架构图、Mermaid 图表
   - 中文排版规范（空格、引号、粗体）

3. Git Push
   - git add → commit → push main
   - 使用 SSH key (id_ed25519)
   - 触发 GitHub Actions

4. CI/CD（GitHub Actions）
   - 安装 Hugo CLI (v0.161.1)
   - 拉取 submodule (beautifulhugo theme)
   - hugo --gc --minify 构建
   - 推送到 hugozhu.github.com 仓库

5. GitHub Pages 发布
   - 自动部署到 hugozhu.site
   - 全球 CDN 分发
   - HTTPS 自动证书

6. 钉钉通知
   - 自定义 GitHub Action (hugozhu/dingtalk-github-action)
   - 部署开始通知
   - 部署成功/失败通知
   - 包含 commit message 和 run link

关键设计：
- Skills 系统：确保 AI 输出质量一致
- 移动优先：手机也能创作高质量博客
- 零手动部署：push 即发布
- 实时反馈：钉钉通知闭环`);

pres.writeFile({ fileName: "/home/hugo/Projects/blog2/ai-blog-story.pptx" })
  .then(() => console.log("OK: ai-blog-story.pptx created"))
  .catch(err => console.error("ERROR:", err));
