---
title: "API 友好不等于开发者友好，也不等于模型友好"
subtitle: "Three Levels of Interface Design for the Agent Era"
date: 2026-07-06
tags: ["cli-design", "agent-experience", "developer-experience", "api-design", "dingtalk", "lark", "google-workspace"]
---

上周我让一个 Coding Agent 帮我用飞书发一条群消息。

它读完了 `lark-cli im --help`，看到了 `messages` 子命令，继续往下翻——发现 `messages` 下面只有 `delete`、`forward`、`urgent_app` 这些操作。 **没有 `send`。**

Agent 懵了。发消息这么基础的操作，怎么可能没有？

它又去翻了 raw API 路径 `lark-cli api POST /open-apis/im/v1/messages`，拼了一大坨 JSON body，调通了。但这条路绕过了 CLI 的所有设计——参数校验、身份管理、错误处理——全部自己来。

后来我告诉它：你应该用 `lark-cli im +send`。这个 `+send` 是一个 **shortcut**——飞书 CLI 为高频操作预置的语义快捷方式，比 raw API 路径短得多，也比它好用得多。

Agent 不知道有这回事，因为 `--help` 的输出里没有明显标记 shortcut 的存在。

**这就是「API 友好」和「模型友好」之间的鸿沟。**

[![接口设计三层模型：API 友好 → 开发者友好 → 模型友好](/img/2026/three-levels-interface-design-thumb.jpg)](/img/2026/three-levels-interface-design.png)

<!--more-->

## 三个层次，三种用户

过去十年，开放平台围绕「开发者体验」（DX）做了大量优化。但如果仔细拆解，这些优化其实分布在三个不同的层次，服务于三种不同的用户：

| 层次 | 核心用户 | 设计目标 | 典型形态 |
|------|---------|---------|---------|
| **API 友好** | 系统集成者 | 接口存在、可用、有文档 | REST API + Swagger/OpenAPI |
| **开发者友好** | 人类开发者 | 好用、好理解、好调试 | SDK + 文档 + 示例 + 错误信息 |
| **模型友好** | AI Agent | 可推理、可发现、可预测 | CLI + Schema + Shortcut + 确定性输出 |

大多数平台做到了前两层。但第三层——模型友好——是一个全新的设计空间，大多数团队还没有意识到它的存在。

