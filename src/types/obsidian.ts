export interface ObsidianVaultConfig {
  vaultPath: string; // Lokasi folder vault, misal '/home/yudz/Documents/Vault'
  enabled: boolean;
  autoDetectPath?: string;
  maxTokensPerSnippet: number; // Default 300 token
  sessionExportFolder: string; // Default 'MultiAgent/Sessions'
  notesCache?: ObsidianNoteMeta[];
  lastIndexedAt?: number;
}

export interface ObsidianNoteMeta {
  title: string;
  relativePath: string;
  absolutePath: string;
  tags: string[];
  headings: string[];
  lastModified: number;
  wordCount: number;
  preview?: string;
}

export interface ObsidianToolCall {
  action: 'search' | 'read' | 'write';
  query?: string;
  title?: string;
  section?: string;
  content?: string;
  folder?: string;
}

export interface ObsidianToolResult {
  action: 'search' | 'read' | 'write';
  success: boolean;
  message: string;
  data?: any;
  formattedOutput: string;
}
