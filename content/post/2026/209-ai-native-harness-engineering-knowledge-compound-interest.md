---
title: "AI Native 研发实战：一个类 Notion 笔记的创业团队的 Harness 工程与知识复利"
subtitle: "How a 5-Person Startup Built an AI-Native Execution Graph for Complex Collaborative Editing"
date: 2026-05-14
tags: ["ai-native", "harness-engineering", "knowledge-management", "execution-graph", "notion-clone", "crdt"]
ingested: 2026-05-17
sha256: cec254565a56f78f0dfe43108820fdcd6496db4fcfd25d9f451a2675407f3151
---

上周和一位做 Notion 类产品的创业朋友 Hugo 深聊。他们团队 5 个人，技术栈很现代：Rust 后端 + CRDT 协作引擎 + React 前端。全员配了 Cursor/Copilot，编码效率确实起飞了。

但他抛出一个让我后背发凉的数据：

> "写代码快了 10 倍，但端到端交付只快了 2 倍。剩下的时间差，全耗在给 AI 擦屁股上。"

他给我看了一个真实案例。新人小李接到任务："新增一个代码块类型，支持语法高亮和行号。"

**没有 Harness 的灾难**：
1. 小李让 Agent 生成代码（5 分钟，看起来完美）
2. Agent 不知道团队半年前从"嵌套 JSON"迁移到"扁平化 parent_id"的架构决策，生成了嵌套方案
3. 小李没看出来（新人不懂历史），提交 PR
4. CI 失败：循环引用检测拦截（嵌套结构在协作同步时会死锁）
5. 小李让 Agent 修复，Agent 为了绕过检测，直接改了权限校验逻辑（越界）
6. 老王 Review 时发现 3 个深层问题：CRDT 冲突策略不对、离线同步没考虑、权限模型被破坏。打回。
7. 反复 3 轮，耗时 2 天。老王叹气："还不如我自己写。"

**问题本质**：AI 把编码压缩了，但把 **隐性知识的缺失放大了**。

过去靠"问老王"填补的架构决策、历史坑位、协作潜规则，AI 一概不知道。阿里技术许晓斌称之为 **人肉中间件现象**：员工沦为 AI 与业务系统间的手工搬运工。腾讯技术工程则指出：**Harness 不是目的，知识才是护城河**。

这篇文章，就以这个 5 人 Notion 团队为案例，完整拆解他们如何用 **三层架构（组织 × 资产 × 工程）** 构建 Harness 系统，把"给 AI 擦屁股"变成"AI 自主交付"，实现知识复利。

<!--more-->

## 一、案例背景：Notion 类产品的技术复杂度

为什么选 Notion 类产品做案例？因为它足够复杂，能暴露 AI 协作的所有痛点。

