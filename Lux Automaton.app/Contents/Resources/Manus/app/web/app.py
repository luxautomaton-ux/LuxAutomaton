from __future__ import annotations
import asyncio
import base64
import json
import os
import re
import subprocess
import threading
import time
import uuid
import webbrowser
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import (
    BackgroundTasks,
    FastAPI,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import FileResponse
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from app.agent.manus import Manus
from app.flow.base import FlowType
from app.flow.flow_factory import FlowFactory
from app.web.log_handler import capture_session_logs, get_logs
from app.web.log_parser import get_all_logs_info, get_latest_log_info, parse_log_file
from app.web.thinking_tracker import ThinkingTracker


#  (,True)
AUTO_OPEN_BROWSER = os.environ.get("AUTO_OPEN_BROWSER", "1") == "1"
last_opened = False  # 

app = FastAPI(title="Lux Manus")

# 
current_dir = Path(__file__).parent
# 
app.mount("/static", StaticFiles(directory=current_dir / "static"), name="static")
# 
templates = Jinja2Templates(directory=current_dir / "templates")

# 
active_sessions: Dict[str, dict] = {}

# 
cancel_events: Dict[str, asyncio.Event] = {}

# 
WORKSPACE_ROOT = Path(__file__).parent.parent.parent / "workspace"
WORKSPACE_ROOT.mkdir(exist_ok=True)

# 
LOGS_DIR = Path(__file__).parent.parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

TEXT_EXTENSIONS = {
    "txt",
    "md",
    "html",
    "css",
    "js",
    "py",
    "json",
    "csv",
    "yaml",
    "yml",
    "xml",
    "log",
    "ini",
    "toml",
    "sql",
    "sh",
    "bat",
    "ts",
    "tsx",
    "jsx",
}
IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "svg"}
SKILLS_ROOT = Path.home() / ".claude" / "skills"
SKILLS_ROOT.mkdir(parents=True, exist_ok=True)

SAFE_SKILL_PACK = [
    {
        "slug": "andrej-karpathy-skills",
        "repo": "https://github.com/forrestchang/andrej-karpathy-skills.git",
    },
    {
        "slug": "claude-code-workflows",
        "repo": "https://github.com/OneRedOak/claude-code-workflows.git",
    },
    {
        "slug": "claude-skills",
        "repo": "https://github.com/Jeffallan/claude-skills.git",
    },
    {
        "slug": "nothing-design-skill",
        "repo": "https://github.com/dominikmartn/nothing-design-skill.git",
    },
    {
        "slug": "awesome-agent-skills",
        "repo": "https://github.com/VoltAgent/awesome-agent-skills.git",
    },
]

# 
from app.utils.log_monitor import LogFileMonitor


# 
active_log_monitors: Dict[str, LogFileMonitor] = {}


# 
def create_workspace(session_id: str) -> Path:
    """"""
    # session_id
    job_id = f"job_{session_id[:8]}"
    workspace_dir = WORKSPACE_ROOT / job_id
    workspace_dir.mkdir(exist_ok=True)
    return workspace_dir


def sanitize_filename(filename: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "_", filename or "file")
    cleaned = cleaned.strip("._")
    return cleaned[:120] or "file"


def decode_base64_payload(value: str) -> bytes:
    payload = value or ""
    if "," in payload:
        payload = payload.split(",", 1)[1]
    return base64.b64decode(payload)


def save_attachments_to_workspace(
    workspace_dir: Path, attachments: List[AttachmentPayload]
) -> List[dict]:
    saved = []
    if not attachments:
        return saved

    attachments_dir = workspace_dir / "attachments"
    attachments_dir.mkdir(exist_ok=True)

    for index, attachment in enumerate(attachments, start=1):
        safe_name = sanitize_filename(attachment.name)
        target = attachments_dir / safe_name
        if target.exists():
            target = attachments_dir / f"{index}_{safe_name}"

        binary = decode_base64_payload(attachment.content)
        with open(target, "wb") as file_obj:
            file_obj.write(binary)

        saved.append(
            {
                "name": target.name,
                "relative_path": str(target.relative_to(workspace_dir)),
                "size": len(binary),
                "mime_type": attachment.mime_type or "application/octet-stream",
            }
        )

    return saved


