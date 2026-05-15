import html
import json
import os
import re
import shutil
import socket
import subprocess
import time
from pathlib import Path
from typing import Optional
from urllib import error, request


HERMES_USER_STORIES_URL = "https://hermes-agent.nousresearch.com/docs/user-stories"
ROOT_DIR = Path(__file__).resolve().parent
STATE_ROOT = Path.home() / ".hermes" / "lux-use-cases"
CACHE_FILE = STATE_ROOT / "hermes-user-stories-cache.json"

STORY_TILE_RE = re.compile(
    r'<a class="tile_[^"]*" href="(?P<link>https?://[^"]+)"[^>]*>'
    r'\s*<div class="badgeRow_[^"]*">\s*'
    r'<span class="sourceBadge_[^"]*">(?:<span class="sourceIcon_[^"]*"[^>]*></span>)?(?P<source>[^<]+)</span>'
    r'<span class="catTag_[^"]*">(?P<category>[^<]+)</span></div>'
    r'<h3 class="headline_[^"]*">(?P<title>.*?)</h3>'
    r'<p class="quote_[^"]*">(?:“|&ldquo;|&#x201C;)<!-- -->(?P<quote>.*?)<!-- -->(?:”|&rdquo;|&#x201D;)</p>'
    r'<span class="author_[^"]*">(?P<author>.*?)</span>',
    re.S,
)


USE_CASE_PRESETS = [
    {
        "id": "viral-youtube-flywheel",
        "name": "Viral YouTube Flywheel",
        "description": "Daily shorts hooks + weekly long-form strategy with local-first tools.",
        "categories": ["Content Creation", "Marketing", "Research", "Dev Workflow"],
        "sources": ["YouTube", "X · Twitter", "Discord", "GitHub"],
        "cron_jobs": [
            {
                "name": "Lux Viral Trend Scan",
                "schedule": "0 8 * * 1,3,5",
                "prompt": "Scan the newest AI + automation creator trends for {niche}. Return 10 high-probability hook formats with examples and why each should perform this week.",
            },
            {
                "name": "Lux Shorts Script Sprint",
                "schedule": "30 8 * * 1,3,5",
                "prompt": "Using the latest trend scan, write 3 scripts for 30-60 second shorts for {channel_name}. Include hook, beat-by-beat script, B-roll ideas, and CTA: {cta}.",
            },
            {
                "name": "Lux Longform Authority Planner",
                "schedule": "0 10 * * 2",
                "prompt": "Plan one 8-15 minute authority video for {channel_name} in {niche}. Include title candidates, chapter outline, retention moments, and conversion path to {offer}.",
            },
        ],
    },
    {
        "id": "avatar-shorts-factory",
        "name": "Avatar Shorts Factory",
        "description": "Turn trend ideas into HeyGen avatar-ready daily short video plans.",
        "categories": ["Content Creation", "Creative", "Business Ops"],
        "sources": ["YouTube", "Discord", "Blog", "X · Twitter"],
        "cron_jobs": [
            {
                "name": "Lux Avatar Hook Miner",
                "schedule": "0 7 * * *",
                "prompt": "Generate 5 new short-form hooks for {niche} and rank by expected watch-through. Optimize for avatar delivery style: {voice}.",
            },
            {
                "name": "Lux HeyGen Shotlist Builder",
                "schedule": "20 7 * * *",
                "prompt": "Convert top 2 hooks into HeyGen-ready scripts: spoken lines, scene notes, captions, and 9:16 framing cues. Channel: {channel_name}. CTA: {cta}.",
            },
        ],
    },
    {
        "id": "community-growth-os",
        "name": "Community Growth OS",
        "description": "Cross-platform research and repurposing pipeline for audience growth.",
        "categories": ["Marketing", "Research", "Personal Assistant"],
        "sources": ["X · Twitter", "Reddit", "Discord", "YouTube"],
        "cron_jobs": [
            {
                "name": "Lux Audience Signal Digest",
                "schedule": "0 9 * * 1-5",
                "prompt": "Collect key audience questions and pain points for {niche}. Return top recurring topics, urgency level, and content responses for {channel_name}.",
            },
            {
                "name": "Lux Repurpose Pack",
                "schedule": "30 9 * * 1-5",
                "prompt": "From latest best-performing video ideas, produce a repurpose bundle: 3 shorts hooks, 1 thread, 1 newsletter opener, and 1 community post. Keep voice: {voice}.",
            },
        ],
    },
]


