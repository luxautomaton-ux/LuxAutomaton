# 🔮 Lux Automaton: Ultimate Multi-Agent & Local Video Production Guide

Welcome to your private AI ecosystem! Below is the comprehensive guide on what your powerful applications do, how to leverage their skills, and how to run a **100% free, local AI Avatar & video automated production pipeline**.

---

## 🧭 Part 1: Lux Claude UI (Port 3001)

### What is Lux Claude?
Lux Claude is a premium web-based interface for Anthropic's **Claude Code** terminal agent. It allows you to run high-fidelity file editing, command line execution, semantic searching, and multi-agent loops directly in a web console.

### 📦 Installed Skills Pack
I have synchronized and updated your local-safe skills directory under `~/.claude/skills/`. This makes your Claude agent incredibly powerful, attaching specialized modules to its context automatically:

| Skill Directory | Description | Trigger Phrase Examples |
|:---|:---|:---|
| **`awesome-agent-skills`** | High-performance planning, self-correction, and task breakdown logic. | *"Analyze this codebase and apply best planning skills"* |
| **`browser-use`** | Out-of-the-box autonomous Chromium controller for web scraping & automation. | *"Use browser-use to check the price of Bitcoin"* |
| **`andrej-karpathy-skills`** | Advanced coding style, compact formatting, and deep-dive file refactoring. | *"Refactor this module Karpathy-style"* |
| **`claude-skills`** | System-level CLI scripts, workspace managers, and file utility extensions. | *"Use system skills to optimize active directories"* |
| **`hyperframes`** | GSAP timeline generator & visual video scripting compiler scripts. | *"Create a hyperframes timeline for a tech intro video"* |
| **`nothing-design-skill`** | Futuristic, high-end visual layout, glassmorphism, and dark-mode styling tokens. | *"Apply nothing-design aesthetics to index.html"* |

---

## 🎬 Part 2: Lux Tube & Free AI Avatar Setup

Paid tools like HeyGen are incredible, but they cost **$24 to $120+ per month** and depend entirely on cloud APIs. You have a **100% free, local, open-source alternative** built right into your folder!

Here is how the automated pipeline works and how to use it:

```
                  ┌────────────────────────┐
                  │   User Inputs Topic    │
                  └───────────┬────────────┘
                              │
                              ▼
                  ┌────────────────────────┐
                  │   Ollama Qwen 2.5      │
                  └───────────┬────────────┘
                              │ Script: Hook/Body/CTA
                              ▼
                  ┌────────────────────────┐
                  │ macOS Samantha TTS     │
                  └───────────┬────────────┘
                              │ High-Fidelity Audio
                              ▼
                  ┌────────────────────────┐
                  │   Hyperframes + GSAP   │
                  └───────────┬────────────┘
                              │ Subtitles & Overlays
                              ▼
                  ┌────────────────────────┐
                  │    FFmpeg Assembly     │
                  └───────────┬────────────┘
                              │ 1080x1920 MP4 Video
                              ▼
                  ┌────────────────────────┐
                  │      Wav2Lip           │
                  │   (ReFlow-Studio)      │
                  └───────────┬────────────┘
                              │ Lip-Sync Avatar
                              ▼
                  ┌────────────────────────┐
                  │  YouTube Optimizer     │
                  └───────────┬────────────┘
                              │ High-CTR Titles, Tags, concepts
                              ▼
                  ┌────────────────────────┐
                  │ 🚀 Viral Local Video   │
                  └────────────────────────┘
```

### How to Trigger the Local Pipeline

To generate a full vertical viral video (Short/TikTok) from a text topic entirely offline, run this command in your terminal:

```bash
./auto-video-pipeline.sh "How AI agents are taking over web browsers"
```

#### What this script does under the hood:
1. **Ollama Scriptwriting:** Calls your local `qwen2.5:7b` model to write an engaging 60-second script split into Hook, Body, and Call-to-Action.
2. **Local TTS Generation:** Uses macOS's native `say` utility with high-fidelity voices to compile standard audio narration files.
3. **Subtitles & Overlays:** Uses **Hyperframes Studio** and GSAP to dynamically render smooth text layers, B-roll placeholders, and visual transitions.
4. **FFmpeg Compilation:** Compresses and merges audio and visual tracks into high-definition portrait format (`1080x1920`).
5. **Lip-Syncing Avatar:** If you specify the `--lipsync` flag, it channels **Wav2Lip** inside your `ReFlow-Studio` folder to match a custom avatar face image's mouth movements perfectly to the audio track!

### 📈 Branded SEO & Virality Engine
Once your raw video is ready, run **Viral YouTube Optimizer AI** at `http://localhost:5173` (or launch it from your dashboard):
* **Deep Grounding:** Paste your topic to analyze the current top-performing video structures on YouTube.
* **Viral Title Generator:** Suggests 5 high-CTR curiosity-inducing titles.
* **SEO Descriptions:** Generates markdown-optimized descriptions populated with high-traffic hashtags.
* **Thumbnail Concepts:** Uses Gemini and Imagen 3 to outline three visually distinct, high-impact thumbnail designs based on emotional triggers.

---

## 🤝 Part 3: Lux Manus (Port 8000)

### What is Lux Manus?
Lux Manus is your autonomous browser-control agent, built on MetaGPT and browser-use. While other agents just write code, Lux Manus can take complete control of your web browser to perform complex web tasks on your behalf.

### Core Features Active on Port 8000:
* 🟢 **Real-time Thinking Graph:** Shows a visual workflow of the agent's internal reasoning, planning, and tool calls as they execute.
* 🟢 **Chromium Interface:** Launches a fully visible web browser that clicks, scrolls, types, and solves obstacles dynamically.
* 🟢 **Filesystem Sandbox:** Directly reads and writes files inside its local `workspace` folder, letting you retrieve downloaded CSVs, PDFs, or generated media instantly.

---

## 🚀 Quick Launch Dashboard
Launch any component instantly from your control center at **`http://localhost:1337/dashboard`**:

* Click 🎬 **Lux Tube Studio** to start your viral research, tune local models, and configure the automated news workflows.
* Click 🎞️ **Hyperframes Studio** to launch the React-based visual timeline editor on port `5190` to manually customize animations and overlays.
* Click 🧭 **Agent Browser Controller** to command Lux Manus or Claude to take browser actions on your behalf!