```text
┌─────────────────────────────────────────────────────────┐
│ Notion 类产品核心技术栈 │
│ │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Block Model │ │ CRDT │ │ Permission │ │
│ │ (块模型) │◄──►│ (协作引擎) │◄──►│ (权限系统) │ │
│ │ │ │ │ │ │ │
│ │ - 扁平化存储 │ │ - Yjs/Automerge│ │ - RBAC + │ │
│ │ - 类型注册表 │ │ - 冲突解决 │ │ 继承链 │ │
│ │ - 拖拽排序 │ │ - 离线同步 │ │ - 分享链接 │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ │
│ │ │ │ │
│ └──────────────────┼──────────────────┘ │
│ ▼ │
│ ┌─────────────────────────┐ │
│ │ 跨域耦合（高爆炸半径） │ │
│ │ 改块模型 → 影响协作 │ │
│ │ 改权限 → 影响同步 │ │
│ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**核心挑战**：
- **块模型**：Notion 的灵魂。支持嵌套、拖拽、30+ 类型扩展。架构决策影响全局。
- **CRDT 协作**：多人实时编辑。冲突解决策略必须一致，否则数据损坏。
- **权限系统**：页面级、块级、分享链接、继承链。安全红线。

这三个领域高度耦合。改块模型可能破坏协作，改权限可能影响同步。**AI Agent 在这种环境下，如果没有 Harness 约束，就是拿着火把在火药库跑步。**

团队现状：
- 5 人：Hugo（TL/Architect）、Alice（编辑器/块模型）、Bob（协作/同步）、Charlie（前端/UX）、Dave（后端/权限）
- 痛点：新人上手慢（2 周）、PR 返工率高（60%）、Agent 越界频繁、知识在老王脑中

## 二、组织层：从 Org Chart 到 Execution Graph

### 2.1 5 人团队的 Execution Graph

Hugo 做的第一件事：**废除传统的"前端/后端"分工，建立 Execution Graph**。

```text
┌─────────────────────────────────────────────────────┐
│ Hugo (Architect / TL) │
│ 不写业务代码 │
│ 职责： │
│ 1. 定义"什么叫好"（SOP、判据、验收标准） │
│ 2. 集成 Triage（分析 Agent 失败 → 沉淀知识） │
│ 3. 知识治理（成熟度评审、衰减、冲突解决） │
│ 4. Agent 名册管理（权限边界、监督者） │
└────────────┬──────────────────────────┬──────────────┘
 │ │
 ┌─────────▼─────────┐ ┌──────────▼──────────┐
 │ Domain Cell A │ │ Domain Cell B │
 │ (Alice + Charlie)│ │ (Bob + Dave) │
 │ Own: 编辑器/块模型│ │ Own: 协作/权限/同步 │
 │ + UX/前端渲染 │ │ + 后端 API/存储 │
 └─────────┬─────────┘ └──────────┬──────────┘
 │ │
 └──────────┬───────────────┘
 │
 ┌─────────▼─────────┐
 │ Agent Platform │
 │ (共享基础设施) │
 │ - Runtime 标准 │
 │ - 权限拦截器 │
 │ - 日志/可观测 │
 │ - 评估 Harness │
 └───────────────────┘
