# Lux Automaton - Complete Installation Guide

## 🎯 Quick Start (Recommended)

### Option 1: Use the App Bundle (Easiest)
```bash
# Already created! Just run:
open "Lux Automaton.app"
```

The app will:
- ✅ Start all services automatically
- ✅ Open dashboard in your browser
- ✅ Show notifications when ready
- ✅ Run in background

---

## 📦 Create DMG Installer

To create a professional DMG installer for distribution:

```bash
cd ~/Documents/LuxAutomaton
./create-installer.sh
```

This creates `Lux-Automaton-Installer.dmg` which users can:
1. Open
2. Drag to Applications
3. Launch anytime

---

## 🔧 Manual Installation

### Step 1: Install Dependencies
```bash
# Install Python 3 (if not already)
brew install python3

# Install required packages
pip3 install flask flask-cors
```

### Step 2: Install Ollama (Optional)
```bash
# Download from: https://ollama.com
# Or use brew:
brew install --cask ollama

# Pull models
ollama pull qwen2.5:7b
ollama pull llama3.2:3b
```

### Step 3: Launch
```bash
cd ~/Documents/LuxAutomaton
python3 hub.py
```

Then open: http://localhost:1337

---

## 🎨 Custom App Icon

To add your custom logo:

1. Create 1024x1024 PNG of your logo
2. Convert to ICNS:
```bash
# Using iconutil
mkdir icon.iconset
cp your-logo-512.png icon.iconset/icon_512x512.png
cp your-logo-256.png icon.iconset/icon_256x256.png
cp your-logo-128.png icon.iconset/icon_128x128.png
iconutil -c icns icon.iconset -o "Lux Automaton.app/Contents/Resources/icon.icns"
```

3. Update Info.plist to reference the icon

---

## 📱 Access Points

Once installed, access Lux Automaton at:

| Service | URL | Description |
|---------|-----|-------------|
| **Main Dashboard** | http://localhost:1337 | Central hub for all apps |
| **System Scanner** | http://localhost:1337/system-scanner | Monitor services |
| **Hermes Setup** | http://localhost:1337/hermes-setup | Viral use case setup |
| **Lux Tube** | http://localhost:5173 | YouTube UI |
| **Lux Tube API** | http://localhost:5174 | Video backend |

---

## 🔍 Troubleshooting

### App won't start
```bash
# Check Python
python3 --version

# Check if port 1337 is in use
lsof -i :1337

# Kill existing instance
killall -9 Python
```

### Dashboard won't load
```bash
# Check if hub is running
curl http://localhost:1337/status

# Restart services
pkill -f hub.py
python3 hub.py
```

### Ollama not working
```bash
# Check if running
ollama list

# Start manually
ollama serve

# Pull model if needed
ollama pull qwen2.5:7b
```

---

## 📊 What's Installed

The Lux Automaton app includes:

- **Hub** - Central dashboard and launcher
- **Manus** - AI agent interface (manus.im style)
- **Lux Tube** - YouTube UI integration
- **Hermes** - Viral use case automation
- **Lux CoWork** - Opencode-based chat
- **Auto-Video Pipeline** - Local video generation
- **Skills System** - Extensible AI capabilities

---

## 🎯 Features

✅ **Local-First AI** - Runs on your machine with Ollama
✅ **Multi-Modal** - Text, image, and video generation
✅ **Modern UI** - Claude Code-inspired design
✅ **Extensible** - Skills system for adding features
✅ **Private** - No cloud dependencies (optional)
✅ **Free** - No subscription required

---

## 📧 Support

For issues or questions:
- Check `ANALYSIS_AND_RECOMMENDATIONS.md`
- Review logs in Console.app
- Check `~/Documents/LuxAutomaton/README.md`

---

## 🚀 Next Steps

After installation:
1. Open Lux Automaton.app
2. Dashboard opens automatically
3. Click any app card to launch
4. Use System Scanner to monitor
5. Start creating with AI!

---

© 2026 Lux Automaton. All rights reserved.
