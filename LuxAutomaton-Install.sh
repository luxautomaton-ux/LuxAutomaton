#!/bin/bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$HOME/Documents/LuxAutomaton}"
NPM_GLOBAL_PREFIX="${NPM_GLOBAL_PREFIX:-$HOME/npm-global}"
NPM_GLOBAL_BIN="$NPM_GLOBAL_PREFIX/bin"
LOCAL_BIN_DIR="$HOME/.local/bin"
UV_BIN_DEFAULT="$LOCAL_BIN_DIR/uv"
OPENCLAUDE_CONFIG="$HOME/.openclaude.json"

log() {
    printf "[INFO] %s\n" "$1"
}

warn() {
    printf "[WARN] %s\n" "$1"
}

die() {
    printf "[ERROR] %s\n" "$1" >&2
    exit 1
}

require_macos() {
    if [[ "$(uname -s)" != "Darwin" ]]; then
        die "This installer currently supports macOS only."
    fi
}

shell_profile() {
    case "$(basename "${SHELL:-/bin/zsh}")" in
        zsh) printf "%s\n" "$HOME/.zshrc" ;;
        bash) printf "%s\n" "$HOME/.bash_profile" ;;
        *) printf "%s\n" "$HOME/.profile" ;;
    esac
}

append_profile_line_once() {
    local line="$1"
    local profile
    profile="$(shell_profile)"
    touch "$profile"
    if ! grep -Fq "$line" "$profile"; then
        printf "\n%s\n" "$line" >> "$profile"
    fi
}

ensure_paths() {
    mkdir -p "$NPM_GLOBAL_BIN" "$LOCAL_BIN_DIR"
    export PATH="$NPM_GLOBAL_BIN:$LOCAL_BIN_DIR:$PATH"
    append_profile_line_once 'export PATH="$HOME/npm-global/bin:$HOME/.local/bin:$PATH"'
}

ensure_xcode_tools() {
    if ! xcode-select -p >/dev/null 2>&1; then
        warn "Xcode Command Line Tools are required (node-gyp build dependencies)."
        xcode-select --install >/dev/null 2>&1 || true
        die "Install Xcode Command Line Tools, then rerun this installer."
    fi
}

ensure_homebrew() {
    if command -v brew >/dev/null 2>&1; then
        return
    fi
    log "Homebrew not found. Installing Homebrew..."
    NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
}

activate_homebrew() {
    if [[ -x /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -x /usr/local/bin/brew ]]; then
        eval "$(/usr/local/bin/brew shellenv)"
    elif command -v brew >/dev/null 2>&1; then
        eval "$(brew shellenv)"
    else
        die "Homebrew was expected but not found."
    fi
}

ensure_brew_pkg() {
    local cmd="$1"
    local pkg="$2"
    if command -v "$cmd" >/dev/null 2>&1; then
        return
    fi
    log "Installing $pkg via Homebrew..."
    brew install "$pkg"
}

ensure_node_and_npm() {
    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        return
    fi
    ensure_brew_pkg node node
}

resolve_uv() {
    if [[ -x "$UV_BIN_DEFAULT" ]]; then
        printf "%s\n" "$UV_BIN_DEFAULT"
        return
    fi
    if command -v uv >/dev/null 2>&1; then
        command -v uv
        return
    fi
    printf "\n"
}

ensure_uv() {
    local uv_bin
    uv_bin="$(resolve_uv)"
    if [[ -n "$uv_bin" ]]; then
        printf "%s\n" "$uv_bin"
        return
    fi
    log "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    uv_bin="$(resolve_uv)"
    [[ -n "$uv_bin" ]] || die "uv installation failed."
    printf "%s\n" "$uv_bin"
}

