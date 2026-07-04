#!/bin/bash
# Notification hook (permission_prompt): flag the tmux window while Claude
# is blocked waiting on a permission approval, distinct from "thinking" and
# from "awaiting you" (AskUserQuestion/ExitPlanMode).
set -euo pipefail

start_ns=$(date +%s%N)
cat > /dev/null

HOOK_START_NS="$start_ns" "$(dirname "$0")/tmux-rename-if-latest.sh" "🔒 needs approval"
