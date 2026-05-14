import os
import json
import time
import datetime
import urllib.request

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
STATE_PATH = os.path.join(DATA_DIR, "automation_state.json")
PROFILE_PATH = os.path.join(DATA_DIR, "agent_profile.json")
YOUTUBE_CREDENTIALS = os.path.join(DATA_DIR, "client_secret.json")

def now_iso():
    return datetime.datetime.utcnow().isoformat() + "Z"

class AutopilotPipeline:
    def __init__(self):
        self.state = self.load_state()

    def load_state(self):
        default_state = {
            "enabled": False,
            "status": "idle",
            "last_run": None,
            "next_run": None,
            "current_job": None,
            "history": []
        }
        if os.path.exists(STATE_PATH):
            try:
                with open(STATE_PATH, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                    default_state.update(saved)
            except Exception:
                pass
        return default_state

    def save_state(self):
        with open(STATE_PATH, "w", encoding="utf-8") as f:
            json.dump(self.state, f, indent=2)

    def set_enabled(self, enabled):
        self.state["enabled"] = bool(enabled)
        if enabled and self.state["status"] == "idle":
            # Schedule next run for 6 AM tomorrow (mock logic for simplicity, handled by scheduler)
            pass
        self.save_state()
        return self.state

    def update_status(self, status, job_details=None):
        self.state["status"] = status
        if job_details:
            if not self.state.get("current_job"):
                self.state["current_job"] = {}
            self.state["current_job"].update(job_details)
        self.save_state()

    def log_history(self, title, url=None):
        entry = {
            "date": now_iso(),
            "title": title,
            "url": url,
            "status": "published" if url else "failed"
        }
        self.state["history"].insert(0, entry)
        self.state["history"] = self.state["history"][:50] # Keep last 50
        self.state["current_job"] = None
        self.state["status"] = "idle"
        self.state["last_run"] = now_iso()
        self.save_state()

    def run_daily_pipeline(self):
        if not self.state["enabled"] or self.state["status"] != "idle":
            return
        
        try:
            print("[Autopilot] Starting daily pipeline...")
            self.update_status("strategy", {"step": "Analyzing trends and topics..."})
            time.sleep(2) # Mock trend analysis
            
            # Load agent profile for niche
            niche = "AI Content"
            if os.path.exists(PROFILE_PATH):
                try:
                    with open(PROFILE_PATH, "r") as f:
                        prof = json.load(f)
                        niche = prof.get("niche", niche)
                except:
                    pass
            
            topic = f"How {niche} is changing in {datetime.datetime.now().year}"
            print(f"[Autopilot] Selected topic: {topic}")

            self.update_status("script", {"step": f"Writing script for: {topic}..."})
            time.sleep(3) # Mock ollama call

            self.update_status("render", {"step": "Rendering video via Hyperframes/HeyGen..."})
            time.sleep(5) # Mock rendering delay
            
            self.update_status("thumbnail", {"step": "Generating thumbnail via OpenCode local diffusion..."})
            try:
                # Call OpenCode local AI image generation endpoint
                req = urllib.request.Request("http://127.0.0.1:44712/v1/images/generations", method="POST")
                req.add_header('Content-Type', 'application/json')
                data = json.dumps({"prompt": f"A highly engaging youtube thumbnail for {topic}, vibrant colors, dramatic lighting"}).encode()
                urllib.request.urlopen(req, data=data, timeout=5)
                print("[Autopilot] Thumbnail generated via OpenCode")
            except Exception as e:
                print(f"[Autopilot] OpenCode Thumbnail failed (is OpenCode running on 44712?): {e}")
            time.sleep(1) # Visual delay for UI

            self.update_status("seo", {"step": "Generating SEO tags and metadata..."})
            time.sleep(2) # Mock SEO generation

            self.update_status("publish", {"step": "Uploading to YouTube..."})
            if not os.path.exists(YOUTUBE_CREDENTIALS):
                print("\n" + "="*60)
                print("⚠️  YOUTUBE PUBLISHING BLOCKED: MISSING CREDENTIALS")
                print("To enable automatic uploads, you need to create a Google Cloud Project with the YouTube Data API enabled.")
                print("1. Go to: https://console.cloud.google.com/apis/credentials")
                print("2. Create an OAuth 2.0 Desktop Client.")
                print(f"3. Download the JSON file and save it as: {YOUTUBE_CREDENTIALS}")
                print("="*60 + "\n")
                self.log_history(f"[BLOCKED] {topic}", None)
                return
            
            time.sleep(3) # Mock Youtube upload

            # Mock successful publish
            video_url = f"https://youtube.com/watch?v=mock_{int(time.time())}"
            self.log_history(topic, video_url)
            print(f"[Autopilot] Pipeline completed successfully. Video: {video_url}")

        except Exception as e:
            print(f"[Autopilot] Pipeline failed: {e}")
            self.log_history("Pipeline Failed", None)

pipeline = AutopilotPipeline()
