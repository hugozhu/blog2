---
title: 树莓派热点通过tailscale exit节点上网
subtitle: route internet traffice from hostapd to tailscale exit-node
date: 2025-03-24
tags: ["tailscale", "hostapd"]
---

将接入tailnet的树莓派hostapd client通过tailscale exit节点上网

<!--more-->

## 配置如下

```bash
sudo nohup ./tailscaled > /dev/null 2>&1 &

sudo ./tailscale up

sudo ./tailscale set --exit-node=<your_node> --exit-node-allow-lan-access

sudo iptables -t nat -A POSTROUTING -o tailscale0 -j MASQUERADE

sudo iptables -A FORWARD -i wlan0 -o tailscale0 -m state --state RELATED,ESTABLISHED -j ACCEPT

sudo iptables -A FORWARD -i tailscale0 -o wlan0 -j ACCEPT

```