import type { AgentPermissions, ObsidianToolCall, ObsidianToolResult } from '../types';
import { globalVaultManager } from '../obsidian/VaultManager';
import { ObsidianStore } from '../storage/ObsidianStore';

export class ObsidianTool {
  public static readonly TOOL_INSTRUCTIONS = `
[OBSIDIAN KNOWLEDGE VAULT TOOL]:
Kamu memiliki akses otonom ke basis pengetahuan Obsidian Vault milik pengguna.
Jika kamu membutuhkan spesifikasi, aturan arsitektur, catatan meeting, atau ingin mendokumentasikan keputusan:
- Untuk mencari catatan relevan di Vault (0 biaya token):
  <obsidian_search query="kata_kunci" />
- Untuk membaca catatan atau sub-bab spesifik:
  <obsidian_read title="NamaCatatan" section="JudulBabOpsional" />
- Untuk mencatat keputusan arsitektur / ringkasan baru ke Obsidian:
  <obsidian_write title="NamaCatatan" content="konten catatan markdown..." />
Catatan yang dibaca akan otomatis dipangkas sesuai token budget agar percakapan tetap hemat token.`;

  /**
   * Memvalidasi izin akses Obsidian agent
   */
  public static checkPermission(
    permissions: AgentPermissions,
    action: 'search' | 'read' | 'write'
  ): boolean {
    const access = permissions.obsidianAccess || 'read-only';

    if (access === 'denied') {
      return false;
    }

    if (action === 'write') {
      return access === 'read-write';
    }

    return true; // 'read-only' atau 'read-write' boleh search & read
  }

  /**
   * Eksekusi pemanggilan tool Obsidian
   */
  public static async execute(
    call: ObsidianToolCall,
    permissions: AgentPermissions
  ): Promise<ObsidianToolResult> {
    const config = ObsidianStore.loadConfig();

    if (!config.vaultPath || !config.vaultPath.trim()) {
      return {
        action: call.action,
        success: false,
        message: 'Obsidian Vault belum dihubungkan oleh pengguna di Pengaturan.',
        formattedOutput: '<obsidian_result status="error">Obsidian Vault belum dikonfigurasi di Pengaturan.</obsidian_result>',
      };
    }

    if (!this.checkPermission(permissions, call.action)) {
      const accessLevel = permissions.obsidianAccess || 'read-only';
      const msg =
        call.action === 'write'
          ? `Izin ditolak: Agent memiliki hak akses '${accessLevel}', tidak diizinkan menulis catatan baru ke Obsidian.`
          : `Izin ditolak: Agent tidak diizinkan mengakses Obsidian Vault (obsidianAccess: 'denied').`;
      return {
        action: call.action,
        success: false,
        message: msg,
        formattedOutput: `<obsidian_result status="denied">${msg}</obsidian_result>`,
      };
    }

    try {
      if (call.action === 'search') {
        const query = call.query || '';
        const notes = await globalVaultManager.searchNotes(query, 5);

        if (notes.length === 0) {
          return {
            action: 'search',
            success: true,
            message: `Tidak ditemukan catatan yang cocok dengan query "${query}".`,
            data: [],
            formattedOutput: `<obsidian_result status="success">\nTidak ada catatan Obsidian yang cocok dengan query "${query}".\n</obsidian_result>`,
          };
        }

        const lines = notes.map(
          (n, i) =>
            `${i + 1}. [[${n.title}]] (${n.relativePath}) — Tags: [${n.tags.join(', ')}] — Headings: [${n.headings.slice(0, 3).join(', ')}]`
        );

        const outputText = `Ditemukan ${notes.length} catatan relevan di Obsidian Vault:\n${lines.join('\n')}`;

        return {
          action: 'search',
          success: true,
          message: `Berhasil menemukan ${notes.length} catatan.`,
          data: notes,
          formattedOutput: `<obsidian_result status="success">\n${outputText}\n</obsidian_result>`,
        };
      }

      if (call.action === 'read') {
        const title = call.title || '';
        if (!title.trim()) {
          throw new Error('Nama catatan (title) wajib diisi untuk membaca.');
        }

        const result = await globalVaultManager.readNote(title, call.section);
        const sectionNote = result.sectionFound ? ` (Bab: "${call.section}")` : '';

        const outputText = `[Konten Catatan Obsidian: [[${result.title}]]${sectionNote} — Estimasi: ${result.tokenEstimate} token]:\n\n${result.content}`;

        return {
          action: 'read',
          success: true,
          message: `Berhasil membaca catatan [[${result.title}]] (~${result.tokenEstimate} token).`,
          data: result,
          formattedOutput: `<obsidian_result status="success">\n${outputText}\n</obsidian_result>`,
        };
      }

      if (call.action === 'write') {
        const title = call.title || '';
        const content = call.content || '';
        if (!title.trim() || !content.trim()) {
          throw new Error('Title dan content wajib diisi untuk menulis catatan.');
        }

        const result = await globalVaultManager.writeNote(title, content, call.folder || 'MultiAgent');

        return {
          action: 'write',
          success: true,
          message: result.message,
          data: result,
          formattedOutput: `<obsidian_result status="success">\n${result.message}\nPath: ${result.filePath}\n</obsidian_result>`,
        };
      }

      throw new Error(`Aksi ObsidianTool tidak dikenal: ${(call as any).action}`);
    } catch (err: any) {
      return {
        action: call.action,
        success: false,
        message: err.message || 'Terjadi kesalahan saat memproses ObsidianTool.',
        formattedOutput: `<obsidian_result status="error">${err.message || 'Gagal mengeksekusi aksi Obsidian.'}</obsidian_result>`,
      };
    }
  }

  /**
   * Mem-parse tag pemanggilan tool dari respons teks agen:
   * <obsidian_search query="..." />
   * <obsidian_read title="..." section="..." />
   * <obsidian_write title="..." content="..." />
   */
  public static parseToolCalls(text: string): ObsidianToolCall[] {
    const calls: ObsidianToolCall[] = [];

    // Parse <obsidian_search query="..." />
    const searchRegex = /<obsidian_search\s+query=["']([^"']+)["']\s*\/>/gi;
    let match: RegExpExecArray | null;
    while ((match = searchRegex.exec(text)) !== null) {
      calls.push({ action: 'search', query: match[1] });
    }

    // Parse <obsidian_read title="..." (section="...")? />
    const readRegex = /<obsidian_read\s+title=["']([^"']+)["'](?:\s+section=["']([^"']+)["'])?\s*\/>/gi;
    while ((match = readRegex.exec(text)) !== null) {
      calls.push({ action: 'read', title: match[1], section: match[2] || undefined });
    }

    // Parse <obsidian_write title="..." (folder="...")?>content</obsidian_write> atau inline
    const writeBlockRegex = /<obsidian_write\s+title=["']([^"']+)["'](?:\s+folder=["']([^"']+)["'])?>([\s\S]*?)<\/obsidian_write>/gi;
    while ((match = writeBlockRegex.exec(text)) !== null) {
      calls.push({ action: 'write', title: match[1], folder: match[2] || undefined, content: match[3].trim() });
    }

    // Parse self-closing write: <obsidian_write title="..." content="..." />
    const writeInlineRegex = /<obsidian_write\s+title=["']([^"']+)["']\s+content=["']([^"']+)["']\s*\/>/gi;
    while ((match = writeInlineRegex.exec(text)) !== null) {
      calls.push({ action: 'write', title: match[1], content: match[2].trim() });
    }

    return calls;
  }
}
