---
title: "AI 时代的个人知识库：极简方案"
subtitle: "Markdown + Git + AI = 最好的知识库"
date: 2025-05-27
tags: ["AI", "knowledge-management", "tools"]
---

AI 时代，个人知识库的核心矛盾变了。

<!--more-->

## 问题变了

传统时代，知识库的痛点是「找不到」。所以需要标签、目录、全文搜索、双向链接。Obsidian、Notion、Roam 都在解决「人怎么组织信息」这个问题。

AI 时代，痛点变成了「能不能喂给 AI」。格式越简单，AI 读取越高效。所有花哨的组织方式（双向链接、graph view、database view）反而成了噪音。

## 极简方案

```text
~/wiki/
├── concepts/        # 概念
├── people/          # 人物
├── projects/        # 项目
├── inbox/           # 随手记，未整理
└── .git/            # 版本控制
```

每个文件就是一个 `.md`，frontmatter 几个字段，正文随便写。

**编辑器？** 随便。VS Code、Obsidian、甚至 `nano`。编辑器不重要，文件本身才重要。

**搜索？** 不需要。`grep` 或者直接问 AI：「我之前写过什么关于 X 的？」

**分类？** 不需要。文件夹随便放，AI 能跨目录检索。标签是给人用的，AI 不需要。

## 为什么不是其他方案

| 方案 | 问题 |
|------|------|
| Obsidian | 插件生态太重，`.obsidian/` 配置膨胀，sync 收费 |
| Notion | 数据在别人服务器，导出麻烦，API 限流，格式不标准 |
| SQLite | 对非技术用户门槛高，编辑器不好找 |
| Heptabase | 好产品，但数据封闭，Markdown 导出有损 |
| 语雀/飞书文档 | 平台锁定，AI 读取需要额外适配 |

Markdown 文件的本质优势： **它是 AI 的原生食物**。任何 LLM 都能直接读取，不需要解析器、不需要 API、不需要导出。

## 真正的架构

```text
人写/收集 → Markdown 文件 → Git 版本控制 → AI 读取/总结/问答
                                    ↓
                              (可选) 静态站发布
```

四层，每层都可以替换：

1. **输入层** — 任何能写文本的工具
2. **存储层** — 文件系统 + Git
3. **智能层** — Hermes / Claude / 任何能读文件的 AI
4. **展示层** — Hugo / 可选，不需要就不建

## 门槛低到什么程度

- 会写文本就行
- 不需要学 Markdown 语法（纯文本也行，AI 能理解）
- 不需要学 Git（让 AI 帮你 commit）
- 不需要装任何特定软件

最低配：一个文件夹 + 一个 AI。完了。

## 实际使用

我目前的方案就是这个架构：

- `~/wiki/` 文件夹，按领域分目录
- Hermes 作为 AI 层，可以随时 `read_file` 检索任何笔记
- Git 做版本控制，偶尔 `git add && git commit`
- Hugo 发布到 hugozhu.site

不需要 Obsidian 的 graph view，不需要 Notion 的 database，不需要任何花哨的功能。 **文本是最持久的格式，文件夹是最简单的组织，AI 是最好的搜索引擎。**
