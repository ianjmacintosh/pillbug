#!/bin/bash
# UserPromptSubmit hook: flag the tmux window as busy the instant a prompt is
# submitted. The Stop hook (rename-tmux-window.sh) overwrites this once
# Claude's response actually lands.
set -euo pipefail

cat > /dev/null

[ -n "${TMUX_PANE:-}" ] || exit 0

tmux rename-window -t "$TMUX_PANE" "⋯ thinking" 2>/dev/null || true

exit 0
