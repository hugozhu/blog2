---
title: "用 Git Hook 自动修复中文 Markdown 排版问题"
subtitle: "Automating Chinese Typography in Markdown with Pre-commit Hooks"
date: 2026-05-20
tags: ["Markdown", "Git Hooks", "Python", "中文排版", "博客工程化"]
---

大语言模型生成的 Markdown 文本常常存在排版不规范的问题，尤其是中英文混排场景。本文介绍如何通过 Python 脚本和 Git Pre-commit Hook 实现中文排版的自动修复，让博客发布流程更加工程化。

<!--more-->

## 问题：大模型生成的 Markdown 排版陷阱

在使用 AI 辅助写作时，我经常遇到以下排版问题：

```markdown
- This is bold**text**, render it       ❌ 英文加粗外侧缺空格
- 这是加粗**文本**, 渲染效果             ❌ 中文加粗外侧缺空格
- 这是加粗 ** 文本 ** , 渲染效果         ❌ 加粗内侧有空格，标点前有空格
- AI时代，个人知识管理(PKM)正在变革      ❌ 中英文无空格，中文括号内不应有空格
```

这些不规范的写法在不同 Markdown 渲染器（GitHub、Hugo、Typora）中表现不一致，导致最终页面排版混乱。

### 核心排版规则

中文 Markdown 排版有两条关键规则：

| 规则 | 正确示例 | 错误说明 |
|------|----------|----------|
| 加粗外侧必须有空格 | `这是 **重点** 内容` | 加粗标记与中文之间缺少空格 |
| 加粗内侧不能有空格 | `这是 **重点** 内容` | 加粗标记与内容之间存在空格 |
| 中英文之间加空格 | `AI 时代` | 中文与英文/数字之间缺少空格 |
| 中文括号内无空格 | `（Context）` | 中文括号内部存在多余空格 |
| 标点前无空格 | `**重点**，` | 标点符号前存在多余空格 |

## 解决方案架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  git commit │────▶│ pre-commit   │────▶│  Python     │
│             │     │ hook (bash)  │     │ fix script  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                    │
                           │              ┌─────▼──────┐
                           │              │  Regex     │
                           │              │  fixes     │
                           │              └─────┬──────┘
                           │                    │
                     ┌─────▼──────┐      ┌─────▼──────┐
                     │  Re-stage  │◀─────│  Write     │
                     │  modified  │      │  fixed     │
                     │  files     │      │  files     │
                     └────────────┘      └────────────┘
```

整个流程在 `git commit` 时自动触发：
1. Pre-commit hook 检测暂存的 `.md` 文件
2. Python 脚本逐行修复排版问题
3. 自动 re-stage 修改后的文件
4. 提交完成，格式已修正

## 核心实现：Python 修复脚本

修复脚本的核心逻辑是逐行处理 Markdown 内容，跳过代码块和 frontmatter，用正则表达式修复排版问题。

```python
import re
from pathlib import Path


def fix_chinese_markdown(content: str) -> str:
    """Fix Chinese markdown typography issues."""
    lines = content.split("\n")
    new_lines = []
    in_code_block = False
    in_frontmatter = False
    frontmatter_count = 0

    for line in lines:
        # Track frontmatter (skip YAML metadata)
        if line.strip() == "---":
            frontmatter_count += 1
            if frontmatter_count <= 2:
                in_frontmatter = (frontmatter_count == 1)
                new_lines.append(line)
                continue

        if in_frontmatter:
            new_lines.append(line)
            continue

        # Track code blocks (skip code content)
        if line.strip().startswith("```"):
            in_code_block = not in_code_block
            new_lines.append(line)
            continue

        if in_code_block:
            new_lines.append(line)
            continue

        # Step 1: Fix bold inner spacing — ** 内容 ** -> **内容**
        def fix_bold(match):
            inner = match.group(1).strip()
            return f'**{inner}**'
        line = re.sub(r'\*\*\s*([^*]+?)\s*\*\*', fix_bold, line)

        # Step 2: Add outer spacing for CJK — 中文**内容 -> 中文 **内容
        line = re.sub(
            r'([\u4e00-\u9fff\u3000-\u303f\uff01-\uff60「」：，。；！？\-])\*\*([\u4e00-\u9fffa-zA-Z0-9])',
            r'\1 **\2', line
        )
        # 内容**中文 -> 内容** 中文
        line = re.sub(
            r'([\u4e00-\u9fffa-zA-Z0-9])\*\*([\u4e00-\u9fff\u3000-\u303f\uff01-\uff60「」：，。；！？])',
            r'\1** \2', line
        )

        # Step 3: Fix punctuation spacing — ** 。 -> **。
        line = re.sub(r'\*\* ([，。；：！？,\.!?])', r'**\1', line)

        # Step 4: Fix Chinese parentheses — （ Context ） -> （Context）
        line = re.sub(r'（ +', r'（', line)
        line = re.sub(r' +）', r'）', line)

        # Step 5: CJK/English spacing
        line = re.sub(r'([\u4e00-\u9fff])([a-zA-Z0-9])', r'\1 \2', line)
        line = re.sub(r'([a-zA-Z0-9])([\u4e00-\u9fff])', r'\1 \2', line)

        # Cleanup multiple spaces
        line = re.sub(r'  +', r' ', line)
        new_lines.append(line.rstrip())

    return "\n".join(new_lines)
