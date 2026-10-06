import { invoke } from '@tauri-apps/api/core';

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export async function listDirectory(dirPath: string = '.'): Promise<FileEntry[]> {
  if (isTauriEnvironment()) {
    try {
      return await invoke<FileEntry[]>('list_directory', { dirPath });
    } catch (err) {
      console.warn('Tauri list_directory fallback:', err);
      return [];
    }
  }
  return [];
}

export async function readFileContent(filePath: string): Promise<string> {
  if (isTauriEnvironment()) {
    try {
      return await invoke<string>('read_file_content', { filePath });
    } catch (err) {
      console.warn('Tauri read_file_content fallback:', err);
    }
  }

  return `// Berkas: ${filePath}\n// Tidak ada konten berkas yang tersimpan.`;
}

export async function saveFileContent(filePath: string, content: string): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      await invoke('save_file_content', { filePath, content });
      return true;
    } catch (err) {
      console.error('Tauri save_file_content error:', err);
      return false;
    }
  }
  return true;
}

export async function createSystemShortcuts(desktop: boolean, startMenu: boolean): Promise<{ success: boolean; message: string }> {
  if (isTauriEnvironment()) {
    try {
      const res = await invoke<string>('create_system_shortcuts', {
        desktop,
        startMenu,
      });
      return { success: true, message: res };
    } catch (err: any) {
      return { success: false, message: err?.toString() || 'Gagal membuat shortcut sistem.' };
    }
  }
  return { success: true, message: 'Shortcut dibuat (lingkungan peramban/web preview).' };
}

export async function selectFolderDialog(): Promise<string | null> {
  if (isTauriEnvironment()) {
    try {
      const path = await invoke<string | null>('select_folder_dialog');
      return path;
    } catch (err) {
      console.warn('select_folder_dialog error:', err);
      return null;
    }
  }
  return null;
}

export async function getCurrentWorkingDir(): Promise<string> {
  if (isTauriEnvironment()) {
    try {
      return await invoke<string>('get_current_working_dir');
    } catch (err) {
      console.warn('get_current_working_dir error:', err);
    }
  }
  return '.';
}


