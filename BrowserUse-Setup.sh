#!/bin/bash
# Browser Use Setup Script for Lux Automaton
# Run this to configure browser-use with your agents

set -e

BROWSER_USE_DIR="$HOME/Documents/LuxAutomaton/browser-use"
VENV_PYTHON="$HOME/.hermes/hermes-agent/venv/bin/python"
SKILL_PATH="$HOME/.claude/skills/browser-use/SKILL.md"

echo "============================================"
echo "Browser Use Setup for Lux Automaton"
echo "============================================"
echo ""

# Check if browser-use is cloned
if [ ! -d "$BROWSER_USE_DIR" ]; then
    echo "Cloning browser-use repository..."
    cd ~/Documents/LuxAutomaton
    git clone https://github.com/browser-use/browser-use.git
fi

# Install browser-use to Hermes venv
echo "Installing browser-use to Hermes venv..."
cd ~/.hermes/hermes-agent && uv pip install browser-use --python venv/bin/python 2>&1 | tail -1

# Create wrapper script for browser-use CLI
echo "Creating browser-use CLI wrapper..."
mkdir -p ~/npm-global/bin
cat > ~/npm-global/bin/browser-use << 'WRAPPER'
#!/bin/bash
exec ~/.hermes/hermes-agent/venv/bin/python -m browser_use.skill_cli "$@"
WRAPPER
chmod +x ~/npm-global/bin/browser-use

# Verify browser-use works
echo ""
echo "Running browser-use doctor..."
export PATH="$HOME/npm-global/bin:$PATH"
if browser-use doctor 2>&1 | head -5; then
    echo "browser-use is ready!"
fi

# Install Claude Code skill
echo ""
echo "Installing Claude Code skill..."
mkdir -p ~/.claude/skills/browser-use
curl -s https://raw.githubusercontent.com/browser-use/browser-use/main/skills/browser-use/SKILL.md -o "$SKILL_PATH"
echo "Skill installed at: $SKILL_PATH"

# Copy skill to OpenClaude skills directory
mkdir -p ~/Documents/LuxAutomaton/browser-use/skills
cp "$SKILL_PATH" ~/Documents/LuxAutomaton/browser-use/skills/browser-use.md

echo ""
echo "============================================"
echo "Setup complete!"
echo ""
echo "browser-use is now available to all your agents."
echo ""
echo "USAGE WITH LUX CLAUDE CODE TERMINAL:"
echo "  1. Start a chat with Lux Claude Code"
echo "  2. The browser-use skill is automatically loaded"
echo "  3. Ask: 'Open github.com and find the browser-use repo'"
echo ""
echo "USAGE WITH HERMES OS:"
echo "  1. The agent can use browser automation tools"
echo "  2. Tools: browser_navigate, browser_snapshot, etc."
echo "  3. Hermes has built-in browser tools via agent-browser"
echo ""
echo "CLI COMMANDS:"
echo "  browser-use open <url>    # Open webpage"
echo "  browser-use state          # See clickable elements"
echo "  browser-use click <n>     # Click element by index"
echo "  browser-use type <text>  # Type text"
echo "  browser-use screenshot    # Take screenshot"
echo ""
echo "CONNECT TO YOUR CHROME (preserves logins):"
echo "  browser-use connect"
echo ""
echo "Use with HIGGSFIELD AI:"
echo "  Generate image with Higgsfield"
echo "  Open browser to view/share the result"
echo "  Automate form fills on any website"
echo "  Research and fill job applications"
echo "  Extract data from any webpage"
echo "============================================"