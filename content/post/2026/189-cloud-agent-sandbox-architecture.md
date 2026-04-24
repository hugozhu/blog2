---
title: "云端大规模 Agent 沙箱：多租户隔离、持久化、弹性调度与合规治理"
subtitle: "Cloud-Scale Agent Sandbox Architecture: Isolation, Persistence, Elasticity, and Compliance"
date: 2026-04-24
tags: ["agent-sandbox", "multi-tenant", "system-design", "cloud-native", "security"]
---

上周，一个做 AI 编程助手平台的架构师朋友找我喝咖啡。他们的产品增长很快，企业客户越来越多，但工程团队正被四个问题折磨得焦头烂额：

> "我们最初用 Docker 给每个用户起一个容器做代码执行沙箱，几十个人跑没问题。现在上千并发，问题全暴露了——
>
> **隔离**：有客户的 Agent 在容器里 `cat /proc/1/environ` 读到了其他租户的 API Key；
> **持久化**：客户抱怨上次会话写的代码，下次进来全没了；
> **弹性**：一个大客户做代码审查把 GPU 配额全占满了，其他客户的 Agent 全部超时；
> **合规**：法务要求支持 GDPR 数据删除，但我们连 Agent 的记忆散落在哪些存储里都说不清。"

他问："你们做大规模 Agent 平台的时候，沙箱到底应该怎么设计？"

这不是他一个人的问题。2026 年，Agent 从 demo 走向生产，几乎所有做 Agent 平台的团队都会在这四个维度上踩坑。传统 SaaS 的多租户隔离只关心"数据别串"，但 Agent 沙箱要解决的是一个更复杂的问题：**一个自主执行代码、持久化状态、调用外部工具的 AI 工作空间，如何在共享基础设施上安全、弹性、合规地运行？**

本文从四个工程维度系统性地拆解云端大规模 Agent 沙箱的架构方案：**多租户隔离、状态持久化、弹性调度、合规治理**。

<!--more-->

```text
Agent 沙箱架构全景图：

┌─────────────────────────────────────────────────────────────┐
│                    Agent Sandbox Platform                   │
├──────────┬──────────┬──────────┬────────────────────────────┤
│ 多租户隔离│ 状态持久化│ 弹性调度 │       合规治理             │
│          │          │          │                            │
│ • 计算   │ • 会话   │ • K8s    │ • 审计日志                 │
│   隔离   │   状态   │   CRD    │ • PII 脱敏                 │
│ • 数据   │ • 文件   │ • Warm   │ • Crypto-                  │
│   隔离   │   系统   │   Pool   │   Shredding                │
│ • 身份   │ • 向量   │ • HPA    │ • 数据主权                 │
│   权限   │   索引   │ • 预测   │ • OWASP/MITRE              │
│ • 速率   │ • 长期   │   伸缩   │                            │
│   限制   │   记忆   │          │                            │
└──────────┴──────────┴──────────┴────────────────────────────┘
```

## 一、多租户隔离

多租户隔离是 Agent 沙箱的第一道防线。它需要解决三个层面的问题：**计算隔离**（代码不能逃逸）、**数据隔离**（数据不能串）、**权限隔离**（Agent 不能越权）。

### 1.1 为什么 Docker 不够用？

先看一个关键区别：

```text
传统 Web 应用：
  用户请求 → 应用服务器（预编译代码）→ 数据库
  └─ 代码是开发者写的，经过审查，可信

AI Agent 系统：
  用户请求 → LLM 推理 → 生成代码 → 沙箱执行 → 调用工具
  └─ 代码是 LLM 实时生成的，未经审查，不可信
```

Blaxel 的安全指南里有一句话一针见血：

> *"Web 应用运行开发者编写的、经过审查的代码。Agent 运行 LLM 生成的、从未经审计的代码。一次边界失效，Agent 的推理链就会被污染，进而通过工具调用产生实际影响。爆炸半径只受限于 Agent 的工具权限。"*

