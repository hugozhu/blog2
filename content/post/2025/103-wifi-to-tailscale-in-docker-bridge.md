---
title: 实现docker中的Tailscale做为路由器
subtitle: Implementing Tailscale as a Router in Docker
date: 2025-04-28
tags: ["tailscale", "docker", "hostapd"]
---

tailscale docker容器做为局域网的网关，前面有介绍用macvlan来实现，这次介绍bridge来实现的方案，适合不允许创建macvlan的机器。

! docker 28后似乎不行了，不能做为路由器。

<!--more-->

```yaml
---
version: "3.7"
services:
  tailscale:
    container_name: tailscale
    image: tailscale/tailscale:latest
    env_file:
      - .env
    ports:
      - 11080:1080
      - 9002:9002
      - 10053:53/tcp
      - 10053:53/udp
    volumes:
      - ${PWD}/tailscale-state:/var/lib/tailscale
    devices:
     - /dev/net/tun:/dev/net/tun
    cap_add:
     - net_admin
    restart: always
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
          "http://127.0.0.1:9002/healthz"
        ]
      timeout: 30s
      interval: 30s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"
    networks:
      tailscale_network:
        ipv4_address: 192.168.1.10  # 为 Tailscale 容器分配静态 IP 地址
  hostapd:
    depends_on:
      tailscale:
        condition: service_started
    container_name: hostapd
    build: docker
    image: hostapd
    cap_add:
      - NET_ADMIN
    stop_grace_period: 3s
    network_mode: host
    restart: unless-stopped
    env_file:
     - .env
    volumes:
      - ./conf/hostapd.conf:/etc/hostapd/hostapd.conf
      - ./conf/dnsmasq.conf:/etc/dnsmasq.conf
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
  tailscale_network:
    name: tailscale_network
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: br-tailscale
    driver: bridge
    ipam:
      config:
        - subnet: 192.168.1.0/24  # 使用与上面相同的子网
```

重启后的启动脚本:

@reboot sudo /home/hugo/Projects/wifi2ts/reboot.sh > /home/hugo/Projects/wifi2ts/reboot.log 2>&1 &


```bash
#!/bin/bash

cd /home/hugo/Projects/wifi2ts

docker-compose up -d

# Function to check if the network is ready
check_network() {
    # Try pinging a reliable external server (e.g., Google DNS)
    ping -c 1 8.8.8.8 > /dev/null 2>&1
    return $?
}

# Wait for the network to be ready
echo "Waiting for network to be ready..."
while ! check_network; do
    echo "Network not ready, retrying in 5 seconds..."
    sleep 5
done

export $(grep -v '^#' .env  | grep -v 'reset' | xargs)

#modprobe -r iwlwifi
#modprobe iwlwifi lar_disable=1

# 开启 IP 转发
sysctl -w net.ipv4.ip_forward=1

echo "1"
# 添加 NAT 规则（出口是 eno1）
iptables -t nat -A POSTROUTING -o eno1 -j MASQUERADE

# 接受从 AP 过来的数据转发到外网
iptables -A FORWARD -i $WLAN_INTERFACE -o eno1 -j ACCEPT

# 接受从外网返回的数据包
iptables -A FORWARD -i eno1 -o $WLAN_INTERFACE -m state --state RELATED,ESTABLISHED -j ACCEPT

# 让HOST能访问tailnet中的主机
#ip route add 100.64.0.0/10 via 192.168.0.2

# 对tailscale容器的网桥接口br-tailscale启用NAT
iptables -t nat -A POSTROUTING  -o br-tailscale -j MASQUERADE

echo "2"

ip addr add 192.168.3.1/24 dev $WLAN_INTERFACE
ip link set $WLAN_INTERFACE up
ip route add 192.168.3.0/24 dev $WLAN_INTERFACE

# 让hostapd的设备流量走tailscale容器
ip rule add from 192.168.3.1 lookup main priority 100

# 其它 192.168.3.0/24 的流量走 table 1
ip rule add from 192.168.3.0/24 table 1 priority 200

# 设置 table 1 的路由
ip route add 192.168.1.10/32 dev br-tailscale
ip route add default via 192.168.1.10 table 1

echo "3"

# 设置tailscale容器能转发包（做路由器）
docker exec tailscale iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
docker exec tailscale iptables -t nat -A POSTROUTING -o tailscale0 -j MASQUERADE


echo "done"
```

# Docker Bridge 网络对比：20.x vs 28.x

在升级 Docker 时，很多人会关心 **bridge 网络** 的变化。本文主要对比 Docker **20.x** 与 **28.x** 在 bridge 网络方面的差异。

---

## 1. 网络实现底层变化

- **Docker 20.x**
  - 使用 `iptables` + `bridge` 做 NAT 转发和网络隔离。
  - 默认 bridge 名称：`docker0`，IP 子网通常为 `172.17.0.0/16`。
  - IPv6 支持需要手动开启。

- **Docker 28.x**
  - 默认支持 **nf_tables**，逐步替代传统 `iptables`。
  - IPv6 默认支持更好，可直接在 bridge 网络启用。
  - 更紧密集成 `containerd`，网络管理更高效。

---

## 2. 默认配置变化

| 配置项 | Docker 20.x | Docker 28.x |
|--------|-------------|-------------|
| 默认 bridge 名 | `docker0` | `docker0` |
| 默认子网 | `172.17.0.0/16` | 可自定义子网和网关 |
| NAT/防火墙 | iptables | nftables 优先 |
| IPv6 支持 | 需手动开启 | 可直接启用 |
| MTU | 1500 | 1500，overlay 网络处理更智能 |

---

## 3. 功能和行为变化

- **网络调试和管理**
  - Docker 28.x 对 `docker network inspect` 输出更详细，包括 IPAM 配置和端口映射信息。
  - 对 `docker compose` 生成的 bridge 网络兼容性更好。

- **安全性**
  - 28.x 对自定义 bridge 的隔离性更强，容器之间通信默认更安全。

- **兼容性注意**
  - 如果你以前直接用 `iptables` 操作 docker0，升级到 28.x 后可能需要改为 `nftables`。

---

## 4. 总结

1. **核心差异**：底层 NAT/转发由 iptables → nftables。
2. **IPv6 与子网管理** 更灵活。
3. **调试输出更详细**，Docker Compose 兼容性提升。
4. **脚本适配提醒**：直接操作 iptables 的规则可能需要更新。

💡 **小建议**：如果只是日常容器通信和开发，bridge 网络的基本行为几乎不变，升级后不用担心。但如果你的脚本依赖 iptables，升级前一定要检查兼容性。

---

你可以附上一个可选的对比图，让读者一眼看懂 20.x 与 28.x 的 NAT 转发和 bridge 网络差异。
