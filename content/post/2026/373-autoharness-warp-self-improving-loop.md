---
title: "AutoHarness：Warp 的 Agent 自我改进循环"
subtitle: "Self-Improving Means Shipping Config, Not Updating Weights"
date: 2026-08-28
share_img: "/img/2026/autoharness-warp-self-improving-loop.png"
tags: ["ai-agent", "self-improvement", "agent-harness", "agent-skills", "claude", "warp"]
---

先看一个反直觉的场景。6 月 12 日，Warp 创始人 Zach Lloyd 的 GitHub 账号向开源 demo 仓库 issue-triage-loop 提交了一个 PR #21。PR 的真正作者不是他，而是一个在 Oz 上运行的 Agent。它做的事很克制：回看 issue #16 到 #20 这 5 次 triage 判断，发现其中 4 次被人类维护者纠正，于是把这些纠正压缩成 3 条可复用的规则，diff 只有 8 行新增、6 行删除，最后提出把 triage Skill 从 v1 升到 v2。

一个 Agent，给自己交了一份只有 14 行的「改进申请」，等人批准。这就是 Anthropic 笔下「self-improving agent」的真实形态——它让人联想到模型在线训练、自动改权重，但讲的并不是这些。我把官方文章、Warp 公开 demo、这个 PR 和当前开源实现放在一起看，结论很清楚：**持续变化的是版本库里的 Skill 与相关配置。** Claude 负责执行任务、归纳反馈和生成候选修改；Git、评测、权限与人审决定修改能否进入生产。

[![Self-Improving Means Shipping Config, Not Updating Weights](/img/2026/autoharness-warp-self-improving-loop-thumb.jpg)](/img/2026/autoharness-warp-self-improving-loop.png)

<!--more-->

## 这套系统想解决什么

Warp 的代码审查、Issue triage 等 Agent 会反复处理相似任务。第一版 prompt 即使覆盖大部分情况，尾部错误仍会制造噪声——内部代码审查 Agent 就被工程师抱怨「评论没用、输出质量低」。团队最初的应对是手工的：根据观察到的失败重写 prompt、补 AGENTS.md。有效，但不 scale，规则还越来越难追溯。

