#!/bin/bash
# Higgsfield AI MCP Setup Script for Lux Automaton
# Run this to configure your Higgsfield API credentials

set -e

HIGGSFIELD_DIR="$HOME/Documents/LuxAutomaton/higgsfield_ai_mcp"
VENV_PYTHON="$HOME/.hermes/hermes-agent/venv/bin/python"

echo "============================================"
echo "Higgsfield AI MCP Setup for Lux Claude Code"
echo "============================================"
echo ""

# Check if Higgsfield MCP is installed
if [ ! -d "$HIGGSFIELD_DIR" ]; then
    echo "Cloning Higgsfield AI MCP..."
    cd ~/Documents/LuxAutomaton
    git clone https://github.com/geopopos/higgsfield_ai_mcp.git
    cd higgsfield_ai_mcp
    uv venv .venv --python 3.11
    uv pip install -r requirements.txt --python .venv/bin/python
    echo "Higgsfield MCP installed!"
else
    echo "Higgsfield MCP already cloned."
fi

# Check if it's installed in Hermes venv
echo ""
echo "Installing Higgsfield MCP into Hermes venv..."
cd "$HIGGSFIELD_DIR"
uv pip install -e . --python "$VENV_PYTHON" 2>/dev/null || echo "(Already installed or skipped)"

# Create .env if not exists
if [ ! -f "$HIGGSFIELD_DIR/.env" ]; then
    cp "$HIGGSFIELD_DIR/.env.example" "$HIGGSFIELD_DIR/.env"
    echo ""
    echo "Created $HIGGSFIELD_DIR/.env"
    echo "Please edit it and add your API credentials:"
    echo "  HF_API_KEY=your-api-key"
    echo "  HF_SECRET=your-secret"
fi

# Configure in OpenClaude .mcp.json
echo ""
echo "Configuring .mcp.json..."
cat > ~/.mcp.json << 'MCPJSON'
{
  "mcpServers": {
    "higgsfield": {
      "command": "~/.hermes/hermes-agent/venv/bin/python",
      "args": ["-m", "higgsfield_mcp.server"],
      "cwd": "~/Documents/LuxAutomaton/higgsfield_ai_mcp",
      "env": {
        "HF_API_KEY": "${HF_API_KEY}",
        "HF_SECRET": "${HF_SECRET}"
      }
    }
  }
}
MCPJSON

# Also configure in OpenClaude project settings
echo "Configuring OpenClaude project MCP settings..."
python3 << 'PYEOF'
import json
with open(os.path.expanduser("~/.openclaude.json"), "r+") as f:
    config = json.load(f)
    for project_name, project in config.get("projects", {}).items():
        project["mcpServers"] = {
            "higgsfield": {
                "command": "~/.hermes/hermes-agent/venv/bin/python",
                "args": ["-m", "higgsfield_mcp.server"],
                "cwd": "~/Documents/LuxAutomaton/higgsfield_ai_mcp",
                "env": {
                    "HF_API_KEY": "${HF_API_KEY}",
                    "HF_SECRET": "${HF_SECRET}"
                }
            }
        }
        project["enabledMcpjsonServers"] = ["higgsfield"]
    f.seek(0)
    json.dump(config, f, indent=2)
    f.truncate()
PYEOF

# Configure in Hermes config.yaml
echo "Configuring Hermes MCP settings..."
python3 << 'PYEOF'
import re
config_path = os.path.expanduser("~/.hermes/config.yaml")
with open(config_path) as f:
    content = f.read()

higgsfield_block = '''mcp_servers:
  higgsfield:
    command: "~/.hermes/hermes-agent/venv/bin/python"
    args: ["-m", "higgsfield_mcp.server"]
    cwd: "~/Documents/LuxAutomaton/higgsfield_ai_mcp"
    env:
      HF_API_KEY: "${HF_API_KEY}"
      HF_SECRET: "${HF_SECRET}"
'''

# Remove old mcp_servers section if exists
lines = content.split('\n')
new_lines = []
skip = False
for line in lines:
    if line.strip().startswith('mcp_servers:') and '# mcp_servers' not in line:
        skip = True
        continue
    if skip and line and not line[0].isspace() and not line.startswith('#'):
        skip = False
    if not skip:
        new_lines.append(line)

content = '\n'.join(new_lines)

# Add the higgsfield config
if 'mcp_servers:' in content:
    # Replace existing
    content = re.sub(r'# mcp_servers:.*?(?=\n\S|\Z)', higgsfield_block, content, flags=re.DOTALL)
else:
    # Add before the first # ==== line or at end
    content += '\n\n' + higgsfield_block

with open(config_path, 'w') as f:
    f.write(content)
PYEOF

echo ""
echo "============================================"
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your Higgsfield API credentials to:"
echo "   $HIGGSFIELD_DIR/.env"
echo ""
echo "2. Get your API keys from:"
echo "   https://cloud.higgsfield.ai/api-keys"
echo ""
echo "3. Restart Lux Claude Code / Hermes to load the MCP server"
echo ""
echo "Available tools in Lux Claude Code:"
echo "  - generate_image: Create high-quality images from text prompts"
echo "  - generate_video: Convert images to cinematic 5-second videos"
echo "  - create_character: Create reusable character references"
echo "  - get_generation_status: Check job status and get results"
echo "  - list_characters: List your created character references"
echo "============================================"