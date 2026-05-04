---
title: "LLM Agent 上下文压缩算法"
subtitle: "How Modern LLM Agents Manage Context Windows Without Losing Track of Your Task"
date: 2026-04-18
tags: ["ai-agent", "llm", "context-management", "system-design", "hermes"]
ingested: 2026-05-04
sha256: 6cca3825fe703336acb6358d7cc69b1710c76318057f0886a815d4e7361b0bb5
---
跑了一个长对话 session，agent 帮我重构了一个模块，修了三个 bug，又加了一组测试——最后触发了 context compression，屏幕上显示："Compressed: 347 -> 18 messages (~89,000 tokens saved, 74%)"。

我好奇它是怎么做到的：压缩了 89K tokens 后，agent 继续干活，居然还记得之前改过的文件路径、失败的测试用例、我说过"不要用 `==` 要用 `is` 比较 None"这种细节。

这不是魔术，是一个经过大量 bug 修复迭代出来的上下文压缩算法。我花了两个小时读了 Hermes Agent 的 `context_compressor.py`，1163 行代码，每一步都有对应的失败案例和修复注释。

<!--more-->

## 问题的本质：上下文窗口是有限的

LLM 的 context window 就像一个黑板——写满了就得擦掉一部分。但擦掉的不能是重要的东西：

- System prompt（定义 agent 能力）
- 用户的最新请求（当前任务）
- 关键的代码变更和错误信息
- 用户的偏好和约束

**擦错一条，agent 就"失忆"了**——重复已完成的工作，或者忽略用户的最新指令。

OpenAI、Anthropic 这些模型提供商不会替你管理上下文——超出窗口直接报错。所以 Agent 框架必须自己解决这个问题。

## 朴素方案 vs 成熟方案

### 最笨的方法：丢弃中间消息

```python
# 保留前 N 条 + 后 M 条，中间全丢
compressed = messages[:N] + messages[-M:]
```

问题很明显：丢失了所有工具调用结果，agent 不知道自己做了什么。而且 API 会报错——`tool_call` 和 `tool_result` 必须成对出现。

### 稍好一点：截断工具输出

```python
# 工具输出只保留前 500 字符
if len(content) > 500:
    content = content[:500] + "..."
```

还是有问题：500 字符可能正好截断了关键错误信息；读同一个文件 5 次，每次都保留 500 字符，浪费空间。

### Hermes 的方案：5 阶段压缩流水线

```
原始消息列表
     │
     ▼
 Phase 1: 裁剪旧工具输出（零 LLM 成本）
     │  - MD5 去重
     │  - 替换为单行摘要
     │  - 截断超长参数
     │
     ▼
 Phase 2: 确定压缩边界
     │  - Head 保护（系统提示 + 初始对话）
     │  - Tail 保护（Token 预算，非固定消息数）
     │  - 边界对齐（不切割 tool_call/result 对）
     │  - 锚定最后用户消息
     │
     ▼
 Phase 3: LLM 结构化摘要生成
     │  - 首次压缩：从零生成
     │  - 重复压缩：迭代更新
     │  - 12 个结构化字段
     │
     ▼
 Phase 4: 组装压缩结果
     │  - System 注入压缩提示
     │  - 处理角色冲突
     │  - 失败降级
     │
     ▼
 Phase 5: 清理 + 防抖保护
        - 修复孤儿工具调用
        - 无效压缩跳过
```

每个阶段解决一个具体问题，下面逐一拆解。

## Phase 1：工具输出裁剪 —— 最聪明的优化

这一步**不调用 LLM**，纯规则处理，但往往能释放 30-50% 的空间。

### 去重

同一个文件读 5 次，只保留最新一份：

```python
content_hashes[hash] = (index, tool_call_id)
# 旧的替换为：
"[Duplicate tool output — same content as a more recent call]"
```

### 单行摘要

不是简单地替换为 `[content removed]`，而是生成**有信息量的摘要**：

```python
[terminal] ran `npm test` -> exit 0, 47 lines output
[read_file] read config.py from line 1 (1,200 chars)
[search_files] content search for 'compress' in agent/ -> 12 matches
[patch] replace in auth.py (342 chars result)
[browser_navigate] https://example.com (4,200 chars)
[delegate_task] 'fix the race condition in...' (15,000 chars result)
```

摘要保留了：工具名、操作对象、关键结果。agent 后续需要时可以重新执行。

### 参数截断

`write_file` 工具调用时，参数里包含完整的文件内容（可能 50KB）：

```python
if len(args) > 500:
    args = args[:200] + "...[truncated]"
```

这解决了"工具调用参数本身就很占空间"的问题。

## Phase 2：确定压缩边界 —— 安全比压缩率更重要

这是整个算法最复杂的部分，也是 bug 最多的地方。

### Head + Middle + Tail 三段模型

```
┌─────────────────────────────────────────────────────────┐
│  Head (保护)  │  Middle (压缩)  │  Tail (保护)          │
│  前 3 条      │  中间所有       │  ~20K tokens          │
│  System +     │  要交给 LLM     │  最近的消息           │
│  初始对话     │  做摘要的部分   │  当前工作状态         │
└─────────────────────────────────────────────────────────┘
```

