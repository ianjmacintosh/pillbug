#!/bin/bash
set -e

# Copy tmux config (No sudo required)
cp .devcontainer/.tmux.conf ~/.tmux.conf

# Fix PS1 for non-VS Code terminals (e.g. docker exec from Ghostty)
cat >> ~/.bashrc << 'EOF'

# If the terminal type isn't known to this container (e.g. xterm-ghostty from
# a direct docker exec), fall back to xterm-256color so programs don't see an
# unknown TERM and degrade their output.
if ! infocmp "$TERM" &>/dev/null 2>&1; then
    export TERM=xterm-256color
fi

if [[ "$TERM_PROGRAM" != "vscode" ]]; then
    __ghostty_prompt() {
        local exit=$?
        local user_part
        if [[ -n "${GITHUB_USER:-}" ]]; then
            user_part="\[\033[0;32m\]@${GITHUB_USER} "
        else
            user_part="\[\033[0;32m\]\u "
        fi
        local arrow
        [[ $exit -ne 0 ]] && arrow="\[\033[1;31m\]>" || arrow="\[\033[0m\]>"
        local git_part=""
        if [[ "$(git config --get devcontainers-theme.hide-status 2>/dev/null)" != "1" ]] && \
           [[ "$(git config --get codespaces-theme.hide-status 2>/dev/null)" != "1" ]]; then
            local branch
            branch=$(git --no-optional-locks symbolic-ref --short HEAD 2>/dev/null || \
                     git --no-optional-locks rev-parse --short HEAD 2>/dev/null)
            if [[ -n "${branch:-}" ]]; then
                git_part="\[\033[0;36m\](\[\033[1;31m\]${branch}"
                if [[ "$(git config --get devcontainers-theme.show-dirty 2>/dev/null)" = "1" ]] && \
                   git --no-optional-locks ls-files --error-unmatch -m --directory --no-empty-directory \
                       -o --exclude-standard ":/*" > /dev/null 2>&1; then
                    git_part+=" \[\033[1;33m\]✗"
                fi
                git_part+="\[\033[0;36m\]) "
            fi
        fi
        PS1="${user_part}${arrow} \[\033[1;34m\]\w \[\033[0m\]${git_part}\[\033[0m\]\$ "
    }
    PROMPT_COMMAND='__ghostty_prompt'
fi
EOF