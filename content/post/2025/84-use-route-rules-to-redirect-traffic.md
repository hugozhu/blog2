---
title: 通过主路由的路由分流策略将异地内网流量转发到docker里的openwrt
subtitle: Redirect Traffic to Intranet with Tailscale in OpenWrt Using Route Rules 
date: 2025-01-24
tags: ["tailscale", "openwrt", "docker"]
---

在之前的文章中，我们已经介绍了如何通过 Docker 启动一个内置 Tailscale 的 OpenWrt。本文将进一步介绍如何结合主路由的智能路由策略，将异地内网流量高效转发到这个 OpenWrt 实例中，实现异地内网的无缝互联。

<!--more-->

## 主路由端口配置
主路由通常是多网口硬件设备。选择其中一个网口（如 Ge04），设置为路由模式，并将 IP 配置为 `192.168.100.254`，同时启用 DHCP 功能。OpenWrt 连接到这个 Ge04 接口时，仅配置 LAN 口，IP 设置为 `192.168.100.1`，网关则设为 `192.168.100.254`。这样，OpenWrt 和主路由的 Ge04 端口便处于同一个网段，为主路由快速转发流量到 OpenWrt 打通了一条通道。

## OpenWrt 的 DNS 配置
在 OpenWrt 中，需要对 DNS 服务进行以下配置：  
1. 将 `dnsmasq` 绑定到 `192.168.100.1`，而不是默认的本机调用地址。这样，局域网中的其他设备也可以使用它来解析 DNS。  
2. 将 `dnsmasq` 的上游服务器设置为 `100.100.100.100`。  

配置完成后，执行以下脚本以启动tailscale服务并配置防火墙规则：  
```bash
#!/bin/bash

echo "启动 Tailscaled..."
./tailscaled --state=tailscaled.state >/dev/null 2>&1 &

sleep 15 

./tailscale up --accept-routes --accept-dns=true

# 配置防火墙规则
iptables -t nat -A POSTROUTING -o tailscale0 -j MASQUERADE
iptables -A FORWARD -i eth0 -o tailscale0 -j ACCEPT
iptables -A FORWARD -i tailscale0 -o eth0 -j ACCEPT
```

## 主路由 DHCP 下发的 DNS 配置
在主路由中，将 DHCP 客户端的 DNS 服务器地址设置为 OpenWrt 的 `dnsmasq` 地址 `192.168.100.1`。这样，连接到主路由的设备便可以解析异地内网的域名。

## 主路由的路由策略配置
在主路由中，需要配置以下路由策略以实现流量分流：  
1. **源地址**：本地内网网段  
2. **目标地址**：异地内网网段  
3. **下一跳网关**：`192.168.100.1`  

通过上述配置，主路由将本地流量智能转发到 OpenWrt，以实现异地内网访问。

## 其他场景配置
如果主路由和 OpenWrt 都是多网口设备，还可以进一步优化配置：  
- 将 OpenWrt 的 WAN 口连接到主路由的某个 LAN 口（如 Ge03），作为 OpenWrt 的出口线路。  
- 将 OpenWrt 的某个 LAN 口连接到主路由的另一个网口（如 Ge01），并将 Ge01 配置为主路由的 WAN 口。  

这种设置方法可在复杂网络环境中提供更多的灵活性和高效性。

--- 

通过以上配置，您可以在主路由和 Docker 中的 OpenWrt 间实现高效的流量分流策略，为异地内网访问提供可靠的解决方案。