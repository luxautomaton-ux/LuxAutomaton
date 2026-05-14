#!/bin/bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$HOME/Documents/LuxAutomaton}"
NPM_GLOBAL_BIN="${NPM_GLOBAL_BIN:-$HOME/npm-global/bin}"

PASS=0
WARN=0
FAIL=0

ok() {
    PASS=$((PASS + 1))
    printf "[PASS] %s\n" "$1"
}

warn() {
    WARN=$((WARN + 1))
    printf "[WARN] %s\n" "$1"
}

fail() {
    FAIL=$((FAIL + 1))
    printf "[FAIL] %s\n" "$1"
}

check_cmd() {
    local name="$1"
    if command -v "$name" >/dev/null 2>&1; then
        ok "Command found: $name"
    else
        fail "Command missing: $name"
    fi
}

check_file() {
    local path="$1"
    local label="$2"
    if [[ -f "$path" ]]; then
        ok "$label"
    else
        fail "$label missing at $path"
    fi
}

check_dir() {
    local path="$1"
    local label="$2"
    if [[ -d "$path" ]]; then
        ok "$label"
    else
        fail "$label missing at $path"
    fi
}

main() {
    [[ -d "$ROOT_DIR" ]] || { fail "LuxAutomaton root not found at $ROOT_DIR"; exit 1; }

    check_cmd python3
    check_cmd node
    check_cmd npm
    check_cmd git

    if [[ -x "$HOME/.local/bin/uv" ]] || command -v uv >/dev/null 2>&1; then
        ok "uv is available"
    else
        fail "uv is not installed"
    fi

    if [[ -x "$NPM_GLOBAL_BIN/openclaude" ]] || command -v openclaude >/dev/null 2>&1; then
        ok "openclaude is available"
    else
        fail "openclaude is not installed"
    fi

    check_dir "$ROOT_DIR/Manus" "Manus source directory"
    check_file "$ROOT_DIR/Manus/.venv311/bin/python" "Manus Python 3.11 venv"
    check_file "$ROOT_DIR/claudecodeui/dist-server/server/index.js" "Lux CLI built server"
    check_file "$ROOT_DIR/hub.py" "Hub backend"
    check_file "$ROOT_DIR/templates/dashboard.html" "Hub dashboard"

    if python3 -c "import flask" >/dev/null 2>&1; then
        ok "Python Flask import works"
    else
        fail "Python Flask import failed"
    fi

    if "$ROOT_DIR/Manus/.venv311/bin/python" -c "import uvicorn" >/dev/null 2>&1; then
        ok "Manus venv can import uvicorn"
    else
        fail "Manus venv cannot import uvicorn"
    fi

    if [[ -d "/Applications/Lux Higgsfield Studio.app" ]] || [[ -d "/Applications/Open Generative AI.app" ]]; then
        ok "Lux Higgsfield Studio.app installed"
    else
        warn "Lux Higgsfield Studio.app not found in /Applications"
    fi

    if [[ -d "/Applications/Ollama.app" ]] || command -v ollama >/dev/null 2>&1; then
        ok "Ollama installed"
    else
        warn "Ollama not found"
    fi

    printf "\nSummary: %d pass, %d warn, %d fail\n" "$PASS" "$WARN" "$FAIL"
    if [[ "$FAIL" -gt 0 ]]; then
        exit 1
    fi
}

main "$@"
