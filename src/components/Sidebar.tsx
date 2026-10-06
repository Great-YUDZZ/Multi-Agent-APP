import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Plus,
  History,
  Box,
  Folder,
  FolderOpen,
  FolderX,
  FileCode,
  FileText,
  File,
  FileJson,
  Globe,
  Image,
  Star,
  Sparkles,
  Atom,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Terminal as TerminalIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { listDirectory, type FileEntry } from '../tauri/fsBridge';

interface SidebarProps {
  onNewSession: () => void;
  onOpenSettings: () => void;
  activeTab: 'dashboard' | 'chat' | 'history' | 'artifact' | 'file';
  setActiveTab: (tab: 'dashboard' | 'chat' | 'history' | 'artifact' | 'file') => void;
  selectedFile?: FileEntry | null;
  onSelectFile?: (file: FileEntry) => void;
  onToggleTerminal?: () => void;
  isTerminalOpen?: boolean;
  workspacePath?: string;
  onOpenFolder?: () => void;
  onCloseFolder?: () => void;
}

// Helper to determine specific file icons matching VS Code themes
const getFileIcon = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.tsx') || lower.endsWith('.jsx')) {
    return <Atom size={13} className="text-[#00d8ff] shrink-0" />;
  }
  if (lower.endsWith('.ts')) {
    return <FileCode size={13} className="text-[#519aba] shrink-0" />;
  }
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    return <FileCode size={13} className="text-[#cbcb41] shrink-0" />;
  }
  if (lower.endsWith('.json')) {
    return <FileJson size={13} className="text-[#cbcb41] shrink-0" />;
  }
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return <Globe size={13} className="text-[#e44d26] shrink-0" />;
  }
  if (lower.endsWith('.css') || lower.endsWith('.scss') || lower.endsWith('.sass') || lower.endsWith('.less')) {
    return <FileCode size={13} className="text-[#42a5f5] shrink-0" />;
  }
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.gif')) {
    return <Image size={13} className="text-[#4ec9b0] shrink-0" />;
  }
  if (lower.endsWith('.ico')) {
    return <Star size={13} className="text-[#e5c07b] fill-[#e5c07b] shrink-0" />;
  }
  if (lower.endsWith('.svg')) {
    return <Sparkles size={13} className="text-[#e5a00d] shrink-0" />;
  }
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
    return <FileText size={13} className="text-[#4ec9b0] shrink-0" />;
  }
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) {
    return <FileText size={13} className="text-[#e06c75] shrink-0" />;
  }
  if (lower.endsWith('.rs') || lower.endsWith('.toml')) {
    return <FileCode size={13} className="text-[#ce9178] shrink-0" />;
  }
  if (lower.endsWith('.sh') || lower.endsWith('.bash') || lower.endsWith('.zsh')) {
    return <TerminalIcon size={13} className="text-[#89d185] shrink-0" />;
  }
  return <File size={13} className="text-[#858585] shrink-0" />;
};

// Helper for folder icons with colors matching VS Code themes
const getFolderIcon = (folderName: string, isOpen: boolean) => {
  const lower = folderName.toLowerCase();
  if (lower === '.github') {
    return <Folder size={13} className="text-[#d9777f] shrink-0" />;
  }
  if (lower === 'dist' || lower === 'build') {
    return <Folder size={13} className="text-[#f48771] shrink-0" />;
  }
  if (lower === 'assets') {
    return <Folder size={13} className="text-[#e5c07b] shrink-0" />;
  }
  if (lower === 'node_modules') {
    return <Folder size={13} className="text-[#89d185] shrink-0" />;
  }
  if (lower === 'public') {
    return <Folder size={13} className="text-[#58a6ff] shrink-0" />;
  }
  if (lower === 'src') {
    return <Folder size={13} className="text-[#7ee787] shrink-0" />;
  }
  if (lower === 'components') {
    return <Folder size={13} className="text-[#d7ba7d] shrink-0" />;
  }
  return isOpen ? (
    <FolderOpen size={13} className="text-[#dcb67a] shrink-0" />
  ) : (
    <Folder size={13} className="text-[#dcb67a] shrink-0" />
  );
};

