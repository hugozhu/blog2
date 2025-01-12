---
title: 使用tailscale+openwrt+docker+macvlan将异地两机房组成一个局域网
subtitle: build intranet with tailscale and openwrt
date: 2025-01-04
tags: ["tailscale", "openwrt", "docker"]
---

在现代网络环境中，将位于不同地理位置的两个数据中心组成一个虚拟局域网，可以有效提升资源共享和管理效率。本文将介绍如何在 Docker 中使用 macvlan 网络模式安装 OpenWrt，并通过 Tailscale 实现异地数据中心的互联。

<!--more-->

## 工具简介

- **Docker**：开源的容器化平台，用于自动化应用程序的部署和管理。

- **macvlan**：Docker 提供的一种网络驱动，使容器能够直接与宿主机的物理网络接口通信，获得独立的 IP 地址。

- **OpenWrt**：开源的嵌入式操作系统，常用于路由器，提供强大的网络功能和可定制性。

- **Tailscale**：基于 WireGuard 的虚拟专用网络（VPN）解决方案，能够轻松实现设备间的安全互联，适用于不同网络环境的设备组成虚拟局域网。

## 实现步骤

### 1. 在 Docker 中安装 OpenWrt 并配置 macvlan 网络

1. **确认宿主机网络接口名称**：

   使用以下命令查看宿主机的网络接口名称（例如，`eth0`）：

   ```bash
   ifconfig
   ```

2. **设置网卡混杂模式**：

   启用宿主机网卡的混杂模式，以允许 macvlan 正常工作，注意这个方法不能使用无线网卡，得有线。

   ```bash
   ip link set eth0 promisc on   
   ```

3. **创建 macvlan 网络并启动 OpenWrt 容器**：

   使用docker-compose根据下面的配置创建 macvlan 网络并启动 OpenWrt 容器，假设主路由ip: `192.168.1.1` ，openwrt容器ip: `192.168.1.11`
   
   ```bash
   docker network create -d macvlan --subnet=192.168.1.0/24 --gateway=192.168.1.1 -o parent=end0 macnet
   ```
   
   docker-compose.yaml

```bash
version: '2.4'
services: 
  openwrt:
    container_name: openwrt_2025
    image: piaoyizy/openwrt-aarch64:latest
    privileged: true
    ports:
     - 80:80
    env_file:
     - .env      
    networks:
      macnet:
        ipv4_address: 192.168.1.11
    sysctls:
      - net.ipv4.ip_forward=1
    restart: unless-stopped          
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

4. **配置 OpenWrt 网络**：

   `docker exec -it openwrt_2025 /bin/sh` 进入 OpenWrt 容器，编辑网络配置文件 `/etc/config/network` ， 设置 LAN 接口的 IP 地址、子网掩码和网关。

   /etc/config/network 

```bash
config interface 'loopback'
	option device 'lo'
	option proto 'static'
	option ipaddr '127.0.0.1'
	option netmask '255.0.0.0'

config globals 'globals'
	option ula_prefix 'fd87:29d7:282e::/48'

config interface 'lan'
	option device 'eth0'
	option proto 'static'
	option ipaddr '192.168.1.11'
	option netmask '255.255.255.0'
	option ip6assign '60'
	option gateway '192.168.1.1'
	list dns '192.168.1.1'
	list dns_search 'hugozhu.site'

config device
	option name 'eth0'
	option promisc '1'
	option ipv6 '0'
```

   注意lan网络配置要修改，否则不一定能正常工作： 
   * 不要用桥接设备br-lan，而要使用eth0 
   * 关掉lan的DHCP服务
   * 打开firewall设置中lan的ip伪装，启用转发 
   
   ```bash
   cat /etc/config/firewall

   config zone
      option name 'lan'
      list network 'lan'
      option input 'ACCEPT'
      option output 'ACCEPT'
      option forward 'ACCEPT'   
      option masq '1'
   ```
      
   保存并重启网络服务：

   ```bash
      /etc/init.d/network restart
   ```

5. **测试验证**：

找台机器把缺省网关设置为192.168.1.11，测试 `curl https://ifconfig.me` 正确返回出口IP。

### 2. 在 OpenWrt 上安装并配置 Tailscale

