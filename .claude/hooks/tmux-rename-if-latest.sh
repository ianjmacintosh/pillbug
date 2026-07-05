#!/bin/bash
# Shared helper: renames the tmux window to $1, but only if no other hook
# invocation that *started* more recently has already claimed the "latest"
# slot. Without this, a hook that started earlier (e.g. a Stop hook from a
# previous turn, slowed down by parsing an ever-growing transcript) can
# finish and rename *after* a hook that started later, silently reverting
# the window to stale text. Comparing start time (not finish time) fixes
# that regardless of which hook type or turn is involved.
set -euo pipefail

label="$1"
[ -n "${TMUX_PANE:-}" ] || exit 0

start_ns="${HOOK_START_NS:-$(date +%s%N)}"
pane_key=$(echo "$TMUX_PANE" | tr -c 'A-Za-z0-9' '_')
seqfile="/tmp/pillbug-tmux-seq-${pane_key}"

(
  flock -x 200
  last=$(cat "$seqfile" 2>/dev/null || echo 0)
  if [ "$start_ns" -gt "$last" ]; then
    echo "$start_ns" > "$seqfile"
    tmux rename-window -t "$TMUX_PANE" "$label" 2>/dev/null || true
  fi
) 200>"${seqfile}.lock"

exit 0
