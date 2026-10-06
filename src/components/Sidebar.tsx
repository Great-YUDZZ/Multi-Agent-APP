import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Plus,
  History,
  Box,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Terminal as TerminalIcon,
  ArrowUp,
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
}

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
}) => {
  const [projectOpen, setProjectOpen] = useState(true);
  const [isGearSpinning, setIsGearSpinning] = useState(false);
  const [workspaceFiles, setWorkspaceFiles] = useState<FileEntry[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>(workspacePath || '');

  const loadWorkspaceFiles = async (dirToLoad?: string) => {
    setIsLoadingFiles(true);
    const target = dirToLoad !== undefined ? dirToLoad : (currentPath || workspacePath || '.');
    try {
      const files = await listDirectory(target);
      setWorkspaceFiles(files);
      setCurrentPath(target);
    } catch (err) {
      console.error('Failed to list workspace files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (workspacePath) {
      setCurrentPath(workspacePath);
      loadWorkspaceFiles(workspacePath);
    } else {
      loadWorkspaceFiles('.');
    }
  }, [workspacePath]);

  const handleSettingsClick = () => {
    setIsGearSpinning(true);
    setTimeout(() => {
      setIsGearSpinning(false);
      onOpenSettings();
    }, 350);
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.ts') || fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      return <FileCode size={13} className="text-[#519aba] shrink-0" />;
    }
    if (fileName.endsWith('.json')) {
      return <FileCode size={13} className="text-[#cbcb41] shrink-0" />;
    }
    if (fileName.endsWith('.md')) {
      return <FileText size={13} className="text-[#4ec9b0] shrink-0" />;
    }
    if (fileName.endsWith('.rs') || fileName.endsWith('.toml')) {
      return <FileCode size={13} className="text-[#ce9178] shrink-0" />;
    }
    return <File size={13} className="text-[#858585] shrink-0" />;
  };

  const handleFileClick = (file: FileEntry) => {
    if (file.is_dir) {
      loadWorkspaceFiles(file.path);
      return;
    }
    if (onSelectFile) {
      onSelectFile(file);
    }
    setActiveTab('file');
  };

  const handleGoUp = () => {
    if (!currentPath || currentPath === '.' || currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length <= 1) {
      loadWorkspaceFiles('/');
    } else {
      parts.pop();
      loadWorkspaceFiles('/' + parts.join('/'));
    }
  };

  return (
    <aside className="w-60 h-full bg-[#252526] border-r border-[#2d2d2d] flex flex-col justify-between select-none font-sans text-xs">
      {/* Top Section */}
      <div className="p-2 space-y-3 flex-1 flex flex-col overflow-hidden">
        {/* + New Session Button (VS Code Primary Action) */}
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#007acc] text-white rounded text-xs font-normal transition-colors shadow-sm shrink-0"
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
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
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
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
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
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
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
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
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
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors ${
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
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
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
          <div className="flex items-center justify-between text-[11px] text-[#bbbbbb] font-bold tracking-wider px-2 py-1 shrink-0">
            <span className="truncate" title={currentPath || 'Workspace Saat Ini'}>
              {currentPath && currentPath !== '.'
                ? `EXPLORER: ${currentPath.split('/').filter(Boolean).pop() || currentPath}`
                : 'EXPLORER: WORKSPACE'}
            </span>
            <div className="flex items-center gap-1">
              {currentPath && currentPath !== '.' && currentPath !== '/' && (
                <button
                  onClick={handleGoUp}
                  title="Naik ke folder induk"
                  className="hover:text-white text-[#858585] p-0.5 rounded transition-colors"
                >
                  <ArrowUp size={12} />
                </button>
              )}
              {onOpenFolder && (
                <button
                  onClick={onOpenFolder}
                  title="Buka Folder dari Perangkat..."
                  className="hover:text-white text-[#858585] p-0.5 rounded transition-colors"
                >
                  <FolderOpen size={12} />
                </button>
              )}
              <button
                onClick={() => loadWorkspaceFiles()}
                title="Muat Ulang Berkas"
                className="hover:text-white text-[#858585] p-0.5 rounded transition-colors"
              >
                <RefreshCw size={11} className={isLoadingFiles ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 text-xs text-[#cccccc] mt-1 pr-1">
            {workspaceFiles.length === 0 ? (
              <div className="py-8 px-3 text-center space-y-2">
                <Folder size={24} className="mx-auto text-[#555555]" />
                <div className="text-[11px] font-medium text-[#cccccc]">
                  {currentPath ? 'Folder Kosong' : 'Belum Ada Folder Terbuka'}
                </div>
                <div className="text-[10px] text-[#858585] leading-relaxed">
                  Buka folder perangkat untuk melihat dan mengedit berkas kode.
                </div>
                {onOpenFolder && (
                  <button
                    onClick={onOpenFolder}
                    className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#007acc] text-white rounded text-[11px] font-medium transition-colors shadow-sm"
                  >
                    <FolderOpen size={12} />
                    <span>Buka Folder Perangkat</span>
                  </button>
                )}
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setProjectOpen(!projectOpen)}
                  className="w-full flex items-center gap-1 px-1.5 py-1 hover:bg-[#2a2d2e] rounded cursor-pointer transition-colors"
                >
                  {projectOpen ? <ChevronDown size={13} className="text-[#858585]" /> : <ChevronRight size={13} className="text-[#858585]" />}
                  {projectOpen ? <FolderOpen size={14} className="text-[#dcb67a]" /> : <Folder size={14} className="text-[#dcb67a]" />}
                  <span className="truncate font-normal">Workspace Project</span>
                </button>

                {projectOpen && (
                  <div className="ml-3 pl-1.5 border-l border-[#333333] space-y-0.5 mt-0.5">
                    {workspaceFiles.map((file: FileEntry) => (
                      <div
                        key={file.path}
                        onClick={() => handleFileClick(file)}
                        className={`flex items-center gap-1.5 px-1.5 py-1 text-xs rounded cursor-pointer transition-colors ${
                          selectedFile?.path === file.path && activeTab === 'file'
                            ? 'bg-[#094771] text-white font-medium'
                            : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                        }`}
                      >
                        {file.is_dir ? (
                          <Folder size={13} className="text-[#dcb67a] shrink-0" />
                        ) : (
                          getFileIcon(file.name)
                        )}
                        <span className="truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section - Settings (VS Code Status / Activity item) */}
      <div className="p-2 border-t border-[#2d2d2d] shrink-0">
        <button
          onClick={handleSettingsClick}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] rounded transition-colors group"
        >
          <motion.div
            animate={{ rotate: isGearSpinning ? 360 : 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <SettingsIcon size={15} className="text-[#858585] group-hover:text-white transition-colors" />
          </motion.div>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
