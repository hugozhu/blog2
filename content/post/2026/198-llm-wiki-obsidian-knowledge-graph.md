---
title: "用 LLM Wiki + Obsidian 构建个人 AI 知识图谱"
subtitle: "Automated knowledge graph with Hermes Agent and Obsidian"
date: 2026-05-04
tags: ["llm-agent", "knowledge-management", "obsidian", "automation", "personal-productivity"]
ingested: 2026-05-04
sha256: fd12539fd510a34ee392f00b1431e5eeb32f34169afe7b42b0bb7027be37598f
---

去年年底，我做了一个实验：把过去十年写的 190 多篇博客、Obsidian 里的读书笔记、还有悟空 Agent 的实践记录，全部扔给 Hermes Agent，让它按照 Karpathy 的 LLM Wiki 模式自动整理。

三天后，我打开 Obsidian 的 Graph View，看到了一个由 **50 多个节点互相连接的知识网络** — 不是文件归档，而是一个真正的知识图谱。Agent 自动提取了实体和概念，建立了双向链接，甚至发现了我自己都没意识到的关联：`[[compression-as-intelligence]]` 和 `[[agent-memory]]` 之间有一条隐含的逻辑链，我自己写了三年都没发现。

那一刻我意识到：**个人知识管理的瓶颈不是工具，而是"碎片到结构"的转换成本。** 这篇文章，我把整个系统的架构、自动化流程和实际用法完整拆解出来。

<!--more-->

## 为什么不用 RAG？

大多数人的第一反应是：把文档塞进向量数据库，用 RAG 检索不就行了？

问题在于，RAG 每次查询都从零开始检索 — 它不会"记住"上次查过什么，也不会主动发现文档之间的矛盾或关联。你的知识库永远是一堆碎片化的向量。

Karpathy 提出的 LLM Wiki 模式走了另一条路：**知识编译一次，持续累积更新**。Agent 在 ingest（摄入）阶段就把文档拆解成实体和概念页面，用 `[[wikilinks]]` 互相引用。矛盾的地方打上标记，相关的内容建立链接。查询时直接读取已经编译好的知识，而不是重新检索。

核心区别：

| 维度 | RAG | LLM Wiki |
|------|-----|----------|
| 知识组织 | 向量相似度 | 人工语义结构 |
| 跨引用 | 无 | 双向 wikilinks |
| 矛盾处理 | 忽略 | 显式标记 |
| 查询方式 | 每次重新检索 | 直接读取编译结果 |
| 人类可读性 | 差（向量空间） | 好（Markdown 页面） |

## 核心框架：CIC 知识编译模型

我把这套方法论总结为 **CIC 模型（Compile-Interlink-Compound）** — 知识编译、互相关联、持续复利。

大多数人的知识管理停留在"收集"阶段：书签、笔记、剪藏，堆在一起就是一堆碎片。CIC 模型的核心观点是：**知识的价值不在于拥有多少碎片，而在于碎片之间被编译了多少结构化关联。**

```text
  Collect（收集）        Compile（编译）        Compound（复利）
  ┌──────────┐         ┌──────────┐         ┌──────────┐
  │ 原始素材  │  ────▶  │ 结构化    │  ────▶  │ 知识网络  │
  │ 碎片化    │         │ 实体/概念 │         │ 互相链接  │
  │ 无关联    │         │ 双向链接  │         │ 持续增值  │
  └──────────┘         └──────────┘         └──────────┘
     人做                Agent 做              人和 Agent 共用
```

- **Compile**：Agent 将原始素材拆解为实体和概念页面，每个页面有 YAML frontmatter、标签、来源引用
- **Interlink**：每个页面至少 2 个 `[[wikilinks]]`，形成双向关联网络
- **Compound**：每次 ingest 不是孤立操作 — 新页面会更新已有页面、发现新关联、标记矛盾点，知识库像滚雪球一样增长

在这个框架下，RAG 的问题就很清楚了：它只有 Collect 阶段，没有 Compile 和 Compound。每次查询都是重新从碎片中检索，永远不会"越用越聪明"。

## 系统架构

整个系统分三层：

