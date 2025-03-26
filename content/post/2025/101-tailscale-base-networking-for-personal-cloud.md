---
title: tailscale是事实上的个人弹性云基础网络
subtitle: Tailscale is the de fact of elastic cloud infrastructure for personal cloud.
date: 2025-03-27
tags: ["tailscale", "coredns"]
---

从软件能力和易用性来说，tailscale已经是事实上的个人弹性云基础网络软件。在这个软件的支撑下，个人智能设备的算力，带宽和网络资源都能被充分利用和挖掘，智能体持续发展，“挖矿”（用知识训练AI，获得相应报酬）将成为职业。

<!--more-->

下文是接入一个tailnet的路由网关(gateway, router)的docker配置，安装和运行非常方便。 

## docker-compose.yaml
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
      - 1080:1080
      - 9002:9002
      - 53:53/tcp
      - 53:53/udp        
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
  coredns:
    container_name: coredns
    image: coredns/coredns:latest
    restart: always    
    env_file:
      - .env    
    depends_on:
      - tailscale    
    volumes:
      - ${PWD}/Corefile:/etc/coredns/Corefile    
    command: -conf /etc/coredns/Corefile
    network_mode: service:tailscale

```

## .env

```yaml
TS_HOSTNAME=hz-tailnet-gateway
TS_AUTHKEY=tskey-auth-<====authkey======>
TS_STATE_DIR=/var/lib/tailscale

TS_LOCAL_ADDR_PORT=0.0.0.0:9002
TS_SOCKS5_SERVER=:1080

TS_ENABLE_HEALTH_CHECK=true
TS_USERSPACE=true
TS_ACCEPT_DNS=true
TS_ENABLE_METRICS=true
TS_EXTRA_ARGS=--accept-routes --accept-dns=true --reset
```

## 运行
```bash
docker-compose up -d
```

## 设置网络出口IP
```bash
docker exec -it tailscale tailscale set --exit-node=<your_exit_node> --exit-node-allow-lan-access
```