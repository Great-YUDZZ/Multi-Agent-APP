import type { ObsidianNoteMeta } from '../types';
import { ObsidianStore } from '../storage/ObsidianStore';
import { listDirectory, readFileContent, saveFileContent, type FileEntry } from '../tauri/fsBridge';
import { estimateTokenCount } from '../llm/contextUtils';

export class VaultManager {
  private static instance: VaultManager;

  private constructor() {}

  public static getInstance(): VaultManager {
    if (!VaultManager.instance) {
      VaultManager.instance = new VaultManager();
    }
    return VaultManager.instance;
  }

  /**
   * Memindai seluruh berkas .md di folder Vault secara rekursif
   */
  public async scanVault(vaultPath?: string): Promise<ObsidianNoteMeta[]> {
    const config = ObsidianStore.loadConfig();
    const targetPath = vaultPath || config.vaultPath;

    if (!targetPath || !targetPath.trim()) {
      return [];
    }

    const notes: ObsidianNoteMeta[] = [];
    await this.traverseDirectory(targetPath, targetPath, notes);

    // Perbarui cache di storage
    ObsidianStore.updateNotesCache(notes);
    return notes;
  }

  /**
   * Rekursif membaca direktori vault
   */
  private async traverseDirectory(
    baseVaultPath: string,
    currentPath: string,
    collected: ObsidianNoteMeta[]
  ): Promise<void> {
    try {
      const entries: FileEntry[] = await listDirectory(currentPath);

      for (const entry of entries) {
        // Abaikan folder konfigurasi dan cache internal Obsidian
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.trash') {
          continue;
        }

        if (entry.is_dir) {
          await this.traverseDirectory(baseVaultPath, entry.path, collected);
        } else if (entry.name.toLowerCase().endsWith('.md')) {
          const title = entry.name.replace(/\.md$/i, '');
          const relativePath = entry.path.startsWith(baseVaultPath)
            ? entry.path.slice(baseVaultPath.length).replace(/^[/\\]+/, '')
            : entry.name;

          // Baca ringkas untuk heading dan tags jika memungkinkan
          let headings: string[] = [];
          let tags: string[] = [];
          let preview = '';
          let wordCount = 0;

          try {
            const rawContent = await readFileContent(entry.path);
            const lines = rawContent.split(/\r?\n/);
            wordCount = rawContent.trim().split(/\s+/).filter(Boolean).length;
            preview = lines.slice(0, 5).join(' ').slice(0, 150);

            // Ekstraksi heading (#, ##, ###)
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('#')) {
                const headingText = trimmed.replace(/^#+\s*/, '');
                if (headingText) headings.push(headingText);
              }
            }

            // Ekstraksi tag sederhana (frontmatter atau #tag)
            const tagMatches = rawContent.match(/#[a-zA-Z0-9_\-/]+/g);
            if (tagMatches) {
              tags = Array.from(new Set(tagMatches.map((t) => t.slice(1))));
            }
          } catch {
            // Jika pembacaan gagal, tetap simpan metadata dasar
          }

          collected.push({
            title,
            relativePath,
            absolutePath: entry.path,
            tags,
            headings,
            lastModified: Date.now(),
            wordCount,
            preview,
          });
        }
      }
    } catch (err) {
      console.warn(`Gagal memindai direktori vault ${currentPath}:`, err);
    }
  }

  /**
   * Mencari catatan di cache lokal vault menggunakan pencarian kata kunci / fuzzy
   */
  public async searchNotes(query: string, maxResults = 5): Promise<ObsidianNoteMeta[]> {
    const config = ObsidianStore.loadConfig();
    let notes = config.notesCache || [];

    // Jika cache kosong tapi vaultPath ada, lakukan scan cepat
    if (notes.length === 0 && config.vaultPath) {
      notes = await this.scanVault(config.vaultPath);
    }

    if (!query || !query.trim()) {
      return notes.slice(0, maxResults);
    }

    const cleanQuery = query.toLowerCase().trim();
    const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

    const scored = notes.map((note) => {
      let score = 0;
      const titleLower = note.title.toLowerCase();
      const pathLower = note.relativePath.toLowerCase();

      // Skor judul persis
      if (titleLower === cleanQuery) score += 100;
      else if (titleLower.includes(cleanQuery)) score += 50;

      // Skor kecocokan token per kata
      for (const token of queryTokens) {
        if (titleLower.includes(token)) score += 20;
        if (pathLower.includes(token)) score += 10;
        if (note.tags.some((t) => t.toLowerCase().includes(token))) score += 15;
        if (note.headings.some((h) => h.toLowerCase().includes(token))) score += 10;
        if (note.preview && note.preview.toLowerCase().includes(token)) score += 5;
      }

      return { note, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((s) => s.note);
  }

  /**
   * Membaca catatan spesifik dan memotong konten sesuai batas token budget
   */
  public async readNote(
    titleOrPath: string,
    section?: string,
    maxTokens?: number
  ): Promise<{
    title: string;
    content: string;
    sectionFound: boolean;
    tokenEstimate: number;
    filePath: string;
  }> {
    const config = ObsidianStore.loadConfig();
    const tokenLimit = maxTokens || config.maxTokensPerSnippet || 300;
    const cleanTitle = titleOrPath.replace(/\.md$/i, '').trim();

    // Cari path absolut berkas
    let targetPath = '';
    const cached = (config.notesCache || []).find(
      (n) =>
        n.title.toLowerCase() === cleanTitle.toLowerCase() ||
        n.relativePath.toLowerCase() === titleOrPath.toLowerCase() ||
        n.absolutePath.toLowerCase() === titleOrPath.toLowerCase()
    );

    if (cached) {
      targetPath = cached.absolutePath;
    } else if (config.vaultPath) {
      targetPath = `${config.vaultPath.replace(/[/\\]+$/, '')}/${cleanTitle}.md`;
    } else {
      targetPath = titleOrPath;
    }

    const rawContent = await readFileContent(targetPath);
    if (!rawContent || rawContent.startsWith('// Berkas:')) {
      throw new Error(`Catatan Obsidian tidak ditemukan atau kosong: "${titleOrPath}"`);
    }

    let extractedContent = rawContent;
    let sectionFound = false;

    // Jika meminta section / heading tertentu
    if (section && section.trim()) {
      const cleanSection = section.toLowerCase().trim();
      const lines = rawContent.split(/\r?\n/);
      let inSection = false;
      let targetHeadingLevel = 1;
      const sectionLines: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) {
          const match = trimmed.match(/^(#+)\s*(.*)$/);
          if (match) {
            const level = match[1].length;
            const headingTitle = match[2].toLowerCase();

            if (inSection) {
              // Jika bertemu heading setingkat atau lebih tinggi, selesai
              if (level <= targetHeadingLevel) {
                break;
              }
            } else if (headingTitle.includes(cleanSection)) {
              inSection = true;
              targetHeadingLevel = level;
              sectionFound = true;
              sectionLines.push(line);
              continue;
            }
          }
        }

        if (inSection) {
          sectionLines.push(line);
        }
      }

      if (sectionFound && sectionLines.length > 0) {
        extractedContent = sectionLines.join('\n');
      }
    }

    // Pangkas teks sesuai budget token agar hemat
    let finalContent = extractedContent;
    let currentTokens = estimateTokenCount(finalContent);

    if (currentTokens > tokenLimit) {
      const notice = '\n\n[...Konten dipotong demi menghemat token...]';
      const noticeTokens = estimateTokenCount(notice);
      const maxChars = Math.max(100, (tokenLimit - noticeTokens) * 4);
      finalContent = extractedContent.slice(0, maxChars) + notice;
      currentTokens = estimateTokenCount(finalContent);
    }

    return {
      title: cleanTitle,
      content: finalContent,
      sectionFound,
      tokenEstimate: currentTokens,
      filePath: targetPath,
    };
  }

  /**
   * Menulis catatan baru ke dalam Obsidian Vault
   */
  public async writeNote(
    title: string,
    content: string,
    subfolder = 'MultiAgent'
  ): Promise<{ success: boolean; filePath: string; message: string }> {
    const config = ObsidianStore.loadConfig();
    if (!config.vaultPath || !config.vaultPath.trim()) {
      throw new Error('Obsidian Vault belum dihubungkan. Silakan tentukan lokasi Vault di Pengaturan.');
    }

    const cleanTitle = title.replace(/\.md$/i, '').trim();
    const cleanSubfolder = subfolder.replace(/^[/\\]+|[/\\]+$/g, '');
    const fileName = `${cleanTitle}.md`;
    const targetPath = `${config.vaultPath.replace(/[/\\]+$/, '')}/${cleanSubfolder}/${fileName}`;

    // Format catatan dengan header timestamp otomatis jika belum ada frontmatter
    let fullContent = content;
    if (!content.startsWith('---')) {
      const now = new Date().toISOString();
      fullContent = `---
created: ${now}
tags:
  - multi-agent
  - ai-generated
---

# ${cleanTitle}

${content}
`;
    }

    const ok = await saveFileContent(targetPath, fullContent);
    if (!ok) {
      throw new Error(`Gagal menulis berkas ke "${targetPath}".`);
    }

    // Perbarui metadata di cache
    const existingIndex = (config.notesCache || []).findIndex(
      (n) => n.absolutePath.toLowerCase() === targetPath.toLowerCase()
    );

    const newMeta: ObsidianNoteMeta = {
      title: cleanTitle,
      relativePath: `${cleanSubfolder}/${fileName}`,
      absolutePath: targetPath,
      tags: ['multi-agent', 'ai-generated'],
      headings: [cleanTitle],
      lastModified: Date.now(),
      wordCount: fullContent.split(/\s+/).length,
      preview: fullContent.slice(0, 150),
    };

    let updatedCache = [...(config.notesCache || [])];
    if (existingIndex >= 0) {
      updatedCache[existingIndex] = newMeta;
    } else {
      updatedCache.push(newMeta);
    }
    ObsidianStore.updateNotesCache(updatedCache);

    return {
      success: true,
      filePath: targetPath,
      message: `Catatan "${cleanTitle}" berhasil disimpan ke Obsidian di "${cleanSubfolder}/${fileName}".`,
    };
  }
}

export const globalVaultManager = VaultManager.getInstance();
