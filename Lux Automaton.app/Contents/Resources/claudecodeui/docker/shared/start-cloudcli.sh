#!/bin/bash
# Auto-start Lux CLI server in background if not already running.

if ! pgrep -f "server/index.js" > /dev/null 2>&1; then
  nohup luxcli start --port 3001 > /tmp/luxcli.log 2>&1 &
  disown

  echo ""
  echo "  Lux CLI is starting on port 3001..."
  echo ""
  echo "  Forward the port from another terminal:"
  echo "    sbx ports <sandbox-name> --publish 3001:3001"
  echo ""
  echo "  Then open: http://localhost:3001"
  echo ""
fi