```

**关键变化**：

| 维度 | 传统分工 | Notion 团队的 Execution Graph |
|:---|:---|:---|
| 最小单元 | 前端/后端角色 | Domain Cell（Own outcomes） |
| 沟通模式 | 需求评审 → 接口对齐 → 联调 | 成果评审（Agent 生成，Architect 判断） |
| 核心角色 | Manager（分配任务） | Architect（定义标准 + 知识翻译） |
| 重组成本 | 换人需 1 个月交接 | 改 Cell 配置，周级调整 |

### 2.2 Architect：最高杠杆率角色

在这个团队中，Hugo 作为 Architect，**不写业务代码**。他的杠杆率来自：一份 SOP/判据 → N 个 Agent 复用。

以"新增代码块"任务为例，Hugo 做了什么？

**Before（人治）**：
- 小李问 Hugo 架构设计
- Hugo 口述 30 分钟
- 小李记笔记，但漏了关键点
- PR 打回，Hugo 再讲一遍

**After（Harness）**：
- Hugo 编写 `block-model-architecture.md`（decision 条目）
- 配置 `@editor-agent` 在"新增块类型"决策点自动查询
- Agent 生成代码时，自动遵循扁平化方案
- PR 一次通过

Hugo 的时间从"重复讲解"变为"一次性翻译隐性知识"。**Architect 的本质，是将团队 Know-how 翻译为 AI 可消化的结构化知识。**

### 2.3 Ego 的边界：执行 vs 创新

阿里文章强调区分两类 Ego。在 Notion 团队中：

| 任务类型 | 示例 | 治理策略 |
|:---|:---|:---|
| **执行类** | 新增代码块、修复渲染 bug、写单元测试 | 全透明 + Agent 主导 + 杀防御性 Ego |
| **创新类** | 设计新的 AI 摘要交互、重构 CRDT 引擎 | 半私密空间 + 保护生产性 Ego + 人主导 |

**关键洞察**：CRDT 引擎重构是创新任务，需要 Bob 凌晨 2 点的执着和反复试错。这种"数月级持续在乎"，AI 做不到。AI 擅长执行已知模式，人擅长探索未知边界。

## 三、资产层：team-knowledge.git

### 3.1 知识库目录结构（Notion 案例）

Hugo 建立了独立的 `team-knowledge.git` 仓库。为什么独立？因为项目会归档，但块模型、CRDT 策略、权限规则是跨项目的永恒资产。

```text
team-knowledge.git/
├── knowledge-catalog.md # Agent 查询入口
├── .knowledge-config.yaml # 团队配置
│
├── team-conventions/ # Layer 0-T（团队宪法）
│ ├── commit-style.md
│ ├── pr-review-rules.md
│ └── agent-onboarding-checklist.md
│
├── tech-wiki/ # Layer 1（跨项目技术）
│ ├── flat-vs-nested-storage.md # [decision] [proven]
│ ├── crdt-conflict-strategies.md # [process] [verified]
│ └── postgres-jsonb-indexing.md # [pitfall] [proven]
│
├── biz-wiki/ # Layer 2（Notion 业务领域）
│ ├── block-model/
│ │ ├── architecture.md # [decision] [proven]
│ │ ├── type-registry.md # [model] [proven]
│ │ └── drag-drop-sorting.md # [process] [verified]
│ ├── collaboration/
│ │ ├── yjs-integration.md # [process] [verified]
│ │ └── offline-sync.md # [guideline] [draft]
│ └── permission/
│ ├── rbac-model.md # [model] [proven]
│ └── share-link-security.md # [pitfall] [verified]
│
├── project-profiles/ # Layer 3（项目级）
│ └── notion-clone/
│ ├── tech-stack.md
│ ├── known-debt.md
│ └── agent-roster.md
│
└── contributions/ # 暂存区
 └── conflicts/
```

### 3.2 核心知识条目：Block Model Architecture

这是团队最重要的 decision 条目。它解决了"嵌套 JSON vs 扁平化"的架构争论，并记录了完整的决策过程和证据。

```markdown
---
id: km-0042
type: decision
maturity: proven
domain: block-model
contributors: [hugo, alice]
validated_in: [notion-clone, mobile-app]
last_used: 2026-05-10
---

# Block Model Architecture Decision

## Context
Notion 类产品核心是块模型。需支持嵌套、拖拽、30+ 类型扩展、多人协作。

## Decision
采用 **扁平化存储 + parent_id 树形重建**，而非嵌套 JSON。

## Rationale
1. **嵌套 JSON 的致命缺陷**：
 - 局部更新需重写整棵树（CRDT 冲突率 12%）
 - 无法增量同步（离线场景灾难）
 - 数据库索引失效（JSONB 深层查询慢 10x）
2. **扁平化优势**：
 - 每个块独立文档（CRDT 友好，冲突率降至 0.3%）
 - 增量同步（只传变更块）
 - 树形重建在客户端完成（<5ms for 1000 blocks）

## Pitfalls（已知陷阱）
- ⚠️ **循环引用**：parent_id 必须写入层拦截（见 postgres-jsonb-indexing.md）
- ⚠️ **子树移动**：批量更新 parent_id 需事务保证一致性
- ⚠️ **孤儿块**：删除父块时需级联处理（软删除 + 定时清理）

