---
date: 2014-07-26
layout: post
title: 安装第三方App到电视盒子
description: Install 3rd party apps on Android based TV Box
categories:
- Blog
tags:
- Android

---


# 安装第三方App方法1

1. 准备一个U盘，注意用FAT格式（Windows能读写就OK）
2. 将需要安装的App下载到U盘，文件后缀名必须是.apk
3. 将U盘插入电视盒子，然后通过盒子自身带的文件管理App安装：如Magic Box：应用－－&gt; 本地播放，进入后选中U盘上的.apk文件即可安装

# 安装第三方App方法2
1. 如果盒子不带USB盘，还可以用adb远程安装
2. adb connect &lt;your_magic_box_ip&gt;
3. adb install &lt;you_app_to_install&gt;.apk

# 直播和回放App

1. 在电脑上用浏览器下载：http://app.shafa.com/shafa.apk 到U盘
2. 按方法1安装好后，在“应用“中找到“沙发管家”
3. 启动“沙发管家”，安装直播App：如“龙龙直播”，也有支持回放的App，如“电视猫视频”等。