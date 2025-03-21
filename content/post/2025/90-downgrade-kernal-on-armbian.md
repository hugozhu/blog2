---
title: Armbian 内核降级指南：恢复系统正常启动的完整流程
subtitle: Tailscale Derp Node with public and private IP
date: 2025-03-18
tags: ["tailscale", "derp"]
---


R2S常规apt upgrade升级后重启，系统就启动不了了。怀疑是内核不兼容，把TF卡取出后通过USB转换器插入到树莓派USB口，尝试降级内核后解决了。

<!--more-->

## **背景介绍**
Armbian 是一个轻量级、优化良好的 Linux 发行版，主要用于 ARM 设备（如 Rockchip、Allwinner 和 Raspberry Pi）。由于不同的设备驱动和底层硬件适配，**升级内核可能会导致设备无法正常启动**。因此，了解如何正确降级内核对于维护系统稳定性至关重要。

在本文中，我们将介绍如何在 Armbian 系统中**降级内核**，以便恢复到一个可正常启动的版本。

---

### 挂载 Armbian 系统盘
在另一台 Linux 机器上，将系统盘插入后，确定其分区情况，可以使用：

```bash
sudo fdisk -l

sudo mkdir -p /mnt/armbian_root

sudo mount /dev/sda1 /mnt/armbian_root

```
### 准备 chroot 环境
```bash
sudo mount --bind /dev /mnt/armbian_root/dev
sudo mount --bind /dev/pts /mnt/armbian_root/dev/pts
sudo mount --bind /proc /mnt/armbian_root/proc
sudo mount --bind /sys /mnt/armbian_root/sys
```
进入 chroot 环境：

```bash
sudo chroot /mnt/armbian_root
```

### 查看和安装旧内核

查看源的内核版本：
```bash
wget -qO - http://apt.armbian.com/dists/bookworm/main/binary-arm64/Packages | grep -A 5 "Package: linux-image-current-rockchip64"

Package: linux-image-current-rockchip64
Priority: optional
Section: kernel
Installed-Size: 270732
Maintainer: Armbian Linux <info@armbian.com>
Architecture: arm64
Source: linux-6.12.19
Version: 25.2.3
Provides: linux-image, linux-image-armbian, armbian-current
Filename: pool/main/l/linux-6.12.19/linux-image-current-rockchip64_25.2.3_arm64__6.12.19-Se9cc-Da873-Pfa20-C1f18H02eb-HK01ba-Vc222-B9bbb-R448a.deb
Size: 48557592
--
Package: linux-image-current-rockchip64
Priority: optional
Section: kernel
Installed-Size: 273826
Maintainer: Armbian Linux <info@armbian.com>
Architecture: arm64
Source: linux-6.12.17
Version: 25.2.2
Provides: linux-image, linux-image-armbian, armbian-current
Filename: pool/main/l/linux-6.12.17/linux-image-current-rockchip64_25.2.2_arm64__6.12.17-S41b2-Da873-P1e8e-C67e9H02eb-HK01ba-Vc222-B9bbb-R448a.deb
Size: 48701308
--
Package: linux-image-current-rockchip64
Priority: optional
Section: kernel
Installed-Size: 273693
Maintainer: Armbian Linux <info@armbian.com>
Architecture: arm64
Source: linux-6.12.12
Version: 25.2.1
Provides: linux-image, linux-image-armbian, armbian-current
Filename: pool/main/l/linux-6.12.12/linux-image-current-rockchip64_25.2.1_arm64__6.12.12-Sd914-D7b0b-P083d-C67e9Heb51-HK01ba-Vc222-B8de6-R448a.deb
Size: 48674308

```

手动下载合适的版本并安装：
```bash
wget http://apt.armbian.com/pool/main/l/linux-6.12.17/linux-image-current-rockchip64_25.2.2_arm64__6.12.17-S41b2-Da873-P1e8e-C67e9H02eb-HK01ba-Vc222-B9bbb-R448a.deb

sudo dpkg -i linux-image-current*.deb

```

## === 以下内容为ChatGPT生成， 仅供参考，可以跳过。===

## **1. 确定当前内核版本及最近的变更**
在降级内核前，先确认当前正在运行的内核版本：
```bash
uname -a
```

