#!/usr/bin/env bash
#
# Pre-commit hook: auto-fix Chinese Markdown typography before commit.
#
# Install:
#   cp scripts/pre-commit.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Or skip with: git commit --no-verify

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