Docker 容器共享宿主内核，对于运行不可信代码的 Agent 沙箱来说，逃逸风险太高。

### 1.2 计算隔离：运行时技术选型

| 技术 | 隔离级别 | 冷启动 | 安全性 | 适用场景 |
|------|---------|--------|--------|---------|
| Docker | 命名空间 + cgroups | ~100ms | ⭐⭐ 共享内核 | 可信代码 |
| gVisor | 用户态内核 | ~300ms | ⭐⭐⭐ 系统调用拦截 | 中等安全需求 |
| Kata Containers | 轻量 VM | ~500ms | ⭐⭐⭐⭐ 独立内核 | 高安全需求 |
| Firecracker | MicroVM | ~150ms | ⭐⭐⭐⭐⭐ 硬件级隔离 | 多租户不可信代码 |

**推荐策略**：生产级多租户 Agent 平台，至少使用 gVisor，高安全场景使用 Firecracker。

### 1.3 Firecracker MicroVM 架构

Firecracker 是 AWS 为 Lambda 和 Fargate 开发的 MicroVM 运行时，结合了容器的速度和虚拟机的安全性：

```text
Firecracker 架构：

┌─────────────────────────────────────────────┐
│  Host OS (Linux)                            │
│  ┌───────────┐  ┌───────────┐  ┌─────────┐ │
│  │ MicroVM 1 │  │ MicroVM 2 │  │ MicroVM N│ │
│  │ ┌───────┐ │  │ ┌───────┐ │  │ ┌──────┐ │ │
│  │ │Kernel │ │  │ │Kernel │ │  │ │Kernel│ │ │
│  │ │(独立) │ │  │ │(独立) │ │  │ │(独立)│ │ │
│  │ └───────┘ │  │ └───────┘ │  │ └──────┘ │ │
│  │ ┌───────┐ │  │ ┌───────┐ │  │ ┌──────┐ │ │
│  │ │Agent  │ │  │ │Agent  │ │  │ │Agent │ │ │
│  │ │代码   │ │  │ │代码   │ │  │ │代码  │ │ │
│  │ └───────┘ │  │ └───────┘ │  │ └──────┘ │ │
│  └───────────┘  └───────────┘  └─────────┘ │
│  ┌───────────────────────────────────────┐  │
│  │       KVM (Hardware Virtualization)   │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

每个 MicroVM：
  • 独立内核 — 无共享内核逃逸风险
  • ~5MB 内存开销 — 单机可跑数千个
  • ~150ms 冷启动 — 接近容器速度
  • 最小设备模型 — 攻击面极小
```

### 1.4 安全加固基线

无论选择哪种运行时，以下加固措施都是 Day 1 必须落地的：

```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class SandboxSecurityConfig:
    """Agent 沙箱安全配置 — Day 1 基线"""

    # 文件系统
    readonly_rootfs: bool = True
    writable_tmpfs: bool = True
    tmpfs_size_mb: int = 512

    # 网络
    network_mode: str = "restricted"  # restricted | isolated | full
    egress_allowlist: list[str] = field(default_factory=list)
    dns_policy: str = "None"  # 自定义 DNS，防止 DNS 隧道

    # 资源限制
    cpu_limit: str = "2"
    memory_limit: str = "4Gi"
    pids_limit: int = 256  # 防止 fork bomb

    # 系统调用
    seccomp_profile: str = "RuntimeDefault"
    apparmor_profile: Optional[str] = "runtime/default"

    # 权限
    run_as_non_root: bool = True
    allow_privilege_escalation: bool = False
    drop_capabilities: list[str] = field(
        default_factory=lambda: ["ALL"]
    )
    add_capabilities: list[str] = field(default_factory=list)

    # 生命周期
    max_lifetime_seconds: int = 86400  # 24h 最大存活
    idle_timeout_seconds: int = 1800   # 30min 空闲超时

    def validate(self) -> bool:
        """验证安全配置是否符合基线要求"""
        if self.allow_privilege_escalation:
            raise ValueError("特权提升必须禁止")
        if "ALL" not in self.drop_capabilities:
            raise ValueError("必须 drop ALL capabilities")
        if not self.readonly_rootfs:
            raise ValueError("根文件系统必须只读")
        return True

# generated by hugo AI
```

