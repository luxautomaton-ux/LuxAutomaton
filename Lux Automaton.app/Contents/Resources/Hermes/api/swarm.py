"""Native Hermes swarm mission state and HTTP handlers.

This module exposes a lightweight, profile-scoped mission tracker behind
``/api/swarm/*`` without requiring OpenClaw. It intentionally manages
planning/lifecycle state only (start/status/cancel/complete/delete + feature
scan) and does not launch external worker runtimes.
"""

from __future__ import annotations

import json
import logging
import os
import platform
import re
import shutil
import subprocess
import threading
import time
import uuid
from pathlib import Path
from urllib.parse import parse_qs

from api.helpers import bad, j

logger = logging.getLogger(__name__)

_STORE_LOCK = threading.RLock()
_STORES: dict[str, dict] = {}
_MAX_MISSIONS = 100
_FEATURE_SCAN_CACHE_SECONDS = 15.0

_WORKER_ROLES = [
    "Planner",
    "Researcher",
    "Implementer",
    "Reviewer",
    "Integrator",
    "Verifier",
    "Documenter",
    "Navigator",
]


def _now() -> float:
    return float(time.time())


def _slugify(value: str, *, fallback: str = "mission") -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text or fallback


def _active_state_file() -> Path:
    try:
        from api.profiles import get_active_hermes_home

        home = Path(get_active_hermes_home()).expanduser().resolve()
    except Exception:
        home = Path(os.getenv("HERMES_HOME", str(Path.home() / ".hermes"))).expanduser().resolve()
    state_dir = home / "webui_state"
    state_dir.mkdir(parents=True, exist_ok=True)
    return state_dir / "swarm_missions.json"


def _new_store() -> dict:
    return {
        "loaded": False,
        "missions": {},
        "feature_scan": {
            "scanned_at": 0.0,
            "workspace": "",
            "payload": None,
        },
    }


def _load_store_locked(store: dict, state_file: Path) -> None:
    if store.get("loaded"):
        return
    missions: dict[str, dict] = {}
    if state_file.exists():
        try:
            raw = json.loads(state_file.read_text(encoding="utf-8"))
            for mission in raw.get("missions", []):
                if not isinstance(mission, dict):
                    continue
                mission_id = str(mission.get("mission_id") or "").strip()
                if not mission_id:
                    continue
                missions[mission_id] = mission
        except Exception:
            logger.warning("Failed to load swarm state from %s", state_file, exc_info=True)
    store["missions"] = missions
    store["loaded"] = True


def _persist_store_locked(store: dict, state_file: Path) -> None:
    missions = list(store.get("missions", {}).values())
    missions.sort(key=lambda m: float(m.get("created_at") or 0.0), reverse=True)
    missions = missions[:_MAX_MISSIONS]
    payload = {"missions": missions}
    tmp_file = state_file.with_suffix(".tmp")
    tmp_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_file.replace(state_file)


def _active_store() -> tuple[dict, Path]:
    state_file = _active_state_file()
    key = str(state_file)
    with _STORE_LOCK:
        store = _STORES.get(key)
        if store is None:
            store = _new_store()
            _STORES[key] = store
        _load_store_locked(store, state_file)
        return store, state_file


def _run_git(cwd: str, *args: str) -> tuple[bool, str]:
    try:
        completed = subprocess.run(
            ["git", "-C", cwd, *args],
            check=True,
            capture_output=True,
            text=True,
            timeout=3,
        )
        return True, (completed.stdout or "").strip()
    except Exception:
        return False, ""


