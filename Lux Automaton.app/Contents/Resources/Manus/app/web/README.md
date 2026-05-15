# OpenManus Web App

This folder contains the web interface layer for OpenManus / Lux Manus.

## What it provides

- FastAPI web server and API routes for chat sessions
- Connected interface UI (`static/connected_interface.html` + `static/connected_interface.js`)
- WebSocket streaming for task progress and logs
- Workspace file browsing and file preview support

## Run locally

1. Install dependencies from the main Manus project.
2. Start Manus web server from project root.
3. Open `http://localhost:8000` in your browser.

## Key files

- `app.py`: FastAPI entrypoint and API routes
- `thinking_tracker.py`: session thinking/progress tracking
- `log_handler.py`: per-session log capture helpers
- `api.py`: job files and logs endpoints
- `static/connected_interface.html`: primary UI shell
- `static/connected_interface.js`: client logic

## Language policy

Runtime UI and active code paths are English-only.
