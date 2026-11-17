---
title: "把数字员工「编译」出来：profile 组装里的静默坑"
subtitle: "Compiling a Digital Employee: The Silent Traps of Profile Assembly"
date: 2026-11-17
share_img: "/img/2026/compiling-digital-employee.png"
tags: ["digital-employee", "dsh", "deepseek-harness", "build-pipeline", "silent-failure", "engineering", "ai-native"]
ingested: 2026-11-17
sha256: dd9e2536fd340df216dcab796ddabe911f5f7b7d95778a82a0290af15229a242
---

> 面向在 Agent harness 上做应用的工程师。你已经会写插件、调 persona。这篇讲一件更朴素的事：**一个员工的定义，是怎么变成一个能跑的进程目录的** —— 以及这一步里那些「违反时不报错」的坑。
>
> 案例来自本仓库：跑在 DeepSeek Harness（dsh）上的钉钉数字员工。入口是 `make build`，实现在 `bin/employee` 的 `build()`。dsh 底座本身的理念与细节，见 [DSH 微内核架构：数字员工的 To B 哲学](https://hugozhu.site/post/2026/368-dsh-microkernel-to-b-philosophy/) 和 [一切皆插件：DeepSeek Harness 真正硬核的是三个细节](https://hugozhu.site/post/2026/348-dsh-three-details-reversible-effects/)；本篇只讲组装的工程。

[![Compiling a Digital Employee: The Silent Traps of Profile Assembly](/img/2026/compiling-digital-employee-thumb.jpg)](/img/2026/compiling-digital-employee.png)

<!--more-->

## 一、为什么叫「编译」

这个项目里没有 tsc、没有 webpack，但有一个货真价实的编译步骤：

```
employees/<name>/   ──make build──▶   var/<name>/   ──make start──▶   dsh 进程
（源：SPEC + patch）                    （产物：profile）
```

把它当编译看，是因为它满足编译的三个性质：

1. **确定性**：同一份源（`_base.patch.yml` + `_runtime.patch.yml` + 员工 `patch.yml` + 锁文件）产出同一个 profile。
2. **单一事实来源**：「这个员工能干什么」只看源，不看产物。产物里改的东西下一次 build 就没了。
3. **产物可丢弃**：`var/<name>/` 整目录 gitignore，删掉重跑 build 即可重建（会话状态除外，那是运行期数据，不是产物）。

第 3 条反过来约束了设计：**凡是必须手工在产物目录里做一次的事，都是 bug。** 后面会看到好几处为此付出的代价。

仓库里其实有三个编译步骤，形状一样：

| 编译 | 源 | 产物 | 入口 |
|---|---|---|---|
| profile 组装 | `employees/` + 插件 | `var/<name>/profile/` | `make build` |
| 知识库索引 | `knowledge/` + manifest | `var/kb/index.json` | `make kb-compile` |
| npm 运行模板 | 已跟踪的公开源文件 | `dist/template/` | `pnpm run build:npm` |

本文主讲第一个，第二个在第八节。

## 二、流水线全貌

`build()` 只有七步，每步都有一段「为什么」的注释，几乎每段都对应一次真实事故：

| 步 | 做什么 | 防的是什么 |
|---|---|---|
| 0 | `pnpm install --frozen-lockfile` 装 dsh 本体 | CI 与本机装出不同版本；原生模块按当前 node ABI 落盘，所以先查 node 版本 |
| 1 | `cat` 三份 patch → `cordis.patch.yml` | 见第三节 |
| 2 | `echo "[]" > cordis.yml` | dsh 每次启动都把它重写成 `[]`，手写内容静默消失 |
| 3 | 按本次 insert 生成 `package.json` | 见第五节 |
| 3b | 复制 `pnpm-workspace.yaml` | profile 是独立 pnpm 项目，少了构建脚本白名单，node-pty 的 spawn-helper 拿不回可执行位，`ctx.subprocess` 静默失效 |
| 4 | 查 dws 登录态，`DWS_PROFILE` 必须唯一 | 见第七节 |
| 5 | 部署专有配置的落地检查 | 见第七节 |
| 6 | 在 profile 目录 `pnpm install` | 不装就是 boot 期 `Cannot find package` |

## 三、`cat` 就是合并

第 1 步的核心只有这么几行：

```bash
{
  cat employees/_base.patch.yml          # 最小攻击面裁剪
  sed "s|__WORKSPACE__|$DSH_HOME|g; …" employees/_runtime.patch.yml   # 事件桥 + 寻址
  sed "s|__WORKSPACE__|$DSH_HOME|g; …" employees/$NAME/patch.yml      # 岗位插件 + persona
  # 可选：~/.dwh/employees/$NAME/patch.yml（用户 overlay，只追加岗位插件）
} > var/$NAME/profile/cordis.patch.yml
```

**三份文件都是顶层 YAML 序列，所以拼接就是合法的合并** —— 不需要 YAML 解析器，也不需要模板引擎。后出现的条目覆盖先出现的，员工可以在自己的 patch 里把基线某项改回来。

这个选择的收益是：组装逻辑一眼看完，没有「合并策略」可以写错。代价也要写清楚：

- **`config:` 是整体替换，不是深合并。** 员工 patch 里给 `system-prompt` 写 `config:`，基线里同一条目的 config 整块被盖掉。每份员工 patch 头上都有这行警告。
- **占位符只有三个**（`__WORKSPACE__` / `__HOME__` / `__PERSONA_EXTRA__`），sed 替换。`__PERSONA_EXTRA__` 现在替换成空 —— 它曾经被静态拼进 persona，后来改成事件桥每次请求现读 runtime.json，保留占位符只为兼容旧 overlay。
- **非 dev 员工的产物会再过一道剥离**：`stripManagementInserts` 按 id 与包名删掉管理类插件。用户在 `~/.dwh` 的 overlay 里手写挂上 `employee-dev`，在这里被剥掉；运行时插件还会再校验一次宿主。安全边界不能只靠「没人会这么写」。

## 四、裁剪是安全边界，而且失败是静默的

`_base.patch.yml` 有 67 条，几乎全是 `{ id: xxx, disabled: true }`：全部 `ui-*`、`tool-bash`、`tool-fs`、subagent / workflow、以及 `agent-presets`。

两条非直觉的依赖：

1. **禁 `agent-presets` 是其余禁用生效的前提。** presets 会 per-session 把一批面向模型的插件补回来；它不关，你禁掉的工具在会话里又出现了。不报错。
2. **两种失败模式响度完全相反：**
 - 写错 `id:` → **静默**。只往没人导出的内存 ring buffer 打一行 `patch: entry ... not found`，你以为禁掉的插件照常运行。
 - `inject:` 依赖不满足 → **响亮**。boot 期 `assertEntriesActivated` 直接拒绝启动。

 推论：禁一个服务提供者，必须把所有 inject 它的插件一并禁掉；而要抓前一种，唯一手段是干跑 —— `make check`（`dsh --dump-config`，干净的运行不打印任何 `not found`）。

> 编译器会对未知标识符报错；这个「编译器」不会。所以 `make check` 不是可选的 lint，是补上缺失的那条编译错误。

## 五、依赖只来自本次 insert

第 3 步生成 profile 的 `package.json`（`lib/profile-package.cjs`）。规则三条：

**① 只 link 本次实际 insert 的插件。** 从组装好的 `cordis.patch.yml` 里解析出 insert 的包名（`lib/patch-inserts.cjs`，认三类：仓库内 `*-plugin`、`@deepseek-ai/*`、第三方 `@scope/name`），只为这些生成依赖。以前整份共享 `plugins/` 目录，结果是每个员工都「能 import」它没挂的插件。第三类没认出来的后果同样静默：insert 了、build 也过了，dsh 启动时才 `Cannot find package`。

**② 用 `link:` 不用 `file:`，且必须是相对路径。**

```js
pluginLocator(profileDir, pluginDir)  // → link:../../plugins/policy-qa
assertNoMachineHome(locator)          // 写了 /Users/… 或 /home/… 直接抛错
```

`link:` 是符号链接，改插件源码 `restart` 即生效；上一代用 `file:`（副本），改完代码重启加载的还是 `node_modules` 里的旧副本，反复咬人。绝对路径则会让产物离开这台开发机就失效 —— 容器里、npm 包里都一样。

**③ 第三方插件显式 pin，兼容性豁免由 build 写。** `@firecrawl/dsh-firecrawl` 的 peerDependencies 写的是另一条 dsh 版本线，装上后 dsh 会默默禁用它（日志一行 `disabling profile plugin row`，进程照常起，`web_fetch` 不存在）。绕过要在 profile 目录写一份精确版本豁免 —— 而 profile 目录是产物。手工 `dsh plugin allow-version` 一次，换机或重建容器就丢，且丢得没有任何报错。所以豁免必须由 build 写。这就是第一节「手工在产物里做一次 = bug」的现场。

## 六、什么 **不** 进编译

编译期能确定的才进编译。下面这些曾经在 build 里，后来都被挪出去了：

| 配置 | 生效方式 | 改完要做什么 |
|---|---|---|
| `patch.yml`、persona、插件启停 | build 时 cat 进 profile | `build` → `reset` → `restart` |
| 插件源码 `plugins/*/*.cjs` | `link:` 符号链接 | `restart` |
| LLM 协议 / 模型 / 地址 | 每次拉起 dsh 前生成 `llm.overlay.yml`，经 `--patch` 传入 | `restart` |
| `channel.json`、`access.json` | 运行期每条事件现读 | 什么都不用做 |
| `personaExtra`（`!dev` 改的） | runtime.json，事件桥每次请求现读 | 什么都不用做 |

LLM 配置挪出去的原因最典型：容器形态下 build 发生在 **镜像构建期**，而 `.env` 被 `.dockerignore` 刻意排除、只在运行期注入。于是写在 build 里的 `LLM_PROTOCOL` 静默无效，镜像永远走默认协议。

**判据：一个值如果是部署配置（同一镜像在不同机器上不同），它就不该进编译产物。** 员工定义进编译；部署配置走运行期 overlay 或热读。

这张表最危险的是第一行和第二行的不对称：改插件 restart 就够，改 persona 不够。2026-09-01 有人加完两条 persona 规则只 restart，真机复测「没生效」，差点判定成规则写错了去改文本。于是 `bin/employee` 加了 `warn_stale_profile()`：任一源 patch 的 mtime 比产物新，start / restart 时响亮提醒 —— 就是 make 的「目标过期」判据，只是这里只警告不重建，因为 build 要跑 `pnpm install`，不该被 start 隐式触发。

## 七、编译期检查：哪些硬失败，哪些只警告

build 里有一串检查，响度是刻意分级的：

**硬失败（`exit 1`）：** `DWS_PROFILE` 命中多个 dws 登录态。旧代码 `.find()` 静默取第一个，员工以 **别人的身份** 收发消息 —— 进程正常、链路正常、日志看不出来。这是 build 就能抓到、运行期却查不出来的错，所以在 build 拦死（check / doctor / run 另外三处同样拦）。这和 [AI 能排什么，不能排什么](https://hugozhu.site/post/2026/448-what-ai-may-rank/) 里认人 fail-closed 的红线同根：把人搞错，是这类系统能犯的最坏的错。

**只警告：** 缺 `access.json`、缺 `channel.json`、缺 `EMPLOYEE_SUPERVISOR`、缺 `TAVILY_API_KEY` / `FIRECRAWL_API_KEY`、登录态 refresh 过期。理由是 **构建镜像时这些本来就没有**，拦住 build 等于没法出镜像。真正的硬失败放在 `precheck_run` / `doctor`，即运行前。

但警告必须响亮，因为它们全是「违反时不报错」那一类：缺 `access.json` 在钉钉侧表现为「所有制度都查不到」（fail-closed 的正确行为，看起来像功能坏了）；缺 `channel.json` 是「在岗但聋」。

一个细节值得抄：登录态检查的判据不是 `status === "active"`。实测 status 常态就是 `expired`，CLI 会自己用 refresh token 续期。拿 status 当判据等于永远在报警，**而永远在报警的检查就是没有检查**。真判据是 `refreshExpAt` 有没有过。

## 八、知识库编译：宁可不出产物

`make kb-compile` 把 `knowledge/` 编成段级索引。纯逻辑在 `plugins/policy-qa/compile.cjs`（有离线单测），脚本只管三件带副作用的事：读语料、贴 nodeId、写产物。

两条纪律：

- **nodeId 只能来自 manifest，绝不现编。** 权限判定只认 nodeId，`access.json` 也是从同一份 manifest 生成的。编一个出来，索引里每一段在 access 里都查不到 → default deny → 员工把每个问题都答成「公司没有这项制度」，而链路上每一环都「成功」。所以没有 manifest 就不出产物；语料里有未登记文件默认也硬失败（`--allow-unmapped` 才放行）。
- **产物可比对。** `compile.cjs` 刻意无时间戳、无随机数；脚本层要写 `generatedAt`，就另写一个只覆盖确定性部分的 `contentHash`。内容没变时它逐字节相同，「产物变了」才是一个有用的信号。

## 九、编译通过 ≠ 能跑

dsh 从 0.1.2-rc.1 升到 0.1.5-rc.2（issue #94）那一轮，有四处破坏性变更：

1. `persona` 拆成 `personaPrefix` / `personaSuffix`，旧键被 schema 当未知键丢掉 —— 四个员工在 **没有 persona** 的状态下运行。build 绿、check 绿、`dump-config` 还照样打印那段文本。
2. `assistant/chunk` 事件被移除，事件桥一个字都收不到。
3. 新增的 `workspace-files` 插件 inject 了被裁掉的服务，停在 pending，boot 拒绝启动。
4. `tool-str-replace-editor` 不在新 bundle 里，禁一个不存在的 id 报 not found。

只有第 4 条是 `make check` 能抓的。第 3 条响亮，但只在真正激活插件树时出现（`--dump-config` 只组装配置）；第 1、2 条连启动都不暴露。

所以验证链是三段，不能合并：

```
make check           配置能组装（抓静默写错的 id）
真的起一次进程        插件树能激活（抓 pending）
真机回读             运行时行为没静默退化（抓键改名、事件移除）
```

另外那一轮还踩了 pin 本身：把 `latest` 的 rc pin 到根上，与 dsh 自己 `^x` 解析出的另一个 rc 共存 —— 两份 `dsh-llm`、三份 `dsh-tools`。`TOOL_RUNTIME_SCHEDULER` 是模块局部 `Symbol()`，两份模块就是两个符号，模型一并行调两个工具就 `Cannot read properties of undefined`。检查方法很土但有效：

```bash
ls -d node_modules/.pnpm/@deepseek-ai+dsh-tools@*/ | wc -l   # 应该是 1
```

事后补的守卫都是「拿运行时真实 schema 判定」而不是硬编码字符串：员工 persona 键必须在当前 dsh 的 `SystemPrompt.Config` 里；默认模型必须仍声明 image 输入。

## 十、带走的几条

1. **把配置组装当编译对待**：源可审、产物可丢、确定性。产物目录里需要手工补一次的东西，迟早在换机或容器里丢。
2. **能 `cat` 就别写合并器。** 选一种天然可拼接的格式（顶层序列 + 后者覆盖），合并逻辑就不会出错 —— 但要把「`config:` 整体替换」这类语义写在每个源文件头上。
3. **部署配置不进编译产物。** 同一个产物要在多台机器上跑，机器相关的值走运行期 overlay 或热读。
4. **给你的「编译器」补上它不报的错。** 写错 id 静默、依赖未声明静默、版本不兼容静默禁用 —— 每一条都需要一个显式闸门（`make check`、只 link insert 的包、build 写豁免）。
5. **检查的响度要分级，判据要对。** 运行期才查不出的错在 build 硬拦；构建环境本来就缺的只警告；永远在报警的检查等于没有。
6. **编译通过只证明能组装。** 能激活、行为对，各要一段独立验证。

延伸阅读：[做好一个钉钉数字员工，只有三件事：SPEC、Evals 和 AI 工程基建](https://hugozhu.site/post/2026/438-digital-employee-three-things-spec-evals-infra/) · [别配置 Agent 了，给它一个岗位](https://hugozhu.site/post/2026/367-agent-harness-develop-digital-employee/)
