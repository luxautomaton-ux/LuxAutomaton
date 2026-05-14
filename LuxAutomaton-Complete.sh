#!/bin/bash
# Lux Automaton - Complete Launch Script
# Starts all Lux Automaton components

set -e

echo "=== Lux Automaton - Complete Launch ==="
echo ""

HUB_URL="http://localhost:1337"
LUXTUBE_BACKEND_URL="http://localhost:5174"

# Check if Hub is running
if curl -s "$HUB_URL/status" > /dev/null 2>&1; then
    echo "✓ Hub is already running"
else
    echo "Starting Hub..."
    cd "$(dirname "$0")"
    nohup python3 hub.py > /tmp/hub.log 2>&1 &
    sleep 3
    if curl -s "$HUB_URL/status" > /dev/null 2>&1; then
        echo "✓ Hub started"
    else
        echo "✗ Hub failed to start. Check /tmp/hub.log"
        exit 1
    fi
fi

# Check if Lux Tube Backend is running
if curl -s "$LUXTUBE_BACKEND_URL/api/health" > /dev/null 2>&1; then
    echo "✓ Lux Tube Backend is already running"
else
    echo "Starting Lux Tube Backend..."
    cd "$(dirname "$0")/LuxTube"
    nohup python3 server.py > /tmp/luxtube.log 2>&1 &
    sleep 3
    if curl -s "$LUXTUBE_BACKEND_URL/api/health" > /dev/null 2>&1; then
        echo "✓ Lux Tube Backend started"
    else
        echo "✗ Lux Tube Backend failed to start. Check /tmp/luxtube.log"
        exit 1
    fi
fi

echo ""
echo "=== Launching Applications ==="
echo ""

# Launch Ollama (if not running)
if curl -s "http://localhost:11434/api/tags" > /dev/null 2>&1; then
    echo "✓ Ollama is running"
else
    echo "Launching Ollama..."
    curl -s "$HUB_URL/launch/ollama" > /dev/null
    sleep 2
    if curl -s "http://localhost:11434/api/tags" > /dev/null 2>&1; then
        echo "✓ Ollama started"
    else
        echo "! Ollama not detected. Install from ollama.com"
    fi
fi

# Launch Lux Manus
echo "Launching Lux Manus..."
curl -s "$HUB_URL/launch/manus" > /dev/null
sleep 2
if curl -s "http://localhost:8000" > /dev/null 2>&1; then
    echo "✓ Lux Manus started (Port 8000)"
else
    echo "! Lux Manus status unknown"
fi

# Launch Lux CoWork
echo "Launching Lux CoWork..."
curl -s "$HUB_URL/launch/cowork" > /dev/null
sleep 2
if curl -s "http://localhost:3002/api/health" > /dev/null 2>&1; then
    echo "✓ Lux CoWork started (Port 3002)"
else
    echo "! Lux CoWork status unknown"
fi

# Launch Lux Tube Frontend
echo "Launching Lux Tube Frontend..."
curl -s "$HUB_URL/launch/luxtube-frontend" > /dev/null
sleep 3
if curl -s "http://localhost:5173" > /dev/null 2>&1; then
    echo "✓ Lux Tube Frontend started (Port 5173)"
else
    echo "! Lux Tube Frontend status unknown"
fi

# Launch Hermes OS
echo "Launching Hermes OS..."
curl -s "$HUB_URL/launch/hermes" > /dev/null
sleep 3
if curl -s "http://localhost:8787" > /dev/null 2>&1; then
    echo "✓ Hermes OS started (Port 8787)"
else
    echo "! Hermes OS status unknown"
fi

echo ""
echo "=== System Status ==="
echo ""
curl -s "$HUB_URL/status" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"Ollama:        {'✓ Running' if d.get('ollama_running') else '✗ Stopped'}\")
print(f\"Lux Manus:     {'✓ Running' if d.get('manus') else '✗ Stopped'}\")
print(f\"Lux CoWork:    {'✓ Running' if d.get('cowork') else '✗ Stopped'}\")
print(f\"Lux Tube BE:   {'✓ Running' if d.get('luxtube_backend') else '✗ Stopped'}\")
print(f\"Lux Tube FE:   {'✓ Running' if d.get('luxtube') else '✗ Stopped'}\")
print(f\"Hermes OS:     {'✓ Running' if d.get('hermes') else '✗ Stopped'}\")
print(f\"Models:        {len(d.get('ollama_models', []))} available\")
"

echo ""
echo "=== Access URLs ==="
echo ""
echo "Hub Dashboard:   http://localhost:1337"
echo "Lux Manus:       http://localhost:8000"
echo "Lux CoWork:      http://localhost:3002"
echo "Lux Tube:        http://localhost:5173"
echo "Lux Tube API:    http://localhost:5174"
echo "Hermes OS:       http://localhost:8787"
echo "Ollama:          http://localhost:11434"
echo ""
echo "=== Complete ==="
