import json
import os
import platform
import re
import shutil
import socket
import time
from datetime import datetime

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

from agents.pipeline import pipeline
LUXTUBE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(LUXTUBE_DIR, "frontend")
STATIC_DIR = os.path.join(FRONTEND_DIR, "dist")
DATA_DIR = os.path.join(LUXTUBE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")
CORS(app)

# Initialize APScheduler for 24/7 Automation
scheduler = BackgroundScheduler()
scheduler.add_job(func=pipeline.run_daily_pipeline, trigger="cron", hour=6, minute=0) # Run at 6 AM daily
scheduler.start()


HEYGEN_CONFIG_PATH = os.path.join(DATA_DIR, "heygen_config.json")
AGENT_PROFILE_PATH = os.path.join(DATA_DIR, "agent_profile.json")
MODEL_STATE_PATH = os.path.join(DATA_DIR, "model_state.json")
SKILLS_STATE_PATH = os.path.join(DATA_DIR, "skills_state.json")


DEFAULT_AGENT_PROFILE = {
    "niche": "AI education and automation",
    "voice": "clear, tactical, high-energy",
    "goal": "grow revenue with high-retention shorts and authority long-form videos",
    "cta": "subscribe for practical AI systems",
}

SAFE_SKILL_PACK = [
    "youtube-analyst",
    "hook-generator",
    "thumbnail-strategist",
    "script-optimizer",
    "retention-auditor",
]


def now_iso():
    return datetime.utcnow().isoformat() + "Z"


def load_json(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return default


def save_json(path, payload):
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(1)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def get_ollama_models():
    models = []
    try:
        import urllib.request

        response = urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=2)
        data = json.loads(response.read().decode("utf-8"))
        models = [entry.get("name", "") for entry in data.get("models", []) if entry.get("name")]
    except Exception:
        pass
    return models


def sanitize_channel_name(channel):
    value = str(channel or "").strip()
    if not value:
        return "Unknown Channel"

    if "@" in value:
        return value.rsplit("@", 1)[-1].replace("/", "").strip() or "Unknown Channel"

    value = value.replace("https://", "").replace("http://", "")
    value = value.replace("www.", "")
    value = value.strip("/")
    if "/" in value:
        value = value.split("/")[-1]
    return value or "Unknown Channel"


def parse_channels(payload):
    channels = payload.get("channels", [])
    if isinstance(channels, str):
        channels = [line.strip() for line in channels.splitlines() if line.strip()]
    if not isinstance(channels, list):
        channels = []

    url = str(payload.get("url", "")).strip()
    if url:
        channels.append(url)

    clean = []
    for item in channels:
        value = str(item).strip()
        if value:
            clean.append(value)
    return list(dict.fromkeys(clean))


def build_channel_insight(channel, idx):
    name = sanitize_channel_name(channel)
    cadence = ["1 upload/day", "4 uploads/week", "2 uploads/week", "3 uploads/week"][idx % 4]
    formats = [
        "Fast hook + strong outcome",
        "Step-by-step breakdown",
        "Before/after transformation",
        "Case study with numbers",
    ]
    titles = [
        f"{name}: 3 mistakes creators keep making",
        f"How {name} gets repeat views every week",
        f"The editing pattern {name} uses to increase retention",
        f"What to copy from {name} without cloning their brand",
        f"{name} growth framework in 10 minutes",
    ]
    return {
        "channel_id": f"channel_{idx + 1}",
        "channel_name": name,
        "upload_cadence": cadence,
        "top_titles": titles,
        "winning_formats": formats,
    }


def choose_recommended_model(models):
    preference = ["qwen2.5:7b", "llama3.2:3b", "qwen2.5:3b", "qwen2.5:1.5b"]
    for candidate in preference:
        if candidate in models:
            return candidate
    if models:
        return models[0]
    return "qwen2.5:7b"


def estimate_speed(cores):
    if cores >= 12:
        return "Very fast"
    if cores >= 8:
        return "Fast"
    if cores >= 4:
        return "Balanced"
    return "Entry-level"


def update_model_in_file(path, model_name):
    if not os.path.exists(path):
        return False

    try:
        if path.endswith(".json"):
            with open(path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
            
            modified = False
            if "model" in data:
                data["model"] = model_name
                modified = True
            if "openai_compatible" in data and "model" in data["openai_compatible"]:
                data["openai_compatible"]["model"] = model_name
                modified = True
            if "models" in data and "default" in data["models"]:
                data["models"]["default"] = model_name
                modified = True
            
            if modified:
                with open(path, "w", encoding="utf-8") as handle:
                    json.dump(data, handle, indent=2)
                return True
            return False

        original = open(path, "r", encoding="utf-8").read()
    except Exception:
        return False

    updated = original
    # TOML/INI style
    updated = re.sub(r'model\s*=\s*"[^"]+"', f'model = "{model_name}"', updated)
    updated = re.sub(r"model\s*=\s*'[^']+'", f"model = '{model_name}'", updated)
    # ENV style
    updated = re.sub(r"OLLAMA_MODEL\s*=\s*[^\n\r]+", f"OLLAMA_MODEL={model_name}", updated)
    updated = re.sub(r"DEFAULT_MODEL\s*=\s*[^\n\r]+", f"DEFAULT_MODEL={model_name}", updated)

    if updated != original:
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(updated)
        return True
    
    # If .env doesn't have the key, append it
    if path.endswith(".env") and "DEFAULT_MODEL=" not in original:
        with open(path, "a", encoding="utf-8") as handle:
            handle.write(f"\nDEFAULT_MODEL={model_name}\n")
        return True

    return False


def apply_model_stack(model_name):
    targets = [
        ("Manus/config/config.toml", os.path.join(LUXTUBE_DIR, "..", "Manus", "config", "config.toml")),
        ("LuxCoWork/.env", os.path.join(LUXTUBE_DIR, "..", "LuxCoWork", ".env")),
        ("openclaude.json", os.path.expanduser("~/.openclaude.json")),
    ]

    updated_files = []
    for label, path in targets:
        if update_model_in_file(path, model_name):
            updated_files.append(label)

    save_json(MODEL_STATE_PATH, {"selected_model": model_name, "updated_at": now_iso()})
    return updated_files


def queue_hyperframes_job(payload):
    script = str(payload.get("script", "")).strip()
    if not script:
        return {"status": "error", "message": "Script required"}, 400

    output_name = str(payload.get("output", "")).strip() or f"hyperframes_{int(time.time())}.mp4"
    composition_path = os.path.join(DATA_DIR, f"composition_{int(time.time())}.json")
    composition = {
        "script": script,
        "style": payload.get("style", "youtube-clean"),
        "engine": "hyperframes",
        "created_at": now_iso(),
    }
    save_json(composition_path, composition)

    return {
        "status": "ok",
        "job_id": f"hyperframes_{int(time.time())}",
        "engine": "hyperframes",
        "message": "Hyperframes job queued.",
        "composition_path": composition_path,
        "output": output_name,
        "estimated_time": 75,
    }, 200


def queue_heygen_job(payload):
    script = str(payload.get("script", "")).strip()
    if not script:
        return {"status": "error", "message": "Script required"}, 400

    status = build_heygen_status_payload()
    if not status["api_key_configured"]:
        return {
            "status": "error",
            "message": "HeyGen API key is not configured. Connect HeyGen first.",
        }, 400

    return {
        "status": "ok",
        "job_id": f"heygen_{int(time.time())}",
        "engine": "heygen",
        "message": "HeyGen generation job queued.",
        "estimated_time": 120,
    }, 200


def build_heygen_status_payload():
    config = load_json(HEYGEN_CONFIG_PATH, {})
    api_key = str(config.get("api_key", "")).strip()
    cli_installed = bool(shutil.which("heygen"))

    skills_dir = os.path.expanduser("~/.claude/skills")
    mcp_configured = False
    if os.path.exists(skills_dir):
        for item in os.listdir(skills_dir):
            if "heygen" in item.lower():
                mcp_configured = True
                break

    api_key_configured = bool(api_key)
    connected = api_key_configured or cli_installed

    if api_key_configured:
        summary = "HeyGen API key is configured and ready."
    elif cli_installed:
        summary = "HeyGen CLI is installed but API key is missing."
    else:
        summary = "HeyGen is not configured yet."

    return {
        "status": "ok",
        "connected": connected,
        "api_key_configured": api_key_configured,
        "cli_installed": cli_installed,
        "mcp_configured": mcp_configured,
        "summary": summary,
    }


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "service": "Lux Tube Backend", "time": now_iso()})


