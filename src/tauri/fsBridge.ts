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

// Fallback project files for browser preview mode
const mockWorkspaceFiles: FileEntry[] = [
  { name: 'src', path: 'src', is_dir: true, size: 0 },
  { name: 'App.tsx', path: 'src/App.tsx', is_dir: false, size: 8420 },
  { name: 'main.tsx', path: 'src/main.tsx', is_dir: false, size: 450 },
  { name: 'plan.config.json', path: 'plan.config.json', is_dir: false, size: 1240 },
  { name: 'package.json', path: 'package.json', is_dir: false, size: 980 },
  { name: 'README.md', path: 'README.md', is_dir: false, size: 2150 },
];

export async function listDirectory(dirPath: string = '.'): Promise<FileEntry[]> {
  if (isTauriEnvironment()) {
    try {
      return await invoke<FileEntry[]>('list_directory', { dirPath });
    } catch (err) {
      console.warn('Tauri list_directory fallback:', err);
      return mockWorkspaceFiles;
    }
  }
  return mockWorkspaceFiles;
}

export async function readFileContent(filePath: string): Promise<string> {
  if (isTauriEnvironment()) {
    try {
      return await invoke<string>('read_file_content', { filePath });
    } catch (err) {
      console.warn('Tauri read_file_content fallback:', err);
    }
  }

  if (filePath.endsWith('.json')) {
    return JSON.stringify(
      {
        name: 'multi-agent-project',
        version: '1.0.0',
        activeMode: 'plan',
        agents: ['Researcher', 'Reviewer', 'QA', 'DevOps'],
      },
      null,
      2
    );
  }

  return `// Berkas: ${filePath}\n// Buka di lingkungan Tauri native untuk akses penuh filesystem lokal.`;
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
