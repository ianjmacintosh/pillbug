#!/bin/bash
# Notification hook (permission_prompt): flag the tmux window while Claude
# is blocked waiting on a permission approval, distinct from "thinking" and
# from "awaiting you" (AskUserQuestion/ExitPlanMode).
set -euo pipefail

cat > /dev/null

[ -n "${TMUX_PANE:-}" ] || exit 0

tmux rename-window -t "$TMUX_PANE" "🔒 needs approval" 2>/dev/null || true

exit 0