interface FileTreeItemProps {
  entry: FileEntry;
  depth?: number;
  expandedDirs: Set<string>;
  dirChildren: Record<string, FileEntry[]>;
  loadingDirs: Set<string>;
  onToggleDir: (dirPath: string) => void;
  selectedFile?: FileEntry | null;
  onSelectFile?: (file: FileEntry) => void;
  activeTab: string;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  entry,
  depth = 0,
  expandedDirs,
  dirChildren,
  loadingDirs,
  onToggleDir,
  selectedFile,
  onSelectFile,
  activeTab,
}) => {
  const isExpanded = expandedDirs.has(entry.path);
  const isLoading = loadingDirs.has(entry.path);
  const children = dirChildren[entry.path] || [];
  const isSelected = selectedFile?.path === entry.path && activeTab === 'file';

  if (entry.is_dir) {
    return (
      <div>
        <div
          onClick={() => onToggleDir(entry.path)}
          className="flex items-center gap-1.5 px-1.5 py-1 text-xs rounded hover:bg-[#2a2d2e] cursor-pointer transition-colors group select-none text-[#cccccc] hover:text-white"
          title={entry.path}
        >
          <span className="text-[#858585] group-hover:text-white shrink-0">
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
          {getFolderIcon(entry.name, isExpanded)}
          <span className="truncate font-normal">{entry.name}</span>
          {isLoading && (
            <RefreshCw size={10} className="animate-spin text-[#858585] ml-auto shrink-0" />
          )}
        </div>

        {isExpanded && (
          <div className="ml-2.5 pl-2 border-l border-[#333333] space-y-0.5 mt-0.5">
            {isLoading && children.length === 0 ? (
              <div className="text-[10px] text-[#858585] py-0.5 px-1 italic">Memuat...</div>
            ) : children.length === 0 ? (
              <div className="text-[10px] text-[#777777] py-0.5 px-1 italic">Kosong</div>
            ) : (
              children.map((child) => (
                <FileTreeItem
                  key={child.path}
                  entry={child}
                  depth={depth + 1}
                  expandedDirs={expandedDirs}
                  dirChildren={dirChildren}
                  loadingDirs={loadingDirs}
                  onToggleDir={onToggleDir}
                  selectedFile={selectedFile}
                  onSelectFile={onSelectFile}
                  activeTab={activeTab}
                />
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelectFile && onSelectFile(entry)}
      className={`flex items-center gap-1.5 px-1.5 py-1 text-xs rounded cursor-pointer transition-colors select-none ${
        isSelected
          ? 'bg-[#094771] text-white font-medium'
          : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
      }`}
      title={entry.path}
    >
      <span className="w-3 shrink-0" />
      {getFileIcon(entry.name)}
      <span className="truncate">{entry.name}</span>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  onNewSession,
  onOpenSettings,
  activeTab,
  setActiveTab,
  selectedFile,
  onSelectFile,
  onToggleTerminal,
  isTerminalOpen = false,
  workspacePath,
  onOpenFolder,
  onCloseFolder,
}) => {
  const [isGearSpinning, setIsGearSpinning] = useState(false);
  const [isRootExpanded, setIsRootExpanded] = useState(true);
  const [rootFiles, setRootFiles] = useState<FileEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [dirChildren, setDirChildren] = useState<Record<string, FileEntry[]>>({});
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set());
  const [isLoadingRoot, setIsLoadingRoot] = useState(false);

  // Load root files when workspacePath changes
  const loadRootFiles = async (targetPath: string) => {
    setIsLoadingRoot(true);
    try {
      const files = await listDirectory(targetPath);
      setRootFiles(files);
      setIsRootExpanded(true);
    } catch (err) {
      console.error('Failed to list workspace root files:', err);
    } finally {
      setIsLoadingRoot(false);
    }
  };

  useEffect(() => {
    if (workspacePath) {
      loadRootFiles(workspacePath);
    } else {
      setRootFiles([]);
      setExpandedDirs(new Set());
      setDirChildren({});
    }
  }, [workspacePath]);

  // Toggle directory expansion and lazily fetch children if needed
  const toggleDir = async (dirPath: string) => {
    const nextExpanded = new Set(expandedDirs);
    if (nextExpanded.has(dirPath)) {
      nextExpanded.delete(dirPath);
      setExpandedDirs(nextExpanded);
    } else {
      nextExpanded.add(dirPath);
      setExpandedDirs(nextExpanded);

      if (!dirChildren[dirPath]) {
        setLoadingDirs((prev) => new Set(prev).add(dirPath));
        try {
          const children = await listDirectory(dirPath);
          setDirChildren((prev) => ({ ...prev, [dirPath]: children }));
        } catch (err) {
          console.error('Failed to list subdirectory:', dirPath, err);
        } finally {
          setLoadingDirs((prev) => {
            const next = new Set(prev);
            next.delete(dirPath);
            return next;
          });
        }
      }
    }
  };

  // Refresh entire tree
  const handleRefresh = async () => {
    if (!workspacePath) return;
    await loadRootFiles(workspacePath);

    // Refresh already expanded directories
    for (const dirPath of expandedDirs) {
      try {
        const children = await listDirectory(dirPath);
        setDirChildren((prev) => ({ ...prev, [dirPath]: children }));
      } catch (err) {
        console.warn('Failed to refresh expanded directory:', dirPath, err);
      }
    }
  };

  const handleSettingsClick = () => {
    setIsGearSpinning(true);
    setTimeout(() => {
      setIsGearSpinning(false);
      onOpenSettings();
    }, 350);
  };

  const handleFileClick = (file: FileEntry) => {
    if (onSelectFile) {
      onSelectFile(file);
    }
    setActiveTab('file');
  };

  const rootFolderName = workspacePath
    ? workspacePath.split('/').filter(Boolean).pop() || workspacePath
    : '';

  return (
    <aside className="w-60 h-full bg-[#252526] border-r border-[#2d2d2d] flex flex-col justify-between select-none font-sans text-xs">
      {/* Top Section */}
      <div className="p-2 space-y-3 flex-1 flex flex-col overflow-hidden">
        {/* + New Session Button */}
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#007acc] text-white rounded text-xs font-normal transition-colors shadow-sm shrink-0 cursor-pointer"
        >
          <Plus size={14} />
          <span>New Session</span>
        </button>

        {/* View Selection: Navigation Items */}
        <div className="space-y-0.5 shrink-0">
          <div className="text-[11px] font-bold text-[#bbbbbb] tracking-wider uppercase px-2 py-1">
            VIEWS
          </div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#37373d] text-white font-medium'
                : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
            }`}
          >
            <LayoutDashboard size={14} className="text-[#4ec9b0]" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-[#37373d] text-white font-medium'
                : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#007acc] flex items-center justify-center text-[9px] text-white font-bold">
              •
            </div>
            <span>Current Workspace</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#37373d] text-white font-medium'
                : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
            }`}
          >
            <History size={14} className="text-[#858585]" />
            <span>Session History</span>
          </button>

          <button
            onClick={() => setActiveTab('artifact')}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'artifact'
                ? 'bg-[#37373d] text-white font-medium'
                : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
            }`}
          >
            <Box size={14} className="text-[#858585]" />
            <span>Artifacts</span>
          </button>

          {/* Terminal Toggle in Views */}
          {onToggleTerminal && (
            <button
              onClick={onToggleTerminal}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors cursor-pointer ${
                isTerminalOpen
                  ? 'bg-[#37373d] text-white font-medium'
                  : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <TerminalIcon size={14} className="text-[#007acc]" />
                <span>Terminal</span>
              </div>
              <span className="text-[10px] font-mono text-[#858585]">Ctrl+`</span>
            </button>
          )}

          {/* Active File Tab in Views if open */}
          {selectedFile && (
            <button
              onClick={() => setActiveTab('file')}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors cursor-pointer ${
                activeTab === 'file'
                  ? 'bg-[#37373d] text-white font-medium'
                  : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
              }`}
            >
              {getFileIcon(selectedFile.name)}
              <span className="truncate">{selectedFile.name}</span>
            </button>
          )}
        </div>

        {/* Projects Tree Section (VS Code Explorer Aesthetic) */}
        <div className="pt-2 border-t border-[#2d2d2d] flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between text-[11px] text-[#bbbbbb] font-bold tracking-wider px-2 py-1 shrink-0 uppercase">
            <span className="truncate">EXPLORER</span>
            <div className="flex items-center gap-1">
              {onOpenFolder && (
                <button
                  onClick={onOpenFolder}
                  title="Buka Folder dari Perangkat..."
                  className="hover:text-white text-[#858585] p-1 rounded hover:bg-[#2a2d2e] transition-colors cursor-pointer"
                >
                  <FolderOpen size={13} />
                </button>
              )}
              {workspacePath && (
                <button
                  onClick={handleRefresh}
                  title="Muat Ulang Berkas"
                  className="hover:text-white text-[#858585] p-1 rounded hover:bg-[#2a2d2e] transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} className={isLoadingRoot ? 'animate-spin' : ''} />
                </button>
              )}
              {workspacePath && onCloseFolder && (
                <button
                  onClick={onCloseFolder}
                  title="Tutup Folder Workspace"
                  className="hover:text-[#f48771] text-[#858585] p-1 rounded hover:bg-[#2a2d2e] transition-colors cursor-pointer"
                >
                  <FolderX size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 text-xs text-[#cccccc] mt-1 pr-1 custom-scrollbar">
            {!workspacePath ? (
              <div className="py-8 px-3 text-center space-y-2">
                <Folder size={28} className="mx-auto text-[#555555]" />
                <div className="text-[11px] font-medium text-[#cccccc]">
                  Belum Ada Folder Terbuka
                </div>
                <div className="text-[10px] text-[#858585] leading-relaxed">
                  Buka folder perangkat untuk mulai menjelajahi dan mengedit berkas kode.
                </div>
                {onOpenFolder && (
                  <button
                    onClick={onOpenFolder}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#007acc] text-white rounded text-xs font-medium transition-colors shadow-sm cursor-pointer"
                  >
                    <FolderOpen size={13} />
                    <span>Buka Folder Perangkat</span>
                  </button>
                )}
              </div>
            ) : rootFiles.length === 0 && !isLoadingRoot ? (
              <div className="py-8 px-3 text-center space-y-2">
                <Folder size={24} className="mx-auto text-[#555555]" />
                <div className="text-[11px] font-medium text-[#cccccc]">Folder Kosong</div>
                <div className="text-[10px] text-[#858585]">
                  Tidak ada berkas di dalam folder ini.
                </div>
              </div>
            ) : (
              <div>
                {/* Root Workspace Folder Node */}
                <button
                  onClick={() => setIsRootExpanded(!isRootExpanded)}
                  className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-semibold text-[#ffffff] hover:bg-[#2a2d2e] rounded cursor-pointer transition-colors group select-none text-left"
                  title={workspacePath}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[#858585] group-hover:text-white shrink-0">
                      {isRootExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </span>
                    <span className="truncate">{rootFolderName}</span>
                  </div>
                  {isLoadingRoot && (
                    <RefreshCw size={11} className="animate-spin text-[#858585] shrink-0" />
                  )}
                </button>

                {/* Recursive Children Tree */}
                {isRootExpanded && (
                  <div className="ml-1 pl-1.5 border-l border-[#333333] space-y-0.5 mt-0.5">
                    {rootFiles.map((entry: FileEntry) => (
                      <FileTreeItem
                        key={entry.path}
                        entry={entry}
                        depth={0}
                        expandedDirs={expandedDirs}
                        dirChildren={dirChildren}
                        loadingDirs={loadingDirs}
                        onToggleDir={toggleDir}
                        selectedFile={selectedFile}
                        onSelectFile={handleFileClick}
                        activeTab={activeTab}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section - Settings */}
      <div className="p-2 border-t border-[#2d2d2d] shrink-0">
        <button
          onClick={handleSettingsClick}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] rounded transition-colors group cursor-pointer"
        >
          <motion.div
            animate={{ rotate: isGearSpinning ? 360 : 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <SettingsIcon
              size={15}
              className="text-[#858585] group-hover:text-white transition-colors"
            />
          </motion.div>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
