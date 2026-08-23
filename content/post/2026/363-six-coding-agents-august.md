---
title: "六大 Coding Agent 的八月：相同的去处，不同的路"
subtitle: "Six Coding Agents in August — Same Destination, Different Roads"
date: 2026-08-23
share_img: "/img/2026/six-coding-agents-august.png"
tags: ["ai-agent", "coding-agent", "harness", "agent-ecosystem", "industry-analysis"]
---

想知道一家 AI 公司把赌注押在哪里，别看发布会，看它的 release notes。

上周有两份发布说明摆在一起，对比堪称黑色幽默：Claude Code 的 v2.1.239 版本写了 40 多条变更，跨机器通信、预算上限、企业云适配密密麻麻；同一周，Codex 的 release notes 只有五个字——「Release 0.x.y」，功能演进一个字不提，却日更 162 个二进制资产。

同一个行业，同一个星期，一家把底牌全摊开，一家把底牌全藏起来。发布说明是产品策略的 X 光片：什么功能被做成一等公民、什么被顺手带过、什么被刻意藏起来，全写在里面。

我把六大主流 Coding Agent 的八月发布记录拉了一遍——OpenClaw、Hermes Agent、OpenCode、Claude Code、Codex、DeepSeek Harness——发现一件有意思的事：

**六家公司，朝着几乎相同的方向走，但走的路线完全不同。**

