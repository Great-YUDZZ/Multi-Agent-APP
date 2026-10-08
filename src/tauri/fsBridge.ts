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

// Mock directory structure for browser preview
const MOCK_BROWSER_FS: Record<string, FileEntry[]> = {
  root: [
    { name: '.github', path: '/Multi Agent APP/.github', is_dir: true, size: 0 },
    { name: 'dist', path: '/Multi Agent APP/dist', is_dir: true, size: 0 },
    { name: 'node_modules', path: '/Multi Agent APP/node_modules', is_dir: true, size: 0 },
    { name: 'public', path: '/Multi Agent APP/public', is_dir: true, size: 0 },
    { name: 'release-installers', path: '/Multi Agent APP/release-installers', is_dir: true, size: 0 },
    { name: 'scripts', path: '/Multi Agent APP/scripts', is_dir: true, size: 0 },
    { name: 'src', path: '/Multi Agent APP/src', is_dir: true, size: 0 },
    { name: 'package.json', path: '/Multi Agent APP/package.json', is_dir: false, size: 1240 },
    { name: 'README.md', path: '/Multi Agent APP/README.md', is_dir: false, size: 4500 },
    { name: 'tsconfig.json', path: '/Multi Agent APP/tsconfig.json', is_dir: false, size: 820 },
    { name: 'vite.config.ts', path: '/Multi Agent APP/vite.config.ts', is_dir: false, size: 1040 },
  ],
  '.github': [
    { name: 'workflows', path: '/Multi Agent APP/.github/workflows', is_dir: true, size: 0 },
  ],
  workflows: [
    { name: 'release.yml', path: '/Multi Agent APP/.github/workflows/release.yml', is_dir: false, size: 1530 },
  ],
  dist: [
    { name: 'assets', path: '/Multi Agent APP/dist/assets', is_dir: true, size: 0 },
    { name: 'favicon.ico', path: '/Multi Agent APP/dist/favicon.ico', is_dir: false, size: 4286 },
    { name: 'favicon.png', path: '/Multi Agent APP/dist/favicon.png', is_dir: false, size: 2340 },
    { name: 'favicon.svg', path: '/Multi Agent APP/dist/favicon.svg', is_dir: false, size: 1890 },
    { name: 'icons.svg', path: '/Multi Agent APP/dist/icons.svg', is_dir: false, size: 3450 },
    { name: 'index.html', path: '/Multi Agent APP/dist/index.html', is_dir: false, size: 860 },
    { name: 'logo.png', path: '/Multi Agent APP/dist/logo.png', is_dir: false, size: 12400 },
  ],
  public: [
    { name: 'favicon.ico', path: '/Multi Agent APP/public/favicon.ico', is_dir: false, size: 4286 },
    { name: 'favicon.png', path: '/Multi Agent APP/public/favicon.png', is_dir: false, size: 2340 },
    { name: 'favicon.svg', path: '/Multi Agent APP/public/favicon.svg', is_dir: false, size: 1890 },
    { name: 'icons.svg', path: '/Multi Agent APP/public/icons.svg', is_dir: false, size: 3450 },
    { name: 'logo.png', path: '/Multi Agent APP/public/logo.png', is_dir: false, size: 12400 },
  ],
  src: [
    { name: 'assets', path: '/Multi Agent APP/src/assets', is_dir: true, size: 0 },
    { name: 'components', path: '/Multi Agent APP/src/components', is_dir: true, size: 0 },
    { name: 'App.tsx', path: '/Multi Agent APP/src/App.tsx', is_dir: false, size: 33500 },
    { name: 'index.css', path: '/Multi Agent APP/src/index.css', is_dir: false, size: 12400 },
    { name: 'main.tsx', path: '/Multi Agent APP/src/main.tsx', is_dir: false, size: 1450 },
    { name: 'types.ts', path: '/Multi Agent APP/src/types.ts', is_dir: false, size: 7600 },
  ],
  assets: [
    { name: 'hero.png', path: '/Multi Agent APP/src/assets/hero.png', is_dir: false, size: 45000 },
    { name: 'logo.png', path: '/Multi Agent APP/src/assets/logo.png', is_dir: false, size: 12400 },
    { name: 'react.svg', path: '/Multi Agent APP/src/assets/react.svg', is_dir: false, size: 1200 },
    { name: 'vite.svg', path: '/Multi Agent APP/src/assets/vite.svg', is_dir: false, size: 1400 },
  ],
  components: [
    { name: 'AgentSelectorModal.tsx', path: '/Multi Agent APP/src/components/AgentSelectorModal.tsx', is_dir: false, size: 8400 },
    { name: 'BuildTaskGraphView.tsx', path: '/Multi Agent APP/src/components/BuildTaskGraphView.tsx', is_dir: false, size: 12300 },
    { name: 'ChatFeed.tsx', path: '/Multi Agent APP/src/components/ChatFeed.tsx', is_dir: false, size: 18200 },
    { name: 'CommandApprovalModal.tsx', path: '/Multi Agent APP/src/components/CommandApprovalModal.tsx', is_dir: false, size: 4500 },
    { name: 'CubesLogo.tsx', path: '/Multi Agent APP/src/components/CubesLogo.tsx', is_dir: false, size: 3200 },
    { name: 'DashboardView.tsx', path: '/Multi Agent APP/src/components/DashboardView.tsx', is_dir: false, size: 14600 },
    { name: 'ErrorBoundary.tsx', path: '/Multi Agent APP/src/components/ErrorBoundary.tsx', is_dir: false, size: 2400 },
    { name: 'FileEditorView.tsx', path: '/Multi Agent APP/src/components/FileEditorView.tsx', is_dir: false, size: 9800 },
    { name: 'HelpDocumentationModal.tsx', path: '/Multi Agent APP/src/components/HelpDocumentationModal.tsx', is_dir: false, size: 16000 },
    { name: 'PromptBar.tsx', path: '/Multi Agent APP/src/components/PromptBar.tsx', is_dir: false, size: 9800 },
    { name: 'Sidebar.tsx', path: '/Multi Agent APP/src/components/Sidebar.tsx', is_dir: false, size: 12000 },
    { name: 'TerminalView.tsx', path: '/Multi Agent APP/src/components/TerminalView.tsx', is_dir: false, size: 11400 },
  ],
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

  // Node.js test environment fallback
  if (typeof window === 'undefined') {
    try {
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      const fs: any = await dynamicImport('node:fs');
      const path: any = await dynamicImport('node:path');
      const proc = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process;
      const home = proc?.env?.HOME || '.';
      const expanded = dirPath.startsWith('~/')
        ? path.join(home, dirPath.slice(2))
        : dirPath;
      if (fs.existsSync(expanded)) {
        const entries = fs.readdirSync(expanded, { withFileTypes: true });
        return entries.map((e: any) => ({
          name: e.name,
          path: path.join(expanded, e.name),
          is_dir: e.isDirectory(),
          size: e.isFile() ? fs.statSync(path.join(expanded, e.name)).size : 0,
        }));
      }
    } catch {}
  }
  
  // Browser preview fallback
  const normalized = dirPath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'root';
  if (MOCK_BROWSER_FS[normalized]) {
    return MOCK_BROWSER_FS[normalized];
  }
  if (dirPath.includes('Multi Agent APP') || dirPath === '.') {
    return MOCK_BROWSER_FS.root;
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

  // Node.js test environment fallback
  if (typeof window === 'undefined') {
    try {
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      const fs: any = await dynamicImport('node:fs');
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch {}
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

  // Node.js test environment fallback
  if (typeof window === 'undefined') {
    try {
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      const fs: any = await dynamicImport('node:fs');
      const path: any = await dynamicImport('node:path');
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (e) {
      console.error('Node saveFileContent error:', e);
      return false;
    }
  }

  return true;
}

export async function createDirectory(dirPath: string): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      await invoke('create_directory', { dirPath });
      return true;
    } catch (err) {
      console.error('Tauri create_directory error:', err);
      return false;
    }
  }

  // Node.js test environment fallback
  if (typeof window === 'undefined') {
    try {
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      const fs: any = await dynamicImport('node:fs');
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return true;
    } catch (e) {
      console.error('Node createDirectory error:', e);
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
  return '/media/yudz/FLASHDISK/Multi Agent APP';
}

export async function selectFileDialog(): Promise<string | null> {
  if (isTauriEnvironment()) {
    try {
      const path = await invoke<string | null>('select_file_dialog');
      return path;
    } catch (err) {
      console.warn('select_file_dialog error:', err);
      return null;
    }
  }
  return '/media/yudz/FLASHDISK/Multi Agent APP/README.md';
}

export async function selectSaveFileDialog(defaultName?: string): Promise<string | null> {
  if (isTauriEnvironment()) {
    try {
      const path = await invoke<string | null>('select_save_file_dialog', { defaultName });
      return path;
    } catch (err) {
      console.warn('select_save_file_dialog error:', err);
      return null;
    }
  }
  return `/media/yudz/FLASHDISK/Multi Agent APP/${defaultName || 'untitled.txt'}`;
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

export interface DetectedVault {
  path: string;
  name: string;
  is_open: boolean;
}

export async function detectObsidianVaults(): Promise<DetectedVault[]> {
  if (isTauriEnvironment()) {
    try {
      return await invoke<DetectedVault[]>('detect_obsidian_vaults');
    } catch (err) {
      console.warn('detect_obsidian_vaults error:', err);
      return [];
    }
  }
  return [];
}