1. **下载并解压 Tailscale**：

   在 OpenWrt 容器中，下载并解压 Tailscale 软件包：

   ```bash
   wget https://pkgs.tailscale.com/stable/tailscale_1.78.1_arm.tgz
   tar xzf tailscale_1.78.1_arm.tgz
   ```
   
   Ubuntu 20 LTS可以用下面的命令安装和启动：
   
   ```bash
   curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/focal.noarmor.gpg | sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null
   curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/focal.tailscale-keyring.list | sudo tee /etc/apt/sources.list.d/tailscale.list
   sudo apt-get update
   sudo apt-get install tailscale

   echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
   echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p /etc/sysctl.conf

   sudo tailscale up --advertise-exit-node
   ```

2. **启动并配置 Tailscale**：

   启动 Tailscale 服务，并进行初始配置：

   ```bash
   ./tailscaled --state=tailscaled.state > /dev/null 2>&1 &
   ```bash

   声明自己是网段192.168.1.0/24子网路由节点：

   ```bash
   ./tailscale up --advertise-routes=192.168.1.0/24
   ```

   执行 `tailscale up` 命令后，会生成一个用于授权的链接。在浏览器中打开该链接，登录 Tailscale 账户，完成设备的添加。

3. **设置开机自启**：

   为了确保 Tailscale 在系统重启后自动启动，可以将启动命令添加到 OpenWrt 的启动脚本中。编辑 `/etc/rc.local` 文件，在 `exit 0` 之前添加：

   较新的openwrt只内置了性能更好的nft，而不带iptables，需要通过以下环境变量配置
   ```bash   
   export TS_DEBUG_FIREWALL_MODE=nftables
   ```

   ```bash   
   nohup sudo ./tailscaled --state=tailscaled.state >/dev/null 2>&1 &
   ```
4. **设置出口节点**：
   **阿里云上的exit node**
   ```bash
   sudo ./tailscale up --accept-routes --accept-dns=false --exit-node=100.105.13.59 --exit-node-allow-lan-access
   ```

   **阿里云上的exit node设置**
   ```bash
   sudo tailscale up --accept-routes=false --accept-dns=false --advertise-exit-node --reset #-netfilter-mode=off
   ```
   
   **去掉Tailscale和阿里云内置DNS网段的冲突**

   ```bash
   sudo iptables -I INPUT 1 -s 100.100.2.0/24 -j ACCEPT
   ```
   or

   ```bash   
   sudo iptables -D ts-input -s 100.64.0.0/10 ! -i tailscale0 -j DROP
   ```

   保存并退出。

### 3. 配置路由和防火墙

为了确保两个数据中心的内网设备能够通过 Tailscale 实现互访，需要进行以下配置：

1. **启用 IP 转发**：

   在 OpenWrt 容器中，编辑 `/etc/sysctl.conf` 文件，确保以下参数被设置：

   ```bash
   net.ipv4.ip_forward=1
   ```

   然后执行 `sysctl -p` 使配置生效。

2. **配置防火墙**：

   确保防火墙允许来自 Tailscale 网络的流量访问内网资源。在 OpenWrt 的防火墙设置中，添加相关规则，允许 Tailscale 分配的 IP 范围访问内网。

   iptables 配置

   **启用 NAT 转换**
   ```bash   
   iptables -t nat -A POSTROUTING -o tailscale0 -j MASQUERADE
   ```
   **允许流量从本地网络转发到 Tailscale 隧道**
   ```bash      
   iptables -A FORWARD -i eth0 -o tailscale0 -j ACCEPT
   iptables -A FORWARD -i tailscale0 -o eth0 -j ACCEPT
   ```

   **nftable 配置**
   ```bash
   #!/usr/sbin/nft -f

   table inet nat {
      chain postrouting {
         type nat hook postrouting priority 100; policy accept;
         oif "tailscale0" masquerade
      }
   }

   table inet filter {
      chain forward {
         type filter hook forward priority 0; policy accept;
         iif "eth0" oif "tailscale0" accept
         iif "tailscale0" oif "eth0" accept
      }
   }
   ```

   然后执行 `nft -f ./nftables.conf` 使配置生效。     

3. **在 Tailscale 管理控制台中启用子网路由**：

   登录 Tailscale 管理控制台，找到对应的设备，启用其广告的子网路由，以确保其他设备可以通过 Tailscale 访问该子网。 



## See also:
* https://www.dongvps.com/2022-11-07/tailscale-exit-node-route/
