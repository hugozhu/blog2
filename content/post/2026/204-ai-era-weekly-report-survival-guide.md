---
title: "AI 时代的周报生存指南"
subtitle: "How to feed DingTalk so AI can generate your weekly release report"
date: 2026-05-10
tags: ["ai-productivity", "dingtalk", "project-management", "weekly-report", "dws-cli"]
---

周五下午 5 点，App v2.5.0 刚刚发版。你合上测试报告，长舒一口气，准备迎接周末。

这时，钉钉弹出一条待办：「请提交本周工作周报」。

你打开空白文档，脑子里只有模糊的碎片：周一跟 iOS 吵了架构方案，周三凌晨修了个线上 Crash，周四拉着后端对了三天后的发版清单……具体改了哪些 Bug？阻塞了哪些需求？下周风险在哪？你开始疯狂翻聊天记录、邮件、Jira 看板。半小时过去了，周报还是只有干巴巴的三行：

> 1. 完成 v2.5.0 发版
> 2. 跟进线上问题修复
> 3. 规划 v2.6.0 需求

你的 Leader 看到这份周报，只会觉得你这周「好像没干什么」。但只有你自己知道，这周你协调了 4 个端、拦下了 3 个不合理需求、熬了 2 个夜。

**这不是你的记忆力问题，而是你的日常记录方式出了问题。**

很多人以为 AI 时代来了，只要对大模型说一句「帮我写周报」，它就能自动汇总你的一周。但现实是：AI 不是读心术。如果你在日常工作中留下的都是碎片化、非结构化、缺乏上下文的数据痕迹，AI 能生成的，也只能是那份干巴巴的三行流水账。

高质量周报从来不是周五「写」出来的，而是每天「喂」给系统的。

<!--more-->

## 一、一份高质量的 App 发版周报长什么样？

在讨论「怎么喂」之前，我们先明确目标。对于负责 App 周度发版的研发 PM 来说，一份能真正体现价值、辅助决策的周报，应该是一份 **微型项目仪表盘**。

它至少应该包含以下维度：

| 维度 | 内容要求 | 决策价值 |
|------|----------|----------|
| **发版进度** | 当前版本阶段、提测/发版时间点、延期风险 | 同步里程碑状态 |
| **质量指标** | Bug 收敛曲线、Crash 率、遗留缺陷清单 | 评估发版质量底线 |
| **资源与阻塞** | 跨端依赖阻塞点、人力瓶颈、已升级事项 | 暴露需要 Leader 介入的风险 |
| **关键决策** | 本周砍掉/延期的需求及原因、架构取舍 | 记录项目上下文，避免后续扯皮 |
| **下周计划** | 核心里程碑、预发版清单、高风险项 | 明确下一步聚焦方向 |

看到这份标准，你再回头看那「三行流水账」，差距一目了然。问题不在于你写不出来，而在于 **这些高质量信息散落在不同的系统里，且大多以「不可读」的形式存在**。

## 二、为什么 AI 帮不了你？数据断层分析