def _ensure_state_root():
    STATE_ROOT.mkdir(parents=True, exist_ok=True)


def _slugify(value: str) -> str:
    lowered = (value or "").strip().lower()
    lowered = re.sub(r"[^a-z0-9]+", "-", lowered)
    lowered = lowered.strip("-")
    return lowered or "item"


def _strip_tags(value: str) -> str:
    text = re.sub(r"<[^>]+>", "", value or "")
    return text.replace("<!-- -->", "").strip()


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_json(path: Path, payload: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _is_port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.8)
        if sock.connect_ex(("127.0.0.1", port)) == 0:
            return True
    with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.8)
        return sock.connect_ex(("::1", port)) == 0


def _find_executable(candidates):
    for candidate in candidates:
        if not candidate:
            continue
        expanded = os.path.expanduser(candidate)
        if os.path.isabs(expanded):
            if os.path.isfile(expanded) and os.access(expanded, os.X_OK):
                return expanded
            continue
        found = shutil.which(expanded)
        if found:
            return found
    return None


def _read_env_flags(env_path: Path) -> dict:
    keys = {}
    if not env_path.exists():
        return keys
    try:
        for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            item = line.strip()
            if not item or item.startswith("#") or "=" not in item:
                continue
            key, raw_value = item.split("=", 1)
            key = key.strip()
            value = raw_value.strip().strip('"').strip("'")
            keys[key] = bool(value)
    except Exception:
        return keys
    return keys


def _fetch_user_stories_html() -> str:
    req = request.Request(
        HERMES_USER_STORIES_URL,
        headers={"User-Agent": "LuxAutomaton/1.0 (Hermes Use Case Scanner)"},
    )
    with request.urlopen(req, timeout=25) as response:
        return response.read().decode("utf-8", errors="ignore")


def _parse_user_story_tiles(html_text: str) -> list:
    stories = []
    for index, match in enumerate(STORY_TILE_RE.finditer(html_text), start=1):
        raw = {key: html.unescape(value or "") for key, value in match.groupdict().items()}
        title = _strip_tags(raw.get("title", "")).strip("' ")
        quote = _strip_tags(raw.get("quote", ""))
        source = _strip_tags(raw.get("source", ""))
        category = _strip_tags(raw.get("category", ""))
        author_line = _strip_tags(raw.get("author", "")).replace("  ", " ").strip()
        stories.append(
            {
                "id": f"story-{index:03d}-{_slugify(title)[:48]}",
                "title": title,
                "quote": quote,
                "source": source,
                "category": category,
                "author": author_line,
                "link": raw.get("link", ""),
            }
        )
    return stories


def _category_counts(stories: list) -> list:
    counts = {}
    for story in stories:
        key = story.get("category", "")
        counts[key] = counts.get(key, 0) + 1
    return [
        {"name": name, "count": count}
        for name, count in sorted(counts.items(), key=lambda item: (-item[1], item[0]))
        if name
    ]


def _source_counts(stories: list) -> list:
    counts = {}
    for story in stories:
        key = story.get("source", "")
        counts[key] = counts.get(key, 0) + 1
    return [
        {"name": name, "count": count}
        for name, count in sorted(counts.items(), key=lambda item: (-item[1], item[0]))
        if name
    ]


def scan_user_stories(limit: int = 60, category: str = "", source: str = "", keyword: str = "", force_refresh: bool = False) -> dict:
    _ensure_state_root()
    cache = _read_json(CACHE_FILE)
    cache_ok = bool(cache.get("stories"))
    cache_age = int(time.time() - cache.get("fetched_epoch", 0)) if cache_ok else 10**9
    should_refresh = force_refresh or (not cache_ok) or cache_age > 6 * 3600

    fetch_error = ""
    if should_refresh:
        try:
            html_text = _fetch_user_stories_html()
            stories = _parse_user_story_tiles(html_text)
            cache = {
                "source_url": HERMES_USER_STORIES_URL,
                "fetched_at": _now_iso(),
                "fetched_epoch": int(time.time()),
                "stories": stories,
            }
            _write_json(CACHE_FILE, cache)
            cache_age = 0
        except (error.URLError, TimeoutError, OSError) as exc:
            fetch_error = str(exc)
            if not cache_ok:
                raise RuntimeError(f"Failed to fetch Hermes user stories: {exc}")

    stories = list(cache.get("stories", []))
    cat_filter = (category or "").strip().lower()
    source_filter = (source or "").strip().lower()
    keyword_filter = (keyword or "").strip().lower()

    filtered = []
    for story in stories:
        if cat_filter and story.get("category", "").lower() != cat_filter:
            continue
        if source_filter and story.get("source", "").lower() != source_filter:
            continue
        if keyword_filter:
            haystack = " ".join(
                [
                    story.get("title", ""),
                    story.get("quote", ""),
                    story.get("author", ""),
                    story.get("category", ""),
                    story.get("source", ""),
                ]
            ).lower()
            if keyword_filter not in haystack:
                continue
        filtered.append(story)

    limit_value = max(1, min(int(limit or 60), 300))
    return {
        "source_url": cache.get("source_url", HERMES_USER_STORIES_URL),
        "cached_at": cache.get("fetched_at", ""),
        "cache_age_seconds": cache_age,
        "fetch_error": fetch_error,
        "total_stories": len(stories),
        "filtered_total": len(filtered),
        "categories": _category_counts(stories),
        "sources": _source_counts(stories),
        "stories": filtered[:limit_value],
    }


