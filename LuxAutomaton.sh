#!/bin/bash
set -euo pipefail

DIR="${DIR:-$HOME/Documents/LuxAutomaton}"
MANUS_DIR="$DIR/Manus"
LUXCLI_DIR="$DIR/claudecodeui"
NPM_GLOBAL_BIN="${NPM_GLOBAL_BIN:-$HOME/npm-global/bin}"

cd "$DIR"

port_open() {
  local port="$1"
  nc -z localhost "$port" >/dev/null 2>&1
}

start_generative() {
  open -a "Lux Higgsfield Studio"
}

start_ollama() {
  open -a Ollama
}

start_manus() {
  if port_open 8000; then
    return
  fi
  (
    cd "$MANUS_DIR"
    export PATH="$HOME/.local/bin:$PATH"
    export PYTHONPATH="$MANUS_DIR"
    ./.venv311/bin/python -m uvicorn app.web.app:app --host 127.0.0.1 --port 8000 >/dev/null 2>&1
  ) &
  sleep 2
}

start_luxcli() {
  if port_open 3001; then
    return
  fi
  if [[ ! -f "$LUXCLI_DIR/dist-server/server/index.js" ]]; then
    npm --prefix "$LUXCLI_DIR" install --silent
    npm --prefix "$LUXCLI_DIR" run build
  fi
  (
    export PATH="$NPM_GLOBAL_BIN:$PATH"
    node "$LUXCLI_DIR/dist-server/server/index.js" >/dev/null 2>&1
  ) &
  sleep 2
}

start_luxclaude() {
  export OPENAI_BASE_URL=http://localhost:11434/v1
  export OPENAI_MODEL=qwen2.5:7b
  export CLAUDE_CODE_USE_OPENAI=1
  if [[ -x "$NPM_GLOBAL_BIN/openclaude" ]]; then
    "$NPM_GLOBAL_BIN/openclaude"
  else
    openclaude
  fi
}

launch_all() {
  start_generative
  start_ollama
  start_manus
  start_luxcli
  if ! port_open 8000; then
    echo "Lux Manus did not start. Run ./LuxAutomaton-Install.sh then retry."
  fi
  if ! port_open 3001; then
    echo "Lux CLI did not start. Run ./LuxAutomaton-Install.sh then retry."
  fi
  open http://localhost:8000
  open http://localhost:3001
  echo "All apps launching..."
}

echo "╔══════════════════════════════════════╗"
echo "║       Lux AI Studio · Control Hub   ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "1) Lux Higgsfield Studio (Creative AI)"
echo "2) Lux Manus (AI Agent Web UI)"
echo "3) Lux Claude Code Terminal (Browser UI for Coding Agents)"
echo "4) Hermes OS (Autonomous Agent)"
echo "5) Ollama (Local LLM Engine)"
echo "6) Launch All"
echo ""
read -r -p "Select app [1-6]: " choice

case "$choice" in
  1)
    start_generative
    ;;
  2)
    start_manus
    open http://localhost:8000
    ;;
  3)
    start_luxcli
    open http://localhost:3001
    ;;
  4)
    start_luxclaude
    ;;
  5)
    start_ollama
    ;;
  6)
    launch_all
    ;;
  *)
    echo "Invalid choice"
    ;;
esac
