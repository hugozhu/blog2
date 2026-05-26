# Case Study Templates

Concrete case study structures from published posts. Use as reference patterns.

## Template 1: Two-Stage AI Pipeline (会议纪要)

**Context**: When one AI model is fast but inaccurate, combine with a second model for correction.

```
[输入] 
    ↓ (实时，低延迟)
[AI Stage 1: 快速生成] → 草稿（80% 准确）
    ↓ (异步，高推理)
[AI Stage 2: 纠错补全] → 精校版（95%+ 准确）
    ↓ (人工确认)
[最终输出]
```

**Key elements to include**:
- Specific failure modes of Stage 1 (术语错误、意图混淆、遗漏)
- Stage 2 Prompt as Python dataclass with correction rules
- Role separation: Stage 1 = speed, Stage 2 = accuracy, Human = confirmation
- Comparison table: Stage 1 only vs. Two-stage vs. Manual

**Metrics to show**:
| 指标 | 单用 Stage 1 | 两阶段 | 纯人工 |
|------|-------------|--------|--------|
| 端到端时间 | 2 min | 5 min | 30 min |
| 准确率 | ~80% | ~96% | ~98% |
| 人类介入时间 | 10 min | 2 min | 30 min |

## Template 2: Collect-Compile-Query Pipeline (知识管理)

**Context**: When information is fragmented and AI summarization causes hallucination.

```
[收集阶段]
多源输入 → [规则过滤] → 原始素材池

[编译阶段]（定时触发）
原始素材池 → [AI 编译器] → 结构化知识库（可追溯）

[查询阶段]
自然语言 → [RAG] → 精确检索 + 引用溯源
```

**Key elements to include**:
- Collection rules as Python dataclass (human defines value, AI executes)
- Compilation Prompt with strict rules: no creation, no over-summarization, traceable
- RAG query example showing source attribution
- Contrast: 「AI as summarizer」 (hallucination) vs. 「AI as compiler」 (traceable)

**Metrics to show**:
| 维度 | 传统方式 | AI 直接总结 | 收集+编译 |
|------|---------|------------|-----------|
| 信息保留度 | 高（不看） | 低 | 高 |
| 可追溯性 | 无 | 弱 | 强 |
| 幻觉率 | N/A | ~15% | <2% |

## Pattern Principles

1. **Problem first**: Start with a concrete, observed pain point — not 「假设」
2. **Diagram the flow**: ASCII pipeline showing data movement and role boundaries
3. **Show the protocol**: Python dataclass for Prompt/config — make it runnable
4. **Compare quantitatively**: Table with real metrics, not qualitative claims
5. **Extract the principle**: One-sentence engineering insight from the case
