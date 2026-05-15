import argparse
import os
import sys
from pathlib import Path

import uvicorn


# Check WebSocket dependencies
def check_websocket_dependencies():
    pass

    return True


# Ensure required directory structure exists
def ensure_directories():
    # Create templates directory
    templates_dir = Path("app/web/templates")
    templates_dir.mkdir(parents=True, exist_ok=True)

    # Create static directory
    static_dir = Path("app/web/static")
    static_dir.mkdir(parents=True, exist_ok=True)

    # Ensure __init__.py exists
    init_file = Path("app/web/__init__.py")
    if not init_file.exists():
        init_file.touch()


if __name__ == "__main__":
    # Add command-line arguments
    parser = argparse.ArgumentParser(description="OpenManus web app server")
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser on startup")
    parser.add_argument("--port", type=int, default=8000, help="Server port (default: 8000)")

    args = parser.parse_args()

    ensure_directories()

    if not check_websocket_dependencies():
        print("Exiting application. Install required dependencies and retry.")
        sys.exit(1)

    # Set environment variable to control automatic browser launch
    if args.no_browser:
        os.environ["AUTO_OPEN_BROWSER"] = "0"
    else:
        os.environ["AUTO_OPEN_BROWSER"] = "1"

    port = args.port

    print("Starting OpenManus web application...")
    print(f"Open http://localhost:{port} to begin")

    uvicorn.run("app.web.app:app", host="0.0.0.0", port=port, reload=True)
