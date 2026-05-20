#!/usr/bin/env python3
"""
Fix Chinese Markdown typography issues.

Rules:
- Bold (**): outer space required, inner space forbidden
- CJK/English/Number spacing
- Chinese quotes 「」 instead of ""
- Punctuation placement

Usage:
    python3 scripts/fix-chinese-markdown.py content/post/2026/231-*.md
    python3 scripts/fix-chinese-markdown.py --check content/post/2026/*.md
    find content/post -name "*.md" -exec python3 scripts/fix-chinese-markdown.py {} +
"""

import re
import sys
import argparse
from pathlib import Path


def fix_chinese_markdown(content: str) -> str:
    """Fix Chinese markdown typography issues."""
    lines = content.split("\n")
    new_lines = []
    in_code_block = False
    in_frontmatter = False
    frontmatter_count = 0

    for line in lines:
        # Track frontmatter
        if line.strip() == "---":
            frontmatter_count += 1
            if frontmatter_count == 1:
                in_frontmatter = True
                new_lines.append(line)
                continue
            elif frontmatter_count == 2:
                in_frontmatter = False
                new_lines.append(line)
                continue

        if in_frontmatter:
            new_lines.append(line)
            continue

        # Track code blocks
        stripped = line.strip()
        if stripped.startswith("```"):
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

        # Step 2b: Add outer spacing for English — word**text -> word **text
        line = re.sub(r'([a-zA-Z0-9])\*\*([a-zA-Z0-9])', r'\1 **\2', line)
        # text**word -> text** word
        line = re.sub(r'([a-zA-Z0-9])\*\*([a-zA-Z0-9])', r'\1** \2', line)

        # Step 3: Fix blockquote — >** -> > **
        line = re.sub(r'>\*\*', r'> **', line)
        # > ** 内容 -> > **内容 (no inner space in blockquote)
        line = re.sub(r'> \*\* +', r'> **', line)

        # Step 4: Fix punctuation spacing — ** 。 -> **。 / ** , -> **,
        line = re.sub(r'\*\* ([，。；：！？,\.!?])', r'**\1', line)
        # Also fix: **text** , -> **text**,
        line = re.sub(r'\*\* ([，。；：！？,\.!?])', r'**\1', line)

        # Step 5: Fix Chinese parentheses — （ Context ） -> （Context）
        line = re.sub(r'（ +', r'（', line)
        line = re.sub(r' +）', r'）', line)

        # Step 6: Fix Chinese quotes — "内容" -> 「内容」 (outside code/frontmatter)
        line = re.sub(r'"([^"]*?)"', r'「\1」', line)

        # Step 7: CJK/English spacing
        line = re.sub(r'([\u4e00-\u9fff])([a-zA-Z0-9])', r'\1 \2', line)
        line = re.sub(r'([a-zA-Z0-9])([\u4e00-\u9fff])', r'\1 \2', line)

        # Cleanup multiple spaces
        line = re.sub(r'  +', r' ', line)
        line = line.rstrip()

        new_lines.append(line)

    return "\n".join(new_lines)


def process_file(filepath: Path, check_only: bool = False) -> bool:
    """Process a single markdown file. Returns True if changes were made."""
    content = filepath.read_text(encoding='utf-8')
    fixed = fix_chinese_markdown(content)

    if content != fixed:
        if check_only:
            print(f"❌ {filepath}: needs formatting")
            # Show diff hint
            for i, (orig, new) in enumerate(zip(content.split('\n'), fixed.split('\n')), 1):
                if orig != new:
                    print(f"   Line {i}: {repr(orig)} -> {repr(new)}")
            return True
        else:
            filepath.write_text(fixed, encoding='utf-8')
            print(f"✅ {filepath}: fixed")
            return True
    else:
        if not check_only:
            print(f"⏭️  {filepath}: OK")
        return False


def main():
    parser = argparse.ArgumentParser(description='Fix Chinese Markdown typography')
    parser.add_argument('files', nargs='+', help='Markdown files to process')
    parser.add_argument('--check', action='store_true', help='Check only, do not modify')
    args = parser.parse_args()

    changed = False
    for filepath in args.files:
        path = Path(filepath)
        if not path.exists():
            print(f"⚠️  {filepath}: not found")
            continue
        if path.suffix != '.md':
            continue
        if process_file(path, check_only=args.check):
            changed = True

    if args.check and changed:
        print("\nRun without --check to auto-fix these issues.")
        sys.exit(1)


if __name__ == '__main__':
    main()
