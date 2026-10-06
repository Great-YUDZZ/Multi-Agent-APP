import type { AgentPermissions, CommandApprovalRequest } from '../types';
import { executeTerminalCommand, type CommandResult } from '../tauri/terminalBridge';

export interface TerminalExecutionOptions {
  cwd?: string;
  onRequestApproval?: (request: CommandApprovalRequest) => Promise<boolean>;
  agentId?: string;
  agentName?: string;
}

export interface TerminalExecutionOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  formattedOutput: string;
}

/**
 * TerminalTool — Eksekusi command sistem dengan evaluasi izin granular per-agent.
 * Mendukung Linux (sh/bash) dan Windows (cmd.exe/PowerShell) secara aman.
 */
export class TerminalTool {
  /**
   * Command aman standar lintas platform yang boleh dieksekusi pada mode 'whitelist-safe'
   */
  public static readonly DEFAULT_WHITELIST_SAFE: string[] = [
    // Cross-platform & Git
    'git status',
    'git log',
    'git diff',
    'git branch',
    'node -v',
    'npm -v',
    'npm list',
    'tsc --version',
    'cargo --version',
    // Linux / macOS
    'ls',
    'pwd',
    'echo',
    'cat',
    'which',
    'uname',
    // Windows
    'dir',
    'cd',
    'type',
    'where',
    'ver',
  ];

  /**
   * Command destruktif/berbahaya yang SELALU wajib konfirmasi pengguna
   */
  public static readonly DEFAULT_ALWAYS_ASK: string[] = [
    // Linux / Unix dangerous
    'rm',
    'sudo',
    'dd',
    'chmod',
    'chown',
    'kill',
    'killall',
    'mkfs',
    'reboot',
    'shutdown',
    'curl',
    'wget',
    // Windows dangerous
    'del',
    'erase',
    'rmdir',
    'rd',
    'format',
    'diskpart',
    'reg',
    'powershell',
  ];

  /**
   * Menentukan platform runtime saat ini
   */
  static detectPlatform(): 'windows' | 'linux' | 'darwin' {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('win')) return 'windows';
      if (ua.includes('mac')) return 'darwin';
      return 'linux';
    }
    return 'linux';
  }

  /**
   * Mengecek apakah sebuah command masuk kategori berbahaya (selalu minta izin)
   */
  static isDangerousCommand(command: string, customAlwaysAsk?: string[]): boolean {
    const list = customAlwaysAsk && customAlwaysAsk.length > 0
      ? customAlwaysAsk
      : TerminalTool.DEFAULT_ALWAYS_ASK;

    const trimmed = command.trim();
    const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase();

    return list.some((danger) => {
      const dangerLower = danger.toLowerCase();
      return (
        firstWord === dangerLower ||
        trimmed.toLowerCase().startsWith(`${dangerLower} `) ||
        trimmed.toLowerCase().includes(`| ${dangerLower}`) ||
        trimmed.toLowerCase().includes(`&& ${dangerLower}`) ||
        trimmed.toLowerCase().includes(`; ${dangerLower}`)
      );
    });
  }

  /**
   * Mengecek apakah command diizinkan langsung dalam mode whitelist-safe
   */
  static isWhitelistedSafe(command: string, customAlwaysAllow?: string[]): boolean {
    const trimmed = command.trim();
    const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase();

    const allowed = [
      ...TerminalTool.DEFAULT_WHITELIST_SAFE,
      ...(customAlwaysAllow || []),
    ].map((c) => c.toLowerCase());

    return allowed.some((safe) => {
      return (
        trimmed.toLowerCase() === safe ||
        firstWord === safe ||
        trimmed.toLowerCase().startsWith(`${safe} `)
      );
    });
  }

  /**
   * Memvalidasi apakah command butuh konfirmasi pengguna berdasarkan AgentPermissions
   */
  static requiresUserApproval(command: string, permissions: AgentPermissions): boolean {
    const { terminalAccess } = permissions;

    // Jika mode adalah 'ask-every-time', selalu minta konfirmasi
    if (terminalAccess.mode === 'ask-every-time') {
      return true;
    }

    // Command destruktif selalu minta approval, bahkan pada mode 'allowed'
    if (TerminalTool.isDangerousCommand(command, terminalAccess.alwaysAsk)) {
      return true;
    }

    // Pada mode whitelist-safe, minta approval jika tidak masuk daftar aman
    if (terminalAccess.mode === 'whitelist-safe') {
      const isSafe = TerminalTool.isWhitelistedSafe(command, terminalAccess.alwaysAllow);
      return !isSafe;
    }

    // Pada mode 'allowed', eksekusi langsung (selama bukan dangerous command)
    return false;
  }

  /**
   * Mengeksekusi command dengan perlindungan izin agent dan dialog konfirmasi pengguna
   */
  static async execute(
    command: string,
    permissions: AgentPermissions,
    options: TerminalExecutionOptions = {}
  ): Promise<TerminalExecutionOutput> {
    const needsApproval = TerminalTool.requiresUserApproval(command, permissions);

    if (needsApproval) {
      if (!options.onRequestApproval) {
        throw new Error(
          `Perintah [${command}] memerlukan persetujuan pengguna tetapi handler persetujuan tidak tersedia.`
        );
      }

      const platform = TerminalTool.detectPlatform();
      const approvalRequest: CommandApprovalRequest = {
        id: `approval-${Date.now()}`,
        agentId: options.agentId || 'agent-unknown',
        agentName: options.agentName || 'Agent',
        command,
        reason: `Agent meminta menjalankan perintah sistem di lingkungan ${platform}.`,
        platform,
      };

      const approved = await options.onRequestApproval(approvalRequest);
      if (!approved) {
        throw new Error(`Eksekusi perintah terminal dibatalkan oleh pengguna: "${command}"`);
      }
    }

    // Jalankan perintah terminal via bridge
    const rawResult: CommandResult = await executeTerminalCommand(
      command,
      options.cwd || '.'
    );

    const formattedOutput = [
      `<tool_result source="terminal" command="${command}" exit_code="${rawResult.exit_code}" duration_ms="${rawResult.duration_ms}">`,
      rawResult.stdout ? `STDOUT:\n${rawResult.stdout}` : '',
      rawResult.stderr ? `STDERR:\n${rawResult.stderr}` : '',
      `</tool_result>`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      stdout: rawResult.stdout,
      stderr: rawResult.stderr,
      exitCode: rawResult.exit_code,
      durationMs: rawResult.duration_ms,
      formattedOutput,
    };
  }
}
