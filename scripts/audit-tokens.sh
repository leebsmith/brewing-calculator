#!/usr/bin/env bash
set -euo pipefail

TARGET_FILE="${1:-style.css}"

if [ ! -f "$TARGET_FILE" ]; then
  echo "Error: Target file '$TARGET_FILE' not found." >&2
  exit 2
fi

ERRORS=0
echo "Auditing $TARGET_FILE for design token regressions..."

# 1. Check for raw Hex color literals
if grep -En '#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b' "$TARGET_FILE"; then
  echo "❌ Found raw hex colors (must use --sys-* tokens)."
  ERRORS=$((ERRORS + 1))
fi

# 2. Check for raw rgb/rgba/hsl/hsla color declarations
if grep -En '\b(rgba?|hsla?)\(' "$TARGET_FILE"; then
  echo "❌ Found raw color functions (move rgba/hsla definitions to tokens.css)."
  ERRORS=$((ERRORS + 1))
fi

# 3. Check for primitive palette leaks bypassing the semantic tier
if grep -En 'var\(--color-(slate|indigo|emerald|amber|rose)' "$TARGET_FILE"; then
  echo "❌ Found primitive palette token leaks (must bind to --sys-* roles)."
  ERRORS=$((ERRORS + 1))
fi

# 4. Check for unscoped transition: all
if grep -En 'transition:\s*all\b' "$TARGET_FILE"; then
  echo "❌ Found 'transition: all' (specify discrete transition properties)."
  ERRORS=$((ERRORS + 1))
fi

# 5. Check for hardcoded px/rem dimensions in spacing and typography
UNMAPPED_SPACING=$(grep -En '^\s*(padding|margin|gap|font-size|border-radius)\s*:[^;]*\b[0-9]+(\.[0-9]+)?(px|rem)\b' "$TARGET_FILE" || true)
if [ -n "$UNMAPPED_SPACING" ]; then
  echo "$UNMAPPED_SPACING"
  echo "❌ Found hardcoded spacing, typography, or radii (use --space-*, --radius-*, or --text-*)."
  ERRORS=$((ERRORS + 1))
fi

if [ "$ERRORS" -gt 0 ]; then
  echo -e "\nAudit failed with $ERRORS violation categor(ies)."
  exit 1
fi

echo "✅ Audit passed: clean token discipline and no leaks detected."
exit 0