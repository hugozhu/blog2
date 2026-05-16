# Hugo's Blog — https://hugozhu.site

一个 AI 驱动的个人技术博客，探索树莓派在 AI 时代如何发挥个人生产力价值。

## 关于

本博客基于 [Hugo](https://gohugo.io/) 静态站点生成器构建，内容涵盖：

- **树莓派与 AI** — 利用树莓派搭建个人 AI 基础设施，实现低成本、高效率的自动化工作流
- **网络与基础设施** — Tailscale、OpenWrt 等组网方案，打造个人生产力网络
- **AI/ML 实践** — 大模型应用、Agent 开发、AI 辅助编程等前沿实践
- **软件开发** — 工程效率、开发工具、最佳实践

博客内容以中英文双语撰写，从 AI 辅助写作到 AI 驱动的自动化部署，整个工作流深度融合了 AI 能力。

## 快速开始

```bash
git clone git@github.com:hugozhu/blog2.git
git submodule update --init --recursive

# 本地开发
hugo server -D

# 构建发布
hugo --gc --minify
```

## 部署

通过 GitHub Actions 自动部署，推送到 `main` 分支即触发构建并发布到 GitHub Pages。
