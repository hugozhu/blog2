---
title: 在Mac上用AppleScript一键排列窗口：打造高效副屏工作区
subtitle: Arrange Windows with One Click Using AppleScript on Mac.
date: 2025-04-15
tags: ["AppleScript", "shortcuts"]
---


很多开发者在使用外接显示器时，希望可以快速恢复特定窗口布局，比如：将 `Cursor` 和 `iTerm2` 按照一定比例排列在副屏上。手动拖动窗口太麻烦？让我们用一段 AppleScript 自动化搞定它。

<!--more-->

## 🎯 目标：自动将两个 App 排列到副屏

- `Cursor`（或 VS Code）占据副屏上方 2/3；
- `iTerm2` 占据副屏下方 1/3；
- 自动取消最小化、激活窗口；
- 完美适配我的副屏：分辨率为 `1728x1117`。

效果如下图（模拟）：

```
┌────────────────────────────────────────────┐
│                 Cursor                     │
│                (2/3 屏幕)                 │
├────────────────────────────────────────────┤
│                 iTerm2                     │
│                (1/3 屏幕)                 │
└────────────────────────────────────────────┘
```


## 🧠 技术实现：AppleScript + System Events + 辅助功能权限

我们使用 macOS 自带的 **AppleScript + System Events** 控制窗口位置。核心逻辑是：

- 获取窗口是否最小化，如果是就还原；
- 设置目标位置与大小；
- 最后把两个窗口依次调到前台。


## 🧩 脚本代码如下

```applescript
tell application "System Events"
	delay 0.5
	
	-- 设置窗口位置和大小（根据你的副屏调整）
	set screenX to 1728
	set screenY to -1000
	set screenWidth to 1600
	set screenHeight to 2200
	
	set cursorHeight to screenHeight * 2.2 / 3
	set iTerm2Height to screenHeight * 1 / 3
	
	-- 控制 Cursor 窗口
	tell application process "Cursor"
		set theWindow to window 1
		if value of attribute "AXMinimized" of theWindow is true then
			set value of attribute "AXMinimized" of theWindow to false
			delay 0.3
		end if
		
		if (count of windows) > 0 then
			set position of window 1 to {screenX, screenY}
			set size of window 1 to {screenWidth, cursorHeight}
		end if
	end tell
	
	-- 控制 iTerm2 窗口
	tell application process "iTerm2"
		set theWindow to window 1
		if value of attribute "AXMinimized" of theWindow is true then
			set value of attribute "AXMinimized" of theWindow to false
			delay 0.3
		end if
		
		if (count of windows) > 0 then
			set position of window 1 to {screenX, screenY + cursorHeight + 40}
			set size of window 1 to {screenWidth, iTerm2Height}
		end if
	end tell
	
	-- 激活两个窗口
	tell application "iTerm2" to activate
	tell application "Cursor" to activate
end tell
```


## ⚙️ 权限设置（重要）

要让脚本正常运行，**需要赋予“辅助功能权限”**：

- 打开「系统设置」→「隐私与安全性」→「辅助功能」；
- 将「Script Editor」或你运行脚本的 `.app` 加进去；
- 勾选权限。


## 🚀 快捷触发方式推荐

你可以选择以下任意一种方式一键执行：

| 方法                  | 简述 |
|-----------------------|------|
| ✅ Automator 打包为 `.app` | 可添加图标、Dock 快捷方式 |
| ✅ macOS Shortcuts 快捷指令 | 可绑定快捷键（建议搭配 `.app`） |
| ✅ Raycast、Alfred 等工具 | 输入命令即刻布局 |
| ✅ 配合 Hammerspoon | 高阶窗口自动化（Lua） |


## 🔁 可拓展：双模式切换（主屏 / 副屏）

你也可以扩展这个脚本支持「双布局切换」：

```bash
-- 布局 1: 副屏开发布局
-- 布局 2: 回到主屏办公模式
```

我将这个功能打包为 [`WindowLayoutSwitcher`](https://github.com/hugozhu/WindowLayoutSwitcher) 工具，支持自定义图标、快捷键调用，一键切换多布局模式。


## 🧼 总结

用 AppleScript 实现窗口定位，是 macOS 上简单又强大的自动化方式。配合快捷键、快捷指令或 Raycast 等工具，可以极大提升你的窗口管理效率。希望这篇文章对你的工作流有所帮助！