# Multi-Agent Desktop App

A modern, high-performance desktop application for multi-agent LLM collaboration, autonomous architecture discussions, and task execution graph orchestrations. Built with **Tauri v2**, **React 19**, **TypeScript**, and **Rust**.

Designed natively for **Linux (Debian / Ubuntu)** and **Windows 10 / 11**.

---

## 🚀 Key Features

* **Dual-Engine Modes**:
  - **Plan Mode**: Multi-turn discussion between specialized agents (`Researcher`, `Reviewer`, etc.) utilizing **Round-Robin** or **Hierarchical** turn strategies until moderator consensus is achieved.
  - **Build Mode**: Dependency task graph visualizer with automated deviation checks and step-by-step execution.
* **Pure Terminal Dock**:
  - Embedded terminal interface connecting directly to native OS shell (`sh`/`bash` on Linux, `cmd.exe` on Windows).
  - Fine-grained permission guards (`whitelist-safe`, `alwaysAsk`, `allowed`).
* **5-Step Agent Builder Wizard**:
  - Identity & Trust Level presets (`secure`, `review-driven`, `agent-driven`, `custom`).
  - Markdown-based Skill Registry integration.
  - Granular tool permissions and interactive in-memory test sandbox.
* **4 Boundary States**:
  - Shimmer Loading Skeleton, Guided Empty States, Global Error Boundary with retry, and Floating Toast Feedback.
* **Multi-Provider Resilience**:
  - Local LLM (LM Studio), OpenAI-compatible endpoints, and offline mock fallback with character-heuristic token truncation.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Framer Motion
- **Native Host**: Tauri v2, Rust
- **CI/CD**: GitHub Actions matrix for Linux & Windows automated installer builds

---

## 📦 Building Installers (Linux & Windows)

### 1. Via Automated GitHub Actions (Recommended)
This repository includes `.github/workflows/release.yml`. Whenever a tag is pushed (e.g. `v0.1.0`) or triggered manually from GitHub Actions:
- **Linux**: Generates `.deb` (Debian/Ubuntu) and `.AppImage` packages.
- **Windows**: Generates `.msi` and `.exe` (NSIS) installers.
- Artifacts are automatically attached to GitHub Releases for direct download.

### 2. Local Development
```bash
# Install frontend dependencies
npm install

# Start development preview
npm run dev
```

### 3. Local Native Build (Requires Rust & Cargo)
```bash
# Build native application bundle
npm run tauri build
```

---

## 📄 License
MIT