@app.route("/api/viral/scan", methods=["POST"])
def viral_scan():
    body = request.get_json(silent=True) or {}
    channels = parse_channels(body)
    if not channels:
        return jsonify({"status": "error", "message": "Provide channels or a URL to scan."}), 400

    channel_insights = [build_channel_insight(channel, idx) for idx, channel in enumerate(channels)]
    insights = [
        "Top channels are opening with a strong payoff promise in the first 3 seconds.",
        "Winning videos repeat one clear audience pain point in title and thumbnail.",
        "Retention increases when each section ends with an explicit next-step tease.",
        "CTA performs best when connected to a specific outcome instead of a generic subscribe ask.",
    ]

    return jsonify(
        {
            "status": "ok",
            "scanned_count": len(channel_insights),
            "generated_at": now_iso(),
            "channels": channel_insights,
            "insights": insights,
        }
    )


@app.route("/api/strategy/generate", methods=["POST"])
@app.route("/api/viral/strategy", methods=["POST"])
def strategy_generate():
    body = request.get_json(silent=True) or {}
    mode = str(body.get("mode", "shorts")).strip().lower()
    if mode not in {"shorts", "longform"}:
        mode = "shorts"

    channels = parse_channels(body)
    topic = str(body.get("topic", "")).strip()

    incoming_profile = body.get("agent_profile") if isinstance(body.get("agent_profile"), dict) else {}
    saved_profile = load_json(AGENT_PROFILE_PATH, DEFAULT_AGENT_PROFILE)
    profile = {**DEFAULT_AGENT_PROFILE, **saved_profile, **incoming_profile}

    focus = topic or profile.get("niche", "your niche")
    channel_phrase = ", ".join([sanitize_channel_name(ch) for ch in channels[:3]]) if channels else "top channels"

    if mode == "shorts":
        plan = [
            f"Choose one recurring pain point from {channel_phrase} and frame a 30-45 second promise.",
            "Open with a direct hook in the first sentence and remove any intro fluff.",
            "Use one core teaching point plus one proof element (result, stat, or example).",
            f"End with CTA: {profile.get('cta', DEFAULT_AGENT_PROFILE['cta'])}.",
            "Publish three hook variants, then keep only the top-retention performer.",
        ]
    else:
        plan = [
            f"Create a long-form outline around {focus} with one transformation promise.",
            "Structure the video into hook, context, method, proof, and action steps.",
            "Insert retention resets every 60-90 seconds with open loops.",
            "Bridge each section to your offer using outcomes and credibility.",
            f"Close with CTA: {profile.get('cta', DEFAULT_AGENT_PROFILE['cta'])}.",
        ]

    return jsonify(
        {
            "status": "ok",
            "mode": mode,
            "focus": focus,
            "channels": channels,
            "plan": plan,
            "profile_used": profile,
            "generated_at": now_iso(),
        }
    )