相同的去处暴露了行业共识；不同的路线暴露了各家的底牌。这篇文章把这张 X 光片拆开给你看。数据来自我的 [开发者双周观察（2026.08.23）](https://hugozhu.site/notes/p/6hyGCTqo)。

[![Six Coding Agents in August — Same Destination, Different Roads](/img/2026/six-coding-agents-august-thumb.jpg)](/img/2026/six-coding-agents-august.png)

<!--more-->

## 一、先看六家八月在干什么

| 工具 | 最新版本 | 八月动态一句话 |
|------|---------|----------------|
| OpenClaw | 2026.8.1-beta.2 | Secret 出口绑定目标主机，双引擎原子切换 |
| Hermes Agent | v0.20.5 | 一周 4 连发，Bot Mode 群聊协作协议 |
| OpenCode | v1.18.21 | Subagent 失败可恢复化 |
| Claude Code | v2.1.241 | 跨机器 SendMessage，预算上限 |
| Codex | 0.150.0-alpha.7 | Release notes 空白，日更 alpha |
| DeepSeek Harness | 0.1.1-rc.2 | Web UI 优先，一切皆插件 |

光看这张表还看不出什么。把每家的迭代展开，方向就清楚了。

## 二、五件所有人都在做的事

把六家的迭代放在一起比对，有五个方向是 **至少四家同时在推进** 的——这不是巧合，这是行业共识。

**1. Agent 之间开始互相通信了。**

这是八月最密集的信号。Claude Code 给 Windows 加了 `SendMessage` 和 `ListAgents`——一个 agent 可以跨机器给另一个 agent 发消息，`ListAgents` 能列出在线的 teammates。Hermes 推出 Bot Mode，agent 作为群聊成员协作，支持跨机路由。OpenCode 把失败的 subagent 调用暴露成可恢复的 `task_id`，不再静默返回空结果。OpenClaw 则让一台 Gateway 同时驱动 Codex 和 Claude 双引擎。

多 agent 互操作从概念走进了协议层。这印证了我在 [好的 Runtime 不挑模型](https://hugozhu.site/post/2026/318-harness-not-pick-agent-loop/) 里的判断：harness 的价值不在单个循环跑得多好，而在它能不能成为网络里的一个节点。

**2. 供应链安全成了标配动作。**

OpenClaw 给每个 secret 绑定精确的 HTTPS 目标主机，未绑定就明文外发前直接拦截（fail-closed）；安装任意可执行插件必须 `--force` 确认。Hermes 在 skill 安装时做 NVIDIA SkillEvaluator 的 license 和安全扫描。Claude Code 在组织层面加了策略检查。

skill 和插件的供应链治理，是六家交集最密的地方。原因不难理解：当 agent 能自主执行代码、调用凭证、连接外部系统，**一个恶意 skill 的破坏半径就是一个员工的破坏半径**。我在 [一切皆插件：DeepSeek Harness 真正硬核的是三个细节](https://hugozhu.site/post/2026/348-dsh-three-details-reversible-effects/) 里也观察过类似的设计取向——安全边界正在从「权限管理」变成「默认拒绝 + 显式授权」。

**3. MCP 已经是必选项。**

Hermes 迁移到 MCP 2.x 并支持 stateless 协议，DeepSeek Harness 把 MCP 打包进 Python 运行时，OpenClaw 的 dashboard 本身就是 MCP apps。没有一家还在讨论「要不要支持 MCP」——这个问题已经从议程上消失了。

**4. 多表面覆盖：CLI 只是入口之一。**

Claude Code 对齐了云端会话（插件、plan mode、图片上传在云/桌面/移动三端一致），OpenCode 和 Hermes 都在修桌面端，DeepSeek Harness 干脆把 Web UI 做成了首要上手路径——`dsh` 一启动就开 Web 界面。CLI 是 agent 的出生地，但已经不是唯一的家。

**5. 成本治理开始产品化。**

Claude Code 加了 `--max-budget-usd` 预算上限，成本估算里甚至包含美国专属推理的溢价。Hermes 做了 5 家供应商的免费额度轮转加 failover，零 API key 开箱即用。agent 的用量经济学，开始有产品形状了。

## 三、三条岔路：共识之下的分化

共识说明大家看清了同一个未来。但怎么走到那个未来，六家分成了三条明显的路线。

**分化一：开放度。**

Claude Code 和 Codex 是闭源阵营——但闭源的方式还不一样。Claude Code 的 release notes 是全行业工程密度最高的，单个版本 40 多条变更，企业级修复写得清清楚楚。Codex 的 release notes 则是 **空白的**，只有「Release 0.x.y」，功能演进完全不公开，一周从 0.148 跳到 0.150，全靠 CI 机器人日更 162 个二进制资产。

有意思的是：**空白本身也是信号**。Codex 用日更的发布节奏和生态侧的动作（被 OpenClaw 内嵌为引擎、被 Framer 接入）来传递信息，而不是用文档。它的沙箱安全模型，正是第三方平台愿意内嵌它的原因。

其余四家都是开源深度运营，但运营的侧重不同——这引出第二条分化。

**分化二：架构哲学。**

- **DeepSeek Harness**：「一切皆插件」。基于 Cordis 编程范式构建，把 harness 本身做成可编程基座，配上 ADR 架构决策记录和双语文档体系——工程治理是六家里最重的。它的插件框架底座 cordis 这周还登上了 GitHub trending。
- **Claude Code**：「集成式平台」。跨机器通信、预算管控、云桌面对齐，什么都自己做，做产品级的完整度。
- **OpenCode**：「极简核心 + 可靠性」。release notes 永远是纯修复驱动，不堆功能，只把并行子代理的失败暴露、恢复、权限传播做成一等公民。

三种哲学对应三种赌注：赌「基座让别人长」、赌「端到端自己做」、赌「核心循环足够可靠别人就离不开」。

**分化三：增长策略。**

Hermes 走的是社区闪电战——日级发布（单个窗口 746 个 commits）、零 key 免费层降低尝试门槛，用速度和开放性抢开发者心智。Claude Code 走的是企业纵深——Bedrock、Vertex、Foundry 三大云的全屏渲染器和 SSO 支持，锁定的是付费场景。一个在抢广场，一个在收城堡。

## 四、竞争单位已经变了

把五个共识和三条分化放在一起看，我认为八月这份 X 光片真正暴露的是这件事：

**AI 编程的竞争单位，已经从「单个模型或工具」切换成了「可互操作、可治理的 agent 网络」。**

证据链是这样的：如果竞争单位还是单个工具，那么跨机通信协议、供应链安全、MCP 标准化这三件事就不值得六家同时投入——它们都是「网络属性」的投资，只有在 agent 要成群结队工作的前提下才有回报。六家同时下注，说明这个前提已经是行业内的默认假设。

这对使用者意味着什么？选 harness 的评估维度要变了：

- 过去问：它写代码有多强？
- 现在还要问：**它的产物能不能被别的 agent 消费？它的插件生态有没有治理？它有没有为「多 agent 协同」留接口？**

这也呼应了我在 [模型正在吞噬 Agent 框架](https://hugozhu.site/post/2026/310-models-eating-agent-frameworks/) 里说的趋势的另一面：模型在吞噬单点能力的同时，网络层的治理价值在上升。**单点越强，网络的接口和治理就越值钱**——就像互联网没有让路由器消失，反而让路由器更关键。

## 五、写在最后

回到开头那张版本表。如果你只看版本号，看到的是六个工具的例行更新；把它当 X 光片看，看到的是一整个行业在八月集体调转方向：从「让一个 agent 更强」，转向「让一群 agent 可协作、可信任、可算账」。

六个相同的去处，三条不同的路。明年这个时候回头看，八月大概就是那条分岔线的起点。

你在用哪个？它在这五条共识里补上了几条？欢迎留言聊聊。