def infer_repo_url(repository: str) -> str:
    if repository.startswith("http://") or repository.startswith("https://"):
        if repository.endswith(".git"):
            return repository
        return f"{repository}.git"
    if "/" in repository:
        return f"https://github.com/{repository}.git"
    raise ValueError("Repository must be a GitHub URL or owner/repo")


def repo_slug_from_url(repository: str) -> str:
    trimmed = repository.rstrip("/")
    base = trimmed.split("/")[-1]
    if base.endswith(".git"):
        base = base[:-4]
    return sanitize_filename(base.lower())


def clone_or_update_repo(repository: str, target_dir: Path) -> str:
    if target_dir.exists():
        subprocess.run(
            ["git", "pull", "--ff-only"],
            cwd=target_dir,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return "updated"

    subprocess.run(
        ["git", "clone", repository, str(target_dir)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return "installed"


@app.on_event("startup")
async def startup_event():
    """:"""
    global last_opened
    if AUTO_OPEN_BROWSER and not last_opened:
        # 1
        threading.Timer(1.0, lambda: webbrowser.open("http://localhost:8000")).start()
        print("Opening Lux Manus in browser...")
        last_opened = True


class AttachmentPayload(BaseModel):
    name: str
    mime_type: Optional[str] = None
    size: int = 0
    content: str


class SessionRequest(BaseModel):
    prompt: str
    mode: Optional[str] = "agent"
    model: Optional[str] = "ollama"
    attachments: List[AttachmentPayload] = []


class SkillInstallRequest(BaseModel):
    repository: str


@app.get("/", response_class=HTMLResponse)
async def get_home(request: Request):
    """ - connected"""
    return HTMLResponse(
        content=open(
            current_dir / "static" / "connected_interface.html", encoding="utf-8"
        ).read()
    )


@app.get("/original", response_class=HTMLResponse)
async def get_original_interface(request: Request):
    """Compatibility route: serve connected interface"""
    return HTMLResponse(
        content=open(
            current_dir / "static" / "connected_interface.html", encoding="utf-8"
        ).read()
    )


@app.get("/connected", response_class=HTMLResponse)
async def get_connected_interface(request: Request):
    """ ()"""
    return HTMLResponse(
        content=open(
            current_dir / "static" / "connected_interface.html", encoding="utf-8"
        ).read()
    )


@app.post("/api/chat")
async def create_chat_session(
    session_req: SessionRequest, background_tasks: BackgroundTasks
):
    session_id = str(uuid.uuid4())
    active_sessions[session_id] = {
        "status": "processing",
        "result": None,
        "log": [],
        "workspace": None,
        "mode": session_req.mode,
        "model": session_req.model,
        "attachment_count": len(session_req.attachments),
    }

    # 
    cancel_events[session_id] = asyncio.Event()

    # 
    workspace_dir = create_workspace(session_id)
    active_sessions[session_id]["workspace"] = str(
        workspace_dir.relative_to(WORKSPACE_ROOT)
    )

    background_tasks.add_task(
        process_prompt,
        session_id,
        session_req.prompt,
        session_req.attachments,
        session_req.mode,
        session_req.model,
    )
    return {
        "session_id": session_id,
        "workspace": active_sessions[session_id]["workspace"],
    }


@app.get("/api/chat/{session_id}")
async def get_chat_result(session_id: str):
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    # 
    session = active_sessions[session_id]
    session["log"] = get_logs(session_id)

    return session


@app.post("/api/chat/{session_id}/stop")
async def stop_processing(session_id: str):
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    if session_id in cancel_events:
        cancel_events[session_id].set()

    active_sessions[session_id]["status"] = "stopped"
    active_sessions[session_id]["result"] = "Processing was stopped by user"

    return {"status": "stopped"}


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    try:
        await websocket.accept()

        if session_id not in active_sessions:
            await websocket.send_text(json.dumps({"error": "Session not found"}))
            await websocket.close()
            return

        session = active_sessions[session_id]

        #  WebSocket 
        async def ws_send(message: str):
            try:
                await websocket.send_text(message)
            except Exception as e:
                print(f"WebSocket : {str(e)}")

        ThinkingTracker.register_ws_send_callback(session_id, ws_send)

        # 
        await websocket.send_text(
            json.dumps(
                {
                    "status": session["status"],
                    "log": session["log"],
                    "thinking_steps": ThinkingTracker.get_thinking_steps(session_id),
                    "logs": ThinkingTracker.get_logs(session_id),  # 
                }
            )
        )

        # (job_id) - 
        job_id = None
        # 
        if "workspace" in session:
            job_id = session["workspace"]

        # ,
        if session_id not in active_log_monitors and job_id:
            log_path = LOGS_DIR / f"{job_id}.log"
            if log_path.exists():
                log_monitor = LogFileMonitor(job_id)
                log_monitor.start_monitoring()
                active_log_monitors[session_id] = log_monitor

        # 
        last_log_entries = []
        if job_id and session_id in active_log_monitors:
            last_log_entries = active_log_monitors[session_id].get_log_entries()

        # 
        last_log_count = 0
        last_thinking_step_count = 0
        last_tracker_log_count = 0  # ThinkingTracker

        while session["status"] == "processing":
            await asyncio.sleep(0.2)  # 

            #  ()
            if job_id and session_id in active_log_monitors:
                current_log_entries = active_log_monitors[session_id].get_log_entries()
                if len(current_log_entries) > len(last_log_entries):
                    new_logs = current_log_entries[len(last_log_entries) :]
                    await websocket.send_text(
                        json.dumps(
                            {
                                "status": session["status"],
                                "system_logs": new_logs,
                                # chat_logs,
                                "chat_logs": new_logs,
                            }
                        )
                    )
                    last_log_entries = current_log_entries

            # 
            current_log_count = len(session["log"])
            if current_log_count > last_log_count:
                await websocket.send_text(
                    json.dumps(
                        {
                            "status": session["status"],
                            "log": session["log"][last_log_count:],
                        }
                    )
                )
                last_log_count = current_log_count

            # 
            thinking_steps = ThinkingTracker.get_thinking_steps(session_id)
            current_thinking_step_count = len(thinking_steps)
            if current_thinking_step_count > last_thinking_step_count:
                await websocket.send_text(
                    json.dumps(
                        {
                            "status": session["status"],
                            "thinking_steps": thinking_steps[last_thinking_step_count:],
                        }
                    )
                )
                last_thinking_step_count = current_thinking_step_count

            # ThinkingTracker
            tracker_logs = ThinkingTracker.get_logs(session_id)
            current_tracker_log_count = len(tracker_logs)
            if current_tracker_log_count > last_tracker_log_count:
                await websocket.send_text(
                    json.dumps(
                        {
                            "status": session["status"],
                            "logs": tracker_logs[last_tracker_log_count:],
                        }
                    )
                )
                last_tracker_log_count = current_tracker_log_count

            # 
            if session["result"]:
                await websocket.send_text(
                    json.dumps(
                        {
                            "status": session["status"],
                            "result": session["result"],
                            "log": session["log"][last_log_count:],
                            "thinking_steps": ThinkingTracker.get_thinking_steps(
                                session_id, last_thinking_step_count
                            ),
                            "system_logs": last_log_entries,  # 
                            "logs": ThinkingTracker.get_logs(
                                session_id, last_tracker_log_count
                            ),  # ThinkingTracker
                        }
                    )
                )
                break  # ,,

        # resultbreak
        if not session["result"]:
            await websocket.send_text(
                json.dumps(
                    {
                        "status": session["status"],
                        "result": session["result"],
                        "log": session["log"][last_log_count:],
                        "thinking_steps": ThinkingTracker.get_thinking_steps(
                            session_id, last_thinking_step_count
                        ),
                        "system_logs": last_log_entries,  # 
                        "logs": ThinkingTracker.get_logs(
                            session_id, last_tracker_log_count
                        ),  # ThinkingTracker
                    }
                )
            )

        #  WebSocket 
        ThinkingTracker.unregister_ws_send_callback(session_id)
        await websocket.close()
    except WebSocketDisconnect:
        # ,
        ThinkingTracker.unregister_ws_send_callback(session_id)
    except Exception as e:
        # ,
        print(f"WebSocket: {str(e)}")
        ThinkingTracker.unregister_ws_send_callback(session_id)


# LLM
from app.web.thinking_tracker import ThinkingTracker


# 
class LLMCommunicationTracker:
    """LLM,monkey patching"""

    def __init__(self, session_id: str, agent=None):
        self.session_id = session_id
        self.agent = agent
        self.original_run_method = None

        # agent,
        if agent and hasattr(agent, "llm") and hasattr(agent.llm, "completion"):
            self.install_hooks()

    def install_hooks(self):
        """LLM"""
        if not self.agent or not hasattr(self.agent, "llm"):
            return False

        # 
        llm = self.agent.llm
        if hasattr(llm, "completion"):
            self.original_completion = llm.completion
            # 
            llm.completion = self._wrap_completion(self.original_completion)
            return True
        return False

    def uninstall_hooks(self):
        ""","""
        if self.agent and hasattr(self.agent, "llm") and self.original_completion:
            self.agent.llm.completion = self.original_completion

    def _wrap_completion(self, original_method):
        """LLMcompletion"""
        session_id = self.session_id

        async def wrapped_completion(*args, **kwargs):
            # 
            prompt = kwargs.get("prompt", "")
            if not prompt and args:
                prompt = args[0]
            if prompt:
                ThinkingTracker.add_communication(
                    session_id,
                    "LLM",
                    prompt[:500] + ("..." if len(prompt) > 500 else ""),
                )

            # 
            result = await original_method(*args, **kwargs)

            # 
            if result:
                content = result
                if isinstance(result, dict) and "content" in result:
                    content = result["content"]
                elif hasattr(result, "content"):
                    content = result.content

                if isinstance(content, str):
                    ThinkingTracker.add_communication(
                        session_id,
                        "LLM",
                        content[:500] + ("..." if len(content) > 500 else ""),
                    )

            return result

        return wrapped_completion


# LLM
from app.agent.llm_wrapper import LLMCallbackWrapper


# API,
@app.get("/api/files")
async def get_generated_files():
    """"""
    result = []

    # 
    workspaces = list(WORKSPACE_ROOT.glob("job_*"))
    workspaces.sort(key=lambda p: p.stat().st_mtime, reverse=True)

    for workspace in workspaces:
        workspace_name = workspace.name
        # 
        files: List[Path] = []
        with os.scandir(workspace) as it:
            for entry in it:
                if entry.is_file() and not entry.name.startswith("."):
                    files.append(Path(entry.path))

        attachments_dir = workspace / "attachments"
        if attachments_dir.exists():
            for nested in attachments_dir.glob("**/*"):
                if nested.is_file() and not nested.name.startswith("."):
                    files.append(nested)

        files.sort(key=lambda p: p.stat().st_mtime, reverse=True)

        # ,
        if files:
            workspace_item = {
                "name": workspace_name,
                "path": str(workspace.relative_to(Path(__file__).parent.parent.parent)),
                "modified": workspace.stat().st_mtime,
                "files": [],
            }

            # 
            for file in sorted(files, key=lambda p: p.name):
                suffix = file.suffix.lower().lstrip(".")
                workspace_item["files"].append(
                    {
                        "name": file.name,
                        "path": str(
                            file.relative_to(
                                Path(__file__).parent.parent.parent
                            )
                        ),
                        "type": suffix or "file",
                        "is_text": suffix in TEXT_EXTENSIONS,
                        "is_image": suffix in IMAGE_EXTENSIONS,
                        "size": file.stat().st_size,
                        "modified": file.stat().st_mtime,
                    }
                )

            result.append(workspace_item)

    return {"workspaces": result}


# 
@app.get("/api/logs")
async def get_system_logs(limit: int = 10):
    """"""
    log_files = []
    for entry in os.scandir(LOGS_DIR):
        if entry.is_file() and entry.name.endswith(".log"):
            log_files.append(
                {
                    "name": entry.name,
                    "size": entry.stat().st_size,
                    "modified": entry.stat().st_mtime,
                }
            )
    # 
    log_files.sort(key=lambda x: x["modified"], reverse=True)
    return {"logs": log_files[:limit]}


@app.get("/api/logs/{log_name}")
async def get_log_content(log_name: str, parsed: bool = False):
    """"""
    log_path = LOGS_DIR / log_name
    # 
    if not log_path.exists() or not log_path.is_file():
        raise HTTPException(status_code=404, detail="Log file not found")

    # 
    if parsed:
        log_info = parse_log_file(str(log_path))
        log_info["name"] = log_name
        return log_info

    # 
    with open(log_path, "r", encoding="utf-8") as f:
        content = f.read()

    return {"name": log_name, "content": content}


@app.get("/api/logs_parsed")
async def get_parsed_logs(limit: int = 10):
    """"""
    return {"logs": get_all_logs_info(str(LOGS_DIR), limit)}


@app.get("/api/logs_parsed/{log_name}")
async def get_parsed_log(log_name: str):
    """"""
    log_path = LOGS_DIR / log_name
    # 
    if not log_path.exists() or not log_path.is_file():
        raise HTTPException(status_code=404, detail="Log file not found")

    log_info = parse_log_file(str(log_path))
    log_info["name"] = log_name
    return log_info


@app.get("/api/latest_log")
async def get_latest_log():
    """"""
    return get_latest_log_info(str(LOGS_DIR))


@app.post("/api/skills/install-safe-pack")
async def install_safe_skill_pack():
    installed = []
    failed = []

    for item in SAFE_SKILL_PACK:
        target = SKILLS_ROOT / item["slug"]
        try:
            action = clone_or_update_repo(item["repo"], target)
            installed.append(f"{item['slug']} ({action})")
        except Exception as exc:
            failed.append(f"{item['slug']}: {str(exc)}")

    return {
        "installed": installed,
        "failed": failed,
        "skills_root": str(SKILLS_ROOT),
    }


@app.post("/api/skills/install")
async def install_skill(request: SkillInstallRequest):
    try:
        repo_url = infer_repo_url(request.repository.strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    slug = repo_slug_from_url(repo_url)
    target = SKILLS_ROOT / slug

    try:
        action = clone_or_update_repo(repo_url, target)
    except subprocess.CalledProcessError as exc:
        raise HTTPException(status_code=500, detail=f"Git operation failed: {exc.returncode}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "status": "ok",
        "repository": repo_url,
        "skill": slug,
        "action": action,
        "path": str(target),
    }


@app.get("/api/skills")
async def list_skills():
    skills = []
    for entry in sorted(SKILLS_ROOT.iterdir()):
        if entry.is_dir() and not entry.name.startswith("."):
            skills.append(entry.name)
    return {"skills": skills, "count": len(skills), "path": str(SKILLS_ROOT)}


@app.get("/api/files/{file_path:path}")
async def get_file_content(file_path: str):
    """"""
    # ,
    root_dir = Path(__file__).parent.parent.parent
    full_path = root_dir / file_path

    # 
    try:
        full_path.relative_to(root_dir)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    file_type = full_path.suffix[1:].lower() if full_path.suffix else "text"

    if file_type not in TEXT_EXTENSIONS:
        relative = str(full_path.relative_to(root_dir))
        return {
            "name": full_path.name,
            "path": file_path,
            "type": file_type,
            "binary": True,
            "download_url": f"/api/files/download/{relative}",
        }

    # 
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()

        return {
            "name": full_path.name,
            "path": file_path,
            "type": file_type,
            "binary": False,
            "content": content,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


@app.get("/api/files/download/{file_path:path}")
async def download_file(file_path: str):
    root_dir = Path(__file__).parent.parent.parent
    full_path = root_dir / file_path

    try:
        full_path.relative_to(root_dir)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(str(full_path), filename=full_path.name)


# process_prompt,
async def process_prompt(
    session_id: str,
    prompt: str,
    attachments: Optional[List[AttachmentPayload]] = None,
    mode: Optional[str] = "agent",
    model: Optional[str] = "ollama",
):
    # 
    workspace_dir = None
    if session_id in active_sessions and "workspace" in active_sessions[session_id]:
        workspace_path = active_sessions[session_id]["workspace"]
        workspace_dir = WORKSPACE_ROOT / workspace_path
        os.makedirs(workspace_dir, exist_ok=True)

    # ,
    if not workspace_dir:
        workspace_dir = create_workspace(session_id)
        if session_id in active_sessions:
            active_sessions[session_id]["workspace"] = str(
                workspace_dir.relative_to(WORKSPACE_ROOT)
            )

    saved_attachments = save_attachments_to_workspace(workspace_dir, attachments or [])
    if session_id in active_sessions:
        active_sessions[session_id]["attachments"] = saved_attachments

    attachment_context = ""
    if saved_attachments:
        lines = [
            "Attached files are saved in workspace/attachments and must be used when relevant:",
        ]
        for item in saved_attachments:
            lines.append(
                f"- {item['name']} ({item['mime_type']}, {item['size']} bytes) at {item['relative_path']}"
            )
        attachment_context = "\n".join(lines)

    runtime_context = f"Execution mode: {mode or 'agent'}\nModel preference: {model or 'ollama'}"
    effective_prompt = f"{runtime_context}\n\n{attachment_context}\n\n{prompt}".strip()

    # 
    original_cwd = os.getcwd()
    os.chdir(workspace_dir)

    # 
    job_id = workspace_dir.name
    # 
    task_log_path = LOGS_DIR / f"{job_id}.log"

    # 
    log_monitor = LogFileMonitor(job_id)
    observer = log_monitor.start_monitoring()
    active_log_monitors[session_id] = log_monitor

    async def sync_logs():
        """LogFileMonitorThinkingTracker"""
        last_count = 0
        try:
            while True:
                if session_id not in active_log_monitors:
                    break
                current_logs = active_log_monitors[session_id].get_log_entries()
                if len(current_logs) > last_count:
                    # 
                    new_logs = current_logs[last_count:]
                    # ,
                    for log_entry in new_logs:
                        # ,ThinkingTracker
                        ThinkingTracker.add_log_entry(
                            session_id,
                            {
                                "level": log_entry.get("level", "INFO"),
                                "message": log_entry.get("message", ""),
                                "timestamp": log_entry.get("timestamp", time.time()),
                            },
                        )
                    last_count = len(current_logs)
                # ,
                await asyncio.sleep(0.1)  # 0.1
        except Exception as e:
            print(f": {str(e)}")

    # 
    sync_task = asyncio.create_task(sync_logs())

    # logger,
    os.environ["OPENMANUS_LOG_FILE"] = str(task_log_path)
    os.environ["OPENMANUS_TASK_ID"] = job_id

    try:
        # 
        with capture_session_logs(session_id) as log:
            # 
            ThinkingTracker.start_tracking(session_id)
            ThinkingTracker.add_thinking_step(session_id, "Starting to process user request")
            ThinkingTracker.add_thinking_step(
                session_id, f"Workspace directory: {workspace_dir.name}"
            )

            # Directly record user input prompt
            ThinkingTracker.add_communication(session_id, "User Input", effective_prompt)

            # Initialize agent and task flow
            ThinkingTracker.add_thinking_step(session_id, "Initializing AI agent and task flow")
            agent = Manus()

            # LLM
            if hasattr(agent, "llm"):
                original_llm = agent.llm
                wrapped_llm = LLMCallbackWrapper(original_llm)

                # 
                def on_before_request(data):
                    # 
                    prompt_content = None
                    if data.get("args") and len(data["args"]) > 0:
                        prompt_content = str(data["args"][0])
                    elif data.get("kwargs") and "prompt" in data["kwargs"]:
                        prompt_content = data["kwargs"]["prompt"]
                    else:
                        prompt_content = str(data)

                    # 
                    print(f"Sent to LLM: {prompt_content[:100]}...")
                    ThinkingTracker.add_communication(
                        session_id, "Sent to LLM", prompt_content
                    )

                def on_after_request(data):
                    # 
                    response = data.get("response", "")
                    response_content = ""

                    # 
                    if isinstance(response, str):
                        response_content = response
                    elif isinstance(response, dict):
                        if "content" in response:
                            response_content = response["content"]
                        elif "text" in response:
                            response_content = response["text"]
                        else:
                            response_content = str(response)
                    elif hasattr(response, "content"):
                        response_content = response.content
                    else:
                        response_content = str(response)

                    # 
                    print(f"Received from LLM: {response_content[:100]}...")
                    ThinkingTracker.add_communication(
                        session_id, "Received from LLM", response_content
                    )

                # 
                wrapped_llm.register_callback("before_request", on_before_request)
                wrapped_llm.register_callback("after_request", on_after_request)

                # LLM
                agent.llm = wrapped_llm

            flow = FlowFactory.create_flow(
                flow_type=FlowType.PLANNING,
                agents=agent,
            )

            # 
            ThinkingTracker.add_thinking_step(
                session_id,
                f"Analyzing user request: {effective_prompt[:50]}{'...' if len(effective_prompt) > 50 else ''}",
            )
            log.info(
                f"Starting execution: {effective_prompt[:50]}{'...' if len(effective_prompt) > 50 else ''}"
            )

            # 
            cancel_event = cancel_events.get(session_id)
            if cancel_event and cancel_event.is_set():
                log.warning("Processing cancelled by user")
                ThinkingTracker.mark_stopped(session_id)
                active_sessions[session_id]["status"] = "stopped"
                active_sessions[session_id]["result"] = "Processing stopped by user"
                return

            # Check for existing files in workspace before execution
            existing_files = set()
            for ext in ["*.txt", "*.md", "*.html", "*.css", "*.js", "*.py", "*.json"]:
                existing_files.update(f.name for f in workspace_dir.glob(ext))

            # Track plan creation process
            ThinkingTracker.add_thinking_step(session_id, "Creating task execution plan")
            ThinkingTracker.add_thinking_step(session_id, "Starting to execute task plan")

            # Get cancel event to pass to flow.execute
            cancel_event = cancel_events.get(session_id)

            # Initial check, if already cancelled then do not execute
            if cancel_event and cancel_event.is_set():
                log.warning("Processing cancelled by user")
                ThinkingTracker.mark_stopped(session_id)
                active_sessions[session_id]["status"] = "stopped"
                active_sessions[session_id]["result"] = "Processing stopped by user"
                return

            # Execute actual processing - pass job_id and cancel_event to flow.execute
            result = await flow.execute(effective_prompt, job_id, cancel_event)

            # Check for newly created files after execution
            new_files = set()
            for ext in ["*.txt", "*.md", "*.html", "*.css", "*.js", "*.py", "*.json"]:
                new_files.update(f.name for f in workspace_dir.glob(ext))
            newly_created = new_files - existing_files

            if newly_created:
                files_list = ", ".join(newly_created)
                ThinkingTracker.add_thinking_step(
                    session_id,
                    f"Generated {len(newly_created)} file(s) in workspace {workspace_dir.name}: {files_list}",
                )
                # 
                active_sessions[session_id]["generated_files"] = list(newly_created)

            # Record completion status
            log.info("Processing complete")
            ThinkingTracker.add_conclusion(
                session_id, f"Task completed! Results generated in workspace {workspace_dir.name}."
            )

            active_sessions[session_id]["status"] = "completed"
            active_sessions[session_id]["result"] = result
            active_sessions[session_id][
                "thinking_steps"
            ] = ThinkingTracker.get_thinking_steps(session_id)

    except asyncio.CancelledError:
        # Handle cancellation
        print("Processing cancelled")
        ThinkingTracker.mark_stopped(session_id)
        active_sessions[session_id]["status"] = "stopped"
        active_sessions[session_id]["result"] = "Processing cancelled"
    except Exception as e:
        # Handle errors
        error_msg = f"Processing error: {str(e)}"
        print(error_msg)
        ThinkingTracker.add_error(session_id, f"Processing encountered error: {str(e)}")
        active_sessions[session_id]["status"] = "error"
        active_sessions[session_id]["result"] = f"Error occurred: {str(e)}"
    finally:
        # 
        os.chdir(original_cwd)

        # 
        if "OPENMANUS_LOG_FILE" in os.environ:
            del os.environ["OPENMANUS_LOG_FILE"]
        if "OPENMANUS_TASK_ID" in os.environ:
            del os.environ["OPENMANUS_TASK_ID"]

        # 
        if (
            "agent" in locals()
            and hasattr(agent, "llm")
            and isinstance(agent.llm, LLMCallbackWrapper)
        ):
            try:
                # 
                if "on_before_request" in locals():
                    agent.llm._callbacks["before_request"].remove(on_before_request)
                if "on_after_request" in locals():
                    agent.llm._callbacks["after_request"].remove(on_after_request)
            except (ValueError, Exception) as e:
                print(f": {str(e)}")

        # 
        if session_id in cancel_events:
            del cancel_events[session_id]

        # ,
        if session_id in active_log_monitors:
            observer.stop()
            observer.join(timeout=1)
            del active_log_monitors[session_id]

        # 
        if sync_task:
            sync_task.cancel()
            try:
                await sync_task
            except asyncio.CancelledError:
                pass


# API
@app.get("/api/thinking/{session_id}")
async def get_thinking_steps(session_id: str, start_index: int = 0):
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "status": ThinkingTracker.get_status(session_id),
        "thinking_steps": ThinkingTracker.get_thinking_steps(session_id, start_index),
    }


# API
@app.get("/api/progress/{session_id}")
async def get_progress(session_id: str):
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    return ThinkingTracker.get_progress(session_id)


# API
@app.get("/api/systemlogs/{session_id}")
async def get_system_logs(session_id: str):
    """"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    job_id = None
    if "workspace" in active_sessions[session_id]:
        workspace_path = active_sessions[session_id]["workspace"]
        job_id = workspace_path

    if not job_id:
        return {"logs": []}

    # 
    if session_id in active_log_monitors:
        logs = active_log_monitors[session_id].get_log_entries()
        return {"logs": logs}

    # 
    log_path = LOGS_DIR / f"{job_id}.log"
    if not log_path.exists():
        return {"logs": []}

    try:
        with open(log_path, "r", encoding="utf-8") as f:
            logs = [line.strip() for line in f.readlines()]
        return {"logs": logs}
    except Exception as e:
        return {"error": f"Error reading log file: {str(e)}"}