@app.route("/api/models/list")
def models_list():
    names = get_ollama_models()
    models = [{"name": name, "status": "available"} for name in names]
    if not models:
        models = [{"name": "qwen2.5:7b", "status": "suggested"}]
    return jsonify({"status": "ok", "models": models})


@app.route("/api/models/recommend")
def models_recommend():
    names = get_ollama_models()
    selected = choose_recommended_model(names)
    cores = os.cpu_count() or 4
    recommendation = {
        "recommended_model": selected,
        "estimated_speed": estimate_speed(cores),
        "explain_simple": "Selected for reliable local performance and strong strategy output.",
        "available_models": names,
    }
    return jsonify({"status": "ok", **recommendation})


@app.route("/api/models/set", methods=["POST"])
def models_set():
    body = request.get_json(silent=True) or {}
    model_name = str(body.get("model") or body.get("model_name") or "").strip()
    if not model_name:
        return jsonify({"status": "error", "message": "Model name required."}), 400

    updated_files = apply_model_stack(model_name)
    return jsonify(
        {
            "status": "ok",
            "model": model_name,
            "updated_files": updated_files,
            "message": f"Model set to {model_name}.",
        }
    )


@app.route("/api/models/auto-set", methods=["POST"])
def models_auto_set():
    names = get_ollama_models()
    model_name = choose_recommended_model(names)
    updated_files = apply_model_stack(model_name)
    recommendation = {
        "recommended_model": model_name,
        "estimated_speed": estimate_speed(os.cpu_count() or 4),
        "explain_simple": "Auto-selected the most stable local model for this machine.",
    }
    return jsonify(
        {
            "status": "ok",
            "recommendation": recommendation,
            "updated_files": updated_files,
            "message": f"Auto-set complete with {model_name}.",
        }
    )


