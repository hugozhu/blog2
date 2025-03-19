---
title: 通过Tailscale Derp节点的公网和私网IP高性能打通网络
subtitle: Tailscale Derp Node with public and private IP
date: 2025-03-18
tags: ["tailscale", "derp"]
---

Tailscale 是一个基于 WireGuard 的零配置 VPN 方案，使用官方 Derp（Distributed Exit Relay Protocol）中继服务器可以轻松穿透 NAT 进行设备互联。但在特定场景下，例如企业内网或跨地域机房互联时，默认的 Derp 可能不是最优解。本文介绍如何通过配置自建 Derp 服务器，使 A 网络解析为内网 IP，B 网络解析为公网 IP，实现高性能互联。

<!--more-->

## 方案概述
在 Tailscale 网络中，不同节点可以通过自定义 Derp 服务器进行中继通信。如果 A 机器位于内网，而 B 机器在公网，则可以利用 DNS 解析策略，让 A 解析为私网 IP，B 解析为公网 IP，从而优化连接路径，提高数据传输性能。

## 配置示例
在 Tailscale 的 `derpMap` 配置中，我们可以设定一个自建 Derp 服务器，并分别指定其公网和私网地址。示例如下：

```json
"derpMap": {
    "OmitDefaultRegions": true, #只连自建derp
    "Regions": {
        "900": {
            "RegionID": 900,
            "RegionCode": "hk1",
            "RegionName": "HK1",
            "Nodes": [
                {
                    "Name": "derp01",
                    "HostName": "derp01.yourmain.com",
                    "RegionID": 900,
                    "DERPPort": 443,
                    "STUNPort": 3478,
                    "InsecureForTests": true
                }
            ]
        }
    }
}
```

在derp节点上抓包测试验证：
```bash
tcpdump -v -n -i eth0  port 3478
```

### 关键配置解析
1. **`OmitDefaultRegions: true`**
   - 该配置确保所有节点只使用自定义 Derp 服务器，而不会使用 Tailscale 官方的 Derp 节点。
2. **`derp01.yourmain.com` 解析控制**
   - A 网络中的机器解析该域名时，返回 `172.25.1.1`（内网 IP）。
   - B 网络中的机器解析时，返回 `114.114.114.100`（公网 IP）。
3. **STUN 端口**
   - `STUNPort` 用于 NAT 穿透，若网络条件允许，可优化为直接 P2P 连接。

## 实践效果
- A 机器在访问 B 机器时，通过内网 IP 直接连接，避免公网绕行。
- B 机器由于不在同一私网，只能通过公网 IP 访问，但仍然走自建 Derp 节点，确保最优路径。
- 实现了公网、私网 IP 智能解析，提高了数据传输的稳定性和速度。

## 适用场景
- **跨地域数据中心互联**：避免公网带宽消耗，提升传输效率。
- **企业内部网络优化**：自定义流量路径，降低延迟。
- **远程办公加速**：通过本地 Derp 服务器优化访问速度。

## 结论
通过 Tailscale 自建 Derp 服务器，并结合智能解析策略，可以高效优化跨网段互联的性能，降低延迟，同时保证稳定性。

