---
title: AI Agent 采纳的复利效应：为什么第二步的「无用功」最值得投入
subtitle: "The Compound Interest of Agent Adoption: Why Redundant Work Pays Off Exponentially"
date: 2026-05-16
tags: [ai-agent, workflow-automation, harness-engineering, system-design, best-practices]
---

从Hashcorp出来后的 Mitchell 把自己的 AI 使用历程分成六个阶段。他不是那种用了就觉得好的人，每个阶段都带着怀疑和验证。六步走完后，他得出了一个反直觉的结论：**最痛苦、看起来最「无用」的第二步，恰恰是后续一切复利的起点。**

大多数人从第一步直接跳到第四步 —— 觉得 AI 好用就开始委托任务。Mitchell 却在第二步花了大量时间做冗余工作：已经手动完成的事，再让 Agent 做一遍。原文说「I literally did the work twice」。目的不是省时间，是建立对 Agent 能力边界的真实认知。

正是这个阶段的「无用功」，让后续每一步都产生了指数级的复利效应。

<!--more-->

## 一、六步采纳框架：Mitchell 的路径

先把完整框架列出来，然后我们重点分析复利在哪里产生。

```text
┌─────────────────────────────────────────────────────────────┐
│                    Mitchell 六步采纳框架                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: 放弃聊天界面 ──→ Step 2: 复现自己的工作             │
│       (Chat → Agent)         (最痛苦，但复利起点)            │
│           │                         │                       │
│           v                         v                       │
│  Step 3: 下班前 Agent 时间 ──→ Step 4: 外包必胜任务          │
│       (异步启动)              (高确定性委托)                 │
│           │                         │                       │
│           v                         v                       │
│  Step 5: 工程化 Harness ──→ Step 6: Agent 始终运行           │
│       (核心步骤)              (后台持续处理)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Step 1：放弃聊天界面。** ChatGPT 聊天模式对正经编码效率很低，必须用 Agent。Mitchell 的定义简明：一个 LLM 加上外部行为循环，最低限度能读文件、跑程序、发 HTTP 请求。

**Step 2：复现自己的工作。** 最痛苦的一步。强迫自己把手动完成的工作用 Agent 再做一遍。目的不是省时间，是建立对 Agent 能力边界的认知。

**Step 3：下班前的 Agent 时间。** 每天留最后 30 分钟给 Agent，利用自己不在的时间让它跑一些进展。

**Step 4：外包必胜任务。** 对 Agent 能力建立信心后，把高确定性任务委托出去。配套建议：关掉 Agent 的桌面通知，上下文切换代价太高。

**Step 5：工程化 Harness。** 核心步骤，也是 harness engineering 这个概念的起源。

**Step 6：让 Agent 始终运行。** 后台始终有 Agent 在处理任务，他偏好慢但质量高的模型，接受 30 分钟以上的处理时间。

## 二、复利效应：为什么第二步是关键

复利的本质是 **前期投入在后续周期中持续产生回报**。Mitchell 的六步框架中，复利效应在三个层次上累积：

### 2.1 认知复利：第二步的「冗余工作」

第二步看起来是浪费时间 —— 已经做完的事，为什么还要让 Agent 再做一遍？

因为你在建立 **对 Agent 行为模式的深度理解**。这不是读几篇教程能获得的，而是通过实际对比：

- Agent 在哪些任务上表现稳定？
- 哪些场景会触发幻觉或错误？
- 上下文窗口如何影响输出质量？
- 错误模式有什么规律？

这些认知在后续步骤中持续产生回报：

| 阶段 | 没有第二步认知 | 有第二步认知 |
|------|----------------|--------------|
| Step 3（下班前委托） | 盲目委托，第二天发现错误，返工成本更高 | 精准选择适合异步的任务，成功率高 |
| Step 4（外包必胜任务） | 分不清哪些是「必胜」，委托后频繁干预 | 准确识别高确定性任务，真正释放时间 |
| Step 5（工程化 Harness） | Harness 设计脱离实际，过度工程化或覆盖不足 | Harness 针对真实失败模式设计，精准有效 |

**认知复利的公式：** `第二步投入时间 × 后续每一步的决策质量提升 = 指数级时间节省`

我在写 [小学标准化试卷 AI 批改 Agent 最佳工程实践](https://hugozhu.site/post/2025/110-ai-exam-grading-agent-best-practices/) 时，也经历了类似过程。最初直接让 Agent 批改，发现对某些题型的误判率很高。后来我手动批改了 50 份试卷，再让 Agent 批改同样的 50 份，逐题对比差异，才发现 Agent 在「开放性填空题」上的失败模式有规律可循。这个认知直接指导了后续的 Harness 设计：对开放性题目增加二次校验逻辑，整体准确率从 78% 提升到 94%。

### 2.2 工具复利：第五步的 Harness Engineering

Harness（测试线束/工程框架）是 Mitchell 框架的核心概念。它的本质是 **将第二步获得的认知，固化为可复用的工程结构**。

一个典型的 Agent Harness 包含以下组件：

```text
┌──────────────────────────────────────────────────────────┐
│                    Agent Harness 架构                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │  Input   │───→│  Agent   │───→│  Validation      │   │
│  │ Pipeline │    │  Core    │    │  & Feedback Loop │   │
│  └──────────┘    └──────────┘    └────────┬─────────┘   │
│                                          │               │
│                                          v               │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │  Output  │←───│  Retry   │←───│  Error           │   │
│  │ Formatter│    │  Logic   │    │  Classification  │   │
│  └──────────┘    └──────────┘    └──────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Harness 的复利效应体现在：

