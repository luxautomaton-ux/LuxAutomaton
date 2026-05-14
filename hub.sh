#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH="$HOME/.local/bin:$HOME/npm-global/bin:$PATH"

if ! python3 -c "import flask" >/dev/null 2>&1; then
  echo "Flask is not installed for system python3."
  echo "Run: $ROOT_DIR/LuxAutomaton-Install.sh"
  exit 1
fi

exec python3 "$ROOT_DIR/hub.py"
