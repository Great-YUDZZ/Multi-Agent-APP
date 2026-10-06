import { invoke } from '@tauri-apps/api/core';
import { isTauriEnvironment } from './fsBridge';

export interface CommandResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
  new_cwd?: string;
}

export async function executeTerminalCommand(
  command: string,
  cwd: string = '.'
): Promise<CommandResult> {
  const startTime = performance.now();
  const trimmed = command.trim();

  if (isTauriEnvironment()) {
    try {
      return await invoke<CommandResult>('execute_command', {
        command: trimmed,
        cwd: cwd || '.',
      });
    } catch (err) {
      return {
        stdout: '',
        stderr: typeof err === 'string' ? err : 'Eksekusi gagal pada lingkungan Tauri.',
        exit_code: 1,
        duration_ms: Math.round(performance.now() - startTime),
      };
    }
  }

  // --- Browser Simulator Fallback ---
  const elapsed = Math.round(performance.now() - startTime);

  if (!trimmed) {
    return { stdout: '', stderr: '', exit_code: 0, duration_ms: elapsed };
  }

  const [cmdName, ...args] = trimmed.split(/\s+/);
  const argStr = args.join(' ');

  switch (cmdName.toLowerCase()) {
    case 'help':
      return {
        stdout: `Perintah Terminal Multi-Agent:
  ls, dir         Daftar berkas di direktori kerja
  pwd             Tampilkan path direktori saat ini
  whoami          Tampilkan identitas pengguna
  date            Tampilkan waktu dan tanggal sistem
  git status      Status repositori Git
  node -v         Versi Node.js
  cargo --version Versi Cargo Rust
  echo [teks]     Cetak teks ke terminal
  clear           Bersihkan layar terminal
  help            Bantuan daftar perintah

* Catatan: Buka di aplikasi desktop Tauri untuk akses penuh ke shell OS asli (bash/zsh/cmd/powershell).`,
        stderr: '',
        exit_code: 0,
        duration_ms: elapsed + 8,
      };

    case 'pwd':
      return {
        stdout: '/workspace/Multi-Agent-APP',
        stderr: '',
        exit_code: 0,
        duration_ms: elapsed + 5,
      };

    case 'whoami':
      return {
        stdout: 'developer@workspace-linux',
        stderr: '',
        exit_code: 0,
        duration_ms: elapsed + 4,
      };

    case 'date':
      return {
        stdout: new Date().toString(),
        stderr: '',
        exit_code: 0,
        duration_ms: elapsed + 3,
      };

    case 'echo':
      return {
        stdout: argStr,
        stderr: '',
        exit_code: 0,
        duration_ms: elapsed + 2,
      };

    case 'node':
      if (args.includes('-v') || args.includes('--version')) {
        return { stdout: 'v22.14.0', stderr: '', exit_code: 0, duration_ms: elapsed + 10 };
      }
      return { stdout: 'Node.js Interactive REPL simulasi', stderr: '', exit_code: 0, duration_ms: elapsed };

    case 'npm':
      if (args.includes('-v') || args.includes('--version')) {
        return { stdout: '10.9.2', stderr: '', exit_code: 0, duration_ms: elapsed + 12 };
      }
      return { stdout: `npm ${argStr} disimulasikan`, stderr: '', exit_code: 0, duration_ms: elapsed };

    case 'cargo':
      return {
        stdout: 'cargo 1.85.0 (Tauri v2 Desktop Toolchain)',
        stderr: '',
        exit_code: 0,
        duration_ms: elapsed + 15,
      };

    case 'git':
      if (args[0] === 'status') {
        return {
          stdout: `On branch main\nYour branch is up to date with 'origin/main'.\n\nChanges not staged for commit:\n  modified:   src/components/TerminalView.tsx\n  modified:   src-tauri/src/lib.rs\n\nno changes added to commit (use "git add" to track)`,
          stderr: '',
          exit_code: 0,
          duration_ms: elapsed + 20,
        };
      }
      if (args[0] === 'branch') {
        return { stdout: '* main', stderr: '', exit_code: 0, duration_ms: elapsed + 5 };
      }
      return { stdout: `git ${argStr} selesai`, stderr: '', exit_code: 0, duration_ms: elapsed + 8 };

    case 'ls':
    case 'dir':
      return {
        stdout: `total 48
drwxr-xr-x  6 user group  4096 Oct  6 09:30 .
drwxr-xr-x 12 user group  4096 Oct  6 09:00 ..
drwxr-xr-x  8 user group  4096 Oct  6 09:32 src
drwxr-xr-x  4 user group  4096 Oct  6 09:31 src-tauri
-rw-r--r--  1 user group  1420 Oct  6 09:15 package.json
-rw-r--r--  1 user group   980 Oct  6 09:10 tsconfig.json
-rw-r--r--  1 user group   620 Oct  6 09:10 vite.config.ts
-rw-r--r--  1 user group  2450 Oct  6 09:35 README.md`,
        stderr: '',
        exit_code: 0,
        duration_ms: elapsed + 12,
      };

    case 'uname':
      return { stdout: 'Linux multi-agent-ide 6.6.0-generic x86_64', stderr: '', exit_code: 0, duration_ms: elapsed + 3 };

    default:
      return {
        stdout: '',
        stderr: `zsh: command not found: ${cmdName}\n(Jalankan di lingkungan desktop Tauri native untuk mengeksekusi langsung pada shell OS sistem)`,
        exit_code: 127,
        duration_ms: elapsed + 15,
      };
  }
}
