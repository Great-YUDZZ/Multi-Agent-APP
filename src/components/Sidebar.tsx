import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Plus,
  History,
  Box,
  Folder,
  FolderOpen,
  FolderX,
  FolderPlus,
  FilePlus,
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
  Check,
  X,
  PanelLeftClose,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { listDirectory, createDirectory, saveFileContent, type FileEntry } from '../tauri/fsBridge';
import { Tooltip } from './Tooltip';

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
  onToggleSidebar?: () => void;
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
  creationState?: { type: 'file' | 'folder'; parentPath: string } | null;
  creationName?: string;
  onChangeCreationName?: (val: string) => void;
  onConfirmCreate?: () => void;
  onCancelCreate?: () => void;
  onStartCreate?: (type: 'file' | 'folder', parentPath: string) => void;
  creationInputRef?: React.RefObject<HTMLInputElement | null>;
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
  creationState,
  creationName = '',
  onChangeCreationName,
  onConfirmCreate,
  onCancelCreate,
  onStartCreate,
  creationInputRef,
}) => {
  const isExpanded = expandedDirs.has(entry.path);
  const isLoading = loadingDirs.has(entry.path);
  const children = dirChildren[entry.path] || [];
  const isSelected = selectedFile?.path === entry.path && activeTab === 'file';
  const isCreatingInside = creationState && creationState.parentPath === entry.path;

  if (entry.is_dir) {
    return (
      <div>
        <div
          onClick={() => onToggleDir(entry.path)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg hover:bg-[#2a2d2e] cursor-pointer transition-colors group select-none text-[#cccccc] hover:text-white"
        >
          <span className="text-[#858585] group-hover:text-white shrink-0">
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
          {getFolderIcon(entry.name, isExpanded)}
          <span className="truncate font-normal">{entry.name}</span>

          {isLoading && (
            <RefreshCw size={10} className="animate-spin text-[#858585] ml-auto shrink-0" />
          )}

          {/* Subfolder Quick Actions on Hover */}
          {!isLoading && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto shrink-0 transition-opacity">
              <Tooltip content="Berkas Baru" position="top">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartCreate && onStartCreate('file', entry.path);
                  }}
                  className="p-0.5 hover:text-white text-[#858585] rounded-md hover:bg-[#383838] transition-colors"
                >
                  <FilePlus size={12} />
                </button>
              </Tooltip>
              <Tooltip content="Folder Baru" position="top">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartCreate && onStartCreate('folder', entry.path);
                  }}
                  className="p-0.5 hover:text-white text-[#858585] rounded-md hover:bg-[#383838] transition-colors"
                >
                  <FolderPlus size={12} />
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="ml-2.5 pl-2 border-l border-[#333333] space-y-0.5 mt-0.5">
            {/* Inline creation input inside this folder */}
            {isCreatingInside && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1e1e1e] border border-[#007acc] rounded-lg text-xs my-0.5">
                {creationState.type === 'file' ? (
                  <FilePlus size={12} className="text-[#4ec9b0] shrink-0" />
                ) : (
                  <FolderPlus size={12} className="text-[#dcb67a] shrink-0" />
                )}
                <input
                  ref={creationInputRef}
                  type="text"
                  value={creationName}
                  onChange={(e) => onChangeCreationName && onChangeCreationName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onConfirmCreate && onConfirmCreate();
                    else if (e.key === 'Escape') onCancelCreate && onCancelCreate();
                  }}
                  placeholder={creationState.type === 'file' ? 'nama-berkas.ext' : 'nama-folder'}
                  className="flex-1 bg-transparent text-white focus:outline-none text-xs"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={onConfirmCreate}
                  className="p-0.5 hover:bg-[#333333] text-[#4ec9b0] rounded"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={onCancelCreate}
                  className="p-0.5 hover:bg-[#333333] text-[#858585] hover:text-white rounded"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {isLoading && children.length === 0 ? (
              <div className="text-[10px] text-[#858585] py-0.5 px-1 italic">Memuat...</div>
            ) : children.length === 0 && !isCreatingInside ? (
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
                  creationState={creationState}
                  creationName={creationName}
                  onChangeCreationName={onChangeCreationName}
                  onConfirmCreate={onConfirmCreate}
                  onCancelCreate={onCancelCreate}
                  onStartCreate={onStartCreate}
                  creationInputRef={creationInputRef}
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
      className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg cursor-pointer transition-colors select-none ${
        isSelected
          ? 'bg-[#094771] text-white font-medium shadow-sm'
          : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
      }`}
    >
      <span className="w-2.5 shrink-0" />
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
  onToggleSidebar,
}) => {
  const [isGearSpinning, setIsGearSpinning] = useState(false);
  const [isRootExpanded, setIsRootExpanded] = useState(true);
  const [rootFiles, setRootFiles] = useState<FileEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [dirChildren, setDirChildren] = useState<Record<string, FileEntry[]>>({});
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set());
  const [isLoadingRoot, setIsLoadingRoot] = useState(false);

  // Inline creation state
  const [creationState, setCreationState] = useState<{ type: 'file' | 'folder'; parentPath: string } | null>(null);
  const [creationName, setCreationName] = useState<string>('');
  const creationInputRef = useRef<HTMLInputElement>(null);

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

  // Listen for external "create workspace file" event from top menu File -> New File
  useEffect(() => {
    const handleCreateEvent = () => {
      if (workspacePath) {
        setCreationState({ type: 'file', parentPath: workspacePath });
        setCreationName('');
        setIsRootExpanded(true);
        setTimeout(() => creationInputRef.current?.focus(), 60);
      }
    };
    window.addEventListener('app:create-workspace-file', handleCreateEvent);
    return () => {
      window.removeEventListener('app:create-workspace-file', handleCreateEvent);
    };
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

  const handleConfirmCreate = async () => {
    if (!creationState || !creationName.trim()) {
      setCreationState(null);
      setCreationName('');
      return;
    }

    const name = creationName.trim();
    const targetPath = `${creationState.parentPath}/${name}`;

    try {
      if (creationState.type === 'file') {
        const ok = await saveFileContent(targetPath, '');
        if (ok) {
          await handleRefresh();
          if (creationState.parentPath !== workspacePath) {
            try {
              const children = await listDirectory(creationState.parentPath);
              setDirChildren((prev) => ({ ...prev, [creationState.parentPath]: children }));
            } catch {}
          }
          if (onSelectFile) {
            onSelectFile({ name, path: targetPath, is_dir: false, size: 0 });
          }
          setActiveTab('file');
        }
      } else {
        const ok = await createDirectory(targetPath);
        if (ok) {
          await handleRefresh();
          if (creationState.parentPath !== workspacePath) {
            try {
              const children = await listDirectory(creationState.parentPath);
              setDirChildren((prev) => ({ ...prev, [creationState.parentPath]: children }));
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error('Failed to create file/folder in workspace:', err);
    } finally {
      setCreationState(null);
      setCreationName('');
    }
  };

  const handleCancelCreate = () => {
    setCreationState(null);
    setCreationName('');
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
        {/* + New Session Button & Collapse Sidebar Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onNewSession}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0e639c] hover:bg-[#1177bb] active:scale-[0.98] text-white rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>New Session</span>
          </button>
          {onToggleSidebar && (
            <Tooltip content="Tutup Sidebar (Ctrl+B)" position="bottom">
              <button
                onClick={onToggleSidebar}
                className="p-2 text-[#858585] hover:text-white hover:bg-[#2a2d2e] rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <PanelLeftClose size={15} />
              </button>
            </Tooltip>
          )}
        </div>

        {/* View Selection: Navigation Items */}
        <div className="space-y-1 shrink-0">
          <div className="text-[11px] font-bold text-[#bbbbbb] tracking-wider uppercase px-2 py-1">
            VIEWS
          </div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#37373d] text-white font-medium shadow-sm'
                : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
            }`}
          >
            <LayoutDashboard size={14} className="text-[#4ec9b0]" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-[#37373d] text-white font-medium shadow-sm'
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
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#37373d] text-white font-medium shadow-sm'
                : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
            }`}
          >
            <History size={14} className="text-[#858585]" />
            <span>Session History</span>
          </button>

          <button
            onClick={() => setActiveTab('artifact')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'artifact'
                ? 'bg-[#37373d] text-white font-medium shadow-sm'
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
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                isTerminalOpen
                  ? 'bg-[#37373d] text-white font-medium shadow-sm'
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
        </div>

        {/* Projects Tree Section (VS Code Explorer Aesthetic with File/Folder Actions) */}
        <div className="pt-2 border-t border-[#2d2d2d] flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between text-[11px] text-[#bbbbbb] font-bold tracking-wider px-2 py-1 shrink-0 uppercase">
            <span className="truncate">EXPLORER</span>
            <div className="flex items-center gap-0.5">
              {workspacePath && (
                <>
                  <Tooltip content="Berkas Baru" position="bottom">
                    <button
                      onClick={() => {
                        setCreationState({ type: 'file', parentPath: workspacePath });
                        setCreationName('');
                        setIsRootExpanded(true);
                        setTimeout(() => creationInputRef.current?.focus(), 60);
                      }}
                      className="hover:text-white text-[#858585] p-1.5 rounded-lg hover:bg-[#2a2d2e] transition-colors cursor-pointer"
                    >
                      <FilePlus size={13} />
                    </button>
                  </Tooltip>
                  <Tooltip content="Folder Baru" position="bottom">
                    <button
                      onClick={() => {
                        setCreationState({ type: 'folder', parentPath: workspacePath });
                        setCreationName('');
                        setIsRootExpanded(true);
                        setTimeout(() => creationInputRef.current?.focus(), 60);
                      }}
                      className="hover:text-white text-[#858585] p-1.5 rounded-lg hover:bg-[#2a2d2e] transition-colors cursor-pointer"
                    >
                      <FolderPlus size={13} />
                    </button>
                  </Tooltip>
                </>
              )}
              {onOpenFolder && (
                <Tooltip content="Buka Folder" position="bottom">
                  <button
                    onClick={onOpenFolder}
                    className="hover:text-white text-[#858585] p-1.5 rounded-lg hover:bg-[#2a2d2e] transition-colors cursor-pointer"
                  >
                    <FolderOpen size={13} />
                  </button>
                </Tooltip>
              )}
              {workspacePath && (
                <Tooltip content="Muat Ulang" position="bottom">
                  <button
                    onClick={handleRefresh}
                    className="hover:text-white text-[#858585] p-1.5 rounded-lg hover:bg-[#2a2d2e] transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} className={isLoadingRoot ? 'animate-spin' : ''} />
                  </button>
                </Tooltip>
              )}
              {workspacePath && onCloseFolder && (
                <Tooltip content="Tutup Folder" position="bottom">
                  <button
                    onClick={onCloseFolder}
                    className="hover:text-[#f48771] text-[#858585] p-1.5 rounded-lg hover:bg-[#2a2d2e] transition-colors cursor-pointer"
                  >
                    <FolderX size={13} />
                  </button>
                </Tooltip>
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
                  Buka folder perangkat untuk mulai mengelola dan mengedit berkas kode.
                </div>
                {onOpenFolder && (
                  <button
                    onClick={onOpenFolder}
                    className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0e639c] hover:bg-[#1177bb] active:scale-[0.98] text-white rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
                  >
                    <FolderOpen size={13} />
                    <span>Buka Folder Perangkat</span>
                  </button>
                )}
              </div>
            ) : rootFiles.length === 0 && !isLoadingRoot && !creationState ? (
              <div className="py-8 px-3 text-center space-y-2">
                <Folder size={24} className="mx-auto text-[#555555]" />
                <div className="text-[11px] font-medium text-[#cccccc]">Folder Kosong</div>
                <div className="text-[10px] text-[#858585]">
                  Gunakan tombol + di atas untuk membuat berkas atau folder baru.
                </div>
              </div>
            ) : (
              <div>
                {/* Root Workspace Folder Node */}
                <button
                  onClick={() => setIsRootExpanded(!isRootExpanded)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-[#ffffff] hover:bg-[#2a2d2e] rounded-lg cursor-pointer transition-colors group select-none text-left"
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
                    {/* Inline creation at workspace root */}
                    {creationState && creationState.parentPath === workspacePath && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1e1e1e] border border-[#007acc] rounded-lg text-xs my-0.5">
                        {creationState.type === 'file' ? (
                          <FilePlus size={12} className="text-[#4ec9b0] shrink-0" />
                        ) : (
                          <FolderPlus size={12} className="text-[#dcb67a] shrink-0" />
                        )}
                        <input
                          ref={creationInputRef}
                          type="text"
                          value={creationName}
                          onChange={(e) => setCreationName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmCreate();
                            else if (e.key === 'Escape') handleCancelCreate();
                          }}
                          placeholder={creationState.type === 'file' ? 'nama-berkas.ext' : 'nama-folder'}
                          className="flex-1 bg-transparent text-white focus:outline-none text-xs"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleConfirmCreate}
                          className="p-0.5 hover:bg-[#333333] text-[#4ec9b0] rounded"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelCreate}
                          className="p-0.5 hover:bg-[#333333] text-[#858585] hover:text-white rounded"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}

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
                        creationState={creationState}
                        creationName={creationName}
                        onChangeCreationName={setCreationName}
                        onConfirmCreate={handleConfirmCreate}
                        onCancelCreate={handleCancelCreate}
                        onStartCreate={(type, parentPath) => {
                          setCreationState({ type, parentPath });
                          setCreationName('');
                          setExpandedDirs((prev) => new Set(prev).add(parentPath));
                          setTimeout(() => creationInputRef.current?.focus(), 60);
                        }}
                        creationInputRef={creationInputRef}
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
          className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] rounded-xl transition-colors group cursor-pointer"
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