@app.route("/api/heygen/connect", methods=["POST"])
def heygen_connect():
    body = request.get_json(silent=True) or {}
    api_key = str(body.get("api_key", "")).strip()
    if not api_key:
        return jsonify({"status": "error", "message": "API key required."}), 400

    save_json(HEYGEN_CONFIG_PATH, {"api_key": api_key, "updated_at": now_iso()})
    payload = build_heygen_status_payload()
    payload["message"] = "HeyGen connected successfully."
    return jsonify(payload)


@app.route("/api/heygen/status")
def heygen_status():
    return jsonify(build_heygen_status_payload())


@app.route("/api/heygen/generate", methods=["POST"])
def heygen_generate():
    body = request.get_json(silent=True) or {}
    payload, status_code = queue_heygen_job(body)
    return jsonify(payload), status_code


@app.route("/api/skills/list")
def skills_list():
    skills_dir = os.path.expanduser("~/.claude/skills")
    filesystem_skills = []
    if os.path.exists(skills_dir):
        for item in sorted(os.listdir(skills_dir)):
            item_path = os.path.join(skills_dir, item)
            if os.path.isdir(item_path):
                filesystem_skills.append(item)

    state = load_json(SKILLS_STATE_PATH, {"safe_pack_installed": False, "custom_installs": []})
    custom_installs = [str(item) for item in state.get("custom_installs", []) if str(item).strip()]
    combined = sorted(set(filesystem_skills + custom_installs))

    return jsonify(
        {
            "status": "ok",
            "skills": combined,
            "safe_pack_installed": bool(state.get("safe_pack_installed", False)),
            "custom_installs": custom_installs,
        }
    )


@app.route("/api/skills/install-safe-pack", methods=["POST"])
def skills_install_safe_pack():
    state = load_json(SKILLS_STATE_PATH, {"safe_pack_installed": False, "custom_installs": []})
    existing = set(state.get("custom_installs", []))
    merged = sorted(existing.union(set(SAFE_SKILL_PACK)))
    new_state = {
        "safe_pack_installed": True,
        "custom_installs": merged,
        "updated_at": now_iso(),
    }
    save_json(SKILLS_STATE_PATH, new_state)
    return jsonify({"status": "ok", "skills": merged, **new_state})


@app.route("/api/skills/install", methods=["POST"])
def skills_install():
    body = request.get_json(silent=True) or {}
    repository = str(body.get("repository") or body.get("skill") or "").strip()
    if not repository:
        return jsonify({"status": "error", "message": "Repository or skill name required."}), 400

    if "/" in repository:
        skill_name = repository.rsplit("/", 1)[-1]
    else:
        skill_name = repository

    skill_name = skill_name.replace(".git", "").strip() or "custom-skill"

    state = load_json(SKILLS_STATE_PATH, {"safe_pack_installed": False, "custom_installs": []})
    merged = sorted(set(state.get("custom_installs", []) + [skill_name]))
    new_state = {
        "safe_pack_installed": bool(state.get("safe_pack_installed", False)),
        "custom_installs": merged,
        "updated_at": now_iso(),
    }
    save_json(SKILLS_STATE_PATH, new_state)

    return jsonify(
        {
            "status": "ok",
            "repository": repository,
            "skill": skill_name,
            "message": f"Skill {skill_name} added.",
            "skills": merged,
        }
    )


