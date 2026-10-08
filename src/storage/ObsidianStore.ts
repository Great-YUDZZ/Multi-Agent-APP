import type { ObsidianVaultConfig, ObsidianNoteMeta } from '../types';

const OBSIDIAN_CONFIG_KEY = 'app_obsidian_vault_config';

export class ObsidianStore {
  private static defaultConfig: ObsidianVaultConfig = {
    vaultPath: '',
    enabled: false,
    maxTokensPerSnippet: 300,
    sessionExportFolder: 'MultiAgent/Sessions',
    notesCache: [],
    lastIndexedAt: 0,
  };

  /**
   * Memuat konfigurasi Obsidian Vault dari localStorage
   */
  static loadConfig(): ObsidianVaultConfig {
    try {
      const raw = localStorage.getItem(OBSIDIAN_CONFIG_KEY);
      if (!raw) return { ...this.defaultConfig };
      const parsed = JSON.parse(raw);
      return {
        ...this.defaultConfig,
        ...parsed,
      };
    } catch (e) {
      console.warn('Gagal memuat konfigurasi Obsidian dari localStorage:', e);
      return { ...this.defaultConfig };
    }
  }

  /**
   * Menyimpan konfigurasi Obsidian Vault ke localStorage
   */
  static saveConfig(config: Partial<ObsidianVaultConfig>): ObsidianVaultConfig {
    try {
      const current = this.loadConfig();
      const updated: ObsidianVaultConfig = {
        ...current,
        ...config,
      };
      localStorage.setItem(OBSIDIAN_CONFIG_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Gagal menyimpan konfigurasi Obsidian ke localStorage:', e);
      return { ...this.defaultConfig, ...config };
    }
  }

  /**
   * Memperbarui cache daftar catatan
   */
  static updateNotesCache(notes: ObsidianNoteMeta[]): void {
    const current = this.loadConfig();
    current.notesCache = notes;
    current.lastIndexedAt = Date.now();
    this.saveConfig(current);
  }

  /**
   * Mereset konfigurasi vault
   */
  static resetConfig(): ObsidianVaultConfig {
    localStorage.removeItem(OBSIDIAN_CONFIG_KEY);
    return { ...this.defaultConfig };
  }
}