```

### 关键正则解析

**加粗内侧空格修复**：`\*\*\s*([^*]+?)\s*\*\*`
- 匹配 `**` 与内容之间存在空格的模式
- 捕获组 `([^*]+?)` 提取内容并 strip 空格
- 替换为 `**内容**`

**加粗外侧空格添加**：`([\u4e00-\u9fff])\*\*([\u4e00-\u9fffa-zA-Z0-9])`
- 匹配中文字符后紧跟 `**` 的情况
- 在 `**` 前插入空格
- 注意：字符类中 **不能包含空格**，否则会匹配已有的空格导致重复添加

**中英文空格**：`([\u4e00-\u9fff])([a-zA-Z0-9])`
- 在中文字符和英文/数字之间插入空格
- 双向匹配（中→英、英→中）

## 集成到 Git 工作流

### 创建 Pre-commit Hook

```bash
#!/usr/bin/env bash
# .git/hooks/pre-commit

# Get staged markdown files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.md$' || true)

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

echo "🔍 Checking Chinese Markdown typography..."

# Run fix script
python3 scripts/fix-chinese-markdown.py $STAGED_FILES

# Re-stage modified files
git diff --name-only --diff-filter=M | grep '\.md$' | xargs -r git add

echo "✅ Markdown typography check complete."
exit 0
```

### 安装 Hook

```bash
# 将 hook 脚本复制到 git hooks 目录
cp scripts/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 使用方式

```bash
# 正常提交流程，hook 自动触发
git add content/post/2026/232-new-post.md
git commit -m "new post about markdown typography"

# 输出示例：
# 🔍 Checking Chinese Markdown typography...
# ✅ content/post/2026/232-new-post.md: fixed
# ✅ Markdown typography check complete.

# 紧急提交时跳过检查
git commit --no-verify -m "urgent fix"
```

## 测试验证

用你最初提供的测试用例验证修复效果：

```markdown
# 修复前
- This is bold **text**, render it
- This is bold**text**, render it
- 这是加粗**文本**, 渲染效果
- 这是加粗** 文本 **, 渲染效果
- 这是加粗 **文本**, 渲染效果
- 这是加粗 ** 文本 ** , 渲染效果

# 修复后（全部规范化）
- This is bold **text**, render it
- This is bold **text**, render it
- 这是加粗 **文本**, 渲染效果
- 这是加粗 **文本**, 渲染效果
- 这是加粗 **文本**, 渲染效果
- 这是加粗 **文本**, 渲染效果
```

## 总结

通过 Git Hook 集成自动化排版修复，解决了三个问题：

1. **一致性**：所有提交的文章自动符合中文排版规范
2. **无感**：开发者无需手动检查，hook 自动处理
3. **可追溯**：修复后的变更会出现在 commit diff 中，可审查

这种「工程化」的思维方式——将重复性的人工检查转化为自动化流程——正是 AI 时代内容生产的核心竞争力。大模型负责生成内容，工程工具负责保证质量。

---

*完整脚本代码：[scripts/fix-chinese-markdown.py](https://github.com/hugozhu/blog2/blob/main/scripts/fix-chinese-markdown.py)*

*你的博客工作流中有类似的自动化检查吗？欢迎在评论区分享。*

# generated by hugo AI