让我们拆解一下 PM 日常的数据流向：

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   IM 群聊    │     │   审批/OA   │     │   待办/任务  │
│  (非结构化)  │     │  (孤立事件)  │     │ (缺少上下文) │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────┐
│                  人类大脑 (人工聚合)                  │
│  周五下午靠记忆和翻聊天记录拼凑周报 → 信息丢失 70%    │
└─────────────────────────────────────────────────────┘
```

传统模式下，IM 里的讨论是流式的，审批单是孤立的，待办事项只有标题没有决策背景。AI 面对这些数据时，会遇到三个致命断层：

1. **意图断层**：待办标题写着「跟进登录模块」，AI 不知道这是需求评审、代码 Review 还是线上故障排查。
2. **上下文章断层**：IM 里你说「方案 B 不行，换 A」，AI 看不到前因后果，不知道「为什么换」以及「谁拍板的」。
3. **状态断层**：任务标记为「进行中」，AI 不知道是顺利推进、还是被第三方阻塞、还是等资源到位。

**AI 的推理质量 = 数据质量 × 上下文完整度**。要打破这个断层，我们需要升级日常记录的方式。

## 三、「AI 可读记录」四要素模型

要让 AI 能生成仪表盘级别的周报，你在日常操作中留下的每一条痕迹，都必须满足以下四个要素。我将其总结为 **AIRS 模型** (Actionable, Interlinked, Resolvable, Structured)。

| 要素 | 核心原则 | ❌ 反例 | ✅ 正例 |
|------|----------|--------|--------|
| **意图明确 (Actionable)** | 每条记录有明确目的标签 | 「跟进项目」 | 「[需求评审] v2.6.0 登录重构方案确认」 |
| **上下文完整 (Interlinked)** | 包含背景、决策依据、相关方 | 「已沟通」 | 「与 @iOS负责人 确认：因性能瓶颈，动画方案降级为 Lottie」 |
| **结构化存储 (Resolvable)** | 用对的工具存对的信息 | IM 里讨论需求细节 | 需求文档沉淀结论 + IM 仅做通知 |
| **状态可追踪 (Structured)** | 有明确的进展/阻塞标记 | 「进行中」 | 「阻塞中：等后端 API 联调（预计周二就绪）」 |

这个模型不是让你每天多写小作文，而是 **改变你使用现有工具的习惯**。每次创建待办、更新状态、填写审批意见时，多花 10 秒钟，按照 AIRS 原则填入关键信息。

## 四、为什么是 Markdown？人与 AI 的共同语言

AIRS 模型解决了「记什么」的问题，接下来要解决「用什么格式记」。

答案是：**Markdown**。

在 AI 时代，Markdown 已经不再只是一种轻量级标记语言，它是 **人与 AI 都能高效理解的共同语言**。选择正确的记录格式，直接决定了 AI 能否准确解析你的工作痕迹。

### 格式对比：为什么不是富文本？

| 格式 | 人类可读性 | AI 可解析性 | 结构化程度 | 语义保真度 |
|------|-----------|------------|-----------|-----------|
| **富文本 (HTML/Word)** | 高 | ❌ 低（标签噪音、样式干扰） | 中（依赖样式而非语义） | 低（格式易丢失） |
| **纯文本** | 中 | ⚠️ 中（缺少层级和关系） | 低 | 中 |
| **Markdown** | ✅ 高 | ✅ 高（语义标记清晰） | ✅ 高（标题/列表/表格/代码块） | ✅ 高 |

富文本的问题在于：**它面向渲染，而非语义**。当你用 Word 或富文本编辑器写记录时，加粗、颜色、字体大小这些视觉样式对人类读者很友好，但对 AI 来说，它们只是无意义的 HTML 标签噪音。更糟的是，富文本在不同系统间复制粘贴时，格式经常丢失或错乱，导致信息失真。

Markdown 的优势恰恰相反：**它用极简的语法表达明确的语义结构**。

```text
# 一级标题      → AI 理解：这是文档主题
## 二级标题     → AI 理解：这是子章节
- 列表项        → AI 理解：这是并列关系
| 表格 |        → AI 理解：这是结构化数据对比
`代码`          → AI 理解：这是技术术语或命令
**加粗**        → AI 理解：这是重点强调
```

这种语义清晰性，使得 LLM 在解析 Markdown 时，能够准确识别信息的层级、关系和重要性，而不会被视觉样式干扰。

### 记录系统的 Markdown 化

对于钉钉等记录系统，理想的状态是：**所有文本输入框都支持 Markdown 语法，所有数据导出都提供 Markdown 格式**。

现实中，虽然钉钉文档已经支持 Markdown，但待办描述、审批意见、IM 消息等场景仍然以富文本或纯文本为主。在这种情况下，我们可以采取 **主动 Markdown 化** 的策略：

- **待办描述**：用 Markdown 语法写，即使系统不渲染，AI 也能解析
- **审批意见**：用 `#`、`-`、`**` 等标记结构化信息
- **IM 总结消息**：用 Markdown 格式发结论，便于 AI 抓取
- **文档/日志**：全程 Markdown，这是最自然的场景