def list_use_case_presets() -> dict:
    return {
        "presets": USE_CASE_PRESETS,
        "count": len(USE_CASE_PRESETS),
    }


def _http_json(url: str, method: str = "GET", payload: Optional[dict] = None, timeout: int = 4):
    body = None
    headers = {}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = request.Request(url, data=body, method=method, headers=headers)
    try:
        with request.urlopen(req, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8", errors="ignore") or "{}")
            return True, data
    except Exception as exc:
        return False, {"error": str(exc)}


def _build_skill_content(preset: dict, profile: dict) -> str:
    preset_id = preset["id"]
    skill_name = f"lux-{preset_id}"
    channel_name = profile["channel_name"]
    niche = profile["niche"]
    voice = profile["voice"]
    cta = profile["cta"]
    offer = profile["offer"]

    return f"""---
name: {skill_name}
description: \"{preset['description']}\"
version: 1.0.0
author: Lux Automaton
license: MIT
platforms: [macos, linux, windows]
metadata:
  hermes:
    tags: [YouTube, Virality, Marketing, Shorts, Longform, HeyGen, Lux]
---

# {preset['name']}

Use this workflow for `{channel_name}` in the `{niche}` niche.

## Operating profile

- Channel: `{channel_name}`
- Niche: `{niche}`
- Voice: `{voice}`
- Offer: `{offer}`
- CTA: `{cta}`

## Core loop

1. Scan winning ideas from top channels and trend sources.
2. Produce short-form hooks and scripts with retention-first structure.
3. Build one long-form authority piece that supports the weekly offer.
4. Convert winning scripts to avatar-ready delivery for local HeyGen workflows.
5. Track outcomes and adjust hook patterns weekly.

## Lux tool bridge commands

```bash
curl -fsS http://127.0.0.1:1337/status
curl -fsS http://127.0.0.1:1337/launch/luxcli
curl -fsS http://127.0.0.1:1337/launch/cowork
curl -fsS http://127.0.0.1:1337/launch/manus
```

## Local HeyGen reminder

- Keep video generation local-first and private where possible.
- Use local scripting and your existing HeyGen setup for final avatar delivery.
- Do not expose API keys in outputs or logs.
"""


def _build_bridge_skill_content() -> str:
    return """---
name: lux-claude-code-bridge
description: "Use Lux Claude Code Terminal and Lux stack services from Hermes."
version: 1.0.0
author: Lux Automaton
license: MIT
platforms: [macos, linux]
metadata:
  hermes:
    tags: [Lux, Claude-Code, Hermes, Local-Tools, Orchestration]
---

# Lux Claude Code Bridge

Use these commands from Hermes terminal tool to orchestrate local Lux services.

## Status check

```bash
curl -fsS http://127.0.0.1:1337/status
```

## Launch key services

```bash
curl -fsS http://127.0.0.1:1337/launch/luxcli
curl -fsS http://127.0.0.1:1337/launch/manus
curl -fsS http://127.0.0.1:1337/launch/cowork
curl -fsS http://127.0.0.1:1337/launch/hermes
```

## Direct OpenClaude path (local)

```bash
~/npm-global/bin/openclaude
```

If `openclaude` is not in PATH, use the absolute path above.
"""


def _ensure_bridge_skills() -> list:
    written = []
    bridge_dir = Path.home() / ".hermes" / "skills" / "lux-claude-code-bridge"
    bridge_dir.mkdir(parents=True, exist_ok=True)
    bridge_file = bridge_dir / "SKILL.md"
    bridge_file.write_text(_build_bridge_skill_content(), encoding="utf-8")
    written.append(str(bridge_file))
    return written


def _create_cron_jobs_if_available(jobs: list) -> dict:
    if not _is_port_open(8787):
        return {"created": [], "skipped": [], "errors": ["Hermes Web UI is not running on port 8787"]}

    ok, existing_payload = _http_json("http://127.0.0.1:8787/api/crons")
    if not ok:
        return {"created": [], "skipped": [], "errors": [existing_payload.get("error", "Unable to query Hermes cron API")]} 

    existing_names = {str(item.get("name", "")).strip() for item in existing_payload.get("jobs", [])}
    created = []
    skipped = []
    errors = []

    for job in jobs:
        name = str(job.get("name", "")).strip()
        if not name:
            continue
        if name in existing_names:
            skipped.append(f"{name} (already exists)")
            continue
        payload = {
            "name": name,
            "prompt": job.get("prompt", ""),
            "schedule": job.get("schedule", ""),
            "deliver": "local",
            "skills": ["lux-claude-code-bridge"],
        }
        created_ok, result = _http_json(
            "http://127.0.0.1:8787/api/crons/create",
            method="POST",
            payload=payload,
            timeout=7,
        )
        if created_ok and result.get("ok"):
            created.append(name)
            existing_names.add(name)
        else:
            errors.append(f"{name}: {result.get('error', 'unknown error')}")

    return {"created": created, "skipped": skipped, "errors": errors}


def apply_use_case(preset_id: str, custom_profile: Optional[dict] = None, auto_apply_cron: bool = True) -> dict:
    custom_profile = custom_profile or {}
    preset = next((item for item in USE_CASE_PRESETS if item["id"] == preset_id), None)
    if not preset:
        raise ValueError(f"Unknown preset: {preset_id}")

    profile = {
        "channel_name": str(custom_profile.get("channel_name") or "Lux Channel").strip(),
        "niche": str(custom_profile.get("niche") or "AI automation and creator tools").strip(),
        "voice": str(custom_profile.get("voice") or "clear, tactical, high-energy").strip(),
        "cta": str(custom_profile.get("cta") or "Subscribe for practical AI systems").strip(),
        "offer": str(custom_profile.get("offer") or "newsletter + consulting funnel").strip(),
    }

    scan = scan_user_stories(limit=240, force_refresh=False)
    story_pool = scan.get("stories", [])

    wanted_categories = {item.lower() for item in preset.get("categories", [])}
    selected = [
        story for story in story_pool if story.get("category", "").lower() in wanted_categories
    ]
    selected = selected[:16] if selected else story_pool[:16]

    slug = _slugify(preset_id)
    applied_root = STATE_ROOT / "applied" / slug
    applied_root.mkdir(parents=True, exist_ok=True)

    cron_jobs = []
    for item in preset.get("cron_jobs", []):
        cron_jobs.append(
            {
                "name": item["name"],
                "schedule": item["schedule"],
                "prompt": item["prompt"].format(**profile),
            }
        )

    skill_slug = f"lux-{slug}"
    skill_dir = Path.home() / ".hermes" / "skills" / skill_slug
    skill_dir.mkdir(parents=True, exist_ok=True)
    skill_file = skill_dir / "SKILL.md"
    skill_file.write_text(_build_skill_content(preset, profile), encoding="utf-8")

    bridge_files = _ensure_bridge_skills()

    manifest = {
        "preset": preset,
        "profile": profile,
        "selected_stories": selected,
        "cron_jobs": cron_jobs,
        "applied_at": _now_iso(),
    }
    _write_json(applied_root / "manifest.json", manifest)

    playbook_lines = [
        f"# {preset['name']} Playbook",
        "",
        f"- Channel: {profile['channel_name']}",
        f"- Niche: {profile['niche']}",
        f"- Voice: {profile['voice']}",
        f"- Offer: {profile['offer']}",
        f"- CTA: {profile['cta']}",
        "",
        "## Weekly execution",
    ]
    for job in cron_jobs:
        playbook_lines.append(f"- {job['name']} ({job['schedule']}): {job['prompt']}")
    playbook_lines.append("")
    playbook_lines.append("## Story references")
    for story in selected[:10]:
        playbook_lines.append(f"- [{story['title']}]({story['link']}) - {story['source']} / {story['category']}")
    (applied_root / "PLAYBOOK.md").write_text("\n".join(playbook_lines), encoding="utf-8")

    cron_result = {"created": [], "skipped": [], "errors": []}
    if auto_apply_cron:
        cron_result = _create_cron_jobs_if_available(cron_jobs)

    return {
        "status": "ok",
        "preset_id": preset_id,
        "profile": profile,
        "applied_path": str(applied_root),
        "skill_path": str(skill_file),
        "bridge_files": bridge_files,
        "selected_story_count": len(selected),
        "cron": cron_result,
    }


def tool_connectivity_snapshot() -> dict:
    hermes_env_flags = _read_env_flags(Path.home() / ".hermes" / ".env")
    heygen_key_present = bool(os.environ.get("HEYGEN_API_KEY")) or bool(hermes_env_flags.get("HEYGEN_API_KEY"))

    openclaude_exec = _find_executable([
        "openclaude",
        str(Path.home() / "npm-global" / "bin" / "openclaude"),
    ])
    heygen_exec = _find_executable([
        "heygen",
        str(Path.home() / ".local" / "bin" / "heygen"),
        "/opt/homebrew/bin/heygen",
        "/usr/local/bin/heygen",
    ])

    hub_status_ok, hub_status = _http_json("http://127.0.0.1:1337/status")
    hermes_running = _is_port_open(8787)

    mcp_servers = []
    mcp_tools = []
    if hermes_running:
        ok_servers, server_payload = _http_json("http://127.0.0.1:8787/api/mcp/servers")
        if ok_servers:
            mcp_servers = server_payload.get("servers", [])
        ok_tools, tool_payload = _http_json("http://127.0.0.1:8787/api/mcp/tools")
        if ok_tools:
            mcp_tools = tool_payload.get("tools", [])

    connected = {
        "hermes": hermes_running,
        "manus": _is_port_open(8000),
        "lux_cli_terminal": _is_port_open(3001),
        "lux_cowork": _is_port_open(3002),
        "luxtube_frontend": _is_port_open(5173),
        "ollama": _is_port_open(11434),
    }

    toolset = {
        "node": bool(_find_executable(["node", "/opt/homebrew/bin/node", "/usr/local/bin/node"])),
        "npm": bool(_find_executable(["npm", str(Path.home() / "npm-global" / "bin" / "npm")])),
        "lux_claude": bool(openclaude_exec),
        "heygen_cli": bool(heygen_exec),
        "git": bool(_find_executable(["git"])),
    }

    heygen_local = {
        "cli_installed": bool(heygen_exec),
        "cli_path": heygen_exec or "",
        "api_key_configured": heygen_key_present,
        "skills_repo_present": (ROOT_DIR / "heygen-skills").exists(),
        "mcp_manifest_present": (ROOT_DIR / "heygen-skills" / "mcp.json").exists(),
    }

    bridge_skill_path = Path.home() / ".hermes" / "skills" / "lux-claude-code-bridge" / "SKILL.md"
    bridge_ready = bridge_skill_path.exists()

    warnings = []
    if not toolset["lux_claude"]:
        warnings.append("Lux Claude binary not found in PATH or ~/npm-global/bin")
    if not connected["lux_cli_terminal"]:
        warnings.append("Lux Claude Code Terminal is not running on port 3001")
    if not connected["ollama"]:
        warnings.append("Ollama is not running on port 11434")
    if not (
        heygen_local["cli_installed"]
        or heygen_local["api_key_configured"]
        or heygen_local["mcp_manifest_present"]
    ):
        warnings.append("Local HeyGen setup is incomplete (no CLI, key, or MCP manifest)")
    if not bridge_ready:
        warnings.append("Hermes Lux Claude bridge skill has not been written yet")

    return {
        "generated_at": _now_iso(),
        "services": connected,
        "tools": toolset,
        "heygen_local": heygen_local,
        "hermes_mcp_servers": mcp_servers,
        "hermes_mcp_tools": mcp_tools,
        "hub_status": hub_status if hub_status_ok else {"error": hub_status.get("error", "Hub status unavailable")},
        "bridge_skill_ready": bridge_ready,
        "bridge_skill_path": str(bridge_skill_path),
        "all_critical_connected": connected["hermes"] and connected["ollama"] and toolset["lux_claude"],
        "warnings": warnings,
    }


def ensure_lux_bridge_files() -> dict:
    files = _ensure_bridge_skills()
    snapshot = tool_connectivity_snapshot()
    return {
        "status": "ok",
        "files": files,
        "connectivity": snapshot,
    }
