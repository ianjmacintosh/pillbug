#!/bin/bash
set -e

# Download Playwright's browser binaries. The playwright-deps feature installs
# the OS-level libraries (libnss3, libatk, etc.) but not the browsers
# themselves, so `playwright test` fails with "Executable doesn't exist"
# unless this also runs.
npx playwright install chromium

# Copy tmux config (No sudo required)
cp .devcontainer/.tmux.conf ~/.tmux.conf