同时，我们可以查看 `dpkg` 日志，找到之前安装的内核版本：
```bash
grep "linux-image" /var/log/dpkg.log | tail -10
```
或者查看所有已安装的内核：
```bash
dpkg --list | grep linux-image
```

这将帮助我们确定可以回退的内核版本。

---

## **2. 查找可用的旧版内核**
Armbian 的官方 APT 源中可能仍然提供旧版内核，可以使用以下命令列出所有可用的内核版本：
```bash
apt-cache madison linux-image-current-rockchip64
```

如果你看到旧版本（例如 `25.2.3`），你可以直接安装它。

如果 `apt` 源中找不到旧版内核，可以手动从 [Armbian 官方仓库](http://apt.armbian.com/) 下载 `.deb` 包。
```bash
wget http://apt.armbian.com/pool/main/l/linux-6.12.19/linux-image-current-rockchip64_25.2.3_arm64.deb
```

---

## **3. 降级内核**
### **方法 1：使用 APT 降级（如果旧版本仍在仓库中）**
如果 `apt-cache` 查找到旧版内核，可以使用以下命令安装它：
```bash
sudo apt install linux-image-current-rockchip64=25.2.3
```
然后，移除导致问题的新内核（可选）：
```bash
sudo apt remove --purge linux-image-current-rockchip64
sudo apt autoremove
```

### **方法 2：手动安装已下载的 `.deb` 内核包**
如果 `apt` 源中找不到旧版本，或者你已经手动下载了 `.deb`，可以使用 `dpkg` 直接安装：
```bash
sudo dpkg -i linux-image-current-rockchip64_25.2.3_arm64.deb
```
如果出现依赖问题，运行：
```bash
sudo apt -f install
```

---

## **4. 更新引导配置**
### **检查 /boot 目录中的内核**
```bash
ls /boot/vmlinuz-*
```
找到正确的内核文件，例如：
```
/boot/vmlinuz-6.12.19-rockchip64
```

### **更新 U-Boot 或 GRUB**
Armbian 主要使用 U-Boot 作为引导程序，因此我们需要更新 `armbianEnv.txt` 以指向正确的内核。

1. **编辑 `armbianEnv.txt` 文件**
```bash
sudo nano /boot/armbianEnv.txt
```
确保包含正确的内核信息，例如：
```
kernel=6.12.19-rockchip64
```

2. **更新 initramfs**
```bash
sudo update-initramfs -u
```

3. **更新 GRUB（如果适用）**
```bash
sudo update-grub
```

4. **强制刷新 U-Boot 配置**
```bash
sudo armbian-update-boot
```

---

## **5. 重新启动并验证**
执行重启：
```bash
sudo reboot
```

重启后，确认系统已使用降级后的内核：
```bash
uname -a
```
如果版本号符合预期，则降级成功。

---

## **6. 预防措施与建议**
### **如何防止未来内核升级导致问题？**
1. **锁定当前内核版本**
   ```bash
   sudo apt-mark hold linux-image-current-rockchip64  armbian-bsp-cli-nanopi-r2s-current armbian-firmware base-files linux-dtb-current-rockchip64 linux-u-boot-nanopi-r2s-current
   ```
   这样可以防止 `apt upgrade` 时自动升级内核。

2. **手动升级内核前，先备份系统**
   - 备份 `/boot` 和 `/lib/modules` 目录
   - 使用 `dd` 备份整个 SD 卡 / eMMC：
     ```bash
     sudo dd if=/dev/mmcblk0 of=armbian_backup.img bs=1M
     ```

3. **测试新内核前，保留旧版本**
   - 不要立即删除旧内核，以便在问题出现时可以回滚。
   - 在 `armbianEnv.txt` 中手动指定已知稳定的内核。

---

## **总结**
在 Armbian 中降级内核的关键步骤包括：
1. **确认当前内核版本** 并查找先前安装的版本。
2. **搜索可用的旧版内核** 并下载相应的 `.deb` 包（如果 `apt` 源中没有）。
3. **安装旧版内核** 并移除问题内核。
4. **更新引导程序（U-Boot/GRUB）** 以确保正确加载降级后的内核。
5. **重启系统并验证降级是否成功**。
6. **预防措施**：锁定内核版本、备份系统、避免自动升级。

通过上述方法，你可以在 Armbian 上安全地降级内核，并恢复设备的正常启动。

希望这篇文章能帮助你顺利降级 Armbian 内核！🚀