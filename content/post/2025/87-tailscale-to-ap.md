---
title: 通过wifi热点接入tailscale网络
subtitle: tailscale to ap
date: 2025-01-27
tags: ["tailscale", "docker", "wifi"]
ingested: 2026-05-04
sha256: b8cdac71d5fb9b24107b382fc86bc23938ff396f755605fc313796f123de12c2
---
tailscale docker容器做为局域网的网关，可以让局域网内的设备无需安装tailscale客户端即可访问tailscale网络内的其他设备。
提升了便利性，安全性通过局域网访问控制来保障。

适用场景：
- 你的 Tailscale 容器充当 VPN 代理，让设备通过它访问互联网。
- 你希望本机（或其他 Docker 容器）能够访问 Tailscale 网络中的设备。

<!--more-->

## 启动脚本和配置文件

这里不展开hostapd的配置，有需要可以翻看前面的文章。

### 启动脚本：startup.sh
```bash
#!/bin/bash

if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs) 
fi

# 打开网卡混杂模式，接收所有数据包，无论目的 MAC 地址是什么
ip link set end0 promisc on

# 创建macvlan docker网络
#docker network create -d macvlan --subnet=192.168.1.0/24 --gateway=192.168.1.1 -o parent=end0 macnet

# 增加mavlan的桥接接口，让主机可以访问macvlan docker容器
ip link add macvlan-br link end0 type macvlan mode bridge
#ip addr add 192.168.1.223/32 dev macvlan-br
ip link set macvlan-br up

# 假设macvlan docker容器的ip为192.168.1.11
ip route add 192.168.1.11/32 dev macvlan-br

# 设置网络地址转换（NAT）中的地址伪装规则， MASQUERADE 规则允许连接到热点的设备通过树莓派访问外部网络： make client from wifi can access the net
iptables -t nat -I POSTROUTING -j MASQUERADE

# set wifi ip address
ip addr add 192.168.3.1 dev wlxe84e066f6aa3
ip route add 192.168.3.0/24 dev wlxe84e066f6aa3

# make wifi client use tailscale container as router to the internet
ip rule add from 192.168.3.1/24 table 1
ip route add default via 192.168.1.11 table 1


# 启动tailscale和hostapd容器
docker-compose up -d 

#enable ipforwarding and exit node can be used with router mode
# echo 'net.ipv4.ip_forward = 1' | sudo -a /etc/sysctl.d/99-tailscale.conf
docker exec -it tailscale sysctl -w net.ipv4.ip_forward=1

# 让 Tailscale 设备访问互联网
docker exec -it tailscale iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# 让本机或其他 Docker 容器访问 Tailscale 网络
docker exec -it tailscale iptables -t nat -A POSTROUTING -o tailscale0 -j MASQUERADE

# 列出所有出口节点
docker exec -it tailscale tailscale status | grep "exit node"

# 选择其中一个出口节点，除局域网流量外，所有流量将通过这个出口节点
docker exec -it tailscale tailscale set --exit-node=<your-exit-node-host> --exit-node-allow-lan-access
```

### 容器编排文件： docker-compose.yaml：
```bash
---
services: 
  tailscale:
    container_name: tailscale
    image: tailscale/tailscale:latest  
    env_file:
      - .env
    environment:
      - TS_STATE_DIR=/var/lib/tailscale
    volumes:
      - ${PWD}/tailscale-state:/var/lib/tailscale
    devices:
      - /dev/net/tun:/dev/net/tun
    privileged: true
    cap_add:
      - net_admin
    networks:
      macnet:
        ipv4_address: 192.168.1.11
    sysctls:
      - net.ipv4.ip_forward=1
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"    
  hostapd:
    container_name: hostapd
    build: .
    image: hostapd
    cap_add: 
      - net_admin
    stop_grace_period: 3s
    network_mode: host
    env_file:
     - .env      
    volumes: 
      - ./conf/hostapd.conf:/etc/hostapd/hostapd.conf
      - ./conf/dhcpd.conf:/etc/dhcp/dhcpd.conf
      - ./entrypoint.sh:/entrypoint.sh
    entrypoint: ["/entrypoint.sh"] 
    extra_hosts:
      - "ifconfig.me:34.117.118.44"        
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"        

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
      parent: end0   
      macvlan_mode: bridge
```

### 环境变量文件： .env
```bash

OUTGOING_INTERFACE=end0
WLAN_INTERFACE=wlxe84e066f6aa3

TS_HOSTNAME=hugo-tailscale-01
#TS_ROUTES=192.168.1.0/24
TS_AUTHKEY=<your_tskey-auth>
TS_ACCEPT_DNS=true

#socks5代理端口，方便使用代理访问tailscale网络
TS_SOCKS5_SERVER=:1080
TS_EXTRA_ARGS=--accept-routes --reset

#使用内核网络，性能较好，兼容性差一些
TS_USERSPACE=false
```
