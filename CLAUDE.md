# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hugo static site blog (hugozhu.site) using the **beautifulhugo** theme (as a git submodule). Posts cover Raspberry Pi, networking (Tailscale, OpenWrt), AI/ML, and software development topics. Posts are written in both English and Chinese.

## Common Commands

```bash
# Clone with theme submodule
git submodule update --init --recursive

# Local development server
hugo server -D

# Build for production
hugo --gc --minify
```

## Deployment

Automated via GitHub Actions (`.github/workflows/hugo.yaml`). Pushing to `main` triggers a build that publishes to the `hugozhu/hugozhu.github.com` repo (GitHub Pages). A DingTalk notification is sent after deployment.

## Content Structure

- `content/post/{YEAR}/` — Blog posts organized by year. Filenames use a numeric prefix: `{ID}-{slug}.md` (e.g., `121-desktop-screen-recording-rpa-best-practices.md`)
- `content/page/` — Static pages (about, tools)
- `static/` — Static assets (images, CNAME)
- `layouts/` — Template overrides on top of the theme (custom `single.html` with Chinese TOC header, custom head/footer partials)

## Writing Blog Posts

New post files go in `content/post/{YEAR}/{ID}-{slug}.md` where `{ID}` is the next sequential number (check the latest post number in the year directory).

Required front matter:
```yaml
---
title: "Post Title"
subtitle: "Optional subtitle"
date: YYYY-MM-DD
tags: ["tag1", "tag2"]
---
```

Use `<!--more-->` after the opening paragraph(s) to set the excerpt boundary.

## Configuration

- `hugo.toml` — Site config (base URL, theme, params, menus, author info)
- Theme: `themes/beautifulhugo` (git submodule from `halogenica/beautifulhugo`)
- Syntax highlighting: `trac` style with code fences
- Comments: Disqus (delayed loading)
- Analytics: Google Tag Manager
- Markup: Goldmark with unsafe HTML enabled, TOC levels 2-3

## Skills

The `skills/` directory contains a `hugo-blog` skill definition (`skills/SKILL.md`) that provides blog post writing guidelines for AI assistants — covering structure, style, code examples, and the bilingual (English/Chinese) content approach.