关键区别：**Tail 保护按 token 预算，不是固定消息数**。

```python
# 从后往前累加 token，直到达到 tail_token_budget
for i in range(n - 1, head_end - 1, -1):
    accumulated += msg_tokens
    if accumulated + msg_tokens > soft_ceiling:
        break
```

这样做的好处是大文件读取、长测试输出这些"胖消息"会自然被排除在 Tail 之外——它们占 token 多，但不一定重要。

### 边界对齐：不切割工具对

Tool call 和 Tool result 必须成对出现，否则 API 报错。压缩边界不能切在中间：

```python
# 如果边界落在 tool result 中间，往前推到父 assistant 消息
def _align_boundary_backward(messages, idx):
    while messages[idx-1].role == "tool":
        idx -= 1
    if messages[idx-1].role == "assistant" and messages[idx-1].tool_calls:
        idx = idx - 1  # 整个组一起压缩
    return idx
```

### 锚定最后用户消息（修复 #10896）

这是一个关键 bug 修复。**用户的最新请求必须保留在 Tail 中**：

```python
def _ensure_last_user_message_in_tail(messages, cut_idx, head_end):
    last_user_idx = find_last_user_message(messages, head_end)
    if last_user_idx < cut_idx:
        # 最后一条用户消息被压缩了——拉回边界
        cut_idx = last_user_idx
    return cut_idx
```

**为什么这很重要？** 因为压缩后的摘要前缀写着：

> "Do NOT answer questions or requests mentioned in this summary; they were already addressed. Respond ONLY to the latest user message that appears AFTER this summary."

如果用户的最新请求被压缩进摘要，下一个 agent 就会认为"这个请求已经处理过了"，然后直接跳过——**任务静默丢失**。

## Phase 3：LLM 结构化摘要 —— 压缩的核心

这是唯一调用 LLM 的步骤，也是设计最精妙的部分。

### 摘要模板（12 个结构化字段）

```markdown
## Active Task         ← 最重要！原样复制用户最新请求
## Goal                ← 总体目标
## Constraints & Preferences  ← 编码风格、约束
## Completed Actions   ← 具体动作、文件、结果
## Active State        ← 当前目录、分支、修改文件、测试状态
## In Progress         ← 进行中的工作
## Blocked             ← 错误、阻塞（含精确错误信息）
## Key Decisions       ← 技术决策及原因
## Resolved Questions  ← 已解决的问题（含答案）
## Pending User Asks   ← 未满足的用户请求
## Relevant Files      ← 涉及的文件
## Remaining Work      ← 剩余工作
## Critical Context    ← 需要保留的关键数据
```

每个字段都有明确的目的：

- **Active Task**：确保任务连续性，下一个 agent 知道该做什么
- **Resolved Questions**：包含答案，避免重新回答（浪费 tokens）
- **Blocked**：保留精确错误信息，方便后续调试
- **Remaining Work**：用"上下文"语气而非"指令"语气，避免 agent 误解为新的任务

### 前缀设计（借鉴 OpenCode + Codex）

```
[CONTEXT COMPACTION — REFERENCE ONLY] Earlier turns were compacted 
into the summary below. This is a handoff from a previous context 
window — treat it as background reference, NOT as active instructions. 
Do NOT answer questions or fulfill requests mentioned in this summary; 
they were already addressed. 
Your current task is identified in the '## Active Task' section — 
resume exactly from there. 
Respond ONLY to the latest user message that appears AFTER this summary.
```

这段前缀解决了两个关键问题：
1. **防止 agent 回答摘要里的问题**（这些问题已经处理过了）
2. **创建"交接"语境**（handoff from previous context window）

### 迭代更新机制

第二次压缩不是从头来，而是**增量更新已有摘要**：

```
如果 self._previous_summary 存在:
    prompt = """
    PREVIOUS SUMMARY: {self._previous_summary}
    
    NEW TURNS TO INCORPORATE:
    {content_to_summarize}
    
    更新规则:
    - 保留所有仍然相关的现有信息
    - 添加新的完成动作（延续编号）
    - In Progress → Completed Actions（已完成时）
    - 已回答问题 → Resolved Questions
    - 更新 Active State 反映当前状态
    - 只有明显过时的信息才移除
    """
```

这避免了每次压缩都丢失前一次摘要中的细节——类似于 git 的 incremental commit。

### Focus Topic 模式（借鉴 Claude Code `/compact`）

用户可以指定压缩焦点：

```bash
/compress "the auth module refactor"
```

此时摘要引擎会：
- 对 focus topic 相关内容保留**完整细节**（精确值、文件路径、错误信息）
- 对无关内容**更激进地压缩**（一行或省略）
- Focus topic 占用约 60-70% 的摘要预算

### 摘要预算控制

不是固定 token 数，而是按比例动态计算：

