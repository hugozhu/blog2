# Blog Banner Illustration Prompts

Reusable Gemini image generation prompt patterns for blog post banner illustrations. These are wide-format (1536x1024) tech-themed illustrations suitable as post headers.

## General Structure

```
A futuristic, cinematic wide banner illustration depicting "{CONCEPT}".
Dark deep-blue background with elegant blue-purple neon glow effects,
clean and sophisticated tech aesthetic inspired by Anthropic/OpenAI design language.

CENTER: {Core visual metaphor — what the system/concept looks like as a physical object}

LEFT SIDE: {The "before" or "problem" scene — manual, painful, old way}

RIGHT SIDE: {The "after" or "solution" scene — automated, effortless, new way}

BACKGROUND ELEMENTS: {Supporting visual details — code snippets, icons, network patterns}

STYLE: Ultra-clean, premium tech illustration. Cinematic lighting.
No cartoon, no anime, no cluttered cyberpunk. Minimalist futuristic UI design.
Professional, geeky, sophisticated. Movie-quality concept art rendering.
Sharp details, depth of field effect.
```

## Key Prompt Engineering Tips

1. **Always specify size 1536x1024** — this is the landscape ratio that works with Gemini and fits blog headers well.
2. **Use 「dark deep-blue background」** — avoids the common AI tendency toward busy cyberpunk or overly bright scenes.
3. **Explicitly say 「No cartoon, no anime, no cluttered cyberpunk」** — Gemini defaults toward these without negative guidance.
4. **Describe scenes as physical spaces** — 「a person sitting in a café」 works better than 「mobile usage scenario」.
5. **Include text labels in quotes** — Gemini can render short text labels on UI elements (e.g., 「AI Agent」, 「Planner」).
6. **Use 「cinematic」 and 「movie-quality」** — pushes toward professional concept art rather than stock illustration.

## Example: AI Writing System Banner

Prompt that produced a high-quality result for a post about automated blog writing:

- Center: luminous AI Core orb with pipeline modules (Idea → Planner → Writer → Evaluator → Publisher)
- Left: programmer hunched over desk late at night, messy screens with Markdown/Git/typography
- Right: person in café with iPhone, single sentence input, automated pipeline producing published blog
- Background: neural network patterns, Git commit icons, GitHub Actions pipeline, Hugo static site
- Muted amber tones for 「old way」, cool blue-purple for 「new way」

## Post-Processing

After generation:
1. Save original to `static/img/{YEAR}/{slug}.png`
2. Generate JPG thumbnail (800px, q=85) → `{slug}-thumb.jpg`
3. Insert as linked thumbnail: `[![Alt text](/img/{YEAR}/{slug}-thumb.jpg)](/img/{YEAR}/{slug}.png)`
4. Place after opening paragraph(s), before `<!--more-->`

## Litterbox Upload

Upload thumbnail to litter.catbox.moe for shareable preview link (24h expiry). If upload returns 403, skip — the local image will be served by GitHub Pages after deployment.