def _git_snapshot(workspace: str | None) -> dict:
    ws = str(workspace or "").strip()
    if not ws:
        return {
            "workspace": "",
            "is_repo": False,
            "branch": "",
            "head": "",
            "dirty": False,
            "ahead": 0,
            "behind": 0,
            "upstream": "",
        }
    resolved = str(Path(ws).expanduser().resolve())
    ok_repo, inside = _run_git(resolved, "rev-parse", "--is-inside-work-tree")
    if not ok_repo or inside.lower() != "true":
        return {
            "workspace": resolved,
            "is_repo": False,
            "branch": "",
            "head": "",
            "dirty": False,
            "ahead": 0,
            "behind": 0,
            "upstream": "",
        }

    ok_branch, branch = _run_git(resolved, "rev-parse", "--abbrev-ref", "HEAD")
    ok_head, head = _run_git(resolved, "rev-parse", "--short", "HEAD")
    ok_status, porcelain = _run_git(resolved, "status", "--porcelain")
    ok_upstream, upstream = _run_git(resolved, "rev-parse", "--abbrev-ref", "@{upstream}")
    ahead = 0
    behind = 0
    if ok_upstream and upstream:
        ok_counts, counts = _run_git(resolved, "rev-list", "--left-right", "--count", "HEAD...@{upstream}")
        if ok_counts:
            try:
                left, right = counts.split()
                ahead = int(left)
                behind = int(right)
            except Exception:
                ahead = 0
                behind = 0
    return {
        "workspace": resolved,
        "is_repo": True,
        "branch": branch if ok_branch else "",
        "head": head if ok_head else "",
        "dirty": bool(ok_status and porcelain),
        "ahead": ahead,
        "behind": behind,
        "upstream": upstream if ok_upstream else "",
    }


def _append_event(mission: dict, kind: str, message: str) -> None:
    mission.setdefault("events", []).append(
        {
            "ts": _now(),
            "kind": str(kind),
            "message": str(message),
        }
    )
    mission["events"] = mission["events"][-200:]


def _mission_summary(mission: dict) -> dict:
    workers = mission.get("workers") if isinstance(mission.get("workers"), list) else []
    return {
        "mission_id": mission.get("mission_id"),
        "prompt": mission.get("prompt", ""),
        "status": mission.get("status", "running"),
        "worker_count": int(mission.get("worker_count") or len(workers) or 0),
        "created_at": float(mission.get("created_at") or 0.0),
        "updated_at": float(mission.get("updated_at") or 0.0),
        "started_at": float(mission.get("started_at") or 0.0),
        "finished_at": mission.get("finished_at"),
        "auto_merge": bool(mission.get("auto_merge")),
        "workspace": mission.get("workspace") or "",
        "git": mission.get("git") if isinstance(mission.get("git"), dict) else {},
        "events_count": len(mission.get("events") or []),
    }


def _worker_plan(mission_id: str, prompt: str, worker_count: int, branch_hint: str) -> list[dict]:
    workers = []
    short_id = mission_id.replace("swm_", "")[:8]
    for idx in range(worker_count):
        worker_num = idx + 1
        role = _WORKER_ROLES[idx % len(_WORKER_ROLES)]
        workers.append(
            {
                "worker_id": f"w{worker_num}",
                "role": role,
                "title": f"{role} {worker_num}",
                "status": "idle",
                "branch": f"swarm/{short_id}/{branch_hint}-w{worker_num}",
                "task": f"{role}: contribute toward '{prompt[:120]}'",
                "updated_at": _now(),
            }
        )
    return workers


def _start_mission(prompt: str, *, worker_count: int = 3, workspace: str | None = None, auto_merge: bool = False) -> dict:
    text = str(prompt or "").strip()
    if not text:
        raise ValueError("prompt is required")
    workers = max(1, min(12, int(worker_count or 3)))
    workspace_value = str(workspace or "").strip() or ""
    mission_id = f"swm_{uuid.uuid4().hex[:12]}"
    created_at = _now()
    git = _git_snapshot(workspace_value)
    branch_hint = _slugify(text, fallback="mission")[:22]
    mission = {
        "mission_id": mission_id,
        "prompt": text,
        "status": "running",
        "worker_count": workers,
        "created_at": created_at,
        "updated_at": created_at,
        "started_at": created_at,
        "finished_at": None,
        "auto_merge": bool(auto_merge),
        "workspace": workspace_value,
        "git": git,
        "workers": _worker_plan(mission_id, text, workers, branch_hint),
        "events": [],
    }
    _append_event(mission, "created", f"Mission created with {workers} workers")
    _append_event(mission, "planning", "Native Hermes swarm planning started")

    store, state_file = _active_store()
    with _STORE_LOCK:
        store["missions"][mission_id] = mission
        _persist_store_locked(store, state_file)
    return mission


