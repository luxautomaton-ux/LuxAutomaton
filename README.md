# Lux Automaton Studio

Local-first AI workstation for macOS with a unified hub.

## Included Components

- `Open-Generative-AI/` - Lux Higgsfield Studio creative app (image/video/lipsync)
- `Manus/` - Lux Manus agent web UI (`http://localhost:8000`)
- `claudecodeui/` - Lux CLI coding web UI (`http://localhost:3001`)
- `openclaude/` - Lux Claude terminal coding agent
- `hub.py` + `templates/dashboard.html` - Control hub (`http://localhost:1337`)

## Fresh macOS Install

From the LuxAutomaton root:

```bash
chmod +x LuxAutomaton-Install.sh verify_setup.sh hub.sh LuxAutomaton.sh
./LuxAutomaton-Install.sh
```

What the installer handles:

- checks macOS + Xcode Command Line Tools
- installs Homebrew if missing
- installs `git`, `python3`, `node`, `npm` if missing
- installs `uv` if missing
- installs Lux Higgsfield Studio app from local DMG if available
- installs Ollama if missing
- builds Manus Python 3.11 runtime (`Manus/.venv311`)
- installs/builds Lux CLI (`claudecodeui/dist-server/server/index.js`)
- installs `openclaude` to `~/npm-global/bin`
- creates `~/.openclaude.json` for local Ollama mode
- verifies setup with `verify_setup.sh`

## Verify Setup Manually

```bash
./verify_setup.sh
```

The script reports pass/warn/fail and exits non-zero if critical checks fail.

## Launch Hub

```bash
./hub.sh
```

Then open:

- Hub: `http://localhost:1337`
- Lux Manus: `http://localhost:8000`
- Lux CLI: `http://localhost:3001`

## Optional CLI Menu

```bash
./LuxAutomaton.sh
```