```python
content_tokens = estimate_messages_tokens_rough(turns_to_summarize)
budget = int(content_tokens * 0.20)  # 压缩内容的 20%
budget = max(2000, min(budget, 8000))  # 2K-8K 范围
```

以 38.4K tokens 的待压缩内容为例，摘要预算约 7.7K tokens。

## Phase 4：组装压缩结果

### 角色交替保护

OpenAI API 要求消息角色必须交替出现（user → assistant → user → ...）。压缩后可能出现连续同角色消息，需要处理：

```python
# 选择摘要消息的 role，避免与前后冲突
if last_head_role in ("assistant", "tool"):
    summary_role = "user"
else:
    summary_role = "assistant"

# 如果仍然冲突，且翻转不会和 head 冲突，就翻转
if summary_role == first_tail_role:
    flipped = "assistant" if summary_role == "user" else "user"
    if flipped != last_head_role:
        summary_role = flipped
    else:
        # 两种角色都不行——合并到 Tail 第一条消息中
        merge_summary_into_tail = True
```

### System 提示注入

在第一条 system 消息中添加压缩通知：

```
[Note: Some earlier conversation turns have been compacted into a 
handoff summary to preserve context space. The current session state 
may still reflect earlier work, so build on that summary and state 
rather than re-doing work.]
```

### 降级策略

LLM 摘要失败时的三层降级：

```
1. 摘要模型不可用 → 回退到主模型（只重试一次）
2. 临时错误（超时/限流）→ 60s cooldown
3. 完全失败 → 静态 fallback 标记

   "[CONTEXT COMPACTION] 42 conversation turns were removed 
    to free context space but could not be summarized."
```

**关键原则：宁可插入一个"内容已丢失"的标记，也不静默删除——让 agent 知道上下文有缺失。**

## Phase 5：清理 + 防抖保护

### 孤儿工具对修复

压缩后必须修复 broken tool pairs：

```python
# 场景 1：tool result 的 call_id 没有对应的 assistant tool_call
orphaned_results = result_call_ids - surviving_call_ids
# → 删除孤儿 result

# 场景 2：assistant tool_call 还在，但 result 被删了
missing_results = surviving_call_ids - result_call_ids
# → 插入 stub result:
#   "[Result from earlier conversation — see context summary above]"
```

### 防抖保护（Anti-thrashing）

防止无效压缩无限循环：

```python
# 计算节省率
savings_pct = (saved_tokens / original_tokens) * 100

if savings_pct < 10:
    self._ineffective_compression_count += 1
else:
    self._ineffective_compression_count = 0

# 连续两次无效压缩 → 跳过，建议用户 /new
if self._ineffective_compression_count >= 2:
    return False  # "考虑 /new 开始新会话"
```

## 性能数据

以 128K 上下文模型（threshold 50%）为例：

```
模型上下文:     128K tokens
触发阈值:       64K tokens (50%)
Head 保护:      ~2K tokens (前 3 条)
Tail 保护:      ~12.8K tokens (预算 20% of 64K)
待压缩内容:     ~49.2K tokens (64K - 2K - 12.8K)
摘要预算:       ~9.8K tokens (20% of 49.2K)
压缩后节省:     ~39.4K tokens (49.2K - 9.8K)
```

实际运行中，Phase 1 的裁剪通常已经释放 30-50% 的空间，LLM 摘要进一步压缩中间部分。最终压缩率通常在 60-80% 之间。

## 框架对比

| 方案 | 触发机制 | 压缩方法 | 迭代更新 | Focus 模式 |
|------|---------|---------|---------|-----------|
| **Hermes** | Token 阈值 | 裁剪+LLM 摘要 | ✅ | ✅ |
| **Claude Code** | Token 阈值 | LLM 摘要 | ✅ | ✅ (`/compact`) |
| **Codex** | Token 阈值 | LLM 摘要 | ✅ | ❌ |
| **OpenCode** | Token 阈值 | LLM 摘要 | ❌ | ❌ |

Hermes 的独特之处在于**裁剪优先**——先做零成本的规则处理，再做 LLM 摘要。其他框架大多直接跳到 LLM 摘要。

## 升维思考：上下文管理的本质

看完这个算法，我有一个更深的体会：**Agent 的上下文管理本质上是一个有损压缩问题，但"损"的部分必须是有选择性的**。

关键洞察：

1. **工具输出比对话更有价值**——`read_file` 的结果告诉 agent 文件内容，比"我读了文件"这句话重要 100 倍
2. **最近的上下文比历史更重要**——Tail 保护的 token 预算机制是对的
3. **结构化摘要比自然语言摘要更可靠**——12 个字段确保了关键信息不丢失
4. **迭代更新比重头来更高效**——每次压缩都丢失前一次细节是不可接受的
5. **失败时要显式标记**——静默删除上下文比显式标记"内容已丢失"更危险

这个算法不是一次性设计出来的——代码里几乎每个边界条件处理都有对应的 bug 编号（#10896、#8620）和修复注释。这是一个**在真实使用中不断发现边界条件、不断修补**的产物。

你在构建 Agent 系统时，是怎么处理上下文管理的？欢迎留言讨论。