我在 [钉钉开放平台的第一用户不再是开发者，而是开发者的 Agent](https://hugozhu.site/post/2026/283-agent-experience-as-developer-experience/) 中，用 DWS 的真实踩坑案例说明过这个问题。今天我想更进一步： **不只是说「Agent 需要更好的体验」，而是拆解「模型友好」到底意味着什么。**

## 第一层：API 友好

API 友好是最基础的层次——**接口存在，能被调用，返回结构化数据**。

```text
POST /v1.0/robot/oToMessages/batchSend
Content-Type: application/json
Authorization: Bearer <token>

{
  "robotCode": "dingxxx",
  "userIds": ["user123"],
  "msgKey": "sampleMarkdown",
  "msgParam": "{\"title\":\"Hi\",\"text\":\"hello\"}"
}
```

这个 API 是「友好的」吗？从 API 设计角度看，它是：RESTful、有文档、返回 JSON。但从开发者角度看，它有几个问题：

- `msgParam` 是一个 **JSON 字符串嵌套在 JSON 里**——开发者需要手动序列化两次
- `msgKey` 的可选值（`sampleMarkdown`、`sampleText`、`sampleImageMsg`…）藏在文档深处
- `userIds` 需要的是 `userId` 而不是 `openDingTalkId`——两者的区别是什么？文档里有，但你得去找

API 友好解决的是「能不能调通」，不解决「好不好用」。

## 第二层：开发者友好

开发者友好是在 API 之上做的一层人类体验优化。SDK 是典型代表：

```python
# Python SDK — 开发者友好
from dingtalk_sdk import RobotClient

client = RobotClient(access_token="...")
client.send_message(
    robot_code="dingxxx",
    user_ids=["user123"],
    msg_type="markdown",      # 不再是 JSON 字符串嵌套
    title="Hi",
    text="hello"
)
```

开发者友好的核心是 **降低人类的认知负担**：

- 参数有类型提示（IDE 自动补全）
- 错误有清晰的 message（不是「服务窗会话消息失败」）
- 有示例代码可以直接抄
- 有社区可以问问题

但所有这些优化的前提是： **有一个人类在理解、记忆、积累经验。** 人类会记住「`msg_type` 应该传 `markdown` 不是 `sampleMarkdown`」，下次就不会再犯。人类会在 StackOverflow 上搜到答案。人类能从模糊的错误信息中推理出真正的问题。

Agent 做不到这些。

## 第三层：模型友好

模型友好是为 AI Agent 设计的接口层。它需要解决的不是「人能不能理解」，而是「模型能不能推理」。

我最近深度使用了三个面向企业办公的 CLI 工具——DWS（钉钉）、lark-cli（飞书）、gws（Google Workspace）——它们分别代表了三种不同的模型友好设计思路。放在一起比较，可以看到模型友好的几个关键维度。

### 维度一：语义压缩——Shortcut 模式

**lark-cli 做了一件聪明的事：用 `+shortcut` 把多步 API 调用压缩成一个语义操作。**

```text
# Raw API 路径（Agent 需要理解 5 个参数和嵌套 JSON）
lark-cli im messages create --chat-id oc_xxx \
  --msg-type text --content '{"text":"hello"}'

# Shortcut（Agent 只需要理解 2 个参数）
lark-cli im +send --chat-id oc_xxx --text "hello"
```

Shortcut 的本质是 **语义压缩**：把一个 API 级别的操作（需要理解参数结构、消息类型、内容格式）压缩成一个意图级别的操作（「发消息」）。

这对 Agent 的价值是巨大的。Agent 的推理窗口有限，每多一个需要理解的参数，就多一个可能出错的推理步骤。Shortcut 减少了推理链条的长度，也减少了出错的概率。

lark-cli 的 `--help` 头部就声明了这个模式：

```text
AGENT QUICKSTART (driving this as an agent? start here):
    Browse commands:  lark-cli <domain> --help
    Prefer a +shortcut over the raw API resource when one matches the task.
```

这行 `AGENT QUICKSTART` 是我见过最直接的模型友好设计——**它在告诉 Agent：从这里开始，优先用 shortcut。**

### 维度二：Schema 自省——调用前推理

**gws 做了一个 Agent 特别需要的东西：`schema` 命令。**

```text
$ gws schema drive.files.list

description: Lists the user's files.
httpMethod: GET
parameters:
  corpora:
    description: Specifies a collection of items...
    type: string
    required: false
  q:
    description: A query for searching files...
    type: string
    required: false
  pageSize:
    description: Maximum number of files to return...
    type: integer
    required: false
```

Agent 在调用 API 之前，先跑一次 `schema`，拿到参数的类型、描述、是否必填。然后基于这些信息推理出正确的调用方式。

这和人类开发者「先看文档，再写代码」的流程完全一致——只是 Agent 看的是 schema 而不是文档。

**关键区别**：文档是给人看的（有上下文、有示例、有措辞），schema 是给模型看的（结构化、确定性强、无歧义）。

### 维度三：确定性输出——Agent 的管道基础

**三个 CLI 都支持 `--format json`，但做得好不好差异很大。**

```text
# gws：确定性输出做得最好
$ gws drive files list --params '{"q":"name=test"}' --format json
{"files": [{"id": "abc", "name": "test", "mimeType": "text/plain"}]}

# dws：也支持 JSON，但有些命令的输出结构不一致
$ dws contact user search --query "张三" --format json
{"result": [...], "success": true}

# lark-cli：支持 --jq 过滤，这对 Agent 非常有用
$ lark-cli contact users list --jq '.items[] | .name'
```

确定性输出是 Agent 管道的基础。Agent 的推理链条是：调命令 → 解析输出 → 推理下一步。如果输出格式不稳定，整个链条就断了。

lark-cli 的 `--jq` 支持是一个加分项——Agent 可以直接在命令里做输出过滤，不需要额外解析 JSON。这减少了推理步骤，也减少了出错概率。

### 维度四：风险分级——Agent 的安全护栏

**lark-cli 在每个命令的 `--help` 里标注了风险级别：**

```text
Risk: read | write | high-risk-write
      high-risk-write needs --yes, only after the user confirms.
```

这是一个精妙的设计：Agent 在调用之前就知道这个操作的风险级别。如果是 `high-risk-write`，Agent 应该先向用户确认，而不是直接执行。

DWS 也有类似的设计（`-y / --yes` 跳过确认），但没有在 `--help` 里显式标注风险级别。Agent 只能靠操作名称推理风险（`delete` 显然是高风险），而不是靠 CLI 的显式声明。

**对 Agent 来说，显式声明 > 隐式推理。** 因为推理有失败的概率，声明没有。

### 维度五：错误信息——Agent 的调试线索

这是三个 CLI 差距最大的维度。

```text
# DWS：误导性错误（#283 案例）
错误：发群服务窗会话消息失败
真实原因：缺少 --title 参数

# gws：结构化错误
{"error": {"code": 404, "message": "File not found", "status": "NOT_FOUND"}}

# lark-cli：带分类的错误
{"ok": false, "error": {
  "type": "validation",
  "subtype": "invalid_argument",
  "message": "unknown subcommand \"+help\"",
  "hint": "run `lark-cli im --help`"
}}
```

lark-cli 的错误格式是最模型友好的：`type` 和 `subtype` 让 Agent 可以程序化地判断错误类别，`hint` 直接告诉 Agent 下一步该做什么。

DWS 的错误是最不模型友好的——「发群服务窗会话消息失败」这个错误信息对人类来说都需要推理（「服务窗是什么？跟我发消息有什么关系？」），对 Agent 来说几乎无法处理。

## 对比总结

| 维度 | DWS（钉钉） | lark-cli（飞书） | gws（Google） |
|------|-----------|-----------------|--------------|
| **语义压缩** | ❌ 无 shortcut | ✅ +shortcut 模式 | ❌ 无 shortcut |
| **Schema 自省** | ❌ 无 schema 命令 | ✅ schema 命令 | ✅ schema 命令 |
| **确定性输出** | ✅ JSON 输出 | ✅ JSON + --jq | ✅ JSON + --format |
| **风险分级** | ⚠️ --yes 但无显式标注 | ✅ read/write/high-risk 标注 | ❌ 无风险标注 |
| **错误信息** | ❌ 误导性错误 | ✅ type + subtype + hint | ⚠️ 结构化但无 hint |
| **Agent 引导** | ❌ 无 | ✅ AGENT QUICKSTART | ❌ 无 |
| **Dry-run** | ✅ --dry-run | ✅ --dry-run | ❌ 无 |

没有一个是完美的。lark-cli 在语义压缩和风险分级上领先，gws 在 schema 自省上做得最好，DWS 的 JSON 输出和 dry-run 基础能力到位但缺乏上层设计。

## 模型友好的设计原则

从这三个 CLI 的对比中，可以提炼出模型友好设计的六条原则：

**一、语义压缩优于参数暴露。** Agent 的推理窗口有限。能用一个 shortcut 表达的操作，不要让 Agent 拼五个参数。lark-cli 的 `+send` 比 raw API 的 `messages create --msg-type text --content '{「text」:「...」}'` 好一个数量级。

**二、Schema 先于文档。** Agent 不看文档，它看 `--help` 和 `schema`。把参数的类型、约束、示例放在 schema 里，而不是放在网页文档里。gws 的 `gws schema` 是正确的方向。

**三、显式标注优于隐式推理。** 风险级别、互斥参数、必填条件——这些在文档里用自然语言描述不够，要在 `--help` 和 schema 里用结构化数据显式标注。lark-cli 的 `Risk: read | write | high-risk-write` 是好的范例。

**四、错误信息是可执行的。** 错误不只要告诉 Agent「什么错了」，还要告诉它「下一步做什么」。lark-cli 的 `hint: 「run lark-cli im --help」` 让 Agent 知道该怎么恢复。DWS 的「服务窗会话消息失败」让 Agent 只能重试或放弃。

**五、输出是确定性的管道。** Agent 的输出是下一个 Agent 的输入。JSON 格式、稳定的字段名、可过滤的 `--jq`——这些是 Agent 管道的基础设施。

**六、提供 Agent 入口。** 在 `--help` 的最顶部告诉 Agent：从哪里开始，优先用什么。lark-cli 的 `AGENT QUICKSTART` 段落是一个极低成本但高回报的设计。

## 不是「更好的 CLI」，而是「新的设计维度」

回到开头的问题：API 友好、开发者友好、模型友好，这三者是什么关系？

**API 友好是基础——没有 API 就没有接口。** 但它只解决「能不能调」的问题。

**开发者友好是优化——SDK、文档、示例降低人类的使用门槛。** 但它假设用户会学习、记忆、积累经验。

**模型友好是一个新的设计维度——它假设用户不会学习、不会记忆、每次从零推理。** 这正是 Agent 的工作方式。

这三层不是递进替代关系，而是累加关系。一个真正面向 Agent 时代的平台，需要同时做到三层：API 存在且规范（第一层），人类开发者用着顺手（第二层），Agent 能精准推理（第三层）。

在 [钉钉开放平台的第一用户不再是开发者，而是开发者的 Agent](https://hugozhu.site/post/2026/283-agent-experience-as-developer-experience/) 中，我说过开放平台的「第一用户」正在换人。今天我想补充的是：换的不只是用户，还有 **用户理解接口的方式**。

人类靠上下文和经验理解接口。Agent 靠 `--help` 和 `schema` 推理接口。这是根本性的不同，也需要根本性不同的设计。

**你的 CLI 工具，Agent 能用吗？** 不只是「能调通」，而是「能推理出正确的调用方式」？

试着把你的 `--help` 输出喂给一个 LLM，问它：「根据这些信息，你能正确调用这个命令吗？」如果答案是不能——那你的工具对人友好，但对模型不友好。而在 Agent 越来越成为第一用户的 2026 年，这可能是一个越来越昂贵的问题。

---

*你在设计或使用 CLI 工具时，遇到过哪些「对人友好但对 Agent 不友好」的案例？欢迎留言讨论。*
