#!/bin/bash
# Stop hook: rename the tmux window running this Claude Code session to a
# snippet of its last response, instead of leaving it as the process name.
set -euo pipefail

[ -n "${TMUX_PANE:-}" ] || exit 0

input=$(cat)
transcript_path=$(echo "$input" | jq -r '.transcript_path')

[ -f "$transcript_path" ] || exit 0

last_message=$(jq -s -r '
  [.[] | select(.type == "assistant") | .message.content[]? | select(.type == "text") | .text] | last // empty
' "$transcript_path")

first_line=$(echo "$last_message" | head -1)

[ -n "$first_line" ] || exit 0

# Strip markdown emphasis/heading/code markers and collapse whitespace.
clean=$(echo "$first_line" | sed -E 's/[#*`_>]+//g' | tr -s '[:space:]' ' ' | sed -E 's/^ +| +$//g')

name=$(echo "$clean" | cut -c1-25)
[ "${#clean}" -gt 25 ] && name="${name}…"

[ -n "$name" ] && tmux rename-window -t "$TMUX_PANE" "$name"

exit 0
