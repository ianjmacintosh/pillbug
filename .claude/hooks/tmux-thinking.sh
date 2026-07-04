#!/bin/bash
# UserPromptSubmit / PostToolUse hook: flag the tmux window as busy.
# The Stop hook (rename-tmux-window.sh) overwrites this once Claude's
# response actually lands.
set -euo pipefail

start_ns=$(date +%s%N)
cat > /dev/null

HOOK_START_NS="$start_ns" "$(dirname "$0")/tmux-rename-if-latest.sh" "⋯ thinking"