```text
┌─────────────────────────────────────────────────┐
│                   人类浏览层                      │
│              Obsidian Desktop App               │
│         (Graph View, Wikilinks, Search)         │
└──────────────────────┬──────────────────────────┘
                       │ 读写 ~/wiki 目录
┌──────────────────────▼──────────────────────────┐
│                  知识库层                         │
│                    ~/wiki/                      │
│                                                 │
│  SCHEMA.md    ← 领域定义、标签分类、页面规则       │
│  index.md     ← 索引（按类型分节，一行一条）        │
│  log.md       ← 操作日志（追加式，按年轮转）       │
│                                                 │
│  entities/    ← 实体页面（人、组织、产品、模型）   │
│  concepts/    ← 概念页面（技术、方法论、理论）     │
│  comparisons/ ← 对比分析页面                      │
│  queries/     ← 有价值的查询结果                   │
│                                                 │
│  raw/         ← 原始素材（不可变）                │
│    ├── blog/        ← symlink → 博客文章         │
│    ├── Clippings/   ← symlink → Obsidian 笔记    │
│    └── Wukong/      ← symlink → 悟空 Agent 记录  │
└──────────────────────┬──────────────────────────┘
                       │ 定时扫描 + 自动 ingest
┌──────────────────────▼──────────────────────────┐
│                 自动化层                          │
│                                                 │
│  wiki-ingest.sh  ← 检测新文件 + 触发 Agent       │
│       │                                         │
│       ▼                                         │
│  wiki-new-files.py  ← 预扫描脚本                 │
│    分类文件：New / Updated / Drift / Skipped     │
│       │                                         │
│       ▼                                         │
│  Hermes Agent (llm-wiki skill)                  │
│    读取 → 提取 → 建页 → 链接 → 更新索引          │
└─────────────────────────────────────────────────┘
```

## ~/wiki 目录结构详解

我的 wiki 目前有 **50 个知识页面**，分布在三个主要目录：

```text
~/wiki/
├── SCHEMA.md              # 领域定义：AI/ML 研究、工程实践、个人生产力
├── index.md               # 索引：9 个实体 + 40 个概念 + 1 个对比
├── log.md                 # 操作日志
│
├── entities/              # 9 个实体
│   ├── hermes-agent.md
│   ├── obsidian.md
│   ├── claude-code.md
│   ├── tailscale.md
│   ├── raspberry-pi.md
│   ├── gemini.md
│   ├── mcp.md
│   ├── arduino.md
│   └── notebooklm.md
│
├── concepts/              # 40 个概念
│   ├── llm-wiki.md
│   ├── rag-retrieval-augmented-generation.md
│   ├── agent-loop.md
│   ├── agent-memory.md
│   ├── ai-knowledge-management.md
│   ├── compression-as-intelligence.md
│   ├── self-drive-ai-100x-efficiency.md
│   └── ... (更多)
│
├── comparisons/           # 1 个对比
│   └── openclaw-vs-hermes-agent.md
│
├── queries/               # 查询结果（待积累）
│
└── raw/                   # 原始素材（symlink 到外部目录）
    ├── blog        → ~/Documents/Obsidian/hugozhu/blog
    ├── Clippings   → ~/Documents/Obsidian/hugozhu/Clippings
    └── Wukong      → ~/Documents/Obsidian/hugozhu/Wukong
```

每个 wiki 页面都有 YAML frontmatter，包含标题、创建/更新时间、类型、标签和来源：

```yaml
---
title: LLM Wiki 知识管理模式
created: 2026-04-17
updated: 2026-05-04
type: concept
tags: [knowledge-management, llm-agent, wiki]
sources: [raw/blog/190-llm-wiki-pattern.md]
---
```

`raw/` 目录通过 symlink 链接到外部数据源，这样做的好处是：原始数据保持在 Obsidian vault 中正常编辑，wiki 的 ingest 流程只读不写。Agent 从 raw/ 读取素材，提取知识后写入 entities/ 或 concepts/，原始文件本身不被修改。

## 自动化流程：wiki-ingest.sh 详解

整个自动化的核心是 `~/bin/wiki-ingest.sh` 脚本。它的工作流程分四步：

