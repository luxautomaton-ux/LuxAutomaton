# Lux AI Studio: First-Run Guide

Welcome to **Lux AI Studio**, the private, local-first powerhouse for agentic AI. Follow this guide to ensure your environment is correctly initialized for the ultimate experience.

## Prerequisites

Before launching the application, ensure you have the following installed on your system:

1.  **Python 3.11+**: Required for the background orchestration services.
2.  **Node.js & NPM**: Required for local agent bridge interactions.
3.  **Ollama**: (Optional but recommended) For local LLM support (Qwen/Llama models).

## Initialization

1.  **Extract the Application**:
    *   **macOS**: Open the `.dmg` and drag `Lux AI Studio` to your Applications folder.
    *   **Windows**: Run the `.exe` installer.

2.  **Verify Backend Services**:
    The studio automatically starts a Python backend (`hub.py`) on port `5001`. If you encounter connection issues, ensure no other service is occupying this port.

3.  **Authentication**:
    On the first run, you will be prompted to register or login. This creates a local `auth.db` in `~/.luxcli/` to manage your secure session.

4.  **Hardware Awareness**:
    Lux AI Studio detects your hardware (Apple Silicon / NVIDIA GPU) to optimize model performance. Ensure your drivers are up-to-date for the best experience.

## Support & Troubleshooting

If you encounter a "Backend Connection Error":
*   Check that your firewall isn't blocking internal port `5001`.
*   Run the `Skills-Install.sh` script found in the application resources if dependencies are missing.

---
*Developed by Lux Automaton - 2026.5.14*
