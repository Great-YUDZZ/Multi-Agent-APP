# Multi-Agent Desktop App

A high-performance desktop application for multi-agent LLM collaboration, autonomous architecture discussions, and task execution graph orchestrations. Built with Tauri v2, React 19, TypeScript, and Rust.

Designed natively for Linux (Debian / Ubuntu) and Windows (10 / 11).

---

## Downloads

Official binary releases and installers are hosted on the GitHub Releases page:

- **Latest Release**: [Download Multi-Agent Desktop (Latest)](https://github.com/Great-YUDZZ/Multi-Agent-APP/releases/latest)
- **All Releases**: [Release Archive](https://github.com/Great-YUDZZ/Multi-Agent-APP/releases)

### Available Packages

| Platform | Format | Description | Target OS |
| :--- | :--- | :--- | :--- |
| **Windows** | `.exe` (NSIS) | Standalone setup wizard with start menu and desktop shortcuts | Windows 10, 11 (64-bit) |
| **Windows** | `.msi` | Windows Installer package for standard and enterprise deployment | Windows 10, 11 (64-bit) |
| **Linux** | `.deb` | Native Debian/Ubuntu package with desktop integration and icon registration | Ubuntu 20.04+, Debian 11+, Mint |
| **Linux** | `.AppImage` | Portable universal executable (no installation required) | Any modern Linux x86_64 distribution |

### Installation Instructions

#### Linux (Debian / Ubuntu)
```bash
# Install via apt (automatically resolves dependencies)
sudo apt install ./multi-agent-desktop_*_amd64.deb

# Or install via dpkg
sudo dpkg -i multi-agent-desktop_*_amd64.deb
```

#### Linux (AppImage)
```bash
# Grant execution permissions and run
chmod +x multi-agent-desktop_*_amd64.AppImage
./multi-agent-desktop_*_amd64.AppImage
```

#### Windows
1. Download `Multi-Agent-Desktop_*_x64-setup.exe` or `Multi-Agent-Desktop_*_x64_en-US.msi`.
2. Double-click the installer file and complete the setup wizard.
3. Launch the application from the Start Menu or Desktop shortcut.

---

## Key Features

- **Dual-Engine Execution**:
  - **Plan Mode**: Multi-turn deliberations between specialized agents (such as Researcher and Reviewer) utilizing Round-Robin or Hierarchical turn strategies until moderator consensus is achieved.
  - **Build Mode**: Dependency task graph visualizer with automated deviation checks and step-by-step execution tracking.
- **Pure Terminal Dock**:
  - Direct connection to native host shell (`sh`/`bash` on Linux, `cmd.exe` on Windows).
  - Fine-grained permission guards (`whitelist-safe`, `alwaysAsk`, `allowed`).
- **5-Step Agent Builder Wizard**:
  - Configurable identity and trust level presets (`secure`, `review-driven`, `agent-driven`, `custom`).
  - Markdown-based Skill Registry integration.
  - Granular tool permissions and interactive in-memory test sandbox.
- **Four Boundary States**:
  - Shimmer Loading Skeleton, Guided Empty States, Global Error Boundary with retry capabilities, and Floating Toast Feedback.
- **Multi-Provider Resilience**:
  - Compatible with Local LLM (LM Studio), OpenAI-compatible endpoints, and offline mock fallback with character-heuristic token truncation.

---

## Architecture and Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Framer Motion
- **Native Host**: Tauri v2, Rust
- **CI/CD**: GitHub Actions workflow matrix for automated Linux and Windows installer compilation

---

## Development and Building from Source

### Prerequisites
- Node.js 18+ and npm
- Rust toolchain and Cargo (for native desktop compilation)

### Development Server
```bash
# Install frontend dependencies
npm install

# Start development preview
npm run dev
```

### Production Desktop Build
```bash
# Compile frontend and package native desktop binaries
npm run tauri build
```

---

## License

This project is licensed under the MIT License.
