---
title: StreamPi - 低成本快速响应系统监控工具
subtitle: the Low-Cost Fast Response System Monitoring Tool
date: 2025-01-03
tags: ["streamdeck", "streamdock", "mirabox", "raspberry pi"]
ingested: 2026-05-04
sha256: a3acea4246edb1f88eaaea0556fa257a77472037247f90dc6577be76f25fb37f
---
在云原生时代，应用的稳定性至关重要。本文将介绍如何利用树莓派和国产StreamDeck 这两个低成本的硬件来灵活监控云原生应用的稳定性，提高运维效率。

本文介绍如何使用Raspberry Pi和Streamdeck，以及Uptime Kuma监控线上系统的稳定性。

<!--more-->

> **关键词**：Raspberry Pi, StreamDeck, MiraBox, Uptime Kuma, DuckDB, Airflow, Aliyun SLS, DingTalk, Clickhouse, DataWorks, Grafana

## 什么是 StreamDeck？

StreamDeck 是一款可编程的硬件设备，最初设计用于流媒体控制，但其灵活性使其成为了一个优秀的 IT 运维工具，国产妙联宝是StreamDeck的平替，价格很香。

## 什么是 Raspberry Pi？

树莓派（Raspberry Pi）是一款低成本的小型单板计算机，适合学习编程、物联网和DIY项目。它具备处理器、USB、HDMI等接口，常用于教育、家居自动化和机器人开发。

## Uptime Kuma

**Uptime Kuma** (https://github.com/louislam/uptime-kuma) 是一个开源的监控工具，用于跟踪和监视网络服务的可用性。它提供了一个用户友好的界面，允许用户轻松地设置和管理监控任务。以下是 Uptime Kuma 的一些主要特点和功能：

### 主要特点

1. **多种监控类型**：
   - 支持 HTTP(s)、Ping、TCP、UDP、DNS 等多种监控方式，可以监控不同类型的服务。

2. **自托管**：
   - 可以在本地服务器或云服务器上自托管，用户可以完全控制监控数据和配置。

3. **实时监控**：
   - 提供实时的监控结果和服务状态，能够快速识别和响应服务故障。

4. **易于使用的界面**：
   - 具有直观的用户界面，用户可以轻松添加、配置和管理监控项。

5. **通知功能**：
   - 支持多种通知方式，包括电子邮件、Discord、Slack、Webhook 等，确保用户在服务出现问题时能够及时收到通知。

6. **历史数据**：
   - 提供监控历史数据的可视化，帮助用户分析服务的可用性和性能趋势。

7. **Docker 支持**：
   - 可以通过 Docker 快速部署，方便用户在各种环境中使用。

### 安装和使用

Uptime Kuma 的安装相对简单，用户可以选择通过 Docker 或直接在服务器上安装。其 GitHub 页面提供了详细的安装说明和文档，帮助用户快速上手。

### 适用场景

- 适用于 IT 管理员、开发者以及任何需要监控网络服务可用性的人。
- 特别适合需要监控多个服务和应用的中小型企业。

### 结论

Uptime Kuma 是一个功能强大且灵活的监控解决方案，非常适合那些希望通过自托管方式监控其网络服务的用户。其开源特性和多样的功能使其成为一个值得考虑的选择。

## 为什么选择 StreamDeck 监控系统稳定性？
- 快速访问：一键即可查看关键指标
- 可视化：通过 LED 按钮直观显示状态
- 自定义：可根据需求设置不同的监控项
- 提高效率：减少在多个监控界面间切换的时间
- 低成本低功耗：可24*7运行， 结合钉钉机器人还可以实现远程交互

## 运行环境配置

```bash
sudo apt install -y libudev-dev libusb-1.0-0-dev libhidapi-libusb0
pip install pyudev
# Add udev rule to allow all users non-root access to Elgato StreamDeck devices:
sudo tee /etc/udev/rules.d/10-streamdeck.rules << EOF
    SUBSYSTEMS=="usb", ATTRS{idVendor}=="0fd9", GROUP="users", TAG+="uaccess"
    EOF

# Add udev rule to allow all users non-root access to Elgato StreamDeck devices:
sudo tee /etc/udev/rules.d/20-streamdock.rules << EOF
SUBSYSTEMS=="usb", ATTRS{idVendor}=="5500", GROUP="users", TAG+="uaccess",ATTR{idProduct}=="1001", MODE="0666"

# Reload udev rules to ensure the new permissions take effect
sudo udevadm control --reload-rules
```

## Streampi工程

代码库地址：https://github.com/hugozhu/streampi

**创建streampi运行环境，这里使用conda工具**
```bash
conda create -n streampi
conda install pip
git clone https://github.com/hugozhu/streampi
pip -r reqirements.txt --upgrade
fastapi --version
```

## 配置插件
```bash
{    
    "server_port": 8001,
    "device_model": "streamdock",
    "text_setting": {
        "max_lines": 5,
        "fonts": {
            "tiny_font": 16,
            "small_font": 18,
            "medium_font": 20,
            "bold_font": 24
        }
    },    
    "plugins":[
        {
            "type": "UptimePlugin", 
            "url": "<your_url>",
            "username": "",
            "password": "",
            "interval": 60            
        }
    ], 
    "scenes":
        [
            [
                {"type": "ClockPlugin", "name": "Clock Plugin", "timezone": "Asia/Shanghai"},
                {"type": "ClockPlugin", "name": "Clock Plugin", "timezone": "America/Los_Angeles"},
                {  
                    "type": "BtcPlugin",
                    "name": "BTC Plugin", 
                    "title": "BTC", 
                    "interval": 300,
                    "image": "./Assets/btc.png"
                },
                {
                    "type": "BrightPlugin", 
                    "name": "Bright ++", 
                    "image": "./Assets/bright_on.png", 
                    "step": 10, 
                    "background": "#7c4487" 
                },
                {
                    "type": "BrightPlugin", 
                    "name": "Bright --", 
                    "image": "./Assets/bright_off.png", 
                    "step": -10, 
                    "background": "#7c4487" 
                },
                {"type": "NextPagePlugin", "name": "Next Page Plugin"}
            ]
        ]    
}
```

## 重置USB设备
按键失灵的时候，可以用以下命令
```bash
sudo usbreset <bus-id:001/device-number:015>
```

## 启动程序

```bash
copy config_sample.json config.json
fastapi run --port 8000
```