## Evidence
- 2026-03: 嵌套方案导致协作冲突率 12% → 扁平化后降至 0.3%
- 2026-04: mobile-app 复用此决策，零适配成本
- 2026-05: Agent 生成代码时，查询此条目后一次通过率从 30% → 85%
```

**为什么这个条目值钱？**
- 它记录了 **失败经验**（嵌套方案的 12% 冲突率），这是新人不可能猜到的
- 它有 **数据支撑**（Evidence），不是主观判断
- 它关联了 **其他知识**（pitfalls 指向 postgres-jsonb-indexing.md）
- 它被 **跨项目验证**（notion-clone + mobile-app），所以是 `proven`

### 3.3 3D 架构与自动衰减

腾讯文章的 3D 架构在这个团队中落地为：

**维度 1：存储层**
- Layer 0-T：团队规范（Commit 标准、PR 规则）
- Layer 1：跨项目技术（扁平化存储、CRDT 策略）
- Layer 2：Notion 业务（块模型、协作、权限）
- Layer 3：项目特定（技术栈、已知债务）

**维度 2：知识类型**
- `model`：块类型注册表、权限 RBAC 模型
- `decision`：扁平化 vs 嵌套、Yjs vs Automerge
- `guideline`：离线同步最佳实践、分享链接安全
- `pitfall`：循环引用、孤儿块、JSONB 索引陷阱
- `process`：拖拽排序算法、CRDT 冲突解决流程

**维度 3：成熟度 + 自动衰减**

```text
draft（新，单来源）
 ↓ （在 1 个工作流中成功引用）
verified（单项目验证）
 ↓ （在 ≥2 个不同项目验证）
proven（成熟/可信）

衰减规则：
- proven 12 个月未使用 → verified
- verified 6 个月未使用 → draft
- draft 未使用 + Lint 标记 → 归档
```

**为什么衰减重要？** Notion 团队曾有一个 `draft` 条目推荐使用 Automerge，但后来团队全面迁移到 Yjs。如果没有衰减，Agent 可能查询到过期建议，生成错误代码。衰减机制确保 **只有被持续验证的知识保持高置信度**。

## 四、工程层：Harness 工作流 = 知识载体

### 4.1 三通道生命周期（Notion 场景）

Harness 不是"让 AI 写代码更快"，而是 **让知识在工作流中流动**。

```text
INIT (Pull) → Execution (Consume) → ARCHIVE (Extract & Promote)
```

**场景重现**：小李再次接到任务："新增一个代码块类型，支持语法高亮和行号。"

#### 通道 1：INIT（知识注入）

小李触发 `agent-init` workflow，输入 `domain: block-model`。

```yaml
# .github/workflows/agent-init.yaml
name: Agent Session Init
on:
 workflow_dispatch:
 inputs:
 task_type: {type: choice, options: [feature, bugfix, refactor]}
 domain: {type: string}

