# Blog Banner Illustration Prompts

Reusable Gemini image generation prompt patterns for blog post banner illustrations. These are wide-format (1280x896) illustrations in **Claude-style warm flat design** suitable as post headers.

## Style Guide

**Color palette**: 奶油色背景（cream #FAF7F2）、赤陶橙色（terracotta #CC785C）、暖棕色文字、柔和米白
**Style**: 极简扁平化、温暖克制、无阴影无 3D、像 Claude 官网插画
**Negative constraints**: 不要卡通人物、不要深色背景、不要赛博朋克、不要 3D 效果、不要阴影

## General Structure — Flowchart

```
极简扁平化技术流程图插图，Claude 风格配色：奶油色背景、赤陶橙色节点、暖棕色文字。
画面中央是一条从左到右的水平流水线，[N]个圆角矩形节点用箭头连接：

第一个节点写「① [名称]」下方小字「[功能]」
第二个节点写「② [名称]」下方小字「[功能]」
...

[可选：某节点有虚线箭头回指前面的节点，旁边写「[条件]→[动作]」]

节点下方有[2-3]个浅色分组标签：「[分组1]」「[分组2]」「[分组3]」。
整体风格极简、温暖、克制，扁平化设计，无阴影无3D，像 Claude 官网插画。不要卡通人物，不要深色背景。
```

## General Structure — Three-Zone Narrative

```
极简扁平化三区域插图，Claude 风格配色：奶油色背景、赤陶橙色、暖棕色。
画面从左到右分为三个区域：

左侧（问题/旧方式）：[具体场景描述，用扁平化图标或简笔画]
中间（核心概念/转换）：[核心视觉隐喻]
右侧（方案/新方式）：[具体场景描述]

每个区域下方有简短中文标注。
整体风格极简、温暖、克制，扁平化设计，无阴影无3D，像 Claude 官网插画。不要卡通人物，不要深色背景。
```

## Key Prompt Engineering Tips

1. **Always specify size 1280x896** — this is the landscape ratio that works with Gemini and fits blog headers well.
2. **Use 「奶油色背景」** — sets the warm Claude-style base, avoids dark or busy backgrounds.
3. **Explicitly say 「不要卡通人物，不要深色背景，不要 3D 效果」** — Gemini defaults toward these without negative guidance.
4. **Describe flow elements with specific Chinese labels** — 「节点写『① Planner』下方小字『分类定向』」 works well.
5. **Use 「极简扁平化」 and 「像 Claude 官网插画」** — pushes toward clean, warm flat design.
6. **Use Chinese prompts** — Gemini handles CJK natively and renders Chinese text better.

## Post-Processing

After generation:
1. Save original to `static/img/{YEAR}/{slug}.png`
2. Generate JPG thumbnail (800px, q=85) → `{slug}-thumb.jpg`
3. Insert as linked thumbnail: `[![Alt text](/img/{YEAR}/{slug}-thumb.jpg)](/img/{YEAR}/{slug}.png)`
4. Place after opening paragraph(s), before `<!--more-->`

## Litterbox Upload

Upload thumbnail to litter.catbox.moe for shareable preview link (24h expiry). If upload returns 403, skip — the local image will be served by GitHub Pages after deployment.
