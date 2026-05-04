---
title: "大模型 Tool Use 准确率可达 99%，但前提是工具足够简单"
subtitle: "为什么平台服务 Tools 化的最佳实践是写 CLI"
date: 2026-03-02
tags: ["AI", "LLM", "tool-use", "CLI", "AI-agents", "architecture", "best-practices"]
ingested: 2026-05-04
sha256: 82606a44ff121bcd67f80f7bd6811834285ec34e3c07a04abee497ccf277adb6
---
最近在做 Agent 开发时，我发现一个有意思的现象：大模型调用工具的准确率其实可以非常高，达到 99% 甚至更高——但这有一个关键前提：**工具本身要足够简单**。这也解释了一个行业趋势：越来越多的平台服务在做 Tools 化时，选择的路径是写 CLI，而不是暴露复杂的 SDK 或 REST API。

<!--more-->

## Tool Use 的准确率到底取决于什么

先澄清一个误区：当我们说"大模型会用工具"，不是说模型理解了工具的底层实现，而是说模型能**正确地生成符合工具调用规范的结构化输出**。

一次工具调用，模型需要做对三件事：

1. **选对工具**：在多个可用工具中选择正确的那个
2. **填对参数**：根据上下文生成正确的参数值
3. **理解返回值**：正确解读工具的返回结果并据此行动

```
用户意图 → 选择工具 → 构造参数 → 调用执行 → 解读结果
              ↑          ↑          ↑          ↑
           准确率       准确率      成功率      准确率
           取决于       取决于      取决于      取决于
          工具描述      参数复杂度   工具质量    返回值设计
```

每一步的准确率相乘，就是最终的端到端准确率。如果每步 99%，四步下来也只有 96%。如果某一步只有 95%，整体就掉到 90% 以下了。

这意味着：**要提高 Tool Use 的整体准确率，每一步都必须尽可能简单**。

## 什么样的工具调用是"简单"的

我们来对比两种风格的工具定义。

### 复杂工具：一个典型的 REST API

```json
{
  "name": "create_deployment",
  "description": "Create a new deployment for the specified service",
  "parameters": {
    "service_id": "string (required)",
    "environment": "string, one of: production, staging, preview",
    "config": {
      "replicas": "integer, 1-100",
      "memory": "string, e.g. '512Mi', '2Gi'",
      "cpu": "string, e.g. '0.5', '2'",
      "env_vars": "object, key-value pairs",
      "health_check": {
        "path": "string",
        "interval": "integer (seconds)",
        "timeout": "integer (seconds)"
      },
      "scaling": {
        "min": "integer",
        "max": "integer",
        "target_cpu_percent": "integer"
      }
    },
    "strategy": "string, one of: rolling, blue-green, canary",
    "canary_percent": "integer, 0-100, only if strategy is canary"
  }
}
```

模型需要理解嵌套结构、条件参数（`canary_percent` 只在 `strategy` 为 `canary` 时有效）、单位格式（`512Mi`）、参数间的约束关系。出错概率大幅上升。

### 简单工具：等效的 CLI 命令

```bash
deploy create <service-name> --env staging --replicas 2 --memory 512Mi
```

同样的操作，CLI 风格把它压缩成了一个**扁平的、线性的**命令。大部分参数有合理的默认值，用户（和模型）只需要指定关心的那几个。

这就是 CLI 的核心优势：**它天然就是为"简单调用"设计的**。

## 为什么 CLI 是大模型最好的工具接口

CLI 之所以适合作为 LLM 的工具接口，原因可以归纳为以下几点：

### 1. 参数是扁平的

CLI 的参数结构天然是一维的：`command subcommand --flag value`。没有嵌套 JSON，没有复杂的对象结构。对模型来说，生成一个扁平的字符串远比构造一个多层嵌套的 JSON 对象容易。

### 2. 有丰富的训练数据