### 1.5 数据隔离：Workspace 模型

文件系统是隔离最薄弱的环节。最佳实践是将每个操作绑定到 `Workspace ID`：

```text
Workspace 数据流：

  用户上传文件
       │
       ▼
┌──────────────────┐
│  Ingestion       │  文件立即标记 Workspace ID
│  • Tag: ws_abc   │  元数据写入: { workspace_id, tenant_id, hash }
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  RAG Pipeline    │  Embeddings 存入 tenant namespace
│  • Chunk & Embed │  Vector DB: namespace="tenant_acme"
│  • Index         │  Metadata: { tenant_id: "acme", ws_id: "ws_abc" }
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Agent Retrieval │  搜索强制限定 namespace
│  • Search tool   │  query.filter = { tenant_id: "acme" }
│  • Namespace     │  返回结果二次验证 tenant_id
│    filter        │
└──────────────────┘
```

**向量数据库隔离关键规则**：
1. 每个向量必须带 `tenant_id` metadata
2. 所有查询**强制**携带 `tenant_id` 过滤条件 — 不是可选的
3. 返回结果**二次验证** `tenant_id` — 防止向量数据库 bug 导致串数据
4. 高合规租户使用独立索引，不依赖逻辑隔离

### 1.6 权限隔离：身份传播链

Agent 不是用户的简单代理，它有自主决策能力。因此 Agent 需要**独立的工作负载身份**，而不是直接传递用户会话：

```text
身份传播链：

  用户 (User Identity)
    │ OIDC Token
    ▼
┌──────────────────┐
│  API Gateway     │  ← 验证用户身份，注入 tenant_id
│  • 鉴权          │
│  • Tenant 解析   │
└────────┬─────────┘
         │ Authorization Envelope:
         │ { user_id, tenant_id, scope, expires_at }
         ▼
┌──────────────────┐
│  Agent Runtime   │  ← 获取短期工作负载凭证
│  • Workload ID   │     (STS AssumeRole / OIDC Federation)
│  • Token 交换    │
└────────┬─────────┘
         │ Short-lived Credential (TTL < 15min)
         ▼
┌──────────────────┐
│  Tool Execution  │  ← 凭证限定工具权限范围
│  • Scoped MCP    │
│  • Egress ACL    │
└──────────────────┘
```

关键原则：
- **Gateway 层强制注入 tenant context** — 在 LLM 处理之前就确定租户边界，用确定性 token claim，不是 LLM 指令
- **短期凭证** — 使用 STS 或 Workload Identity Federation，凭证 TTL < 15 分钟
- **最小权限** — Agent 的工具权限按需授予，不是继承用户全量权限

MCP 工具的权限必须严格限定在租户范围内：

```python
import os
from dataclasses import dataclass

@dataclass
class ScopedToolContext:
    """限定范围的工具执行上下文"""

    tenant_id: str
    workspace_id: str
    user_id: str
    allowed_paths: list[str]
    allowed_domains: list[str]
    max_output_bytes: int = 1_000_000

    def validate_file_access(self, path: str) -> bool:
        """验证文件访问是否在允许范围内"""
        resolved = os.path.realpath(path)
        return any(
            resolved.startswith(allowed)
            for allowed in self.allowed_paths
        )

    def validate_network_access(self, url: str) -> bool:
        """验证网络访问是否在白名单内"""
        from urllib.parse import urlparse
        host = urlparse(url).hostname
        return any(
            host.endswith(domain)
            for domain in self.allowed_domains
        )

# generated by hugo AI
```

### 1.7 防"嘈杂邻居"：速率限制

