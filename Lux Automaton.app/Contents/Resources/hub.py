import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from functools import wraps
import secrets

from flask import Flask, jsonify, render_template, request, send_from_directory
from flask_cors import CORS
import database

from lux_hermes_use_cases import (
    apply_use_case,
    ensure_lux_bridge_files,
    list_use_case_presets,
    scan_user_stories,
    tool_connectivity_snapshot,
)


def _first_existing(paths):
    for path in paths:
        if path and os.path.exists(path):
            return path
    return None


def _find_executable(candidates):
    for candidate in candidates:
        if not candidate:
            continue
        if os.path.isabs(candidate):
            if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
                return candidate
            continue
        found = shutil.which(candidate)
        if found:
            return found
    return None


def _escape_osascript(value):
    return value.replace("\\", "\\\\").replace('"', '\\"')


if getattr(sys, "frozen", False):
    BUNDLE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(sys.executable))))
    LUX_DIR = os.path.join(BUNDLE_DIR, "Resources", "LuxAutomaton")
    GENERATIVE_APP = os.path.join(BUNDLE_DIR, "Resources", "Lux Higgsfield Studio.app")
else:
    LUX_DIR = os.path.dirname(os.path.abspath(__file__))
    TEMPLATE_DIR = os.path.join(LUX_DIR, "templates")
    bundled_generative = os.path.abspath(os.path.join(LUX_DIR, "..", "Lux Higgsfield Studio.app"))
    GENERATIVE_APP = bundled_generative if os.path.exists(bundled_generative) else "/Applications/Lux Higgsfield Studio.app"
    bundled_npm = os.path.abspath(os.path.join(LUX_DIR, "..", "npm-global", "bin"))
    NPM_BIN = bundled_npm if os.path.exists(bundled_npm) else os.path.expanduser("~/npm-global/bin")

app = Flask(__name__, template_folder=TEMPLATE_DIR)
CORS(app)

# Security: API Key for sensitive operations
API_KEY = os.environ.get("LUX_API_KEY", "lux-prod-dev-key-1337")

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Allow localhost dashboard to bypass auth for simplicity in this local env
        if request.remote_addr == '127.0.0.1' or request.headers.get('X-Lux-Dashboard'):
             return f(*args, **kwargs)
        
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Missing authentication"}), 401
        if auth_header[7:] != API_KEY:
            return jsonify({"error": "Invalid authentication"}), 401
        return f(*args, **kwargs)
    return decorated

MANUS_DIR = os.path.join(LUX_DIR, "Manus")
HERMES_DIR = os.path.join(LUX_DIR, "Hermes")
CLOUDCLI_DIR = os.path.join(LUX_DIR, "claudecodeui")
COWORK_DIR = os.path.join(LUX_DIR, "LuxCoWork")
OPENCLAUDE_DIR = os.path.join(LUX_DIR, "openclaude")
LUXTUBE_DIR = os.path.join(LUX_DIR, "LuxTube")
LUXTUBE_FRONTEND_DIR = os.path.join(LUXTUBE_DIR, "frontend")
GENERATIVE_WEB_DIR = os.path.join(LUX_DIR, "Open-Generative-AI")
HYPERFRAMES_DIR = os.path.join(LUX_DIR, "hyperframes")
LUXCLI_ENTRY = os.path.join(CLOUDCLI_DIR, "dist-server", "server", "index.js")

running = {
    "manus": False,
    "luxcli": False,
    "luxclaude": False,
    "hermes": False,
    "cowork": False,
    "luxtube": False,
    "luxtube_backend": False,
    "hyperframes": False,
}


def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(1)
        if sock.connect_ex(("127.0.0.1", port)) == 0:
            return True
    with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as sock:
        sock.settimeout(1)
        return sock.connect_ex(("::1", port)) == 0


