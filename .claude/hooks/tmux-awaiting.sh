#!/bin/bash
# PreToolUse hook (AskUserQuestion, ExitPlanMode): flag the tmux window as
# blocked on the user, distinct from the general "thinking" state.
set -euo pipefail

cat > /dev/null

[ -n "${TMUX_PANE:-}" ] || exit 0

tmux rename-window -t "$TMUX_PANE" "❓ awaiting you" 2>/dev/null || true

exit 0
