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


# Chars that need a separating space BEFORE an opening ** delimiter.
# CJK ideographs + alphanumerics + hyphen only. Punctuation ranges like
# \u3000-\u303f (contains 「」) and \uff01-\uff60 (contains （）) are
# deliberately excluded — typography rules forbid spaces next to them.
_OPEN_LEFT = re.compile(r'[\u4e00-\u9fffa-zA-Z0-9\-]')
# Chars that need a separating space AFTER a closing ** delimiter
_CLOSE_RIGHT = re.compile(r'[\u4e00-\u9fffa-zA-Z0-9]')


def fix_bold_outer_spacing(line: str) -> str:
    """Add spaces around **bold** pairs, pair-aware.

    Splits on '**' and uses parity: delimiters at odd split-indices are
    opening, even are closing. A naive regex like CJK**CJK cannot tell
    opening from closing, which corrupts '也**不应该**靠' into
    '也 **不应该 **靠' (space inside the closing side breaks rendering).
    """
    if line.count('**') % 2 != 0 or '**' not in line:
        return line
    parts = line.split('**')
    if len(parts) < 3:
        return line
    result = parts[0]
    for k in range(1, len(parts)):
        seg = parts[k]
        if k % 2 == 1:  # opening delimiter before this bold content
            if result and _OPEN_LEFT.search(result[-1]):
                result += ' '
            result += '**' + seg
        else:  # closing delimiter before this plain text
            if seg and _CLOSE_RIGHT.search(seg[0]):
                result += '** '
            else:
                result += '**'
            result += seg
    return result


def fix_chinese_markdown(content: str) -> str:
    """Fix Chinese markdown typography issues."""
    lines = content.split("\n")
    new_lines = []
    in_code_block = False
    in_frontmatter = False
    frontmatter_count = 0

    def mask_inline_code(line: str):
        """Replace inline code spans with placeholders so line-level fixes
        (quote conversion, CJK spacing, bold spacing) never touch code.
        Returns (masked_line, list_of_spans)."""
        spans = []

        def stash(match):
            spans.append(match.group(0))
            return f"\x00{len(spans) - 1}\x00"

        return re.sub(r'`[^`]*`', stash, line), spans

    def unmask_inline_code(line: str, spans) -> str:
        for i, span in enumerate(spans):
            line = line.replace(f"\x00{i}\x00", span, 1)
        return line

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

        # Mask inline code spans so none of the line-level fixes below
        # corrupt code content (e.g. `readline, ""` -> `readline, 「」`).
        line, _code_spans = mask_inline_code(line)

        # Step 1: Fix bold inner spacing — ** 内容 ** -> **内容**
        def fix_bold(match):
            inner = match.group(1).strip()
            return f'**{inner}**'
        line = re.sub(r'\*\*\s*([^*]+?)\s*\*\*', fix_bold, line)

        # Step 2: Add outer spacing around bold pairs (pair-aware).
        # A naive regex like CJK**CJK cannot tell opening ** from closing **
        # (也**不应该**靠 would corrupt the closing side into 不应该 **靠).
        # Split on ** and use parity: odd-index segments are bold content.
        line = fix_bold_outer_spacing(line)

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

        # Restore inline code spans, untouched.
        line = unmask_inline_code(line, _code_spans)

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