ensure_open_generative_app() {
    if [[ -d "/Applications/Lux Higgsfield Studio.app" ]]; then
        return
    fi
    if [[ -d "/Applications/Open Generative AI.app" ]]; then
        log "Renaming Open Generative AI to Lux Higgsfield Studio..."
        mv "/Applications/Open Generative AI.app" "/Applications/Lux Higgsfield Studio.app"
        return
    fi

    local dmg_file=""
    local candidate
    for candidate in "$ROOT_DIR"/Open-Generative-AI/*.dmg; do
        if [[ -f "$candidate" ]]; then
            dmg_file="$candidate"
            break
        fi
    done

    if [[ -z "$dmg_file" ]]; then
        warn "No Lux Higgsfield Studio DMG found under $ROOT_DIR/Open-Generative-AI/. Skipping app install."
        return
    fi

    log "Installing Lux Higgsfield Studio app from DMG..."
    local mount_point="/Volumes/Lux Higgsfield Studio"
    hdiutil attach "$dmg_file" -nobrowse -quiet || die "Failed to mount DMG: $dmg_file"
    if [[ -d "$mount_point/Lux Higgsfield Studio.app" ]]; then
        cp -R "$mount_point/Lux Higgsfield Studio.app" /Applications/
    elif [[ -d "$mount_point/Open Generative AI.app" ]]; then
        cp -R "$mount_point/Open Generative AI.app" /Applications/
        mv "/Applications/Open Generative AI.app" "/Applications/Lux Higgsfield Studio.app"
    else
        hdiutil detach "$mount_point" -quiet || true
        die "Mounted DMG does not contain Lux Higgsfield Studio.app"
    fi
    hdiutil detach "$mount_point" -quiet || true
}

ensure_ollama() {
    if [[ -d "/Applications/Ollama.app" ]] || command -v ollama >/dev/null 2>&1; then
        return
    fi
    log "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
}

ensure_manus_runtime() {
    local uv_bin="$1"
    [[ -d "$ROOT_DIR/Manus" ]] || die "Missing Manus directory: $ROOT_DIR/Manus"

    log "Setting up Lux Manus (Python 3.11 + dependencies)..."
    "$uv_bin" python install 3.11
    "$uv_bin" venv --python 3.11 "$ROOT_DIR/Manus/.venv311"
    "$uv_bin" pip install --python "$ROOT_DIR/Manus/.venv311/bin/python" -r "$ROOT_DIR/Manus/requirements.txt"
    "$ROOT_DIR/Manus/.venv311/bin/python" -m playwright install chromium
}

ensure_luxcli() {
    [[ -d "$ROOT_DIR/claudecodeui" ]] || die "Missing Lux CLI directory: $ROOT_DIR/claudecodeui"
    log "Installing Lux CLI dependencies and building..."
    npm --prefix "$ROOT_DIR/claudecodeui" install --silent
    npm --prefix "$ROOT_DIR/claudecodeui" run build
}

ensure_openclaude() {
    if [[ -x "$NPM_GLOBAL_BIN/openclaude" ]] || command -v openclaude >/dev/null 2>&1; then
        return
    fi
    log "Installing Lux Claude (openclaude) under $NPM_GLOBAL_PREFIX..."
    npm install -g --prefix "$NPM_GLOBAL_PREFIX" @gitlawb/openclaude
}

ensure_openclaude_config() {
    if [[ -f "$OPENCLAUDE_CONFIG" ]]; then
        return
    fi
    log "Creating default ~/.openclaude.json for Ollama local mode..."
    cat > "$OPENCLAUDE_CONFIG" <<'EOF'
{
  "provider": "ollama",
  "models": {
    "default": "qwen2.5:7b"
  },
  "openai_compatible": {
    "base_url": "http://localhost:11434/v1",
    "api_key": "ollama",
    "model": "qwen2.5:7b"
  }
}
EOF
}

ensure_hub_python_deps() {
    if python3 -c "import flask" >/dev/null 2>&1; then
        return
    fi
    log "Installing Flask for hub UI..."
    python3 -m pip install --user flask
}

run_verification() {
    if [[ -x "$ROOT_DIR/verify_setup.sh" ]]; then
        log "Running setup verification..."
        "$ROOT_DIR/verify_setup.sh"
    else
        warn "verify_setup.sh not found or not executable. Skipping verification run."
    fi
}

main() {
    require_macos
    [[ -d "$ROOT_DIR" ]] || die "LuxAutomaton directory not found: $ROOT_DIR"
    cd "$ROOT_DIR"

    ensure_paths
    ensure_xcode_tools
    ensure_homebrew
    activate_homebrew
    ensure_brew_pkg git git
    ensure_brew_pkg python3 python@3.11
    ensure_node_and_npm

    local uv_bin
    uv_bin="$(ensure_uv)"

    ensure_open_generative_app
    ensure_ollama
    ensure_manus_runtime "$uv_bin"
    ensure_luxcli
    ensure_openclaude
    ensure_openclaude_config
    ensure_hub_python_deps
    run_verification

    log "Done. Launch the hub with: $ROOT_DIR/hub.sh"
}

main "$@"
