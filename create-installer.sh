#!/bin/bash
set -euo pipefail

echo "🚀 Creating Lux Automaton Installer..."

APP_NAME="Lux Automaton"
APP_DIR="$APP_NAME.app"
DMG_NAME="Lux-Automaton-Installer"
RESOURCES_DIR="$APP_DIR/Contents/Resources"

COPY_ITEMS=(
  "hub.py"
  "templates"
  "static"
  "Hermes"
  "Manus"
  "LuxCoWork"
  "LuxTube"
  "claudecodeui"
  "openclaude"
  "Logos"
  "lux_hermes_use_cases.py"
  "Skills-Install.sh"
  "auto-video-pipeline.sh"
  "ANALYSIS_AND_RECOMMENDATIONS.md"
  "README-INSTALLER.txt"
  "INSTALLATION-GUIDE.md"
)

# Clean previous builds
rm -f "$DMG_NAME.dmg"
rm -rf "$APP_DIR"

# Create app structure
echo "📦 Creating app bundle..."
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$RESOURCES_DIR"

# Copy all Lux Automaton files required by hub routes/launchers
echo "📂 Copying application files..."
for item in "${COPY_ITEMS[@]}"; do
  if [ -e "$item" ]; then
    cp -R "$item" "$RESOURCES_DIR/"
  else
    echo "⚠️ Skipping missing item: $item"
  fi
done

# Create icon assets
echo "🎨 Building app icons..."
python3 create_icon.py || echo "⚠️ Icon generation skipped"

# Create launcher script
cat > "$APP_DIR/Contents/MacOS/Lux Automaton" << 'LAUNCHER'
#!/bin/bash
set -e

APP_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd ../../ && pwd)"
RESOURCES="$APP_PATH/Contents/Resources"
cd "$RESOURCES"

show_notification() {
    osascript -e "display notification \"$1\" with title \"Lux Automaton\""
}

if ! command -v python3 &> /dev/null; then
    osascript -e 'display alert "Python 3 Required" message "Please install Python 3 from python.org"'
    exit 1
fi

if ! command -v curl &> /dev/null; then
    osascript -e 'display alert "curl Required" message "Please install curl and retry."'
    exit 1
fi

if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    if [ -d "/Applications/Ollama.app" ]; then
        open -a "Ollama"
        sleep 3
    fi
fi

pip3 install flask flask-cors --quiet 2>/dev/null || true

export PYTHONPATH="$RESOURCES:${PYTHONPATH:-}"
python3 "$RESOURCES/hub.py" &
HUB_PID=$!

echo "Starting Lux Automaton services..."
for i in {1..20}; do
    if curl -s http://localhost:1337 > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

open "http://localhost:1337"
show_notification "Lux Automaton is ready!"

wait $HUB_PID
LAUNCHER

chmod +x "$APP_DIR/Contents/MacOS/Lux Automaton"

# Create Info.plist
cat > "$APP_DIR/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Lux Automaton</string>
    <key>CFBundleIdentifier</key>
    <string>com.luxautomaton.app</string>
    <key>CFBundleName</key>
    <string>Lux Automaton</string>
    <key>CFBundleDisplayName</key>
    <string>Lux Automaton</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>LUXA</string>
    <key>CFBundleIconFile</key>
    <string>LuxAutomaton</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.productivity</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <false/>
    <key>NSPrincipalClass</key>
    <string>NSApplication</string>
</dict>
</plist>
PLIST

# Create DMG
echo "💿 Creating DMG installer..."
hdiutil create -volname "$APP_NAME" -srcfolder "$APP_DIR" -ov -format UDZO "$DMG_NAME.dmg"

echo ""
echo "✅ Installer created successfully!"
echo "📍 Location: $(pwd)/$DMG_NAME.dmg"
echo ""
echo "To install:"
echo "1. Open $DMG_NAME.dmg"
echo "2. Drag Lux Automaton.app to Applications"
echo "3. Launch from Applications folder"