def _set_mission_status(mission: dict, status: str, message: str) -> dict:
    mission["status"] = status
    mission["updated_at"] = _now()
    if status in {"cancelled", "completed"}:
        mission["finished_at"] = _now()
        for worker in mission.get("workers", []):
            if worker.get("status") not in {"completed", "cancelled"}:
                worker["status"] = "cancelled" if status == "cancelled" else "completed"
                worker["updated_at"] = _now()
    _append_event(mission, status, message)
    return mission


def _mutate_mission(mission_id: str, mutate_fn) -> dict:
    mission_key = str(mission_id or "").strip()
    if not mission_key:
        raise ValueError("mission_id is required")
    store, state_file = _active_store()
    with _STORE_LOCK:
        mission = store["missions"].get(mission_key)
        if not mission:
            raise KeyError(mission_key)
        updated = mutate_fn(mission)
        updated["updated_at"] = _now()
        _persist_store_locked(store, state_file)
        return updated


def _delete_mission(mission_id: str) -> None:
    mission_key = str(mission_id or "").strip()
    if not mission_key:
        raise ValueError("mission_id is required")
    store, state_file = _active_store()
    with _STORE_LOCK:
        if mission_key not in store["missions"]:
            raise KeyError(mission_key)
        del store["missions"][mission_key]
        _persist_store_locked(store, state_file)


def _feature_scan(workspace: str | None = None, *, force: bool = False) -> dict:
    workspace_value = str(workspace or "").strip()
    store, _state_file = _active_store()
    with _STORE_LOCK:
        cache = store.get("feature_scan") or {}
        scanned_at = float(cache.get("scanned_at") or 0.0)
        cached_workspace = str(cache.get("workspace") or "")
        cached_payload = cache.get("payload")
        if (
            not force
            and cached_payload
            and cached_workspace == workspace_value
            and (_now() - scanned_at) <= _FEATURE_SCAN_CACHE_SECONDS
        ):
            return cached_payload

    payload = {
        "ok": True,
        "native_swarm": True,
        "openclaw_required": False,
        "tools": {
            "git": bool(shutil.which("git")),
            "gh": bool(shutil.which("gh")),
            "python3": bool(shutil.which("python3")),
            "node": bool(shutil.which("node")),
            "bun": bool(shutil.which("bun")),
        },
        "platform": {
            "system": platform.system(),
            "release": platform.release(),
            "python": platform.python_version(),
        },
        "git": _git_snapshot(workspace_value),
        "scanned_at": _now(),
    }

    with _STORE_LOCK:
        store["feature_scan"] = {
            "scanned_at": float(payload["scanned_at"]),
            "workspace": workspace_value,
            "payload": payload,
        }
    return payload


def _list_missions(*, limit: int = 30) -> list[dict]:
    cap = max(1, min(200, int(limit or 30)))
    store, _state_file = _active_store()
    with _STORE_LOCK:
        missions = list(store.get("missions", {}).values())
    missions.sort(key=lambda m: float(m.get("created_at") or 0.0), reverse=True)
    return missions[:cap]


def _status_payload(*, limit: int = 30) -> dict:
    missions = _list_missions(limit=limit)
    counts = {"running": 0, "completed": 0, "cancelled": 0}
    for mission in missions:
        status = str(mission.get("status") or "running")
        if status in counts:
            counts[status] += 1
    return {
        "ok": True,
        "counts": counts,
        "missions": [_mission_summary(mission) for mission in missions],
    }