问题的本质是：**反馈会随会话结束而消失。** 某人在 Issue 下纠正了 Agent，这次纠正就留在那个 Issue 里，下一次任务对此一无所知。[让钉钉机器人自己开发自己](https://hugozhu.site/post/2026/293-dingtalk-agent-develops-itself/) 里我验证过这件事的另一面：Agent 只有看见真实使用现场，改进才有原料。Warp 的解法是把「看见」工程化——把团队知识放进文件化 Skill，再让另一个 Agent 定期观察历史反馈，提出小范围修改。一次纠正经过审核与合并后，才会影响未来任务。

## 两个时钟，两个 Agent Loop

任务内环在新 Issue 出现时运行。Agent 加载当前 base Skill，读取 Issue 与仓库，输出分类、标签和评论。公开 demo 还在评论里加了隐藏的版本 marker（`<!-- oz-triage v:1 -->`），让后续纠正能够归因到具体版本。这个细节很关键：没有归因，就没有改进的输入。

改进外环按计划批量运行。它比较 Agent 当时的判断与维护者后来的改标签、重新打开和明确纠正，寻找跨案例重复出现的差异。证据足够时生成最小 Skill diff；证据不足时不改。候选修改进入 PR，人工合并后，下一次任务才加载新版。

[![两个时钟，两个循环](/img/2026/autoharness-two-clocks-thumb.jpg)](/img/2026/autoharness-two-clocks.png)

我更愿意把它称为异步的配置优化与发布系统。任务 Agent 负责当前工作，improver 总结可复用原则，维护者掌握 merge 权。两个时钟分开后，单次噪声不会立刻污染生产规则。这正是它和「犯错当下立刻改规则」式 reflection 的本质区别：**变化的延迟，恰恰是噪声的过滤器。**

## Skill 为什么是合适的改进载体

Skill 是包含说明、元数据、脚本和参考资料的文件目录。Anthropic 采用渐进披露：启动时只暴露名称和描述，匹配任务后读取 SKILL.md，需要时再加载资源。这带来两个好处：

- **修改结果是普通 diff**，可以绑定版本、代码评审和回滚；
- **知识可以分层存放**：稳定契约、仓库经验与确定性脚本各归其位。

我在 [Agent 的 Skill 自进化机制：它是如何自己长记性的](https://hugozhu.site/post/2026/183-agent-skill-self-evolution/) 里写过个人 Agent 层面的 Skill 自进化——那是 Agent 在会话中为自己积累的经验。Warp 往前走了一步：改进对象是团队共享、版本受控的文件，而决定改进是否生效的不是 Agent，是发布流程。

## PR #21 证明了什么

公开 PR #21 是这篇案例最硬的机制证据。PR 描述里的证据表很直白：

| Issue | Agent 当时判断 | 维护者事后动作 | 判定 |
|-------|--------------|--------------|------|
| #16 | `ready-to-implement` | 👍，未改标签 | 正确 |
| #17 | `ready-to-implement` | 👎 + 回复：设计决策有歧义应标 `needs-info` | 错误 |
| #18 | `duplicate` | 改标 `needs-info`：匹配到的是重新播种的旧记录，不是真重复 | 错误 |
| #19 | `duplicate` | 改标 `needs-info`：匹配到已被取代的旧记录，且描述含糊 | 错误 |
| #20 | `needs-info` | 改标 `duplicate`：与仍然开着的 #16 同根因 | 错误 |

5 次判断，4 次被纠正。improver 没有逐条记住五个 Issue，它尝试提炼团队以后还能复用的判断原则。写进 PR 的 3 条规则原文是这样的（每条都附了证据出处）：

> 1. 只有当匹配到的 Issue 真正覆盖同一问题时才标 `duplicate`；永远不要匹配因管理原因（superseded、re-seeded）关闭的 Issue。匹配前先核对候选的状态和关闭原因。（observed: #18、#19 两次维护者改标 duplicate→needs-info）
> 2. 当一个仍然 **open** 的 Issue 已描述相同根因时，优先标 `duplicate`，即使新报告更随意、细节更少——共同根因比缺失的复现信息更重要。（observed: #20 被改标 needs-info→duplicate of open #16）
> 3. 只要还存在未决的设计或范围问题（例如改动是否需要配置项），就不要把 feature request 标为 `ready-to-implement`，即使它列出了验收标准；优先 `needs-info` 并提问。（observed: #17 维护者纠正回复 + 👎）
>

注意第 2 条和第 3 条的方向是相反的：一条教 Agent 更敢判重复，一条教它更谨慎放行。这不是对 5 个案例的机械记忆，而是从纠正里还原出了判断的边界条件。

研究时 PR #21 仍是 OPEN（draft 状态），仓库 main 分支仍加载 v1，公开材料也没有 v2 在 holdout 或线上流量上的结果。也就是说：**它证明 Agent 能生成可审计的候选修改，没有证明这些修改已经部署，更没有证明质量已经提高。** 这个区分很重要——后面谈「缺什么」，正是建立在这上面。

## 当前公开实现增加了哪些护栏

博客配套 demo 是便于理解的简化版本。Warp 当前开源的 oz-for-oss 显示，这个控制面后来变得更严格：

- **确定性采集**：Python 脚本按回看窗口（默认 7 天，计划任务调度）采集带 `triaged` 标签 Issue 的标签变化、reopen 和组织维护者评论，并显式排除 PR；
- **学习目标隔离**：closed-as-duplicate 信号交给单独的 dedupe 回路，避免两个学习目标互相污染；
- **写面收敛**：核心 triage-issue Skill 保持只读，仓库经验只能写入 triage-issue-local companion；runner 在 push 前做 `git diff` 路径检查，越界就终止；
- **证据门槛**：多个 Issue 支持同一模式，或一条非常明确的维护者陈述，才足以触发修改；一次性纠正不够。

对「反馈是错的怎么办」，Warp 官方给的回答也值得抄下来：假设它就是错的——不要让 Agent 盲目接受反馈，要过滤谁的输入算数，并在过滤或终审环节保留人。

让我觉得靠谱的地方正是这些确定性边界。提示词里写「不要越权」只是软约束，**路径白名单、最小 GitHub 权限、人工审批和可回滚版本才是硬控制。**

## 自我改进的准确边界

公开材料没有训练作业、梯度、微调、adapter、checkpoint 或参数发布链路。新知识通过下一次推理加载的 Skill 进入上下文，基础模型权重没有被改写。它也不同于当前会话的 reflection：任务内重试发生在一次 run 中，Warp 的变化要等 PR 合并后才生效。

能变化也不代表会单调变好。反馈可能偏置、冲突或过时；少量样本容易过拟合；新规则可能修好一个失败簇，又让相邻任务退化。

这里还有一个值得正面回答的质疑：改配置也是一种学习，那它和改权重到底有什么本质区别？我的答案是：区别不在「有没有学习」，而在学习这个动作的治理属性。权重更新一旦发生就难以逐条回滚、难以归因到具体案例、难以在生效前被人审；而 Skill diff 天生带版本、带评审、带 revert。Warp 选择的不是更强的学习，而是 **可治理的学习**——在改进速度和可控性之间，它把可控性放在了前面。对团队协作场景，这个排序是对的。

## 真正缺失的是效果闭环

原文给了架构路径、最佳实践和厂商自报的规模数字（80 万月活开发者、56% 的财富 500 强、Warp 内 1000 万 Claude Code 会话等），却没有改进前后的准确率、人工纠正率、成本、延迟、样本量或显著性。最大的缺口是：**候选 Skill PR 缺少公开的固定回归结果。**

我在 [Agent-as-a-Judge：自进化 Agent 的眼睛](https://hugozhu.site/post/2026/200-agent-as-a-judge-self-evolution-evaluation/) 里说过，没有自动化评测的眼睛，自进化就是盲的。Warp 这个案例把这个问题具象化了——管道已经就位，眼睛还没装上。

一条可上线的链路应该经过静态检查、历史失败 replay、未参与改写的 golden holdout、多次 trial、成本预算、人审、canary 和回滚。评测既要看人工改标率和误报漏报，也要看 time to merge、token 与 reviewer 成本。

## 怎么做一个有决策价值的最小实验

我的建议：

1. **固定变量**：模型、harness、权限和任务分布都不变；
2. **样本切分**：从历史运行中选 3 到 5 个高频失败簇，写规则的样本和 holdout 严格分开；
3. **对照**：比较 vN 与 vN+1 的人工纠正率、失败率和成本；
4. **回归**：每个候选 diff 跑语义相关的最小回归，再加一个全局 canary；
5. **止损**：holdout 没有收益，就停止叠规则。

反馈源从明确纠正、maintainer relabel、测试失败等高置信信号开始，并尽早核算减少的返工是否高于 observer 与人工 review 成本。**算不过来账的改进循环，是负资产。**

## 与 Claude Code、Cursor、OpenClaw 的关系

[别配置 Agent 了，给它一个岗位](https://hugozhu.site/post/2026/367-agent-harness-develop-digital-employee/) 里我讨论过 harness 与可持久工件的分工，Warp 这个案例恰好可以放进这个分工里：

| 层 | 代表 | 职责 |
|----|------|------|
| 模型能力 | Claude Platform | 提供推理与归纳 |
| 任务执行 harness | Warp Agent、Claude Code、Cursor Agent、OpenCode | 跑当前任务 |
| 可持久工件 | Skills、Rules、AGENTS.md | 承载可修改知识 |
| 控制面 | Oz、Warp Factories | 调度、轨迹、权限、评分、发布 |

广义 Factories 把 model/harness、context、Skill 与 MCP 可用性都视作可评测旋钮；这篇 triage 案例只能直接证明 Skill 更新。

OpenClaw 当前官方文档也有 self-learning：把对话中的证据转成待处理的 Skill Workshop 提案，不训练模型权重、不直接修改已启用的 Skills、不悄悄改变 Agent 行为，auto 模式下也要过 scanner 门禁。差异在治理与场景：Warp 面向团队 Git 工作流，采用批量慢外环和 PR 人审；OpenClaw 更偏个人或工作区的长期 Agent。

## 总结

Warp 最值得借鉴的设计，是把人类纠正编译成可治理的软件工件：先让任务结果可归因，再聚合高置信反馈；先生成候选 Skill diff，再用评测和人审决定是否发布；合并后才影响下一次运行。

所以，这里的 self-improving 修饰的是 Agent 系统配置，不是 Claude 模型权重。Claude 提供归纳与执行能力，Skill 承载可修改知识，Git 和 eval 决定系统是否真的朝正确方向变化。

接下来值得想的问题是：如果你的团队也有一个每天被人类纠正的 Agent，这些纠正现在流向了哪里？是随会话消失，还是进入了某条可以被审计的发布管道？

你搭过类似的改进循环吗？欢迎留言讨论。