**Markdown 是 AI 时代的 ASCII**。就像 ASCII 让不同计算机系统能够交换文本数据一样，Markdown 让人和 AI 能够在同一个文本格式下高效协作。你的记录系统如果能生成人和 AI 都易理解的 Markdown，你就已经赢在了 AI 生产力的起跑线上。

## 五、钉钉各模块的「喂养」实操

作为研发 PM，你每天高频使用钉钉的多个模块。下面是结合 AIRS 模型的具体操作指南：

### 1. IM 群聊：从「信息流」到「结论沉淀」

IM 是最容易丢失上下文的地方。关键讨论结束后，**必须做一步收敛动作**：

- 使用 **「话题」** 功能聚合单次讨论。
- 讨论出结论后，发一条总结消息并 **Pin（置顶）**。
- 格式示例：`【结论】v2.5.0 发版清单锁定。延期需求：3个（详见文档链接）。风险：无。`

这样 AI 在扫描群聊时，可以直接抓取 Pin 消息作为高质量摘要，而不是去解析几百条碎片对话。

### 2. 待办/任务：标题即摘要，备注即上下文

待办是 AI 生成周报的核心数据源。创建和完成待办时，遵循以下规范：

- **标题格式**：`[模块/版本] 动作 - 预期结果`
  - 例：`[v2.5.0] 组织发版评审 - 确认发版清单及回滚预案`
- **描述字段**：关联文档链接、相关人、决策背景。
- **完成备注**：不要直接勾选完成！填写实际结果。
  - 例：`已完成。评审通过，遗留 2 个 P3 Bug 已评估不影响发版，转入 v2.6.0 修复。`

### 3. 审批/OA：决策理由比审批结果更重要

审批单（如发版审批、需求变更审批）是记录 **关键决策** 的最佳位置。

- 在审批意见中，写清 **为什么同意/拒绝**。
- 例：`同意发版。核心指标达标，Crash 率 0.02% < 阈值 0.05%。已知风险：低端机启动耗时增加 200ms，已排期 v2.6.1 优化。`

### 4. 文档/日志：每日 5 分钟进展快照

不要等到周五才写日志。每天下班前花 5 分钟更新项目文档的 **「每日进展」** 区块：

```markdown
## 2026-05-08 进展
- ✅ 完成：iOS/Android 提测，QA 介入
- 🚧 阻塞：后端支付接口延迟交付，已升级至 @技术总监
- 📝 决策：砍掉「暗黑模式」需求，保核心发版时间
```

这种结构化日志，是 AI 生成周报最直接的素材。

## 六、技术实现：用 `dws` CLI 自动聚合周报

当你按照 AIRS 模型在日常系统中留下高质量痕迹后，下一步就是让 AI 自动抓取并生成周报。