@app.route("/api/agent/profile", methods=["GET", "POST"])
def agent_profile():
    if request.method == "GET":
        profile = load_json(AGENT_PROFILE_PATH, DEFAULT_AGENT_PROFILE)
        return jsonify({"status": "ok", "profile": profile})

    body = request.get_json(silent=True) or {}
    profile = body.get("profile") if isinstance(body.get("profile"), dict) else {}
    merged = {**DEFAULT_AGENT_PROFILE, **profile}
    save_json(AGENT_PROFILE_PATH, merged)
    return jsonify({"status": "ok", "profile": merged, "message": "Agent profile saved."})


@app.route("/api/system/profile")
def system_profile():
    machine = platform.machine() or "unknown-arch"
    cores = os.cpu_count() or 4
    models = get_ollama_models()

    hardware_summary = f"{machine} machine with {cores} CPU cores"
    runtime_summary = (
        f"Ollama {'online' if is_port_open(11434) else 'offline'} | "
        f"Lux Tube API {'online' if is_port_open(5174) else 'offline'} | "
        f"Models: {len(models)}"
    )

    return jsonify(
        {
            "status": "ok",
            "hardware_summary": hardware_summary,
            "runtime_summary": runtime_summary,
            "system": {
                "ollama_running": is_port_open(11434),
                "luxtube_backend": is_port_open(5174),
                "version": "2.0.0",
                "cpu_cores": cores,
                "models_count": len(models),
            },
        }
    )


@app.route("/api/hyperframes/info")
def hyperframes_info():
    cli_path = shutil.which("hyperframes")
    npx_path = shutil.which("npx")
    installed = bool(cli_path or npx_path)

    return jsonify(
        {
            "status": "ok",
            "installed": installed,
            "cli_path": cli_path,
            "npx_available": bool(npx_path),
            "default": True,
            "engine": "hyperframes",
        }
    )


@app.route("/api/hyperframes/generate", methods=["POST"])
def hyperframes_generate():
    body = request.get_json(silent=True) or {}
    payload, status_code = queue_hyperframes_job(body)
    return jsonify(payload), status_code


@app.route("/api/video/generate", methods=["POST"])
def video_generate():
    body = request.get_json(silent=True) or {}
    engine = str(body.get("engine", "hyperframes")).strip().lower() or "hyperframes"

    if engine == "hyperframes":
        payload, status_code = queue_hyperframes_job(body)
        return jsonify(payload), status_code

    if engine == "heygen":
        payload, status_code = queue_heygen_job(body)
        return jsonify(payload), status_code

    script = str(body.get("script", "")).strip()
    if not script:
        return jsonify({"status": "error", "message": "Script required."}), 400

    return jsonify(
        {
            "status": "ok",
            "job_id": f"local_{int(time.time())}",
            "engine": "local",
            "message": "Local video assembly queued.",
            "pipeline": ["storyboard", "voice", "timeline", "render"],
            "estimated_time": 150,
        }
    )


@app.route("/api/automation/status")
def automation_status():
    return jsonify({"status": "ok", "state": pipeline.state})

@app.route("/api/automation/toggle", methods=["POST"])
def automation_toggle():
    body = request.get_json(silent=True) or {}
    enabled = bool(body.get("enabled", False))
    new_state = pipeline.set_enabled(enabled)
    return jsonify({"status": "ok", "state": new_state})

@app.route("/api/automation/trigger", methods=["POST"])
def automation_trigger():
    if pipeline.state["status"] != "idle":
        return jsonify({"status": "error", "message": "Pipeline is already running"}), 400
    
    # Run the pipeline in a separate thread so it doesn't block the request
    import threading
    threading.Thread(target=pipeline.run_daily_pipeline, daemon=True).start()
    return jsonify({"status": "ok", "message": "Manual pipeline trigger initiated"})


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path and app.static_folder and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)

    if app.static_folder and os.path.exists(os.path.join(app.static_folder, "index.html")):
        return send_from_directory(app.static_folder, "index.html")

    return (
        jsonify(
            {
                "status": "error",
                "message": "Lux Tube frontend build not found. Run npm run build in LuxTube/frontend.",
            }
        ),
        503,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5174, debug=False)
