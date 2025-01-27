---
title: 简化版本的异地组网
subtitle: Use tailscale docker image to simplify networking
date: 2025-01-26
tags: ["tailscale", "docker"]
---

前面介绍了使用openwrt来跑tailscale，比较合适硬路由。更简单的方法是官方的用tailscale docker镜像来搭建。

<!--more-->

## docker-compose配置

假设国内的网段是192.168.1.0/24, 海外是192.168.2.0/24, docker容器配置如下：

### 国内机器：
```bash
---
services:
  tailscale:
    container_name: tailscale
    image: tailscale/tailscale:latest
    environment:
      - TS_HOSTNAME=tailscale-node
      - TS_ROUTES=192.168.1.0/24
      - TS_AUTHKEY=<your_key>
      - TS_ACCEPT_DNS=true
      - TS_SOCKS5_SERVER=:1080
      - TS_EXTRA_ARGS=--accept-routes  --advertise-exit-node --reset
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_USERSPACE=false
    volumes:
      - ${PWD}/tailscale-state:/var/lib/tailscale
    devices:
      - /dev/net/tun:/dev/net/tun
    privileged: true
    cap_add:
      - net_admin
    restart: unless-stopped
    networks:
      macnet:
        ipv4_address: 192.168.1.10
    sysctls:
      - net.ipv4.ip_forward=1 

networks:
  macnet:
    name: macnet
    ipam:
      driver: default
      config:
        - subnet: '192.168.1.0/24'
          gateway: 192.168.1.1
    driver: macvlan
    driver_opts:
      parent: enp89s0   
      macvlan_mode: bridge
```

### 海外机器：
```bash
---
services:
  tailscale:
    container_name: tailscale
    image: tailscale/tailscale:latest
    environment:
      - TS_HOSTNAME=tailscale-node
      - TS_ROUTES=192.168.2.0/24
      - TS_AUTHKEY=<your_key>
      - TS_ACCEPT_DNS=true
      - TS_SOCKS5_SERVER=:1080
      - TS_EXTRA_ARGS=--accept-routes  --advertise-exit-node --reset
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_USERSPACE=false
    volumes:
      - ${PWD}/tailscale-state:/var/lib/tailscale
    devices:
      - /dev/net/tun:/dev/net/tun
    privileged: true
    cap_add:
      - net_admin
    restart: unless-stopped
    networks:
      macnet:
        ipv4_address: 192.168.2.10
    sysctls:
      - net.ipv4.ip_forward=1 

networks:
  macnet:
    name: macnet
    ipam:
      driver: default
      config:
        - subnet: '192.168.2.0/24'
          gateway: 192.168.2.1
    driver: macvlan
    driver_opts:
      parent: enp89s0   
      macvlan_mode: bridge
```

## 配置主路由器转发

看前面的文章介绍，两边的主路由，可以把目标地址为对方网段的流量路由到这个docker容器的IP。


## 生成热点AP转发

通过hostapd发射热点（AP）的dhcp配置将网关和DNS下发到接入的设备，这些设备将使用tailscale docker容器作为网关，tailscale的智能DNS服务器：100.100.100.100做为dns，这样设备不用安装tailscale也能连通异地网络。