# Lux Automaton - Quick Start Guide

## What is Lux Automaton?

Lux Automaton is a complete AI automation studio featuring:
- **Lux Manus**: Local LLM-powered agent with file attachments
- **Lux CoWork**: Opencode-based AI chat with free models
- **Lux Tube Studio**: YouTube-style video creation and optimization
- **Hermes OS**: Viral use case automation and scanning
- **Auto-Video Pipeline**: Local video generation with ffmpeg/Wav2Lip

All components are **free, local, and private-first**.

---

## Quick Start

### Option 1: Launch Everything (Recommended)

```bash
cd ~/Documents/LuxAutomaton
./LuxAutomaton-Complete.sh
```

This starts all services and opens the Hub Dashboard.

### Option 2: Start Hub Only

```bash
cd ~/Documents/LuxAutomaton
python3 hub.py
```

Then open **http://localhost:1337** in your browser.

---

## Service Status

| Service | Port | Status |
|---------|------|--------|
| Hub | 1337 | ✓ Operational |
| Lux Manus | 8000 | ✓ Operational |
| Lux CoWork | 3002 | ✓ Operational |
| Lux Tube Backend | 5174 | ✓ Operational |
| Lux Tube Frontend | 5173 | ✓ Operational |
| Hermes OS | 8787 | ✓ Operational |
| Ollama | 11434 | ✓ Operational |

---

## Key Features

### Lux Tube Studio
- **Viral Scanner**: Analyze YouTube channels for patterns
- **Strategy Generator**: Create video plans from topics
- **AI Settings**: Manage Ollama models across apps
- **HeyGen Integration**: Connect AI avatar video tools
- **Skills**: Install and manage AI agent skills
- **Local Video Pipeline**: Generate videos with ffmpeg

### Auto-Video Pipeline
Generate videos from text scripts:
```bash
./auto-video-pipeline.sh "AI Automation"
```

Outputs:
- Script (via Ollama)
- Audio (macOS TTS or placeholder)
- Video frames (ImageMagick or placeholders)
- Assembled MP4 (9:16 vertical for Shorts/Reels)

### Hermes Use Case Scanner
Scan and apply viral YouTube strategies:
```bash
./Hermes-UseCase-Scanner.sh scan
./Hermes-UseCase-Scanner.sh apply viral-youtube-flywheel
```

---

## API Endpoints

### Hub (http://localhost:1337)
```
GET  /status              - System status
GET  /launch/{app}        - Launch app (manus, cowork, luxtube, hermes, ollama)
GET  /api/tools/connectivity
GET  /api/hermes/use-cases/presets
GET  /api/hermes/use-cases/scan
POST /api/hermes/use-cases/apply
```

### Lux Tube Backend (http://localhost:5174)
```
GET  /api/health
POST /api/viral/scan
POST /api/strategy/generate
GET  /api/models/list
POST /api/models/set
POST /api/heygen/connect
GET  /api/heygen/status
POST /api/heygen/generate
GET  /api/skills/list
POST /api/skills/install
GET  /api/agent/profile
GET  /api/system/profile
POST /api/video/generate
```

---

## File Structure

```
~/Documents/LuxAutomaton/
├── hub.py                          # Central hub server
├── LuxAutomaton-Complete.sh        # Launch all script
├── auto-video-pipeline.sh          # Video generation
├── Hermes-UseCase-Scanner.sh       # Hermes CLI
├── lux_hermes_use_cases.py         # Hermes scanner
├── Skills-Install.sh               # Skills installer
├── COMPLETION_SUMMARY.md           # Full documentation
├── LuxTube/
│   ├── server.py                   # Backend API
│   └── frontend/
│       ├── src/App.jsx             # React UI
│       └── FULL_GUIDE_USE_CASES.md
├── LuxCoWork/
│   ├── server/server.js            # Backend
│   └── renderer/                   # Electron UI
├── Manus/
│   ├── app/web/app.py              # FastAPI backend
│   └── config/config.toml          # LLM config
└── Hermes/
    ├── server.py                   # Flask server
    └── static/                     # Web UI
```

---

## Skills System

Installed skills (in `~/.claude/skills/`):
- hyperframes (video generation)
- hyperframes-cli
- hyperframes-media
- hyperframes-registry
- gsap (animations)
- nothing-design
- claude-code-workflows
- awesome-agent-skills
- claude-skills
- browser-use
- andrej-karpathy-skills

Add more via:
```bash
./Skills-Install.sh
```

---

## Troubleshooting

### Hub won't start
```bash
# Check if port 1337 is in use
lsof -i :1337

# Kill existing process and restart
kill -9 $(lsof -t -i:1337)
python3 hub.py
```

### Lux Tube Backend issues
```bash
# Check logs
cat /tmp/luxtube.log

# Restart backend
pkill -f "python3.*server.py"
python3 LuxTube/server.py
```

### Missing dependencies
```bash
# Install Python deps
pip3 install flask flask-cors

# Install Node deps
cd LuxTube/frontend && npm install
```

### Ollama models
```bash
# List installed models
ollama list

# Pull new model
ollama pull qwen2.5:7b

# Check Ollama status
curl http://localhost:11434/api/tags
```

---

## Next Steps

1. **Test the system**: Open Hub Dashboard and launch all apps
2. **Try Lux Tube**: Generate a video strategy for a topic
3. **Run auto-video**: Create a test video with `./auto-video-pipeline.sh "Test"`
4. **Scan use cases**: Run Hermes scanner for viral strategies
5. **Add skills**: Install more skills via Skills-Install.sh

---

## Documentation

- **Full Summary**: `COMPLETION_SUMMARY.md`
- **Lux Tube Guide**: `LuxTube/FULL_GUIDE_USE_CASES.md`
- **Hermes Guide**: `Hermes/static/FULL_GUIDE_USE_CASES.md`
- **Video Skill**: `marketingskills/skills/video/SKILL.md`

---

**Version**: 1.0.0  
**Date**: May 11, 2026  
**Status**: Production Ready (Local)
