---
title: 通过主路由的智能路由分流策略将异地内网流量转发到docker里的openwrt
subtitle: redirect traffic to intranet with tailscale in openwrt with route rules
date: 2025-01-24
tags: ["tailscale", "openwrt", "docker"]
---

前面已经有介绍通过docker能开启一个内置tailscale的openwrt，本文将介绍怎么通过主路由的智能路由策略和这个openwrt打通异地内网。

<!--more-->

## 主路由端口配置好
主路由有多个端口，拿一个端口（路由模式，ip为192.168.100.254）连接openwrt的lan口，openwrt只配置lan口，ip设为192.168.100.1，gateway设为192.168.100.254

## Openwrt配置DNS
1. dnsmasq要绑定到192.168.100.1，而不是缺省的只能本机调用，这样其他主机才能查询DNS
2. dnsmasq的上游服务器要指向100.100.100.100

启动执行以下：
```
#!/bin/bash

echo "start tailscaled ..."
./tailscaled --state=tailscaled.state >/dev/null 2>&1 &

sleep 15 

./tailscale up --accept-routes --accept-dns=true

iptables -t nat -A POSTROUTING -o tailscale0 -j MASQUERADE
iptables -A FORWARD -i eth0 -o tailscale0 -j ACCEPT
iptables -A FORWARD -i tailscale0 -o eth0 -j ACCEPT
```

## 主路由设置DHCP下发的DNS
要设置为openwrt的dnsmasq地址，这样就能解析内网的域名了。

## 主路由设置路由策略

```
1. 源地址: 本地内网网段
2. 目标地址: 异地内网网段
3. 下一跳网关： 192.168.100.1
```

## 其他
如果是硬路由，还可以把wan口用其他出口线路，lan口和主路由的wan口，将openwrt作为主路由的上一级路由。