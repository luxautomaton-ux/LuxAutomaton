# Lux Automaton Studio

Local-first AI workstation for macOS with a unified hub.

WEBSITE https://luxautomaton-ux.github.io/LuxAutomaton/

💠 Lux AI Studio - Release Notes v1.0.0

**Release Date:** May 15, 2026  
**Build:** "Sovereign Intelligence" Initial Release

---

## 🌟 Overview

Lux AI Studio v1.0.0 marks the final unification of the Lux Automaton ecosystem. This release transforms a collection of high-performance AI tools into a single, cohesive, local-first workstation. Designed for absolute privacy and data sovereignty, Lux AI Studio provides a premium "out-of-the-box" experience for developers, creators, and power users.

---

## 🆕 Key Features

### 🏢 Unified Platform Branding
We have completely rebranded the entire stack to ensure a seamless visual identity.
*   **Lux Navigator** (formerly Manus): Your autonomous web-research partner.
*   **Lux OS** (formerly Hermes): The sovereign automation backbone.
*   **Lux Workspace** (formerly CoWork): Professional multi-agent collaborative environment.
*   **Lux Console** (formerly Claude Code UI): Branded terminal bridge for AI coding.
*   **Lux Bridge** (formerly OpenCode): High-speed persistent local inference proxy.
*   **Lux Studio** (formerly Open-Generative-AI): High-fidelity video and creative suite.

### 🎛️ Centralized API Orchestration
The **Lux Dashboard** now serves as the single source of truth for all API credentials.
*   Configure Anthropic, OpenAI, and Lux Bridge keys once in the dashboard.
*   Automatic propagation of keys to all sub-applications via the `hub.py` sync engine.
*   No more manual `.env` editing required.

### 🧠 Hardware-Aware Smart Routing
Built for performance on every Mac, from the MacBook Air to the Mac Studio.
*   **Intelligent Model Detection:** The system now detects system RAM and CPU architecture.
*   **Gemma Optimization:** Automatically prioritizes **Gemma 2 2B** for 8GB/16GB machines to ensure snappy performance without lag.
*   **High-Performance Mode:** Switches to **Gemma 2 9B** or **Llama 3.1** on 32GB+ systems for high-reasoning tasks.

---

## 🛠️ Improvements & Fixes

*   **Installer Unification:** Created a single, branded DMG installer for macOS and a portable setup script for Linux.
*   **UI/UX Overhaul:** Standardized dark-mode aesthetics across all 30+ internal pages using the "LUX AI" design system.
*   **Zero-Config Networking:** All local services are pre-configured for `127.0.0.1` loopback to ensure no sensitive data ever leaves your hardware.
*   **Unified Documentation:** Consolidated all manuals, use cases, and setup guides into the core dashboard.

---

## 📦 How to Install

1.  Navigate to the **`A_START_HERE`** folder.
2.  **macOS:** Open `Lux-Automaton-Installer.dmg`.
3.  **Linux:** Run `Lux-Automaton-Linux.sh`.
4.  **Windows:** Run `Lux-Automaton-Setup.exe`.
5.  Launch the **Lux Hub** to begin your sovereign AI journey.

---

## 🔒 Security & Privacy Notice

Lux AI Studio is **Local-First**. We do not collect analytics, track usage, or send your data to external servers. Your AI agents live entirely within your own hardware environment.

---

<p align="center">
  <em>Developed by the Lux Automaton Team.</em><br>
  <strong>Your Machine. Your Agents. Your Command Center.</strong>
</p>


## Fresh macOS Install

From the LuxAutomaton root:

```bash
chmod +x LuxAutomaton-Install.sh verify_setup.sh hub.sh LuxAutomaton.sh
./LuxAutomaton-Install.sh
```


