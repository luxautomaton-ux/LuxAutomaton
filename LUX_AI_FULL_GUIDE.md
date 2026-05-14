# 🟠 Lux AI Ecosystem: The Definitive Guide

Welcome to the **Lux AI Ecosystem**, a premium, local-first intelligence suite designed to bridge the gap between high-level reasoning and absolute data sovereignty. This guide outlines the architecture, capabilities, and competitive standing of the Lux platform.

---

## 🏗️ 1. Architecture & Technical Stack

The Lux ecosystem is built on a "Distributed Local Intelligence" model. Unlike traditional SaaS AI tools, every component of Lux is designed to run on your hardware, using your resources.

### **The Core Layers:**
1.  **Frontend (Lux AI Studio / Claude Code UI)**:
    *   **Tech**: React 18, Tailwind CSS, Framer Motion (for cinematic transitions).
    *   **Design**: Glassmorphism aesthetic with high-contrast orange/gold accents.
    *   **Packaging**: Optimized for Vite 8 and the Rolldown bundler for lightning-fast cold starts.
2.  **Orchestration Layer (Opencode)**:
    *   A high-performance proxy that mimics the OpenAI/Anthropic APIs.
    *   **Role**: Handles request routing, caching, and model switching. It is the "brain" that allows cloud-only tools like Claude Code to work offline.
3.  **Inference Engine (Ollama + Gemma 4)**:
    *   **Gemma 4**: The default local reasoning model, optimized for coding and complex logic.
    *   **Hardware**: Leverages Metal (macOS) or CUDA (Windows/Linux) for near-instant response times.
4.  **Agentic Modules**:
    *   **Manus**: The high-level agent engine for multi-step task planning.
    *   **Lux CoWork**: A collaborative workspace for multi-agent coordination.
    *   **Hermes**: A specialized web-ui for agentic experimentation.

---

## 🚀 2. Key Capabilities

### **🔓 Zero-Friction Authentication**
Most agentic tools (like the original Claude Code) require a cloud login and API billing. Lux has been modified to **bypass cloud authentication entirely**. By using the `CLAUDE_CODE_USE_OPENAI=1` override pointed at a local `opencode` instance, you get the power of the Claude CLI without the login prompts.

### **💻 The Super Agent Terminal**
Integrated directly into the chat mode, the terminal is more than just a shell. It is a **bidirectional workspace**:
*   **Agent Control**: Watch the AI execute commands in real-time.
*   **Collapsible Interface**: Toggle the terminal view to maximize chat focus.
*   **Local Execution**: Commands run directly in your project directory with full safety guardrails.

### **🛡️ Local-First Privacy**
Your code never leaves your machine. Your prompts, search history, and agent sessions are stored in local SQLite databases or JSON flat files within your `Documents/LuxAutomaton` folder.

---

## 📊 3. How Lux Stacks Up

| Feature | Lux AI Ecosystem | Aider / OpenHands | LM Studio / Chatbox |
| :--- | :--- | :--- | :--- |
| **User Interface** | Premium, Cinematic UI | CLI-focused / Basic Web | Chat-only |
| **Logic Engine** | Integrated Gemma 4 | Varies (Mostly Cloud) | Local Inference Only |
| **Agentic Power** | Full System Access | High (CLI only) | Low (No tool use) |
| **Login Req.** | **None (Bypassed)** | API Key Required | None |
| **Privacy** | 100% Local | Mostly Local | 100% Local |
| **Philosophy** | "Automaton" Autonomy | Developer Utility | LLM Playground |

### **Why Lux Wins:**
*   **The "Flow" State**: While Aider is great for quick terminal edits, Lux provides a **holistic workspace** where you can chat, browse files, and watch terminal execution simultaneously.
*   **Premium Feel**: Lux is built to feel like an **Operating System for AI**, not just a wrapper. The custom splash screens, glassmorphism, and responsive layouts are designed for long-form professional use.
*   **No "API Anxiety"**: Because it defaults to local models like Gemma 4, you never have to worry about token costs or rate limits while experimenting.

---

## 🛠️ 4. Managing Your Setup

### **Switching Models**
All Lux apps are synchronized. To change the brain of the system, you only need to update the `DEFAULT_MODEL` in your `.env` files. We currently recommend:
*   **Gemma 4**: For heavy coding and logic.
*   **Qwen 2.5 (7b/14b)**: For fast, creative tasks.

### **Project Structure**
*   `/claudecodeui`: The React source for the graphical interface.
*   `/openclaude`: The modified CLI that enables no-login local execution.
*   `/LuxCoWork`: The collaboration server.
*   `/Manus`: The core agentic reasoning engine.

---

## 🔮 5. Future Roadmap
*   **Vision Integration**: Native support for local vision models (Llava/Qwen-VL) to "see" your UI.
*   **Mobile Bridge**: Access your local Lux agents from your phone via a secure, private tunnel.
*   **Hardware Acceleration**: Specialized kernels for the latest M4 and RTX hardware.

---
*Created by Antigravity for Lux Automaton — 2026*