jobs:
 init:
 runs-on: ubuntu-latest
 steps:
 - name: Pull knowledge repo
 run: |
 git clone ${{ secrets.KNOWLEDGE_REPO }} /tmp/knowledge
 cd /tmp/knowledge && git pull origin main

 - name: Inject block-model knowledge
 if: inputs.domain == 'block-model'
 run: |
 # 只注入 block-model 相关知识，而非全量知识库
 cat /tmp/knowledge/biz-wiki/block-model/*.md >> $GITHUB_STEP_SUMMARY
 cat /tmp/knowledge/tech-wiki/flat-vs-nested-storage.md >> $GITHUB_STEP_SUMMARY

 - name: Load Agent roster & permissions
 run: |
 cat /tmp/knowledge/project-profiles/notion-clone/agent-roster.md
 # 输出：@editor-agent 可读写 src/editor/，禁止修改权限模型
```

**关键**：按需注入，而非全量推送。全量推送 = 噪声大 + Token 贵 + Agent 迷失。

#### 通道 2：Execution（决策点查询）

`@editor-agent` 开始生成代码。在关键决策点，它 **主动查询知识库**。

```python
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class KnowledgeEntry:
 """知识库条目"""
 id: str
 type: str # model | decision | guideline | pitfall | process
 maturity: str # draft | verified | proven
 decision: str
 pitfalls: list[str]
 last_used: datetime


class KnowledgeQuerier:
 """Agent 在决策点按需查询知识库（Notion 场景）"""

 def __init__(self, knowledge_dir: Path, budget: int = 3):
 self.knowledge_dir = knowledge_dir
 self.budget = budget
 self.queries_used = 0

 def query(self, decision_point: str, context: str) -> Optional[dict]:
 """
 Notion 场景决策点查询：
 - "新增 block 类型" → 查询 block-model/architecture.md
 → 获取：扁平化方案 + 循环引用陷阱
 - "实现拖拽排序" → 查询 block-model/drag-drop-sorting.md
 → 获取：分数索引算法 + 边界条件
 - "修改权限" → 查询 permission/rbac-model.md
 → 获取：继承链规则 + 分享链接安全红线
 """
 if self.queries_used >= self.budget:
 return None # 预算耗尽，Agent 自行判断（或请求人类介入）

 self.queries_used += 1

 # 1. 查 catalog 定位文件
 catalog = self._load_catalog()
 target_file = catalog.match(decision_point, context)

 if not target_file:
 return None

 # 2. 加载知识条目
 entry = self._load_entry(target_file)

 # 3. 返回结构化知识（非全文）
 confidence = self._calc_confidence(entry)
 
 # 低置信度强制人工确认
 if confidence < 0.5:
 return {
 "decision": entry.decision,
 "pitfalls": entry.pitfalls,
 "maturity": entry.maturity,
 "confidence": confidence,
 "action": "HUMAN_DRI_CONFIRM_REQUIRED", # Harness 拦截
 }
 
 return {
 "decision": entry.decision,
 "pitfalls": entry.pitfalls,
 "maturity": entry.maturity,
 "confidence": confidence,
 }

 def _calc_confidence(self, entry: KnowledgeEntry) -> float:
 """基于成熟度 + 最近使用计算置信度"""
 base = {"draft": 0.3, "verified": 0.6, "proven": 0.9}
 days = (datetime.now() - entry.last_used).days
 
 # 时间衰减因子
 if days < 30:
 decay = 1.0
 elif days < 90:
 decay = 0.8
 elif days < 180:
 decay = 0.6
 else:
 decay = 0.3
 
 return base[entry.maturity] * decay

# generated by hugo AI
```

**在"新增代码块"任务中发生了什么？**

1. Agent 准备生成块模型代码
2. 触发决策点："如何存储块结构？"
3. 查询 `block-model/architecture.md`
4. 获取：`proven` 扁平化方案 + 循环引用陷阱 + 置信度 0.9
5. **Agent 自动生成扁平化代码，并内置循环引用检测**
6. 不再踩坑，不再越界修改权限

**对比 Before**：Agent 不知道架构决策 → 生成嵌套 JSON → CI 失败 → 返工 3 轮。
**After**：Agent 查询 proven 知识 → 生成正确方案 → 一次通过。

#### 通道 3：ARCHIVE（知识提取 & 提升）

PR 合并后，`@archiver` Agent 自动执行：

```yaml
# .github/workflows/agent-archive.yaml
name: Knowledge Archive & Promotion
on:
 pull_request:
 types: [closed]
 branches: [main]

jobs:
 archive:
 if: github.event.pull_request.merged == true
 runs-on: ubuntu-latest
 steps:
 - name: Extract knowledge from PR
 uses: ai/archiver-action@v1
 with:
 pr_number: ${{ github.event.pull_request.number }}
 knowledge_repo: ${{ secrets.KNOWLEDGE_REPO }}
 # Archiver 自动执行：
 # 1. 分析 PR diff：发现新增了"行号渲染逻辑"
 # 2. 提取 guideline："代码块行号需考虑折叠状态"
 # 3. 提取 pitfall："语法高亮 Web Worker 需防抖，否则主线程卡顿"
 # 4. 标记为 draft，写入 contributions/

 - name: Run promotion logic
 run: |
 # 自动提升判断
 # Q1: 是否 Notion 特有？ → 是，留在 biz-wiki/block-model/
 # Q2: 是否通用技术？ → Web Worker 防抖是通用 → 提升到 tech-wiki/
 python scripts/promotion_check.py

 - name: Auto-decay check
 run: |
 # 检查成熟度衰减
 python scripts/decay_check.py

# generated by hugo AI
```

**闭环完成**：小李的任务不仅交付了代码，还沉淀了 2 条新知识（行号渲染 guideline + Web Worker pitfall）。下次其他成员做类似任务时，Agent 会自动查询这些知识，避免重复踩坑。

### 4.2 Agent 名册与权限治理

Notion 团队的 Agent 名册是治理起点：

```markdown
---
# Agent 名册 - Notion Clone
updated: 2026-05-14
---

| Agent ID | 职责 | 权限边界 | 监督者 | 状态 |
|:---|:---|:---|:---|:---|
| `@editor-agent` | 块操作、类型注册、渲染 | 读写 `src/editor/`，**禁止** 修改 `src/permission/` | alice | active |
| `@collab-agent` | CRDT 同步、冲突解决 | 读写 `src/collab/`，只读 `src/permission/` | bob | active |
| `@permission-agent` | 权限校验、分享链接 | 读写 `src/permission/`，**禁止** 修改块模型 | dave | active |
| `@test-agent` | E2E 测试、回归 | 读写 `tests/`，只读业务代码 | hugo | active |
| `@archiver` | 知识提取、PR 分析 | 只读 PR，写 knowledge repo | hugo | active |

## 权限纪律
1. 越界自动拦截：`@editor-agent` 修改 `src/permission/` → CI 直接 fail
2. 梯度自治：生产环境写入需人类 DRI 审批
3. 失败可观测：Agent 错误日志聚合到 Grafana，异常模式告警
```

**四大危险不对称** 在 Notion 团队的具体体现：
- **可无限复制**：`@editor-agent` 的错误代码可能被批量应用到 100+ 页面
- **Brilliant yet Brittle**：Agent 能生成完美的语法高亮代码，但可能忘记处理空块边界
- **Compliance-blind**：Agent 默认不关心权限，可能生成越权访问漏洞
- **失败传播极快**：CRDT 引擎的错误会在 3 秒内同步到所有协作者

名册 + 权限拦截器 + 可观测，是应对这些不对称的三道防线。

## 五、复利飞轮：6 个月后的变化

### 5.1 关键指标对比

| 指标 | 基线（Day 0） | 6 个月后 | 变化原因 |
|:---|:---|:---|:---|
| 知识库条目 | 0 | 87 | 每周 2-3 条来自 PR 的有机增长 |
| proven 比例 | 0% | 38% | 跨项目验证 + 月度评审 |
| Agent 查询命中率 | 0% | 78% | catalog 优化 + 知识覆盖核心场景 |
| 人工 PR 干预率 | 60% | 22% | Agent 遵循 proven 知识，一次通过率↑ |
| 新成员上手时间 | 2 周 | 2 天 | 知识库注入 + Agent 引导 |
| 回归缺陷率 | 8% | 1.5% | pitfall 条目拦截已知陷阱 |
| 迭代周期 | 6 周 | 3 天 | 编码 + 对齐 + 返工时间全面压缩 |

### 5.2 复利公式

```text
传统 Notion 团队：
 CRDT 经验 → Bob 脑中 → Bob 休假 → 团队停滞
 新人 → 重新踩循环引用的坑 → 线性增长

Harness Notion 团队：
 CRDT 经验 → crdt-conflict-strategies.md [proven]
 每次迭代 → 沉淀 pitfall/guideline → Agent 命中率↑
 新人 → 注入知识库 → 2 天独立提交 → 指数加速

速度(t) = 基础速度 × (1 + 知识命中率) ^ t
6个月后：1.78^6 ≈ 32x（理论上限）
实际：8-12x（考虑衰减、新场景、模型限制）
```

### 5.3 冷启动路径

Notion 团队的冷启动经验：

**Week 1-2：基线建立**
- 初始化 `team-knowledge.git`
- Hugo 手动编写 3 条核心 decision（块模型、CRDT、权限）
- 建立 Agent 名册 + 权限拦截器
- `@knowledge-builder` 扫描代码库，提取 10 条 draft pitfall

**Week 3-4：第一个闭环**
- 选择"新增代码块"作为试点场景
- 配置 `@editor-agent` 查询块模型知识
- PR 合并后触发 `@archiver`
- **验证闭环跑通**（比知识数量重要 10 倍）

**Month 2-3：有机增长**
- 每周新增 2-3 条知识（来自实际 PR）
- Hugo 每周 1 小时 Triage：分析 Agent 失败 → 转化为 pitfall
- 月度成熟度评审：draft → verified → proven

**Month 4-6：复利显现**
- Agent 一次通过率突破 70%
- 新成员 2 天上手
- 迭代周期从 6 周压缩到 3 天

### 5.4 避坑指南（Notion 团队真实教训）

| 陷阱 | 症状 | 解法 |
|:---|:---|:---|
| **知识库变垃圾场** | 50+ draft 条目，无人验证，Agent 查询到过期建议 | 严格预算 + 自动衰减 + Hugo 每周 Triage |
| **Agent 越界修改权限** | `@editor-agent` 为绕过检测，直接改权限逻辑 | 名册声明边界 + CI 权限拦截器（越界直接 fail） |
| **CRDT 冲突策略不一致** | Agent 生成代码使用 Last-Writer-Wins，与团队 CRDT 引擎冲突 | decision 条目明确策略 + 低置信强制人工确认 |
| **蒸馏焦虑** | Alice 担心"教 Agent 越多，自己越可替代" | Hugo 明确：AI 红利 = 扩边界（做更多功能），非缩团队；Alice 晋升 Architect 通道 |
| **Harness 过度工程** | 花 3 周搭框架，0 条知识，团队抱怨 | 从 1 个场景（新增代码块）+ 1 条知识（块模型）开始，闭环优先 |

## 六、终极检验

阿里文章最后提出了一个灵魂拷问：

> "你的公司理解什么是真正难以理解的？这个理解每天都在变深吗？"

对于 Notion 团队，这个问题翻译为：

**如果 Hugo 休假 2 周，Alice 和 Bob 能否靠 Harness + 知识库继续高效交付？**

- **Before**：不能。块模型决策在 Hugo 脑中，CRDT 策略在 Bob 脑中。人不在，团队停滞。
- **After**：能。`block-model/architecture.md` [proven] + `crdt-conflict-strategies.md` [proven] + Agent 自动查询 + 权限拦截器。知识是资产，不随人流失。

腾讯文章给出了更直白的判断：

> "模型会迭代，工具链会更新，工作流会重构。但你的团队在一个特定业务领域积累的领域模型、架构决策、最佳实践、已知陷阱——这些知识是永恒的。"

AI Native 不是"用 AI 写代码更快"。AI Native 是 **让团队的隐性知识显性化、可继承、可复利**。

对于 Notion 类复杂产品，Harness 工程不是可选项，而是生存必需。没有 Harness，AI 就是拿着火把在火药库跑步。有了 Harness，AI 是团队的指数加速器。

**Harness 是手段，知识是护城河，Execution Graph 是组织形态。三者合一，才是 AI Native 研发的完整答案。**

---

你的团队在 AI 落地中遇到过什么"隐性知识缺失"的坑？知识是怎么沉淀的？欢迎留言讨论。

---

## 参考文献

1. 许晓斌，《AI Native 时代 —— 研发组织何去何从》，阿里技术，2026 
 https://mp.weixin.qq.com/s/Xf3C60jCxR4ppMi4HuAnVA

2. 《Harness 不是目的，知识才是护城河》，腾讯技术工程，2026 
 https://mp.weixin.qq.com/s/JV4-oPP0jjsBCZ4tW3Gy1g