互联网上有海量的 CLI 使用示例。从 Stack Overflow 到 GitHub Issues，从官方文档到博客教程，模型在预训练阶段已经见过无数的 CLI 调用。这意味着模型对 CLI 的"语法直觉"非常好。

```bash
# 模型见过数百万次这类命令
git commit -m "fix: resolve login issue"
docker run -d -p 8080:80 nginx
kubectl get pods -n production
```

这些模式已经深深刻入了模型的权重中。

### 3. 默认值减少了决策负担

好的 CLI 设计会为大多数参数提供合理的默认值。模型只需要填写真正必要的参数，而不是面对一个巨大的参数表逐一做决策。决策越少，出错的空间就越小。

### 4. 帮助信息就是最好的工具描述

`--help` 的输出格式高度标准化，本质上就是一份精简的工具使用说明。把它直接塞进 system prompt 或工具描述里，模型就能很好地理解如何使用：

```
Usage: deploy create <service> [options]

Options:
  --env          Target environment (default: staging)
  --replicas     Number of replicas (default: 1)
  --memory       Memory limit (default: 256Mi)
  --cpu          CPU limit (default: 0.5)
  -h, --help     Show help
```

### 5. 组合优于复杂

Unix 哲学的"做好一件事"在 LLM 时代获得了新的生命。与其设计一个参数爆炸的万能工具，不如提供多个职责单一的小命令，让模型自己编排调用顺序：

```bash
# 三个简单命令，比一个复杂命令更不容易出错
deploy create my-service --env staging
deploy scale my-service --replicas 3
deploy promote my-service --from staging --to production
```

## 实际数据印证

我在 OpenClaw 项目中做过对比测试。把同一组平台操作分别封装成两种工具：

| 工具风格 | 平均参数数量 | 嵌套层级 | Tool Use 准确率 |
|----------|-------------|---------|----------------|
| 复杂 JSON Schema | 8-15 个 | 2-3 层 | ~87% |
| CLI 风格（扁平参数） | 3-5 个 | 0 层 | ~99% |

差距非常显著。当工具参数超过 7 个、或出现嵌套结构时，模型的准确率会明显下降。而 CLI 风格的工具，即便执行的是同样的底层操作，准确率却稳定在 99% 左右。

## 设计 LLM 友好工具的实践建议

基于以上观察，如果你正在为大模型设计工具接口，这里有几条实用建议：

### 保持参数扁平化

```
# 不好：嵌套参数
{"config": {"scaling": {"min": 1, "max": 10}}}

# 好：扁平参数
--scale-min 1 --scale-max 10
```

### 拆分复杂操作为多个简单命令

一个命令只做一件事。宁可让模型调用三次简单工具，也不要让它一次调用一个复杂工具。三次各 99% 的准确率（97%）仍然优于一次 87% 的准确率。

### 提供合理的默认值

能省的参数就省。模型不需要显式指定的参数，就不应该要求它指定。

### 返回值要结构清晰

工具的输出同样要简单明了。模型需要能一眼看懂返回的结果，才能正确地进行下一步推理。

```bash
# 好的返回：简单直接
✓ Deployment created: my-service (staging, 2 replicas)

# 不好的返回：信息过载
{"id":"dep-abc123","status":"CREATING","service":{"id":"svc-xyz","name":"my-service",...},...}
```

## 结论

大模型用工具的能力已经足够强了——在简单工具上，准确率可以做到 99% 以上。瓶颈不在模型，而在工具的设计。

CLI 之所以成为平台服务 Tools 化的最佳载体，不是因为它是什么新技术，恰恰是因为它足够老、足够简单、足够标准化。几十年的 Unix 哲学为 LLM 时代的工具设计提供了现成的答案：

> **保持简单。做好一件事。通过组合解决复杂问题。**

当你在设计 AI Agent 的工具接口时，不妨先问自己一个问题：这个操作能不能用一行命令描述清楚？如果不能，那可能不是模型的问题，而是你的工具还不够简单。
