# 🔮 Project LuxAutomaton: Guidelines & Auto-Skills Integration

Welcome Agent! You are running inside the **LuxAutomaton** private AI ecosystem. Read and follow these durable instructions continuously to assist the user autonomously.

---

## 🛠️ Auto-Skills Integration (ALWAYS Use These)

You have access to a rich set of premium, local-safe skills located in `~/.claude/skills/`. You MUST proactively reference and utilize them during execution:

1.  **Browser Automation (`browser-use`):**
    *   Whenever the user asks you to scrape a webpage, navigate, or test a local web app, automatically load and run the `browser-use` script skill to perform autonomous Chromium interactions.
2.  **Karpathy Styling (`andrej-karpathy-skills`):**
    *   When editing or writing code, follow Andrej Karpathy's clean coding standard: write highly compact, explicit logic, omit verbose comments unless explaining non-obvious "whys", and keep abstractions minimal.
4.  **Nothing Visual System (`nothing-design-skill`):**
    *   When modifying HTML, CSS, or dashboard templates, use futuristic dark mode palettes, vibrant/harmonic gradients, glassmorphism, and micro-animations.

---

## 🎬 Branded Video Local-Pipeline Shorthand

When asked to generate videos or optimize for YouTube, coordinate with these pre-configured local tools:

*   **Offline Scripting & Narration:** Run `./auto-video-pipeline.sh "<topic>" [--lipsync]` to generate full MP4 videos using local Ollama (`qwen2.5:7b`), macOS Samantha speech synthesis (`say`), and FFmpeg.
*   **Wav2Lip Lip-Sync:** Use `ReFlow-Studio` resources to sync avatar images with audio files.
*   **SEO Optimizer:** Utilize the local Vite app inside `viral-youtube-optimizer-ai` to generate tags, descriptions, and Imagen 3 thumbnail concept scripts.

---

## 💻 Development & System Commands

*   **Start Local Hub Dashboard:** `python3 hub.py`
*   **Verify Platform Readiness:** `./verify_setup.sh`
*   **Recompile Hyperframes Monorepo:** `bun run build` inside `hyperframes/`
*   **Launch Hyperframes Visual Timeline Studio:** `bun run studio` inside `hyperframes/` (port 5190)
*   **Stop Port Conflicts:** `pkill -9 -f "python.*hub.py"`
