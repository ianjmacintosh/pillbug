#!/bin/bash
# PreToolUse hook (AskUserQuestion, ExitPlanMode): flag the tmux window as
# blocked on the user, distinct from the general "thinking" state.
set -euo pipefail

start_ns=$(date +%s%N)
cat > /dev/null

HOOK_START_NS="$start_ns" "$(dirname "$0")/tmux-rename-if-latest.sh" "❓ awaiting you"
