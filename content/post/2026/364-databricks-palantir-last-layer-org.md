---
title: "Databricks 逼近 Palantir，但最后一层藏在组织里"
subtitle: "Databricks Is Closing In on Palantir — But the Last Layer Lives in the Org"
date: 2026-08-23
share_img: "/img/2026/databricks-palantir-last-layer-org.png"
tags: ["enterprise-ai", "ontology", "databricks", "palantir", "organization-design"]
ingested: 2026-08-25
sha256: fc2e7dfa810204b29f381e21463c0776c1d75b407735e370d64db3814a32ae54
---

昨天读到汪小东的一篇长文，标题是《Databricks 正在逼近 Palantir 的核心区》。文章把 Databricks 2026 年的产品拼图摊开看：Genie Ontology、Agent Bricks、Supervisor Agent、Unity AI Gateway、Omnigent、Lakebase——结论是 Databricks 正在从「管理企业数据」走向「理解企业业务」，逼近 Palantir 经营了二十年的战略腹地。

文章最后那句话写得很好：

> 「模型提供智能，但企业需要一个能够承载智能的世界。Ontology，正在成为这个世界的骨架。」

这个判断我完全同意——它和我在 [AI 的竞争变了：未来是上下文的竞争](https://hugozhu.site/post/2026/337-context-is-the-new-battlefield/) 里说的方向完全一致。但读完之后，有一个问题一直挂着我：

**如果 Ontology 是终点，为什么数据资产最多、AI 工程师最密集的 Databricks，走到 Context Layer 就停住了？它缺的到底是什么？**

四天前我在 [Palantir 从本体长到 Agent，我们从 Agent 长回本体](https://hugozhu.site/post/2026/358-palantir-ontology-to-agent-we-grow-back/) 里讨论过 Palantir 的路线。Databricks 的入局，让这盘棋从两家变成了三家。这篇文章在那篇的基础上再往前推一步：三家从三个起点出发，走向同一个终点——而 Databricks 恰好证明了，最难的那一层，从数据侧爬不上去。

[![Databricks Is Closing In on Palantir — But the Last Layer Lives in the Org](/img/2026/databricks-palantir-last-layer-org-thumb.jpg)](/img/2026/databricks-palantir-last-layer-org.png)

<!--more-->

## 一、三方棋局：三个起点，同一个终点

先把三家的路线摆在一起：

| | Palantir | Databricks | 组织平台（钉钉） |
|---|---|---|---|
| 起点 | 业务运营 | 数据基础设施 | 组织协同 |
| 核心资产 | Ontology 建模方法论 + FDE | Lakehouse + Unity Catalog | 组织图谱 + 审批链 |
| 建设方式 | 驻场实施 | 从数据资产推断 | 组织运行中生长 |
| 2026 的动作 | 守住 Operational Layer | Genie Ontology 向上爬 | 数字员工进流程 |

三家的终点是同一个：**一个机器可理解、可操作的企业世界模型**——对象、关系、指标、规则、权限、动作，全部编译成 Agent 可以在其中工作的结构。

汪小东的文章最有价值的地方，是讲清了 Databricks 的动机。过去 Databricks 理解的是 Table、Column、Schema、Pipeline——这些都是 IT 世界的对象。但 Agent 进入企业经营之后，光知道某张表第八列是什么远远不够，它还得知道什么叫活跃客户、Revenue 用哪个口径、库存短缺时允许采取哪些动作。

于是 Genie Ontology 出现了：把 Unity Catalog 里人工治理的语义，和企业的 Dashboard、SQL、Metric View 里的业务知识结合起来，构建一个统一的 Context Layer。

方向完全正确。但请注意这个 Context Layer 的推断来源：**表、查询、报表、指标**。全是数据资产。

这就是问题所在。

## 二、Databricks 缺的那一层：组织语义

汪小东自己在文章里其实已经点破了这个差距，只是没有往深里追：

> 「Databricks 的 Ontology 目前首先是一个 Context Layer，而 Palantir 的 Ontology 已经发展成一套成熟的 Operational Layer。」

Context Layer 回答的问题是：**Agent 应该怎样正确理解企业？**

Operational Layer 回答的问题是：**这个企业世界里，允许发生什么变化？**

两者之间隔着的，不是更多的数据，而是另一类完全不同的知识：

- 「客户」「订单」「库存」的定义——这是 **数据语义**，Databricks 能从表结构和查询模式里推断出来
- 「谁有权限修改授信额度」「什么条件下允许停机」「这个审批需要几级」——这是 **组织语义**，它不存在于任何一张表里

组织语义的源头不在数据仓库，在组织本身：岗位说明书里、审批流配置里、人事系统的权限矩阵里、每一次真实的审批记录里。Palantir 的 Ontology 之所以是 Operational 的，是因为它把 Function、Action、Permission、Workflow 建模了进去——它不只描述企业是什么，还描述企业 **能做什么、谁能做、做了要留什么证据**。

用他文章里的例子：在 Palantir 里，一架飞机不是一行记录，它有型号、位置、状态、维修记录，并且企业可以围绕它定义调度、维修、重新分配、批准、取消这些 **受权限约束的动作**。

这些动作的权限边界，Databricks 从哪里推断？表里没有「谁有权批准取消航班」这个字段。Unity Catalog 治理的是 **数据的访问权限**——谁能读哪张表；而企业真正需要的是 **业务的行动权限**——谁能批这笔钱、谁能停这条线。前者是数据目录，后者是组织制度。

所以 Databricks 的路线有一个结构性缺口：**它拥有数据的事实，但没有行动的授权**。它的 Context Layer 可以告诉 Agent「逾期账款是 300 万」，但无法告诉 Agent「你可以生成催收任务，但修改授信额度必须经过两级审批，审批人是张总」。

而后面那句，才是 Agent 真正进入企业经营的分界线。

## 三、Ontology 的三种建法：实施的、推断的、生长的

把三家的建设方式放在一起看，会发现一个更根本的差异——**Ontology 是怎么来的**：

**Palantir：实施的。** FDE 驻场，用客户的真实数据从零建模，把企业的对象、关系、动作编码进 Ontology。质量最高，成本也最高——汪小东说得对，这是 Palantir 的护城河，但同时也是它的服务半径：驻场模式覆盖的是最大的几百家客户。

**Databricks：推断的。** 从表结构、查询历史、指标定义里自动推断业务语义。成本极低，但推断的上限就是数据资产里有的东西——推断不出权限边界，因为权限边界不在数据里。

**组织平台：生长的。** 这是我四天前那篇的核心论点，Databricks 的入局让我更确信它：工号是身份，组织图谱是关系，审批链是权限边界的活体实现，审计日志是决策证据。这些东西不是建出来的，是几千万家企业每天用审批、考勤、汇报、群聊 **运行出来的**。

三种建法的冷启动成本差着数量级：

| | 建模周期 | 维护方式 | 覆盖半径 |
|---|---|---|---|
| 实施（Palantir） | 月级，驻场 | FDE 持续投入 | 头部大客户 |
| 推断（Databricks） | 自动，但止步于数据语义 | 随数据资产更新 | 已有数据客户 |
| 生长（组织平台） | 第一天就有 | 组织运行自维护 | 所有在平台上的组织 |

汪小东文章里有一句话：「Palantir 的真正护城河，是它已经把企业运行过程的一部分编码进 Ontology 之中。」这句话反过来读更有力——**如果一个平台本身就承载企业的运行过程，那它每天都在自动编码自己的 Ontology，一行代码都不用写**。

## 四、终局收敛，起点决定谁先到

汪小东判断，未来企业软件的抽象会从 Table、Application、Service 变成 Object、Context、Agent、Action。我同意，而且想补充一点：**这四个抽象的权重并不相等**。

Object 和 Context 是知识问题，可以靠数据积累和模型推断逐步逼近。但 Action 是制度问题——它需要身份体系、权限强制、问责链条，这些只能在组织制度里长出来，无法从数据里推断出来。

这恰好呼应了我在 [Agent Spec 是数字员工的劳动合同](https://hugozhu.site/post/2026/357-agent-spec-labor-contract/) 里的推导：Agent 要进入企业，光有智能不够，得有可问责的身份和被强制的边界。身份和边界，正是组织平台的原生资产。

所以三方棋局的走向，我的判断是：

- **Palantir** 继续守住最复杂的运营场景，用 FDE 模式服务头部客户，它的 Operational Ontology 短期内无人能复制
- **Databricks** 会把 Context Layer 做得越来越好，成为企业 AI 的数据底座和语义层，但它会停在「理解企业」这一步，「操作企业」需要它不擅长的东西
- **组织平台** 拿着唯一一份自生长的 Ontology，从数字员工往回长——这正是四天前景那篇文章说的反向路线

汪小东问：「未来企业 AI 的终极平台形态，会不会趋同于 Data + Ontology + Agent + Action？」

我认为会。但赢家大概率不是从 Data 出发的那家——因为这条路走到 Action 就断了。也不是从 Ontology 出发的那家——因为建模成本锁死了它的规模。

**赢家是从 Organization 出发的那家。** 因为 Ontology 最贵的那部分——行动权限和组织身份——只有在组织里才是现成的、活的、自维护的。

模型提供智能，但企业需要一个能够承载智能的世界。而这个世界的第一块基石，不在数据湖里，在组织架构里。

你的企业，Ontology 的哪一部分已经在跑、哪一部分还散落在人脑里？欢迎留言聊聊。