1. **一次构建，多次复用**：针对某类任务设计的 Harness，可以应用到同类型的所有后续任务。
2. **错误模式积累**：每次 Agent 失败，Harness 的校验层捕获并分类，后续自动规避同类错误。
3. **质量门槛固化**：第二步学到的「什么情况下 Agent 会出错」，转化为 Harness 中的自动化检查规则。

我在 [构建高质量订单文档分类器](https://hugozhu.site/post/2025/111-order-document-classifier-agent-routing/) 中描述的导流系统，本质上就是一个 Harness：先通过分类器判断文档类型，再路由到专业 Agent，每个 Agent 都有针对其领域的校验逻辑。这个架构一旦搭建完成，新增一种订单类型只需要添加对应的 Agent 和校验规则，边际成本极低。

### 2.3 系统复利：第六步的持续运行

当 Harness 足够健壮，Agent 可以在后台持续运行。Mitchell 偏好慢但质量高的模型，接受 30 分钟以上的处理时间。这个选择的复利效应是：

- **时间利用率最大化**：人类工作时间 + Agent 后台时间 = 接近 24 小时的生产力。
- **质量优先的累积**：慢模型输出质量更高，减少返工，长期来看总产出更大。
- **异步工作流的网络效应**：多个 Agent 并行处理不同任务，彼此之间通过 Harness 协调，形成自动化流水线。

我在 [Claude Code 自动修正生成代码的原理解析](https://hugozhu.site/post/2025/113-claude-code-auto-correction-agent-loop/) 中详细分析了 Agent Loop 的反馈机制。持续运行的 Agent 本质上是一个不断自我修正的循环：每次失败都被 Harness 捕获，反馈给下一轮迭代，质量随时间单调递增。

## 三、实践：构建最小可用 Harness

理解了复利效应，我们来看一个最小可用的 Harness 实现。这个示例基于 Python，展示了如何将第二步的认知固化为自动化校验。

```python
from dataclasses import dataclass, field
from typing import Protocol, Any
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AgentProtocol(Protocol):
    """Agent 接口定义"""
    def run(self, input_data: dict[str, Any]) -> dict[str, Any]: ...


class ValidatorProtocol(Protocol):
    """校验器接口定义"""
    def validate(self, output: dict[str, Any]) -> tuple[bool, str]: ...


@dataclass
class HarnessConfig:
    """Harness 配置"""
    max_retries: int = 3
    retry_delay: float = 2.0
    timeout: float = 300.0
    enable_feedback_loop: bool = True


@dataclass
class HarnessResult:
    """执行结果"""
    success: bool
    output: dict[str, Any] | None = None
    error_message: str | None = None
    retry_count: int = 0
    execution_time: float = 0.0
    feedback_history: list[str] = field(default_factory=list)


class AgentHarness:
    """
    最小可用 Agent Harness
    
    核心功能：
    1. 输入预处理
    2. 带重试的执行循环
    3. 输出校验
    4. 反馈循环（将错误信息反馈给 Agent 重新尝试）
    """
    
    def __init__(
        self,
        agent: AgentProtocol,
        validators: list[ValidatorProtocol],
        config: HarnessConfig | None = None
    ):
        self.agent = agent
        self.validators = validators
        self.config = config or HarnessConfig()
    
    def execute(self, input_data: dict[str, Any]) -> HarnessResult:
        """执行 Agent 任务，带校验和重试"""
        start_time = time.time()
        current_input = input_data.copy()
        
        for attempt in range(self.config.max_retries):
            try:
                # Step 1: Agent 执行
                output = self.agent.run(current_input)
                
                # Step 2: 校验
                validation_passed, error_msg = self._validate(output)
                
                if validation_passed:
                    return HarnessResult(
                        success=True,
                        output=output,
                        retry_count=attempt,
                        execution_time=time.time() - start_time
                    )
                
                # Step 3: 反馈循环
                if self.config.enable_feedback_loop and attempt < self.config.max_retries - 1:
                    logger.info(f"Attempt {attempt + 1} failed: {error_msg}, retrying...")
                    current_input = self._inject_feedback(current_input, error_msg)
                    time.sleep(self.config.retry_delay)
                else:
                    return HarnessResult(
                        success=False,
                        error_message=f"Validation failed after {attempt + 1} attempts: {error_msg}",
                        retry_count=attempt,
                        execution_time=time.time() - start_time
                    )
                    
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} exception: {e}")
                if attempt == self.config.max_retries - 1:
                    return HarnessResult(
                        success=False,
                        error_message=str(e),
                        retry_count=attempt,
                        execution_time=time.time() - start_time
                    )
                time.sleep(self.config.retry_delay)
        
        return HarnessResult(
            success=False,
            error_message="Max retries exceeded",
            retry_count=self.config.max_retries,
            execution_time=time.time() - start_time
        )
    
    def _validate(self, output: dict[str, Any]) -> tuple[bool, str]:
        """运行所有校验器"""
        for validator in self.validators:
            passed, msg = validator.validate(output)
            if not passed:
                return False, msg
        return True, ""
    
    def _inject_feedback(
        self, 
        input_data: dict[str, Any], 
        error_msg: str
    ) -> dict[str, Any]:
        """将校验错误反馈到输入中，供 Agent 下一轮参考"""
        feedback = input_data.get("_feedback_history", [])
        feedback.append(error_msg)
        input_data = input_data.copy()
        input_data["_feedback_history"] = feedback
        return input_data


# generated by hugo AI
```

这个 Harness 的复利价值在于：

1. **校验器可插拔**：每次发现新的失败模式，只需添加一个 Validator，不需要修改核心逻辑。
2. **反馈循环自动化**：Agent 不需要人工干预就能从错误中学习（在单次任务范围内）。
3. **执行过程可观测**：`HarnessResult` 记录了重试次数、执行时间、反馈历史，这些数据用于持续优化。

## 四、复利思维 vs 捷径思维

回到 Mitchell 的框架，大多数人的路径是：

```
Step 1 (放弃聊天) ──→ Step 4 (委托任务) ──→ 遇到问题 ──→ 放弃或低效使用
```

Mitchell 的路径是：

```
Step 1 ──→ Step 2 (复现工作，建立认知) ──→ Step 3 ──→ Step 4 ──→ Step 5 (Harness) ──→ Step 6 (持续运行)
                ↑                                                              │
                └──────────────── 复利起点 ───────────────────────────────────┘
```

捷径思维追求 **即时回报**，但 Agent 的能力边界不清晰时，委托任务的失败率很高，返工成本抵消了节省的时间。

复利思维接受 **前期投入没有即时回报**，但第二步建立的认知在后续每一步中持续产生价值：

- 更准确的任务选择（Step 3 & 4）
- 更有效的 Harness 设计（Step 5）
- 更可靠的持续运行（Step 6）

**复利的数学表达：**

```
捷径模式总收益 = Σ(单次委托节省时间 - 返工时间) × N次
复利模式总收益 = (第二步投入) × (后续每步效率提升系数)^N - 初始投入
```

当 N 足够大时，复利模式远超捷径模式。这就是为什么 Mitchell 说第二步的「无用功」最值得投入。

## 五、行动建议

如果你正在考虑或已经开始使用 AI Agent，以下是基于复利思维的实践建议：

1. **不要跳过第二步**。选一个你最近手动完成的项目，用 Agent 重做一遍。记录差异，分析失败模式。
2. **从必胜任务开始委托**。第二步完成后，你自然知道哪些任务适合 Agent。
3. **投资 Harness 工程**。不要只写 Prompt，要构建包含校验、重试、反馈的完整循环。参考 [API、MCP 和 Skills 的本质区别](https://hugozhu.site/post/2025/109-api-mcp-skills-explained/) 中讨论的交互模式，Harness 是比单纯 API 调用更健壮的范式。
4. **接受慢模型**。如果任务可以异步处理，选择质量更高的模型，减少返工就是节省时间。
5. **关掉通知**。上下文切换的代价远高于你想象，让 Agent 在后台安静工作。

## 六、总结

Mitchell 的六步框架之所以有效，不是因为它提供了什么新技术，而是因为它揭示了一个被忽视的真相：**在 AI Agent 的采纳过程中，最大的捷径就是不跳过第二步。**

第二步的「无用功」是复利的种子。它看起来没有即时回报，但在后续每一步中持续产生价值。当你走到第六步，后台有 Agent 在持续处理任务，Harness 自动捕获和修正错误，你会发现前期投入的每一分钟都获得了指数级的回报。

这正是复利的魔力：慢就是快。

---

你在实际使用 Agent 时，有没有经历过「跳过第二步然后踩坑」的情况？或者你已经体会到了第二步带来的复利效应？欢迎留言讨论。

## 参考文献

1. Mitchell's Six-Step Agent Adoption Framework (来源：图片摘录，Page 86/249)
2. [小学标准化试卷 AI 批改 Agent 最佳工程实践](https://hugozhu.site/post/2025/110-ai-exam-grading-agent-best-practices/) — Harness 在批改场景的应用案例
3. [构建高质量订单文档分类器：智能导流到专业 Agent](https://hugozhu.site/post/2025/111-order-document-classifier-agent-routing/) — 路由型 Harness 架构
4. [Claude Code 自动修正生成代码的原理解析：Agent Loop 最佳实践](https://hugozhu.site/post/2025/113-claude-code-auto-correction-agent-loop/) — Agent Loop 反馈机制
5. [API、MCP 和 Skills：三个概念的本质区别](https://hugozhu.site/post/2025/109-api-mcp-skills-explained/) — Agent 交互模式对比