一个租户的 Agent 不应该影响其他租户的性能。需要在多个层面实施限流：

```text
限流层级：

┌──────────────────────────────────────────┐
│  全局限流                                │
│  • 总并发 Sandbox 数                     │
│  • 总 GPU/CPU 配额                       │
├──────────────────────────────────────────┤
│  租户限流                                │
│  • 每租户最大 Sandbox 数                 │
│  • 每租户 LLM API 调用 QPS               │
│  • 每租户网络带宽                        │
├──────────────────────────────────────────┤
│  会话限流                                │
│  • 单会话最大执行时间                    │
│  • 单会话最大内存                        │
│  • 单会话最大文件 I/O                    │
└──────────────────────────────────────────┘
```

## 二、状态持久化

Agent 沙箱与传统容器最大的区别之一，是它需要持久化大量有状态的数据。这些数据不是一次性的，而是贯穿 Agent 的整个生命周期。

### 2.1 四类持久化数据

| 数据类型 | 内容 | 存储方案 | 隔离方式 |
|---------|------|---------|---------|
| **会话状态** | 对话历史、推理链、中间结果 | Redis/PostgreSQL | Row-Level Security |
| **文件系统** | 代码文件、构建产物、上传文件 | 对象存储 + 本地缓存 | Per-tenant prefix |
| **向量索引** | RAG 文档 embeddings | 向量数据库 | Namespace per tenant |
| **长期记忆** | 用户偏好、项目上下文 | 专用 Memory Store | Schema per tenant |

### 2.2 Pause/Resume 模式

