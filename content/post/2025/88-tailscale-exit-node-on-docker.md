---
title: Tailscale Exit Node
subtitle: Tailscale Exit Node
tags: ["tailscale", "docker"]
---


# Tailscale Exit Node

## 什么是 Tailscale Exit Node？

[Tailscale](https://tailscale.com/) 是基于 WireGuard 的零配置 VPN 解决方案，可以轻松创建私有网络，让设备之间实现安全连接。而 **Exit Node（出口节点）** 功能允许你将某台设备作为所有流量的出口，就像 VPN 一样，帮助你绕过网络限制或访问受地理位置限制的内容。

<!--more-->

## Exit Node 的作用

1. **绕过网络限制**：在受限的网络环境下（如学校、公司或某些国家的网络），可以通过自己的出口节点访问受限资源。
2. **隐藏 IP 地址**：使用位于不同地区的出口节点来更改你的 IP 地址，提高隐私性。
3. **远程访问本地网络**：如果你出差或在外地，需要访问家里的 NAS、路由器或局域网设备，可以通过 Exit Node 实现。
4. **安全 Wi-Fi 连接**：在公共 Wi-Fi（如机场、咖啡厅）环境下，你可以将流量加密并通过可信任的出口节点路由，提高安全性。

## 如何设置 Tailscale Exit Node？

### 1. 在目标设备上启用 Exit Node

首先，确保你的设备已经安装并登录了 Tailscale。

- Linux / macOS / Windows:
  ```sh
  tailscale up --advertise-exit-node
  ```
- Android:
  进入 Tailscale App，找到 `Use Exit Node` 选项，选择想要的节点。

然后，进入 [Tailscale Admin 控制台](https://login.tailscale.com/admin/machines)，找到该设备，点击 `Edit route settings`，勾选 `Use as Exit Node`。

### 2. 让其他设备使用 Exit Node

在其他设备上，运行：
```sh
tailscale up --exit-node=<exit-node-IP>
```
或者，在 Tailscale 控制台的 `Settings` 里，选择 `Use Exit Node`。

### 3. (可选) 强制所有流量通过 Exit Node

如果你希望 **所有** 流量都通过 Exit Node，可以加上 `--exit-node-allow-lan-access=false`，这样本地流量也会通过该节点：
```sh
tailscale up --exit-node=<exit-node-IP> --exit-node-allow-lan-access=false
```

### 4. 使用 Docker 配置 Tailscale Exit Node

如果你想在 Docker 中运行 Tailscale 并设置 Exit Node，可以使用以下 `docker-compose.yml` 配置文件：

```yaml
version: "3.7"
services:
  tailscale:
    container_name: tailscale
    image: tailscale/tailscale:latest
    hostname: tailscale
    env_file: .env
    environment:
      - TS_STATE_DIR=/var/lib/tailscale
    volumes:
      - ${PWD}/tailscale-state:/var/lib/tailscale
    devices:
      - /dev/net/tun:/dev/net/tun
    privileged: true
    cap_add:
      - net_admin
    restart: unless-stopped
    sysctls:
      - net.ipv4.ip_forward=1
    healthcheck:
      test:
        [
          "CMD",
          "wget",
          "--no-verbose",
          "--tries=1",
          "--spider",
          "https://www.google.com/"
        ]
      timeout: 5s
      interval: 30s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"
```

.env 文件

```
#TS_HOST_IP=192.168.1.1
TS_HOSTNAME=<your_host_name>
#TS_ROUTES=192.168.1.0/24
TS_AUTHKEY=<tskey-auth-...>
TS_ACCEPT_DNS=true
TS_SOCKS5_SERVER=:1080
TS_EXTRA_ARGS=--accept-routes  --advertise-exit-node  --reset
TS_USERSPACE=false
```

这个配置会在 Docker 容器中运行 Tailscale，并允许其作为 Exit Node 供其他设备使用。

## Exit Node vs. 普通 VPN

| 特性 | Tailscale Exit Node | 传统 VPN |
|------|----------------|---------|
| 配置难度 | 低，只需几条命令 | 需要手动搭建服务器 |
| 设备支持 | 跨平台，支持所有 Tailscale 设备 | 取决于 VPN 供应商 |
| 安全性 | 基于 WireGuard，加密流量 | 取决于 VPN 技术 |
| 速度 | P2P 连接优化，低延迟 | 可能受限于 VPN 服务器 |
| 适用场景 | 个人、家庭、小团队 | 大规模商用 |


## 总结

Tailscale 的 Exit Node 功能让你可以轻松实现远程访问、绕过网络限制，并提高网络安全性。如果你已经在使用 Tailscale，不妨尝试启用 Exit Node。