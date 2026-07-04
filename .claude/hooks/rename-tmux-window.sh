#!/bin/bash
# Stop hook: rename the tmux window running this Claude Code session to a
# snippet of its last response, instead of leaving it as the process name.
set -euo pipefail

# Captured before the (transcript-size-dependent) jq parsing below, so the
# race guard in tmux-rename-if-latest.sh orders by when the turn actually
# ended, not by how long this script took to compute the name.
start_ns=$(date +%s%N)

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

[ -n "$name" ] && HOOK_START_NS="$start_ns" "$(dirname "$0")/tmux-rename-if-latest.sh" "$name"

exit 0