```text
Step 1: 扫描 raw/ 目录
   └─ wiki-new-files.py 检测新文件
       ├─ New: 没有 frontmatter → 立即 ingest
       ├─ Updated: mtime 比 ingested 新 → 重新 ingest
       ├─ Drift: sha256 不匹配 → 标记审查
       └─ Skipped: 已处理 → 跳过

Step 2: 统计待处理文件数

Step 3: 调用 Hermes Agent
   └─ hermes chat --skills llm-wiki -q "..."
       ├─ 读取 SCHEMA.md 了解规则
       ├─ 读取 index.md 了解已有页面
       ├─ 每批最多处理 5 个文件
       │   ├─ 提取实体和概念
       │   ├─ 检查已有页面（避免重复）
       │   ├─ 创建/更新页面 + [[wikilinks]]
       │   └─ 在源文件 frontmatter 中标记 ingested + sha256
       ├─ 重写 index.md
       └─ 追加 log.md

Step 4: 报告结果
```

脚本的关键部分：

```python
# wiki-new-files.py 的核心逻辑（简化版）
# 分类每个 raw 文件到四个桶之一

def classify_file(filepath: str) -> str:
    """返回: new | updated | drift | skipped"""
    frontmatter = parse_frontmatter(filepath)
    if not frontmatter or "ingested" not in frontmatter:
        return "new"
    
    stored_hash = frontmatter.get("sha256", "")
    current_hash = sha256_of_body(filepath)
    
    if stored_hash and stored_hash != current_hash:
        return "drift"
    
    mtime = os.path.getmtime(filepath)
    ingested_date = datetime.fromisoformat(frontmatter["ingested"])
    if datetime.fromtimestamp(mtime) > ingested_date and not stored_hash:
        return "updated"
    
    return "skipped"
# generated by hugo AI
```

```bash
# wiki-ingest.sh 触发 Agent 处理
hermes chat --skills llm-wiki -q "You are maintaining the llm-wiki at $WIKI.

The pre-run script detected new files in raw/ that need ingestion.

WORKFLOW (automated, no clarify):
1. Read SCHEMA.md at $WIKI/SCHEMA.md
2. Read index.md at $WIKI/index.md to know existing pages
3. Process at most 5 new files per run. Read each, extract entities/concepts,
   check existing pages via index + search_files, create/update wiki pages
   with YAML frontmatter (title, created, updated, type, tags, sources).
   Minimum 2 [[wikilinks]] per page. Tags from SCHEMA taxonomy only.
4. Add ingested + sha256 fields INSIDE the source file's existing frontmatter.
   Do NOT modify body content.
5. Rewrite index.md (bulk write_file, not patch).
6. Append to log.md with summary of files processed and pages created.
7. If no new files remain, report 'Wiki is up to date' and stop."
# generated by hugo AI
```

几个关键设计决策：

**为什么每批只处理 5 个文件？** Agent 单次会话有上下文和超时限制。实测 40+ 文件一批会超时，10 个以内比较稳定，5 个是最保险的。对于大量积压文件，多次运行即可 — 每次 ingest 后源文件会被标记，下次不会重复处理。

**为什么用 sha256 而不是 mtime？** macOS 上 Spotlight 和 Time Machine 会修改文件的 mtime，导致误判文件已更新。sha256 对内容做哈希，只有实际内容变了才会触发重新 ingest。

**symlink 的坑：** Python 的 `os.walk()` 默认不跟随符号链接（`followlinks=False`）。如果你把外部目录 symlink 到 raw/，检测脚本会完全跳过它们。`wiki-new-files.py` 里有专门的 `_walk_dirs()` 函数来处理这个问题。

## Obsidian 作为前端浏览器

Wiki 页面是纯 Markdown 文件，天然兼容 Obsidian。把 `~/wiki` 作为 Obsidian vault 打开，就能获得：

**Graph View（图谱视图）** — 这是最有价值的功能。所有 `[[wikilinks]]` 自动渲染为节点之间的连线，你可以直观地看到知识网络：哪些概念关联最紧密，哪些页面是孤岛。

**双向链接** — 点击 `[[hermes-agent]]` 直接跳转到对应页面。Obsidian 的 backlinks 面板还会显示所有引用了当前页面的其他页面。

**Dataview 查询** — 安装 Dataview 插件后，可以用类 SQL 语法查询 wiki：

