const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
const shapes = pres.shapes;
pres.layout = "LAYOUT_16x9";
pres.author = "Hugo Zhu";
pres.title = "AI 驱动的博客系统架构";

const slide = pres.addSlide();

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
const ARROW_COLOR = "334155";

slide.background = { color: BG };

// === Title ===
slide.addText("AI 驱动的博客系统", {
  x: 0.6, y: 0.3, w: 6, h: 0.6,
  fontSize: 28, fontFace: "Arial Black", color: TEXT_WHITE,
  bold: true, margin: 0
});
slide.addText("How AI Creates & Publishes Blog Posts  ·  hugozhu.site", {
  x: 0.6, y: 0.85, w: 7, h: 0.35,
  fontSize: 12, fontFace: "Calibri", color: TEXT_MUTED, margin: 0
});

// === Tech badges top right ===
const badges = ["Hugo", "GitHub Actions", "DingTalk"];
const badgeColors = [ACCENT_CYAN, ACCENT_GREEN, ACCENT_ORANGE];
badges.forEach((b, i) => {
  const bx = 7.4 + i * 0.9;
  slide.addShape(shapes.ROUNDED_RECTANGLE, {
    x: bx, y: 0.35, w: 0.82, h: 0.28,
    fill: { color: badgeColors[i], transparency: 80 },
    line: { color: badgeColors[i], width: 0.5 },
    rectRadius: 0.05
  });
  slide.addText(b, {
    x: bx, y: 0.35, w: 0.82, h: 0.28,
    fontSize: 7, fontFace: "Calibri", color: badgeColors[i],
    align: "center", valign: "middle", margin: 0
  });
});

// === Pipeline Cards ===
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

function makeShadow() {
  return { type: "outer", color: "000000", blur: 8, offset: 2, angle: 135, opacity: 0.3 };
}

cards.forEach((c, i) => {
  const row = Math.floor(i / 3);
  const col = i % 3;
  const cx = startX + col * (cardW + gapX);
  const cy = row === 0 ? row1Y : row2Y;

  // Card background
  slide.addShape(shapes.RECTANGLE, {
    x: cx, y: cy, w: cardW, h: cardH,
    fill: { color: CARD_BG },
    shadow: makeShadow()
  });

  // Left accent bar
  slide.addShape(shapes.RECTANGLE, {
    x: cx, y: cy, w: 0.06, h: cardH,
    fill: { color: c.color }
  });

  // Number badge
  slide.addShape(shapes.ROUNDED_RECTANGLE, {
    x: cx + 0.2, y: cy + 0.18, w: 0.45, h: 0.28,
    fill: { color: c.color, transparency: 75 },
    rectRadius: 0.05
  });
  slide.addText(c.num, {
    x: cx + 0.2, y: cy + 0.18, w: 0.45, h: 0.28,
    fontSize: 10, fontFace: "Consolas", color: c.color,
    bold: true, align: "center", valign: "middle", margin: 0
  });

  // Title
  slide.addText(c.title, {
    x: cx + 0.75, y: cy + 0.15, w: 1.8, h: 0.35,
    fontSize: 16, fontFace: "Arial Black", color: TEXT_WHITE,
    bold: true, margin: 0
  });

  // Subtitle
  slide.addText(c.sub, {
    x: cx + 0.75, y: cy + 0.45, w: 1.8, h: 0.22,
    fontSize: 9, fontFace: "Calibri", color: c.color, margin: 0
  });

  // Description
  slide.addText(c.desc, {
    x: cx + 0.2, y: cy + 0.8, w: cardW - 0.4, h: 1.5,
    fontSize: 10, fontFace: "Calibri", color: TEXT_MUTED,
    lineSpacingMultiple: 1.4, margin: 0
  });
});

// === Connecting arrows (row 1: left→right) ===
for (let i = 0; i < 2; i++) {
  const ax = startX + (i + 1) * cardW + i * gapX + gapX * 0.3;
  const ay = row1Y + cardH / 2;
  slide.addShape(shapes.LINE, {
    x: ax, y: ay, w: gapX * 0.5, h: 0,
    line: { color: ARROW_COLOR, width: 2, endArrowType: "triangle" }
  });
}

// === Connecting arrow (row 1 → row 2, down-right) ===
{
  const ax = startX + 2 * (cardW + gapX) + cardW / 2;
  const ay = row1Y + cardH + 0.05;
  slide.addShape(shapes.LINE, {
    x: ax, y: ay, w: 0, h: row2Y - row1Y - cardH - 0.1,
    line: { color: ARROW_COLOR, width: 2, endArrowType: "triangle" }
  });
}

// === Connecting arrows (row 2: right→left, reversed) ===
for (let i = 0; i < 2; i++) {
  const ax = startX + (2 - i) * cardW + (1 - i) * gapX + gapX * 0.3;
  const ay = row2Y + cardH / 2;
  slide.addShape(shapes.LINE, {
    x: ax, y: ay, w: gapX * 0.5, h: 0,
    line: { color: ARROW_COLOR, width: 2, endArrowType: "triangle" }
  });
}

// === Bottom label ===
slide.addText("Conversation → Content → Deploy → Feedback    |    Powered by Hermes Agent + Hugo + GitHub Actions", {
  x: 0.6, y: 5.25, w: 8.8, h: 0.3,
  fontSize: 8, fontFace: "Calibri", color: TEXT_MUTED, align: "center", margin: 0
});

// === Speaker Notes ===
slide.addNotes(`这个系统展示了 AI 如何端到端完成博客创作与发布：
1. 对话创作：Hermes Agent 加载 hugo-blog Skill，通过对话理解需求
2. 内容生成：输出符合规范的 Markdown 文件
3. Git 提交：推送至 blog2 仓库 main 分支
4. CI/CD：GitHub Actions 自动构建 Hugo 静态站点
5. 发布上线：部署到 GitHub Pages (hugozhu.github.com)
6. 钉钉通知：自定义 GitHub Action 发送部署状态

关键设计：Skills 系统确保 AI 输出质量一致，CI/CD 实现零手动部署。`);

pres.writeFile({ fileName: "/home/hugo/Projects/blog2/ai-blog-system.pptx" })
  .then(() => console.log("OK: ai-blog-system.pptx created"))
  .catch(err => console.error("ERROR:", err));