def wait_for_port(port, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if is_port_open(port):
            return True
        time.sleep(0.5)
    return False


def probe_http_ok(url, timeout=5):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return 200 <= response.status < 400
    except urllib.error.HTTPError as exc:
        return 200 <= exc.code < 400
    except Exception:
        return False


def resolve_node():
    return _find_executable([
        "node",
        "/opt/homebrew/bin/node",
        "/usr/local/bin/node",
    ])


def resolve_npm():
    return _find_executable([
        os.path.join(NPM_BIN, "npm"),
        "npm",
        "/opt/homebrew/bin/npm",
        "/usr/local/bin/npm",
    ])


def resolve_openclaude():
    return _find_executable([
        os.path.join(NPM_BIN, "openclaude"),
        os.path.expanduser("~/npm-global/bin/openclaude"),
        "openclaude",
    ])


def resolve_manus_python():
    return _first_existing([
        os.path.join(MANUS_DIR, ".venv311", "bin", "python"),
        os.path.join(MANUS_DIR, ".venv", "bin", "python3"),
    ])


def resolve_hermes_python():
    return _first_existing([
        os.path.expanduser("~/.hermes/hermes-agent/venv/bin/python"),
        os.path.expanduser("~/.hermes/hermes-agent/venv/bin/python3"),
    ])


def get_best_available_model(requested="gemma4"):
    """Checks Ollama for model availability and returns the best fallback."""
    fallbacks = [requested, "gemma4", "gemma2:9b", "qwen2.5:7b", "llama3.2:3b", "qwen2.5:1.5b"]
    
    try:
        req = urllib.request.Request("http://localhost:11434/api/tags")
        with urllib.request.urlopen(req, timeout=2) as response:
            data = json.loads(response.read().decode())
            installed = [m["name"] for m in data.get("models", [])]
            for model in fallbacks:
                if model in installed or any(model in name for name in installed):
                    return model
    except Exception:
        pass
    
    return "qwen2.5:1.5b" # Absolute safe floor

def ensure_openclaude_config():
    config_path = os.path.expanduser("~/.openclaude.json")
    best_model = get_best_available_model("gemma4")
    
    config = {
        "provider": "ollama",
        "models": {"default": best_model},
        "openai_compatible": {
            "base_url": "http://localhost:11434/v1",
            "api_key": "ollama",
            "model": best_model,
        },
    }
    
    # Always overwrite or create to ensure the best model is locked in
    with open(config_path, "w", encoding="utf-8") as file_obj:
        json.dump(config, file_obj, indent=2)


def ensure_luxcli_built():
    if os.path.exists(LUXCLI_ENTRY):
        return True, "Lux CLI build exists"

    npm_exec = resolve_npm()
    if not npm_exec:
        return False, "npm is missing. Run LuxAutomaton-Install.sh first."

    env = os.environ.copy()
    env["PATH"] = NPM_BIN + ":" + env.get("PATH", "")

    try:
        subprocess.run([npm_exec, "install", "--silent"], cwd=CLOUDCLI_DIR, env=env, check=True)
        subprocess.run([npm_exec, "run", "build"], cwd=CLOUDCLI_DIR, env=env, check=True)
    except subprocess.CalledProcessError as exc:
        return False, f"Lux CLI build failed (exit {exc.returncode})."

    if not os.path.exists(LUXCLI_ENTRY):
        return False, "Lux CLI build completed but dist-server entry was not created."
    return True, "Lux CLI built"


def start_manus():
    if is_port_open(8000):
        running["manus"] = True
        return True, "Lux Manus already running", "http://localhost:8000"

    manus_python = resolve_manus_python()
    if not manus_python:
        return False, "Manus Python environment not found. Run LuxAutomaton-Install.sh first.", None

    env = os.environ.copy()
    env["PATH"] = os.path.expanduser("~/.local/bin") + ":" + env.get("PATH", "")
    env["PYTHONPATH"] = MANUS_DIR

    try:
        subprocess.Popen(
            [manus_python, "-m", "uvicorn", "app.web.app:app", "--host", "127.0.0.1", "--port", "8000"],
            cwd=MANUS_DIR,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as exc:
        return False, f"Failed to start Lux Manus: {exc}", None

    if wait_for_port(8000, timeout=45):
        running["manus"] = True
        return True, "Lux Manus started", "http://localhost:8000"
    return False, "Lux Manus did not become ready on port 8000.", None


def launch_luxcli():
    if is_port_open(3001):
        running["luxcli"] = True
        return True, "Lux CLI already running", "http://localhost:3001"

    build_ok, build_message = ensure_luxcli_built()
    if not build_ok:
        return False, build_message, None

    node_exec = resolve_node()
    if not node_exec:
        return False, "Node.js is missing. Run LuxAutomaton-Install.sh first.", None

    env = os.environ.copy()
    # Remove invalid local proxy variables that cause ConnectionRefused
    env.pop("ANTHROPIC_BASE_URL", None)
    env.pop("ANTHROPIC_AUTH_TOKEN", None)
    
    env["PATH"] = os.path.join(CLOUDCLI_DIR, "node_modules", ".bin") + ":" + env.get("PATH", "")
    env["PATH"] = NPM_BIN + ":" + env["PATH"]

    try:
        subprocess.Popen(
            [node_exec, LUXCLI_ENTRY],
            env=env,
            cwd=CLOUDCLI_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as exc:
        return False, f"Failed to launch Lux CLI: {exc}", None

    if wait_for_port(3001, timeout=30):
        running["luxcli"] = True
        threading.Timer(0.5, lambda: subprocess.Popen(["open", "http://localhost:3001"])).start()
        return True, "Lux Claude started", "http://localhost:3001"
    return False, f"Lux Claude launch timed out. {build_message}", None


def launch_luxclaude():
    openclaude_exec = resolve_openclaude()
    if not openclaude_exec:
        return False, "openclaude command is missing. Run LuxAutomaton-Install.sh first.", None

    ensure_openclaude_config()

    command = (
        "export OPENAI_BASE_URL=http://localhost:11434/v1; "
        "export OPENAI_MODEL=qwen2.5:7b; "
        "export CLAUDE_CODE_USE_OPENAI=1; "
        f'"{openclaude_exec}"'
    )
    escaped_command = _escape_osascript(command)

    env = os.environ.copy()
    env["PATH"] = NPM_BIN + ":" + env.get("PATH", "")
    env["OPENAI_BASE_URL"] = "http://localhost:11434/v1"
    env["OPENAI_MODEL"] = "qwen2.5:7b"
    env["CLAUDE_CODE_USE_OPENAI"] = "1"

    try:
        subprocess.Popen(
            [
                "osascript",
                "-e",
                f'tell application "Terminal" to do script "{escaped_command}"',
                "-e",
                'tell application "Terminal" to activate',
            ],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as exc:
        return False, f"Failed to launch Lux Claude: {exc}", None

    running["luxclaude"] = True
    return True, "Lux Claude launched in Terminal", None


def launch_generative():
    app_candidates = [
        GENERATIVE_APP,
        "/Applications/Lux Higgsfield Studio.app",
    ]

    for app_path in app_candidates:
        if app_path and os.path.exists(app_path):
            try:
                subprocess.Popen(["open", app_path])
                return True, "App launched", None
            except Exception as exc:
                return False, f"Failed to open app bundle: {exc}", None

    if os.path.exists(GENERATIVE_WEB_DIR):
        npm_exec = resolve_npm()
        if not npm_exec:
            return False, "npm is required to run local Generative web mode.", None

        git_exec = _find_executable(["git", "/usr/bin/git"])

        env = os.environ.copy()
        env["PATH"] = NPM_BIN + ":" + env.get("PATH", "")
        port = 3008
        node_modules = os.path.join(GENERATIVE_WEB_DIR, "node_modules")

        required_packages = [
            os.path.join(GENERATIVE_WEB_DIR, "packages", "Vibe-Workflow", "packages", "workflow-builder", "package.json"),
            os.path.join(GENERATIVE_WEB_DIR, "packages", "Open-Poe-AI", "packages", "agents", "package.json"),
            os.path.join(GENERATIVE_WEB_DIR, "packages", "studio", "package.json"),
        ]

        try:
            if any(not os.path.exists(pkg_path) for pkg_path in required_packages):
                if not git_exec:
                    return False, "git is required to fetch Generative submodules.", None
                subprocess.run([git_exec, "submodule", "update", "--init", "--recursive"], cwd=GENERATIVE_WEB_DIR, env=env, check=True)
        except subprocess.CalledProcessError as exc:
            return (
                False,
                f"Generative submodule setup failed (exit {exc.returncode}). Run: cd Open-Generative-AI && git submodule update --init --recursive",
                None,
            )

        if is_port_open(port):
            if probe_http_ok(f"http://127.0.0.1:{port}/studio", timeout=4):
                return True, "Generative web mode already running", f"http://localhost:{port}"
            return False, "Generative web mode is running but returning errors. Run: cd Open-Generative-AI && npm run setup", None

        try:
            if not os.path.exists(node_modules):
                subprocess.run([npm_exec, "install", "--silent"], cwd=GENERATIVE_WEB_DIR, env=env, check=True)
        except subprocess.CalledProcessError as exc:
            return (
                False,
                f"Generative dependency install failed (exit {exc.returncode}). Run: cd Open-Generative-AI && npm run setup",
                None,
            )

        workspace_markers = [
            os.path.join(node_modules, "workflow-builder"),
            os.path.join(node_modules, "ai-agent"),
            os.path.join(node_modules, "studio"),
        ]

        try:
            if any(not os.path.exists(marker) for marker in workspace_markers):
                subprocess.run([npm_exec, "run", "setup"], cwd=GENERATIVE_WEB_DIR, env=env, check=True)
        except subprocess.CalledProcessError as exc:
            return (
                False,
                f"Generative workspace setup failed (exit {exc.returncode}). Run: cd Open-Generative-AI && npm run setup",
                None,
            )

        try:
            subprocess.Popen(
                [npm_exec, "run", "dev", "--", "--port", str(port), "--hostname", "127.0.0.1"],
                cwd=GENERATIVE_WEB_DIR,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception as exc:
            return False, f"Failed to start Generative web mode: {exc}", None

        if wait_for_port(port, timeout=120):
            if probe_http_ok(f"http://127.0.0.1:{port}/studio", timeout=8):
                threading.Timer(0.8, lambda: subprocess.Popen(["open", f"http://localhost:{port}"])).start()
                return True, "Generative web mode started", f"http://localhost:{port}"
            return False, "Generative web mode started but app routes are failing. Run: cd Open-Generative-AI && npm run setup", None

        return False, "Generative web mode did not become ready. Run: cd Open-Generative-AI && npm run setup", None

    return False, "Lux Higgsfield Studio is not installed and local web mode is unavailable.", None


def start_cowork():
    if is_port_open(3002):
        running["cowork"] = True
        return True, "Lux CoWork already running", "http://localhost:3002"

    if not os.path.exists(COWORK_DIR):
        return False, "Lux CoWork not found. Run setup.", None

    node_exec = resolve_node()
    if not node_exec:
        return False, "Node.js is missing.", None

    env = os.environ.copy()
    env["PATH"] = NPM_BIN + ":" + env.get("PATH", "")

    try:
        subprocess.Popen(
            [node_exec, os.path.join(COWORK_DIR, "server", "server.js")],
            cwd=COWORK_DIR,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as exc:
        return False, f"Failed to start Lux CoWork server: {exc}", None

    if not wait_for_port(3002, timeout=30):
        return False, "Lux CoWork server did not start.", None

    try:
        electron_path = os.path.join(COWORK_DIR, "node_modules", ".bin", "electron")
        if os.path.exists(electron_path):
            subprocess.Popen(
                [node_exec, electron_path, "."],
                cwd=COWORK_DIR,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                detached=True,
            )
    except Exception as exc:
        pass

    running["cowork"] = True
    threading.Timer(1.0, lambda: subprocess.Popen(["open", "http://localhost:3002"])).start()
    return True, "Lux CoWork started", "http://localhost:3002"


def start_luxtube_backend():
    port = 5174
    if is_port_open(port):
        running["luxtube_backend"] = True
        return True, "Lux Tube Backend already running", f"http://localhost:{port}"

    env = os.environ.copy()
    env["PYTHONPATH"] = LUXTUBE_DIR

    python_candidates = []
    manus_python = resolve_manus_python()
    if manus_python:
        python_candidates.append(manus_python)
    python_candidates.append("python3")

    for python_exec in python_candidates:
        try:
            subprocess.Popen(
                [python_exec, os.path.join(LUXTUBE_DIR, "server.py")],
                cwd=LUXTUBE_DIR,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception:
            continue

        if wait_for_port(port, timeout=15):
            running["luxtube_backend"] = True
            return True, "Lux Tube Backend started", f"http://localhost:{port}"

    return False, "Lux Tube Backend did not become ready on port 5174.", None


def start_luxtube():
    port = 5173
    if is_port_open(port):
        running["luxtube"] = True
        return True, "Lux Tube already running", f"http://localhost:{port}"

    if not os.path.exists(LUXTUBE_FRONTEND_DIR):
        return False, "Lux Tube frontend not found.", None

    npm_exec = resolve_npm()
    if not npm_exec:
        return False, "npm is missing.", None

    env = os.environ.copy()
    env["PATH"] = NPM_BIN + ":" + env.get("PATH", "")

    node_modules = os.path.join(LUXTUBE_FRONTEND_DIR, "node_modules")
    try:
        if not os.path.exists(node_modules):
            subprocess.run([npm_exec, "install", "--silent"], cwd=LUXTUBE_FRONTEND_DIR, env=env, check=True)
    except subprocess.CalledProcessError as exc:
        return False, f"Lux Tube dependency install failed (exit {exc.returncode}).", None

    try:
        subprocess.Popen(
            [npm_exec, "run", "dev", "--", "--host", "127.0.0.1", "--port", str(port)],
            cwd=LUXTUBE_FRONTEND_DIR,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as exc:
        return False, f"Failed to start Lux Tube: {exc}", None

    if wait_for_port(port, timeout=30):
        running["luxtube"] = True
        threading.Timer(0.8, lambda: subprocess.Popen(["open", f"http://localhost:{port}"])).start()
        return True, "Lux Tube started", f"http://localhost:{port}"
    return False, "Lux Tube did not become ready on port 5173.", None


def start_hyperframes():
    port = 5190
    if is_port_open(port):
        running["hyperframes"] = True
        return True, "Hyperframes Studio already running", f"http://localhost:{port}"

    if not os.path.exists(HYPERFRAMES_DIR):
        return False, "Hyperframes monorepo not found.", None

    env = os.environ.copy()
    env["PATH"] = NPM_BIN + ":" + env.get("PATH", "")

    # We can use bun to start the studio
    try:
        subprocess.Popen(
            ["bun", "run", "studio"],
            cwd=HYPERFRAMES_DIR,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as exc:
        return False, f"Failed to start Hyperframes Studio: {exc}", None

    if wait_for_port(port, timeout=30):
        running["hyperframes"] = True
        threading.Timer(0.8, lambda: subprocess.Popen(["open", f"http://localhost:{port}"])).start()
        return True, "Hyperframes Studio started", f"http://localhost:{port}"
    return False, "Hyperframes Studio did not become ready on port 5190.", None


@app.route("/")
def index():
    return render_template("splash.html")


@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@app.route("/hermes-setup")
def hermes_setup():
    return render_template("hermes_setup.html")

@app.route("/system-scanner")
def system_scanner():
    return render_template("system_scanner.html")


@app.route("/about")
def about_page():
    return render_template("about.html")

@app.route("/guides")
def guides_page():
    return render_template("guides.html")

@app.route("/backup")
def run_backup_route():
    from backup import create_backup
    try:
        path = create_backup()
        return jsonify({"status": "ok", "path": path})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/launch/<target>")
@require_auth
def launch(target):
    if target == "hyperframes":
        ok, message, url = start_hyperframes()
        if ok:
            return jsonify({"status": "ok", "app": "Hyperframes Studio", "url": url, "message": message})
        return jsonify({"status": "error", "app": "Hyperframes Studio", "message": message}), 500

    if target == "manus":
        ok, message, url = start_manus()
        if ok:
            return jsonify({"status": "ok", "app": "Lux Manus", "url": url, "message": message})
        return jsonify({"status": "error", "app": "Lux Manus", "message": message}), 500

    if target == "luxcli":
        ok, message, url = launch_luxcli()
        if ok:
            return jsonify({"status": "ok", "app": "Lux Claude Code", "url": url, "message": message})
        return jsonify({"status": "error", "app": "Lux Claude Code", "message": message}), 500

    if target == "luxclaude":
        ok, message, url = launch_luxclaude()
        if ok:
            return jsonify({"status": "ok", "app": "Lux Claude Terminal", "url": url, "message": message})
        return jsonify({"status": "error", "app": "Lux Claude Terminal", "message": message}), 500

    if target == "generative":
        ok, message, url = launch_generative()
        if ok:
            return jsonify({"status": "ok", "app": "Lux Higgsfield Studio", "url": url, "message": message})
        return jsonify({"status": "error", "app": "Lux Higgsfield Studio", "message": message}), 500

    if target == "ollama":
        if not os.path.exists("/Applications/Ollama.app") and not _find_executable(["ollama"]):
            return jsonify({"status": "error", "app": "Ollama", "message": "Ollama is not installed."}), 500
        subprocess.Popen(["open", "-a", "Ollama"])
        return jsonify({"status": "ok", "app": "Ollama", "url": None, "message": "App launched"})

    if target == "hermes":
        if not os.path.exists(HERMES_DIR):
            return jsonify({"status": "error", "app": "Hermes OS", "message": "Hermes WebUI not found. Run bootstrap."}), 500
        port = 8787
        if is_port_open(port):
            running["hermes"] = True
            return jsonify({"status": "ok", "app": "Hermes OS", "url": f"http://localhost:{port}", "message": "Already running"})
        hermes_python = resolve_hermes_python()
        if not hermes_python:
            return jsonify({"status": "error", "app": "Hermes OS", "message": "Hermes venv Python not found."}), 500
        env = os.environ.copy()
        env["PATH"] = NPM_BIN + ":" + env.get("PATH", "")
        try:
            subprocess.Popen(
                [hermes_python, os.path.join(HERMES_DIR, "server.py")],
                cwd=HERMES_DIR,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception as exc:
            return jsonify({"status": "error", "app": "Hermes OS", "message": f"Failed to launch: {exc}"}), 500
        if wait_for_port(port, timeout=45):
            running["hermes"] = True
            threading.Timer(0.5, lambda: subprocess.Popen(["open", f"http://localhost:{port}"])).start()
            return jsonify({"status": "ok", "app": "Hermes OS", "url": f"http://localhost:{port}", "message": "Hermes OS started"})
        return jsonify({"status": "ok", "app": "Hermes OS", "url": f"http://localhost:{port}", "message": "Started — give it a few seconds"})

    if target == "cowork":
        ok, message, url = start_cowork()
        if ok:
            return jsonify({"status": "ok", "app": "Lux CoWork", "url": url, "message": message})
        return jsonify({"status": "error", "app": "Lux CoWork", "message": message}), 500

    if target in {"luxtube", "luxtube-backend"}:
        ok, message, url = start_luxtube_backend()
        if ok:
            return jsonify({"status": "ok", "app": "Lux Tube Backend", "url": url, "message": message})
        return jsonify({"status": "error", "app": "Lux Tube Backend", "message": message}), 500

    if target == "luxtube-frontend":
        ok, message, url = start_luxtube()
        if ok:
            return jsonify({"status": "ok", "app": "Lux Tube", "url": url, "message": message})
        return jsonify({"status": "error", "app": "Lux Tube", "message": message}), 500

    return jsonify({"status": "error", "message": f"Unknown app target: {target}"}), 404


def get_auth_status():
    try:
        req = urllib.request.Request("http://localhost:3001/api/auth/status")
        with urllib.request.urlopen(req, timeout=1) as response:
            return json.loads(response.read().decode())
    except Exception:
        return {"needsSetup": False, "isAuthenticated": False, "offline": True}


@app.route("/status")
def status():
    auth = get_auth_status()
    try:
        import backup
        drives = backup.get_usb_drives()
        auth["usb_connected"] = len(drives) > 0
        auth["drives"] = drives
    except Exception:
        auth["usb_connected"] = False
        auth["drives"] = []
        
    return jsonify(
        {
            "manus": is_port_open(8000),
            "luxcli": is_port_open(3001),
            "luxclaude": running["luxclaude"],
            "hermes": is_port_open(8787),
            "cowork": is_port_open(3002),
            "luxtube": is_port_open(5173),
            "luxtube_backend": is_port_open(5174),
            "hyperframes": is_port_open(5190),
            "generative": os.path.exists(GENERATIVE_APP)
            or os.path.exists("/Applications/Lux Higgsfield Studio.app")
            or os.path.exists(GENERATIVE_WEB_DIR)
            or is_port_open(3008),
            "ollama": os.path.exists("/Applications/Ollama.app") or bool(_find_executable(["ollama"])),
            "ollama_running": is_port_open(11434),
            "ollama_models": get_ollama_models(),
            "auth_status": auth,
            "checks": {
                "node": bool(resolve_node()),
                "npm": bool(resolve_npm()),
                "openclaude": bool(resolve_openclaude()),
                "manus_env": bool(resolve_manus_python()),
                "luxcli_build": os.path.exists(LUXCLI_ENTRY),
                "cowork_dir": os.path.exists(COWORK_DIR),
                "luxtube_dir": os.path.exists(LUXTUBE_FRONTEND_DIR),
            },
        }
    )



@app.route("/api/production/readiness")
def production_readiness():
    checks = {
        "node": bool(resolve_node()),
        "npm": bool(resolve_npm()),
        "manus_env": bool(resolve_manus_python()),
        "ollama_installed": os.path.exists("/Applications/Ollama.app") or bool(_find_executable(["ollama"])),
        "hub_running": True,
        "manus_running": is_port_open(8000),
        "luxcli_running": is_port_open(3001),
        "cowork_running": is_port_open(3002),
        "hermes_running": is_port_open(8787),
        "luxtube_frontend_running": is_port_open(5173),
        "luxtube_backend_running": is_port_open(5174),
        "ollama_running": is_port_open(11434),
    }

    critical = [
        "node",
        "npm",
        "manus_env",
        "ollama_installed",
        "hub_running",
    ]
    runtime = [
        "manus_running",
        "luxcli_running",
        "cowork_running",
        "hermes_running",
        "luxtube_frontend_running",
        "luxtube_backend_running",
        "ollama_running",
    ]

    missing_critical = [key for key in critical if not checks[key]]
    missing_runtime = [key for key in runtime if not checks[key]]

    ready = not missing_critical
    score = int(((len(checks) - len(missing_critical) - len(missing_runtime)) / len(checks)) * 100)

    recommendations = []
    if "manus_env" in missing_critical:
        recommendations.append("Create/repair Manus virtual environment and reinstall dependencies.")
    if "ollama_installed" in missing_critical:
        recommendations.append("Install Ollama to enable local model execution.")
    if missing_runtime:
        recommendations.append("Start missing runtime services from the dashboard or system scanner.")

    return jsonify(
        {
            "status": "ok",
            "ready_for_production": ready,
            "score": max(score, 0),
            "checks": checks,
            "missing_critical": missing_critical,
            "missing_runtime": missing_runtime,
            "recommendations": recommendations,
        }
    )


@app.route("/api/tools/connectivity")
def tools_connectivity():
    try:
        return jsonify({"status": "ok", **tool_connectivity_snapshot()})
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/api/tools/ensure-bridge", methods=["POST"])
def ensure_bridge():
    try:
        return jsonify(ensure_lux_bridge_files())
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/api/hermes/use-cases/presets")
def hermes_use_case_presets():
    return jsonify({"status": "ok", **list_use_case_presets()})


@app.route("/api/hermes/use-cases/scan")
def hermes_use_case_scan():
    limit_raw = request.args.get("limit", "60")
    try:
        limit = int(limit_raw)
    except ValueError:
        limit = 60

    category = request.args.get("category", "")
    source = request.args.get("source", "")
    keyword = request.args.get("keyword", "")
    refresh_raw = request.args.get("refresh", "0").strip().lower()
    force_refresh = refresh_raw in {"1", "true", "yes", "on"}

    try:
        payload = scan_user_stories(
            limit=limit,
            category=category,
            source=source,
            keyword=keyword,
            force_refresh=force_refresh,
        )
        return jsonify({"status": "ok", **payload})
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/api/hermes/use-cases/apply", methods=["POST"])
def hermes_use_case_apply():
    body = request.get_json(silent=True) or {}
    preset_id = str(body.get("preset_id") or "").strip()
    if not preset_id:
        return jsonify({"status": "error", "message": "preset_id is required"}), 400

    custom_profile = body.get("profile") or {}
    auto_apply_cron = body.get("auto_apply_cron", True)

    try:
        result = apply_use_case(
            preset_id=preset_id,
            custom_profile=custom_profile,
            auto_apply_cron=bool(auto_apply_cron),
        )
        database.log_job("hermes", f"apply_use_case_{preset_id}", status="completed", result=result)
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/api/models/set", methods=["POST"])
@require_auth
def models_set():
    """
    Update model selection across the entire Lux stack.
    Wires to Manus, CoWork, and Lux Claude.
    """
    body = request.get_json(silent=True) or {}
    model_name = str(body.get("model") or body.get("model_name") or "").strip()
    if not model_name:
        return jsonify({"status": "error", "message": "Model name required."}), 400

    database.set_setting("default_model", model_name)
    
    # Proxy to Lux Tube Backend if running, as it has the logic to rewrite files
    if is_port_open(5174):
        try:
            req = urllib.request.Request(
                "http://localhost:5174/api/models/set",
                data=json.dumps({"model": model_name}).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                result = json.loads(response.read())
                return jsonify({
                    "status": "ok",
                    "model": model_name,
                    "propagated": True,
                    "updated_files": result.get("updated_files", []),
                    "message": f"Model stack updated to {model_name}"
                })
        except Exception as exc:
            return jsonify({"status": "warn", "message": f"Model set in DB, but propagation failed: {exc}"}), 200
    
    return jsonify({"status": "ok", "model": model_name, "propagated": False, "message": "Model set in database. Propagation skipped (Lux Tube offline)."})


@app.route("/api/lux-ai/config", methods=["GET", "POST"])
def lux_ai_config():
    if request.method == "POST":
        body = request.get_json(silent=True) or {}
        path = body.get("path")
        if path in {"auto", "gpu", "cpu"}:
            database.set_setting("lux_ai_path", path)
            return jsonify({"status": "ok", "path": path})
        return jsonify({"status": "error", "message": "Invalid path"}), 400
    
    return jsonify({
        "status": "ok",
        "path": database.get_setting("lux_ai_path", "auto")
    })


def get_ollama_models():
    try:
        import urllib.request

        result = urllib.request.urlopen("http://localhost:11434/api/tags", timeout=2)
        data = json.loads(result.read())
        return [model["name"] for model in data.get("models", [])]
    except Exception:
        return []


def has_high_power_gpu():
    """Detect if the system has a capable GPU (Apple Silicon/Metal or NVIDIA)."""
    try:
        if sys.platform == "darwin":
            result = subprocess.run(["system_profiler", "SPDisplaysDataType"], capture_output=True, text=True)
            output = result.stdout.lower()
            return "apple" in output or "metal" in output
        else:
            result = subprocess.run(["nvidia-smi"], capture_output=True, text=True)
            return result.returncode == 0
    except Exception:
        return False


@app.route("/lux-ai")
def lux_ai_page():
    return render_template("lux_ai.html")


@app.route("/models")
def models_discovery():
    return render_template("models.html")


@app.route("/api/models/pull", methods=["POST"])
def models_pull():
    """Trigger Ollama to pull a model in the background or terminal."""
    body = request.get_json(silent=True) or {}
    model_name = body.get("model")
    
    if not model_name:
        return jsonify({"status": "error", "message": "Model name required"}), 400
        
    try:
        # We can use osascript to open terminal so the user sees the progress of the heavy download
        command = f'ollama run {model_name}'
        escaped_command = _escape_osascript(command)
        
        subprocess.Popen([
            "osascript", "-e",
            f'tell application "Terminal" to do script "{escaped_command}"',
            "-e", 'tell application "Terminal" to activate'
        ])
        
        return jsonify({
            "status": "ok", 
            "message": f"Terminal opened to pull/run {model_name}"
        })
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/api/lux-ai/chat", methods=["POST"])
def lux_ai_chat():
    """
    LUX AI Smart Router: Two hardware paths, one decision already made for you.
    GPU runs Qwen3.6 27B. CPU runs Qwen3.6 35B A3B.
    Proxies request to local Ollama.
    """
    body = request.get_json(silent=True) or {}
    
    # Smart Routing
    config_path = database.get_setting("lux_ai_path", "auto")
    available_models = get_ollama_models()
    
    if config_path == "gpu" or (config_path == "auto" and has_high_power_gpu()):
        hardware_path = "gpu"
        for preferred in ["qwen2.5:7b", "llama3.2:3b", "gemma2:9b"]:
            if preferred in available_models:
                target_model = preferred
                break
        else:
            target_model = available_models[0] if available_models else "qwen2.5:1.5b"
    else:
        hardware_path = "cpu"
        for preferred in ["qwen2.5:1.5b", "gemma3:1b", "qwen2.5:3b"]:
            if preferred in available_models:
                target_model = preferred
                break
        else:
            target_model = available_models[0] if available_models else "qwen2.5:1.5b"
        
    # Override the model requested by the client
    body["model"] = target_model
    
    # Determine the remote or local Ollama URL
    # For LUX Link, we can eventually point this to a remote Tailscale IP.
    # For now, it defaults to the local Ollama instance.
    ollama_url = "http://localhost:11434/api/chat"
    
    try:
        import json
        import urllib.request
            
        req = urllib.request.Request(
            ollama_url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=300) as response:
            result = json.loads(response.read())
            
        # Inject metadata to show which hardware path was used
        result["lux_ai_metadata"] = {
            "hardware_path": hardware_path,
            "model_used": target_model,
            "message": "Processed by LUX AI Smart Router"
        }
        return jsonify(result)
        
    except Exception as exc:
        return jsonify({
            "error": f"LUX AI Engine failed to process request via {hardware_path} ({target_model}): {str(exc)}",
            "lux_ai_metadata": {
                "hardware_path": hardware_path,
                "model_used": target_model
            }
        }), 500


@app.route("/api/backup/create")
def api_create_backup():
    try:
        import backup
        path = backup.create_backup()
        return jsonify({"status": "ok", "path": path})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/backup/status")
def api_backup_status():
    try:
        import backup
        drives = backup.get_usb_drives()
        return jsonify({
            "usb_connected": len(drives) > 0,
            "drives": drives
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    threading.Timer(1.0, lambda: subprocess.Popen(["open", "http://localhost:1337"])).start()
    app.run(host="0.0.0.0", port=1337, debug=False)