```dataview
TABLE tags, updated
FROM "entities"
WHERE contains(tags, "ai-agent")
SORT updated DESC
```

**搜索** — Obsidian 的全局搜索比任何自定义 wiki 搜索引擎都好用，支持正则、标签过滤、路径过滤。

### 服务端同步方案

如果 wiki 运行在没有显示器的服务器上（比如你的 Hermes Agent 跑在一台 Linux VPS 上），可以用 `obsidian-headless` 实现无头同步：

```bash
# 安装 obsidian-headless（需要 Node.js 22+）
npm install -g obsidian-headless

# 登录 Obsidian 账号（需要 Sync 订阅）
ob login --email <email> --password '<password>'

# 创建远程 vault
ob sync-setup --vault "<vault-id>"

# 通过 systemd 保持后台同步
systemctl --user enable --now obsidian-wiki-sync
```

这样 Agent 在服务器上写 `~/wiki`，你在笔记本的 Obsidian 上几秒钟后就能看到更新。

## 个人 AI 知识库的常见用法

有了这套系统，我日常有几种高频使用场景：

### 1. 写作素材库

写博客时，不再从零构思。先查 `index.md` 找到相关概念页面，Agent 已经帮我整理好了核心观点、技术细节和来源引用。一篇文章的素材可能分布在 5-10 个 wiki 页面上，组合起来就是一篇有深度的文章。

### 2. 技术决策参考

当需要对比两个方案时（比如 OpenClaw vs Hermes Agent），comparison 页面直接给出维度对比表。Agent 在 ingest 阶段就已经做了方案分析，你只需要读取结果。

### 3. 知识发现

在 Obsidian Graph View 中浏览知识网络时，经常会发现意想不到的关联。比如 `[[compression-as-intelligence]]` 和 `[[agent-memory]]` 之间的链接，揭示了一个我之前没有深入思考的视角：压缩本质上是一种注意力机制。

### 4. 会议/阅读笔记的自动沉淀

把会议纪要或论文笔记丢进 `raw/`，Agent 自动提取关键概念、更新已有页面、建立新链接。笔记不再是一次性消费，而是持续为知识库增值。

### 5. 定时监控

通过 Hermes Agent 的 cron job 功能，可以设置每小时自动扫描 raw/ 目录：

```
cronjob(action='create',
  schedule='every 1h',
  skills=['llm-wiki'],
  script='wiki-new-files.py',
  prompt='Process new files in wiki raw/ directory...')
```

新笔记放入 Obsidian vault 后，一小时内就会被自动 ingest 到 wiki 中。

## 未来展望

这套系统目前能跑通，但还有几个方向值得探索：

**增量编译优化** — 目前的 ingest 是批处理模式，未来可以做成事件驱动：文件变更时立即触发 Agent 增量更新，而不是等 cron 轮询。

**知识图谱可视化增强** — Obsidian Graph View 够用，但对于大规模知识库（500+ 页面），需要更强大的可视化工具。可以考虑用 D3.js 或 Neo4j 构建交互式图谱，支持按标签过滤、按时间线演化、按关联强度布局。

**多 Agent 协作** — 当前的 ingest 由单个 Agent 串行处理。对于大量积压文件，可以用 `delegate_task` 并行处理多个批次，每个 subagent 负责 5-10 个文件，最后合并结果。

**从 Wiki 到 Agent Memory** — 最终形态是 wiki 不仅供人阅读，还作为 Agent 的长期记忆。Agent 在每次会话开始时自动加载相关 wiki 页面，决策时参考已编译的知识，行动后自动将新发现写回 wiki。这才是真正的"知识复利"。

**质量评估体系** — 目前 wiki 页面的质量依赖 Agent 的判断。未来可以引入自动评分机制：链接密度、来源多样性、更新频率、矛盾标记数量 — 用这些指标自动识别低质量页面和知识孤岛。

---

知识管理的核心矛盾是：**人需要结构化，但信息天然是碎片化的**。LLM Wiki 模式的价值在于，它让 AI Agent 承担了"碎片到结构"的转换成本，人只需要享受结构化的结果。

你在实际落地个人知识库时遇到过什么坑？欢迎留言讨论。
