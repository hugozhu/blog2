---
title: 构建可通过IP访问的tailscale的derp relay节点
subtitle: create derp relay node for tailscale
date: 2025-01-10
tags: ["tailscale", "docker", "derp"]
---

derp节点可用加速tailscale网络的连通性能

<!--more-->

## 实现步骤

### 1. 用docker来启动

1. **docker-compose.yaml**：

   ```bash
version: "3"
services:
  tailscale:
    image: tailscale/tailscale
    container_name: tailscale
    privileged: true
    restart: always
    volumes:
      - "./tailscale/data:/var/lib/tailscale"
      - "./tailscale/tmp:/tmp"
      - "/dev/net/tun:/dev/net/tun"
    cap_add:
      - net_admin
      - sys_module
    environment:
      TS_AUTHKEY: "<your_tailscale_auth_key>"
      TS_STATE_DIR: "/var/lib/tailscale"
      TS_USERSPACE: "false"
    networks:
      - tailscale_network
    dns:
      - 8.8.8.8
      - 8.8.4.4
  
  derper:
    #image: starudream/derper
    build:
      context: ./build
      dockerfile: Dockerfile
    container_name: derper
    restart: always
      #command: /tailscale/derper -a :80 -verify-clients
    depends_on:
      - tailscale
    ports:
      - "3478:3478/udp"
      - "80:80/tcp"
      - "443:443/tcp"
    volumes:
      - "./tailscale/tmp:/var/run/tailscale"
    networks:
      - tailscale_network
    dns:
      - 8.8.8.8
      - 8.8.4.4

networks:
  tailscale_network:
    external: true
   ```

2. **build/Dockerfile**

   ```bash
# 编译
FROM golang:alpine AS builder

# 切换模块源为中国Go模块代理服务器
RUN go env -w GOPROXY=https://goproxy.cn,direct

# 拉取代码
RUN go install tailscale.com/cmd/derper@latest

# 去除域名验证（删除cmd/derper/cert.go文件的91~93行）
RUN find /go/pkg/mod/tailscale.com@*/cmd/derper/cert.go -type f -exec sed -i '97,99d' {} +

# 编译
RUN derper_dir=$(find /go/pkg/mod/tailscale.com@*/cmd/derper -type d) && \
	cd $derper_dir && \
    go build -o /etc/derp/derper

# 生成最终镜像
FROM alpine:latest

WORKDIR /apps

COPY --from=builder /etc/derp/derper .

RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo 'Asia/Shanghai' > /etc/timezone

ENV LANG C.UTF-8

# 创建软链接 解决二进制无法执行问题 Amd架构必须执行，Arm不需要执行
RUN mkdir /lib64 && ln -s /lib/libc.musl-x86_64.so.1 /lib64/ld-linux-x86-64.so.2

# 添加源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories

# 安装openssl
RUN apk add openssl && mkdir /ssl

# 生成自签10年证书
RUN openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes -keyout /ssl/<your_domain>.key -out /ssl/<your_domain>.crt -subj "/CN=<your_domain>" -addext "subjectAltName=DNS:<your_domain>"


CMD ./derper -hostname <your_domain> -certmode manual -certdir /ssl --verify-clients=false
   ```

    用 ```curl -k https://<ip>/``` 验证

### 添加新增derp节点到Tailscale

   Open **https://login.tailscale.com/admin/acls/file**

   ```bash
	"derpMap": {
		// 如果想要所有节点只使用自建中继的话，就启用这条配置
		// "OmitDefaultRegions": true,
		"Regions": {
			"901": {
				"RegionID":   901,
				"RegionCode": "test",
				"RegionName": "test",
				"Nodes": [
					{
						"Name":             "test",
						"HostName":         "<host_name>",
						"RegionID":         901,
						"DERPPort":         443,
						"STUNPort":         3478,
						"IPv4":             "<host_ip>",
						"InsecureForTests": true,
					},
				],
			},
		},

   ```   