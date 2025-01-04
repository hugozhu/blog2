---
title: StreamPi - 低成本快速响应系统监控工具
subtitle: the Low-Cost Fast Response System Monitoring Tool
date: 2025-01-03
tags: ["streamdeck", "streamdock", "mirabox", "raspberry pi"]
---

在云原生时代，应用的稳定性至关重要。本文将介绍如何利用树莓派和国产StreamDeck 这两个低成本的硬件来灵活监控云原生应用的稳定性，提高运维效率。
本文介绍如何使用Raspberry Pi和Streamdeck监控云原生大数据系统的稳定性

<!--more-->

> **关键词**：Raspberry Pi, StreamDeck, MiraBox, Uptime Kuma, DuckDB, Airflow, Aliyun SLS, DingTalk, Clickhouse, DataWorks, Grafana

## 什么是 StreamDeck？

StreamDeck 是一款可编程的硬件设备，最初设计用于流媒体控制，但其灵活性使其成为了一个优秀的 IT 运维工具，国产妙联宝是StreamDeck的平替，价格很香。

## 什么是 Raspberry Pi？

树莓派（Raspberry Pi）是一款低成本的小型单板计算机，适合学习编程、物联网和DIY项目。它具备处理器、USB、HDMI等接口，常用于教育、家居自动化和机器人开发。

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

```bash
conda create -n streampi
conda install pip
pip -r reqirements.txt --upgrade
fastapi --version
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