钉钉官方开源的 **[DingTalk Workspace CLI (`dws`)](https://github.com/DingTalk-Real-AI/dingtalk-workspace-cli)** 是为此场景量身定制的工具。它统一了钉钉全产品线能力，原生支持 AI Agent 调用，自带 Token 管理和分页处理。

### 1. 数据采集：`dws` 核心命令

安装并登录后（`dws auth login`），你可以用以下命令拉取本周数据：

```bash
# 拉取本周已完成的待办任务
dws todo task list --status done --start-time 2026-05-04 --end-time 2026-05-10 -f json

# 拉取本周审批记录（发版审批、变更审批等）
dws oa approval list --start-time 2026-05-04 --end-time 2026-05-10 -f json

# 拉取本周日志/日报
dws report list --start-time 2026-05-04 --end-time 2026-05-10 -f json

# 拉取日历会议（评估时间分配）
dws calendar event list --start-time 2026-05-04 --end-time 2026-05-10 -f json
```

`dws` 的 `-f json` 参数输出结构化数据，非常适合管道化处理。

### 2. 聚合脚本：从原始数据到周报草稿

下面是一个 Python 聚合脚本示例。它调用 `dws` 命令，解析 JSON 输出，并按项目维度聚类生成周报草稿：

```python
#!/usr/bin/env python3
"""从 dws CLI 输出聚合生成 App 发版周报草稿"""
import subprocess
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

@dataclass
class WeeklyReport:
    """周报数据结构"""
    version: str
    completed_tasks: list[str] = field(default_factory=list)
    key_decisions: list[str] = field(default_factory=list)
    blockers: list[str] = field(default_factory=list)
    next_week_plan: list[str] = field(default_factory=list)

def run_dws(args: list[str]) -> dict[str, Any]:
    """执行 dws 命令并解析 JSON 输出"""
    cmd = ["dws"] + args + ["-f", "json"]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)

def get_week_range() -> tuple[str, str]:
    """获取本周一和周日的日期字符串"""
    today = datetime.now()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return monday.strftime("%Y-%m-%d"), sunday.strftime("%Y-%m-%d")

def generate_release_report(version: str) -> WeeklyReport:
    """聚合各系统数据生成发版周报"""
    start_date, end_date = get_week_range()
    report = WeeklyReport(version=version)
    
    # 1. 拉取已完成待办
    todos = run_dws(["todo", "task", "list", "--status", "done", 
                     "--start-time", start_date, "--end-time", end_date])
    for task in todos.get("list", []):
        title = task.get("subject", "")
        note = task.get("description", "")
        # 提取完成备注中的关键信息
        report.completed_tasks.append(f"- {title}: {note[:50]}..." if note else f"- {title}")
        
    # 2. 拉取审批记录（提取决策）
    approvals = run_dws(["oa", "approval", "list", 
                         "--start-time", start_date, "--end-time", end_date])
    for proc in approvals.get("list", []):
        result = proc.get("result", "")
        if "同意" in result or "拒绝" in result:
            report.key_decisions.append(f"- [{proc.get('title', '')}] {result}")
            
    # 3. 此处可扩展：拉取日志解析阻塞项、拉取日历统计会议时长等
    # ...
    
    return report

if __name__ == "__main__":
    draft = generate_release_report("v2.5.0")
    print(f"📊 {draft.version} 发版周报草稿\n")
    print("✅ 已完成事项:")
    print("\n".join(draft.completed_tasks))
    print("\n📌 关键决策:")
    print("\n".join(draft.key_decisions))
# generated by hugo AI
```

### 3. 让 AI 自动发现能力：`dws schema`

`dws` 最强大的地方在于它的 AI 原生设计。你不需要死记硬背 163 个命令，只需运行：

```bash
dws schema > dws_capabilities.json
```

将生成的 Schema 文件喂给 LLM，AI 就能 **自动发现** 钉钉的所有能力，并根据你的周报需求，动态生成所需的 `dws` 调用链。这就是 Agentic 应用在实际工作流中的落地形态：**人定义目标，AI 发现工具并执行**。

## 七、结语：周报是项目管理的副产品

回到开头的问题：为什么周五写周报那么痛苦？

因为我们把「记录」和「汇报」割裂成了两件事。每天在 IM 里碎片化沟通，周五再靠人脑重新拼凑。这不仅低效，而且必然导致信息失真。

AI 时代的正确姿势是：**把记录融入日常操作，让汇报成为系统的自然产出。**

当你在创建待办时写清意图，在审批时留下决策理由，在文档中更新每日进展，你其实已经完成了 90% 的周报工作。周五下午，你只需要运行一条命令，AI 就会基于这些高质量的结构化痕迹，为你生成一份数据准确、上下文完整、风险清晰的仪表盘周报。

**周报不应该是一项负担，它应该是良好项目管理的副产品。**

你在日常协作中是如何记录关键信息的？有没有尝试过用 AI 自动化生成周报？欢迎留言讨论。
