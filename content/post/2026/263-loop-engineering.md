---
title: "Loop Engineering：AI Agent 工程的第五层"
subtitle: "从 Prompt 到 Goal，人从执行者变成终点线定义者"
date: 2026-06-10
tags: ["AI", "Agent", "Loop Engineering", "Harness Engineering", "钉钉"]
---

AI Agent 工程有一个不断演进的层级结构。半年前大家还在讨论 Prompt Engineering，现在已经到了第五层。

<!--more-->

## 五层演进

```
Prompt Engineering          — 你怎么问
  < Context Engineering     — 你喂什么
    < Feedback Loop Engineering — Agent 能不能自检
      < Harness Engineering     — Agent 在什么框架内运行
        < Loop Engineering      — Agent 自己跑到终点
```

每一层不是替代前一层，而是把人的角色往上推一格：

| 层级 | 人的角色 | Agent 的角色 |
|---|---|---|
| Prompt | 写指令 | 执行一次 |
| Context | 喂上下文 | 执行一次 |
| Feedback Loop | 建验证工具 | 执行 + 自检 |
| Harness | 设计跑道（guides + sensors） | 在框架内执行 |
| **Loop** | **定义终点线 + 预算** | **自己找路跑到** |

Daniel Demmel 在他那篇 [Feedback Loop Engineering](https://www.danieldemmel.me/blog/feedback-loop-engineering) 里把前四层讲得很清楚。但 2026 年 4 月 OpenAI Codex 0.128.0 和 Claude Code 的 `/goal` 指令出来之后，第五层正式成型。

## 什么是 Loop Engineering

Loop Engineering 的核心模式来自 Geoffrey Huntley 的 **Ralph Loop**：

> *「The loop's intelligence is in the loop, not in the agent. The agent is fungible. The loop is what makes it autonomous.」*

翻译成工程语言：

```
定义 /goal（终点线）
设置 token budget（成本上限）
↓
Agent 自主迭代：
  执行一步 → 验证结果 → 更新状态 → 继续 or 停止
↓
到达终点 / 预算耗尽 / 卡住了 → 报告
```

Codex 的 `/goal` 实现了五个状态：`pursuing → paused → achieved → unmet → budget-limited`。关键设计是 **每轮用 fresh context**，防止 context rot 和 goal drift——这是长时间 loop 最容易崩的两个点。

Claude Code 的实现类似，`/goal 「all auth tests pass and lint is clean」` 这种声明式目标，agent 跑到满足条件为止。

## 和 Harness Engineering 的区别

Harness = 人设计跑道，Agent 在里面跑。

Loop = 人只定义终点线，Agent 自己找路跑过去。

这不是说 Harness 不重要。好的 Loop Engineering 需要好的 Harness 做底座——验证工具、传感器、安全护栏，这些都是 Harness 的组件。区别在于 **谁决定下一步做什么**。Harness 模式下，workflow 是人编排的；Loop 模式下，agent 根据当前状态自己决定下一步。

## Proxy Signal Collapse

Loop Engineering 最大的坑是 **proxy signal collapse**——agent 用表面信号代替真实完成。

比如一个 agent 说「测试通过了」，但它只跑了单元测试，没跑集成测试。或者说「代码已提交」，但其实提交到了错误的分支。

Codex 的 `continuation.md` 模板专门针对这个问题：

```
- 不接受 proxy signal 作为完成
- 必须 inspect actual files
- 必须 run actual tests
- 必须 verify actual output
```

这跟你在公司里遇到的情况一模一样——下属说「搞定了」，你得问「怎么验证的」。

## 钉钉场景：差旅报销

找一个性价比最高的场景来展开。

### 为什么选这个

| 维度 | 评估 |
|---|---|
| 目标明确 | 表单字段填完 + 校验通过 + 提交成功 |
| 验证天然存在 | 钉钉表单有字段校验、必填项、业务规则 |
| 复杂度适中 | 100k-300k token，¥0.5-1.5 |
| 高频 | 每个员工每周 5-10 次 |
| 痛点真实 | 填表烦、字段多、容易被打回 |

### 实际流程

```
用户：/goal "提交上周杭州出差报销，高铁票 3 张共 ¥1200，
            住宿 2 晚 ¥800，餐补按公司标准"

Iteration 1: 打开报销单模板，识别全部字段
Iteration 2: 从聊天历史/附件提取票据信息
Iteration 3: 填写基础字段（日期、金额、项目）
Iteration 4: 查公司制度计算餐补（¥100/天 × 5 天 = ¥500）
Iteration 5: 上传附件
Iteration 6: 触发钉钉校验 → "项目编码必填"
Iteration 7: 从历史报销记录匹配项目编码
Iteration 8: 重新校验 → 通过
Iteration 9: 提交 → 成功
→ update_goal(achieved)
```

### 性价比

| 对比 | 人工 | Agent Loop |
|---|---|---|
| 时间 | 15-20 分钟 | 2-3 分钟 |
| 打回率 | 15% | <3% |
| Token 成本 | ¥0 | ¥1.2 |
| 用户价值 | — | 省 15 分钟 ≈ ¥25 |

¥1.2 换 ¥25，20x 回报。

### 防止 Proxy Signal Collapse

```yaml
continuation:
  - 必须调用钉钉 API 触发真实校验
  - 校验返回 0 error 才算 achieved
  - 附件必须 verify 文件 ID 存在
  - 不接受 "看起来填完了"
```

## 其他钉钉场景

不展开，但每个都满足 Loop Engineering 的三个前提： **目标可验证、复杂度适中、高频**。

| 场景 | /goal | 验证方式 | Token 预算 |
|---|---|---|---|
| 会议待办闭环 | 「从会议纪要提取 action items 并跟踪到完成」 | 待办状态全部 = done | 500k-1M |
| 群日报收集 | 「收齐今天全部日报并发汇总」 | 全员已交 + 汇总已发 | 200k-500k |
| CRM 更新 | 「更新 A 客户的最新跟进记录」 | CRM 字段已更新 + 下次提醒已设置 | 100k-300k |
| 招聘推进 | 「把候选人 B 推进到二面阶段」 | 面试已安排 + 通知已发 | 300k-800k |
| 审批催办 | 「把超 48 小时未审批的单据催完」 | 全部已 @对应审批人 | 50k-200k |

## 什么时候不该用

Loop Engineering 不是银弹。三种情况别用：

**1. 目标太简单** — 请个假、发条消息，一次调用搞定，不需要 loop。用 loop 是浪费。

**2. 目标太大** — 「帮我做一个完整的项目方案」，这种 goal 太大，token 预算不可控，proxy signal 太多。拆小了再用。

**3. 没有验证手段** — 如果「完成」没有客观标准（「写一篇好文章」），loop 永远不知道该停。

**判断标准：** 能用一条命令验证 done 还是 not done，就适合 loop。不能，就不适合。

## 给 To B 产品团队的建议

**先建 Harness，再上 Loop。**

没有 Harness 做底座就上 Loop Engineering，等于让 agent 在没有护栏的高速公路上自动驾驶。你需要：

1. **验证工具** — 表单校验 API、状态查询 API、文件存在性检查
2. **安全护栏** — token budget 上限、操作白名单、敏感操作确认
3. **状态可观测** — 每轮迭代的决策日志、最终审计报告
4. **优雅退出** — 卡住了能报 unmet，不要死循环烧 token

Codex 的设计值得参考：`update_goal` 是结构化 tool call（不是文本声明），五个状态都有明确的语义，`budget_limit.md` 模板指导 agent 在预算耗尽时优雅退出。

这些做好了，Loop Engineering 在 To B 场景的 ROI 可以非常高。不是因为 model 变强了，而是因为 **loop 把验证成本降到了接近零**。

---

*参考：Daniel Demmel — [Feedback Loop Engineering](https://www.danieldemmel.me/blog/feedback-loop-engineering)；OpenAI — [Codex /goal](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex)；Geoffrey Huntley — Ralph Loop*