def _mission_payload(mission_id: str) -> dict:
    store, _state_file = _active_store()
    with _STORE_LOCK:
        mission = store.get("missions", {}).get(str(mission_id or "").strip())
    if not mission:
        raise KeyError(mission_id)
    return {
        "ok": True,
        "mission": mission,
        "summary": _mission_summary(mission),
    }


def handle_swarm_get(handler, parsed) -> bool:
    path = parsed.path
    qs = parse_qs(parsed.query or "")
    if path in {"/api/swarm", "/api/swarm/status"}:
        limit = qs.get("limit", ["30"])[0]
        try:
            return j(handler, _status_payload(limit=int(limit)))
        except Exception:
            return j(handler, _status_payload(limit=30))

    if path in {"/api/swarm/feature-scan", "/api/swarm/features"}:
        workspace = qs.get("workspace", [""])[0]
        force = str(qs.get("force", [""])[0]).strip().lower() in {"1", "true", "yes", "on"}
        return j(handler, _feature_scan(workspace, force=force))

    if path == "/api/swarm/missions":
        limit = qs.get("limit", ["50"])[0]
        try:
            cap = int(limit)
        except Exception:
            cap = 50
        return j(handler, {"ok": True, "missions": _list_missions(limit=cap)})

    if path == "/api/swarm/mission":
        mission_id = qs.get("mission_id", [""])[0]
        if not str(mission_id or "").strip():
            return bad(handler, "mission_id is required", status=400)
        try:
            return j(handler, _mission_payload(mission_id))
        except KeyError:
            return bad(handler, "mission not found", status=404)

    return False


def handle_swarm_post(handler, parsed, body: dict) -> bool:
    path = parsed.path
    if path == "/api/swarm/start":
        prompt = body.get("prompt") or body.get("objective") or body.get("mission")
        try:
            worker_count = int(body.get("workers") or body.get("worker_count") or 3)
        except Exception:
            worker_count = 3
        auto_merge = str(body.get("auto_merge") or "").strip().lower() in {"1", "true", "yes", "on"}
        workspace = body.get("workspace")
        try:
            mission = _start_mission(
                str(prompt or ""),
                worker_count=worker_count,
                workspace=str(workspace or "").strip() or None,
                auto_merge=auto_merge,
            )
        except ValueError as exc:
            return bad(handler, str(exc), status=400)
        return j(handler, {"ok": True, "mission": mission, "summary": _mission_summary(mission)})

    if path == "/api/swarm/cancel":
        mission_id = body.get("mission_id")
        try:
            mission = _mutate_mission(
                mission_id,
                lambda m: _set_mission_status(m, "cancelled", "Mission cancelled by user"),
            )
        except ValueError as exc:
            return bad(handler, str(exc), status=400)
        except KeyError:
            return bad(handler, "mission not found", status=404)
        return j(handler, {"ok": True, "mission": mission, "summary": _mission_summary(mission)})

    if path == "/api/swarm/complete":
        mission_id = body.get("mission_id")
        try:
            mission = _mutate_mission(
                mission_id,
                lambda m: _set_mission_status(m, "completed", "Mission marked completed"),
            )
        except ValueError as exc:
            return bad(handler, str(exc), status=400)
        except KeyError:
            return bad(handler, "mission not found", status=404)
        return j(handler, {"ok": True, "mission": mission, "summary": _mission_summary(mission)})

    if path == "/api/swarm/delete":
        mission_id = body.get("mission_id")
        try:
            _delete_mission(str(mission_id or ""))
        except ValueError as exc:
            return bad(handler, str(exc), status=400)
        except KeyError:
            return bad(handler, "mission not found", status=404)
        return j(handler, {"ok": True, "mission_id": str(mission_id or "")})

    return False