沙箱不应该在空闲时被销毁，而应该**暂停和恢复**。[E2B](https://e2b.dev) 是目前最成熟的实现方案之一：

```python
from dataclasses import dataclass
from enum import Enum

class SandboxState(Enum):
    RUNNING = "running"
    PAUSED = "paused"
    TERMINATED = "terminated"

@dataclass
class SandboxLifecycle:
    """Agent 沙箱生命周期管理 — Pause/Resume 模式"""

    sandbox_id: str
    state: SandboxState = SandboxState.RUNNING
    timeout_ms: int = 30 * 60 * 1000  # 30 分钟空闲超时
    auto_resume: bool = True

    async def create(self, template: str) -> str:
        """创建沙箱实例"""
        # sandbox = await e2b.Sandbox.create(
        #     template=template,
        #     timeout_ms=self.timeout_ms,
        #     lifecycle={
        #         "onTimeout": "pause",
        #         "autoResume": self.auto_resume,
        #     }
        # )
        # return sandbox.sandbox_id
        ...

    async def pause(self) -> None:
        """暂停沙箱 — 保存文件系统 + 内存状态"""
        # await sandbox.pause()
        self.state = SandboxState.PAUSED

    async def resume(self) -> None:
        """恢复沙箱 — 从暂停时的状态继续"""
        # sandbox = await e2b.Sandbox.connect(self.sandbox_id)
        self.state = SandboxState.RUNNING

    async def connect_or_create(self) -> str:
        """连接已有沙箱或创建新的 — 自动恢复暂停的沙箱"""
        # 如果沙箱存在（包括暂停状态），自动连接/恢复
        # 否则创建新的
        ...

# generated by hugo AI
```

关键特性：
- **空闲自动暂停**：`onTimeout: "pause"` — 超时后保存状态，释放计算资源
- **按需自动恢复**：`autoResume: true` — 下次连接时自动恢复，< 25ms
- **状态完整保留**：文件系统 + 内存状态 + 进程状态全部保留
- **零空闲成本**：暂停期间不消耗 CPU/GPU 资源

### 2.3 向量数据库隔离策略

向量数据库的数据隔离需要支持多种模式，根据租户的合规等级灵活选择：

```python
from dataclasses import dataclass

@dataclass
class VectorIsolationConfig:
    """向量数据库多租户隔离配置"""

    tenant_id: str
    isolation_mode: str = "namespace"  # namespace | shard | instance

    def get_collection_name(self, workspace_id: str) -> str:
        """根据隔离模式生成集合名"""
        if self.isolation_mode == "namespace":
            # 共享实例，逻辑隔离 — 适合大多数租户
            return f"tenant_{self.tenant_id}_vectors"
        elif self.isolation_mode == "shard":
            # 分片隔离，物理边界 — 适合 B2B 客户
            return f"shard_{self.tenant_id}_{workspace_id}"
        else:
            # 独立实例，最强隔离 — 适合金融/医疗等强合规场景
            return f"instance_{self.tenant_id}"

    def build_query_filter(self) -> dict:
        """构建强制租户过滤条件 — 所有查询必须携带"""
        return {
            "tenant_id": self.tenant_id,
            # 防御性编程：即使 namespace 隔离，也加 metadata filter
        }

# generated by hugo AI
```

三种隔离模式的 trade-off：

| 模式 | 安全性 | 成本 | 运维复杂度 | 适用场景 |
|------|--------|------|-----------|---------|
| Namespace | ⭐⭐⭐ | 低 | 低 | 大多数 SaaS 租户 |
| Shard | ⭐⭐⭐⭐ | 中 | 中 | B2B 企业客户 |
| Instance | ⭐⭐⭐⭐⭐ | 高 | 高 | 金融/医疗/政府 |

## 三、弹性调度

Agent 的工作负载特征和传统 Web 服务完全不同：**长时间空闲 + 突发活跃 + 需要挂起/恢复**。这意味着弹性调度策略也需要重新设计。

### 3.1 Kubernetes Agent Sandbox CRD

2026 年 3 月，Kubernetes SIG Apps 正式推出了 [Agent Sandbox](https://github.com/kubernetes-sigs/agent-sandbox) 项目，这是 Kubernetes 原生支持 Agent 工作负载的标志性事件。

用 StatefulSet + Headless Service + PVC 来管理 Agent 沙箱，在规模上会变成运维噩梦。Agent Sandbox CRD 提供了原生抽象：

```yaml
apiVersion: sandbox.x-k8s.io/v1alpha1
kind: Sandbox
metadata:
  name: agent-workspace-user-1234
spec:
  # 安全运行时 — 使用 gVisor 做内核隔离
  runtimeClassName: gvisor
  # 持久化工作空间
  workspace:
    storageClassName: ssd
    size: 10Gi
    mountPath: /workspace
  # 空闲时自动缩到零
  lifecycle:
    idleTimeout: 30m
    scaleToZero: true
  # 网络策略 — 只允许出站白名单
  networkPolicy:
    egress:
      - to:
          - cidr: 10.0.0.0/8  # 内网 API
      - to:
          - cidr: 0.0.0.0/0
        ports:
          - port: 443  # 只允许 HTTPS
```

### 3.2 Warm Pool 解决冷启动

Agent 被挂起后，用户再次访问时需要快速恢复。标准 Pod 启动约 1 秒的延迟会打断交互连续性。Agent Sandbox 的 `SandboxWarmPool` 维护一组预热的沙箱：

```yaml
apiVersion: sandbox.x-k8s.io/v1alpha1
kind: SandboxWarmPool
spec:
  templateRef:
    name: python-agent-template
  minReady: 10
  maxReady: 50
  scalingPolicy: predictive  # 基于历史并发预测预热
```

编排器通过 `SandboxClaim` 声明一个预热好的沙箱，控制器瞬间交付一个已隔离的环境。

### 3.3 弹性伸缩架构

```text
弹性伸缩三层架构：

  用户请求
     │
     ▼
┌────────────┐     ┌──────────────┐     ┌──────────────┐
│  API       │────▶│  Sandbox     │────▶│  Agent       │
│  Gateway   │     │  Orchestrator│     │  Runtime     │
│            │     │              │     │  (MicroVM)   │
│ • 路由     │     │ • Claim/     │     │              │
│ • 限流     │     │   Release    │     │ • LLM 推理   │
│ • 鉴权     │     │ • Warm Pool  │     │ • 代码执行   │
└────────────┘     │ • 生命周期   │     │ • 工具调用   │
                   └──────┬───────┘     └──────────────┘
                          │
                   ┌──────▼───────┐
                   │  Kubernetes  │
                   │  HPA +       │
                   │  Cluster     │
                   │  Autoscaler  │
                   └──────────────┘
```

关键策略：
- **HPA（水平伸缩）**：基于活跃 Sandbox 数量，而非 CPU/内存 — Agent 大部分时间 idle，CPU 指标没有意义
- **Cluster Autoscaler**：节点级别伸缩，支持 Spot 实例降低成本
- **预测性伸缩**：基于历史并发模式提前预热 Warm Pool

### 3.4 调度策略的 Trade-off

| 策略 | 冷启动延迟 | 资源利用率 | 成本 | 适用场景 |
|------|----------|-----------|------|---------|
| Always-On | 0ms | 低 | 高 | VIP 客户/高并发租户 |
| Warm Pool | ~100ms | 中 | 中 | 主流生产场景 |
| Scale-to-Zero | ~1-5s | 高 | 低 | 低频使用/开发环境 |
| Predictive | ~100ms | 高 | 中 | 有明显峰谷规律的场景 |

## 四、合规治理

合规不是事后补的，而是 Day 1 就要设计的架构约束。Agent 平台的合规挑战比传统应用更复杂，因为 Agent 的推理链、工具调用、RAG 检索都会产生敏感数据。

### 4.1 合规框架映射

| 合规要求 | Agent 沙箱特殊挑战 | 解决方案 |
|---------|-------------------|---------|
| **GDPR 删除权** | Agent 记忆分散在会话、向量、日志中 | Crypto-Shredding + 全局数据清单 |
| **SOC 2 审计** | Agent 推理链包含敏感上下文 | 结构化审计日志 + PII 脱敏 |
| **数据主权** | 沙箱可能跨 region 调度 | Per-tenant region pinning |
| **OWASP LLM08** | RAG 跨租户数据泄露 | 强制 namespace filter + 二次验证 |
| **MITRE ATLAS** | Prompt 注入导致权限提升 | 输入验证 + 沙箱 + 运行时监控 |

### 4.2 Crypto-Shredding：密码学数据擦除

对于 Agent 平台，物理删除分散在各处的租户数据非常困难。Crypto-Shredding 提供了更优雅的解决方案：

```text
Crypto-Shredding 架构：

┌─────────────────────────────────────────────┐
│  KMS (Key Management Service)               │
│                                             │
│  KEK_tenant_A  KEK_tenant_B  KEK_tenant_C   │
│  (Key Encrypting Key per tenant)            │
└──────────────┬──────────────────────────────┘
               │ 加密
               ▼
┌─────────────────────────────────────────────┐
│  DEK (Data Encrypting Keys)                 │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │Session DB│ │Vector DB │ │Object Store│  │
│  │(加密存储) │ │(加密存储) │ │(加密存储)  │  │
│  └──────────┘ └──────────┘ └────────────┘  │
└─────────────────────────────────────────────┘

删除租户 A 的数据：
  1. 销毁 KEK_tenant_A
  2. 所有用该 KEK 加密的数据立即不可读
  3. 无需物理删除分散的数据块
  4. 满足 GDPR "Right to be Forgotten"
```

### 4.3 审计日志

Agent 的审计日志比传统应用复杂得多，因为它需要记录推理链、工具调用、数据访问：

```python
from dataclasses import dataclass

@dataclass
class AgentAuditEntry:
    """Agent 审计日志条目 — SOC 2 合规要求"""

    timestamp: str
    tenant_id: str
    user_id: str
    sandbox_id: str

    # 事件类型
    event_type: str  # tool_call | file_access | memory_retrieval | network_request

    # 事件详情
    action: str  # 具体操作，如 "read_file", "search_vectors"
    resource: str  # 访问的资源路径或 ID
    result: str  # success | denied | error

    # 安全上下文
    workload_identity: str  # Agent 的工作负载身份
    source_ip: str
    tenant_context_verified: bool  # 租户上下文是否通过验证

    # 可选：敏感信息脱敏后的摘要
    sanitized_summary: str = ""

    def to_json(self) -> dict:
        """序列化为 JSON — 写入审计日志系统"""
        return {
            k: v for k, v in self.__dict__.items()
            if v is not None
        }

# generated by hugo AI
```

审计日志的关键要求：
- **每条日志必须包含 `tenant_id`** — 支持按租户隔离审计数据
- **记录推理链摘要** — 不只是请求/响应，还包括 Agent 的决策路径
- **PII 脱敏** — 使用 OpenTelemetry Collector transform processor 在写入前脱敏
- **不可篡改** — 写入 Append-only 存储，支持合规审计

### 4.4 NVIDIA 安全指导要点

NVIDIA 最近发布的 [Agent 沙箱安全指导](https://developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/) 强调了几个关键实践：

1. **禁止写入工作空间外的文件** — 防止持久化攻击和沙箱逃逸
2. **保护配置文件** — Agent 不能修改 `.env`、`kubeconfig` 等敏感配置
3. **及时清理过期沙箱** — 过期的沙箱中可能残留密钥和专有代码
4. **企业级策略强制执行** — 不管用户是否手动批准，敏感操作必须被阻断

## 五、方案对比与选型建议

```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│              │  自建 (K8s)  │  E2B         │  Blaxel      │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ 隔离技术     │ 自选         │ Firecracker  │ MicroVM      │
│ 持久化       │ 自行设计     │ Pause/Resume │ 永续沙箱     │
│ 恢复速度     │ 取决于实现   │ ~1s          │ <25ms        │
│ 空闲成本     │ 需自行优化   │ 暂停零成本   │ 待机零成本   │
│ 最大会话时长 │ 无限制       │ 24h (Pro)    │ 无限         │
│ 多租户       │ 自行实现     │ 支持         │ 原生支持     │
│ 合规支持     │ 自行实现     │ 基础         │ ZDR 原生     │
│ 运维复杂度   │ 高           │ 低           │ 低           │
│ 适合场景     │ 大规模/定制  │ 快速启动     │ 生产级 Agent │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**选型建议**：
- **早期团队（< 100 并发）**：E2B 或 Blaxel，快速启动，专注业务逻辑
- **中型团队（100-1000 并发）**：K8s + gVisor + 自建持久化，平衡控制和成本
- **大规模/高合规（> 1000 并发）**：K8s Agent Sandbox CRD + Firecracker + Crypto-Shredding

## 六、总结

云端大规模 Agent 沙箱的核心认知：

> **Agent 沙箱不是"给容器加个安全策略"，而是多租户隔离、状态持久化、弹性调度、合规治理四维度的系统工程。每个维度都有独立的失效模式，任何一个维度的缺失都会导致整个体系的崩溃。**

四个维度的 Day 1 基线：

| 维度 | Day 1 基线 | 进阶 |
|------|-----------|------|
| **多租户隔离** | gVisor + namespace filter + Gateway tenant injection | Firecracker + per-tenant KMS |
| **状态持久化** | Pause/Resume + 对象存储 + 向量 namespace | 永续沙箱 + 多 region 复制 |
| **弹性调度** | K8s HPA + Warm Pool + 租户限流 | 预测性伸缩 + Spot 实例 |
| **合规治理** | 审计日志 + PII 脱敏 + per-tenant KEK | Crypto-Shredding + 独立审计后端 |

你在实际落地 Agent 沙箱时遇到过什么隔离或持久化的坑？欢迎留言讨论。
