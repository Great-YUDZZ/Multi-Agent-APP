import React, { useState, useEffect, useRef } from 'react';
import type { HelpTabType } from './HelpDocumentationModal';
import {
  FileText,
  FolderOpen,
  Save,
  Copy,
  Scissors,
  Clipboard,
  Undo2,
  Redo2,
  Search,
  Replace,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Terminal,
  HelpCircle,
  Bot,
  Layers,
  CheckCircle2,
  ShieldCheck,
  Keyboard,
  Rocket,
  Info,
  Maximize2,
  ChevronRight,
} from 'lucide-react';
import { CubesLogo } from './CubesLogo';

interface TopMenuBarProps {
  onToggleTerminal?: () => void;
  isTerminalOpen?: boolean;
  onFileAction?: (action: 'new-file' | 'new-text-file' | 'new-window' | 'open-file' | 'open-folder' | 'open-recent' | 'open-workspace' | 'save' | 'save-as') => void;
  onEditAction?: (action: 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'find' | 'replace') => void;
  onZoomChange?: (type: 'in' | 'out' | 'reset') => void;
  zoomPercent?: number;
  onOpenHelp?: (tab?: HelpTabType) => void;
  onOpenShortcutSetup?: () => void;
  onOpenAbout?: () => void;
}

type MenuKey = 'file' | 'edit' | 'view' | 'help' | null;

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  onToggleTerminal,
  isTerminalOpen = false,
  onFileAction,
  onEditAction,
  onZoomChange,
  zoomPercent = 100,
  onOpenHelp,
  onOpenShortcutSetup,
  onOpenAbout,
}) => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMenuClick = (menu: MenuKey) => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  const handleMenuHover = (menu: MenuKey) => {
    if (activeMenu !== null) {
      setActiveMenu(menu);
    }
  };

  const executeAction = (cb?: () => void) => {
    setActiveMenu(null);
    if (cb) cb();
  };

  return (
    <div
      ref={menuBarRef}
      className="h-9 w-full bg-[#0c0e15] border-b border-white/[0.08] flex items-center px-3 text-xs text-[#94a3b8] select-none z-40 font-sans relative"
    >
      {/* Brand Logo & Name */}
      <div
        onClick={() => onOpenAbout?.()}
        className="flex items-center gap-2 mr-3 px-1.5 py-1 rounded-lg hover:bg-white/[0.05] cursor-pointer transition-colors"
      >
        <CubesLogo size={20} withGlow={true} />
        <span className="font-semibold text-white tracking-wide text-xs">
          Multi-Agent Desktop
        </span>
      </div>

      {/* Menus */}
      <div className="flex items-center space-x-0.5">
        {/* FILE MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('file')}
            onMouseEnter={() => handleMenuHover('file')}
            className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors text-xs font-medium ${
              activeMenu === 'file'
                ? 'bg-indigo-600/30 text-white border border-indigo-500/30'
                : 'hover:text-white hover:bg-white/[0.06] text-[#cbd5e1]'
            }`}
          >
            File
          </button>

          {activeMenu === 'file' && (
            <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#141724]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1.5 text-xs text-[#cbd5e1] z-50">
              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('new-file'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} className="text-[#818cf8]" />
                  <span>New File</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl+N</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('new-text-file'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} className="text-[#818cf8]" />
                  <span>New Text File</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('new-window'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Maximize2 size={14} className="text-[#818cf8]" />
                  <span>New Window</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl+Shift+N</span>
              </button>

              <div className="h-[1px] bg-white/[0.08] my-1 mx-2" />

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('open-file'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} className="text-[#38bdf8]" />
                  <span>Open File...</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl+O</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('open-folder'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen size={14} className="text-[#38bdf8]" />
                  <span>Open Folder...</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl+K Ctrl+O</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('open-workspace'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen size={14} className="text-[#38bdf8]" />
                  <span>Open Workspace from File</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('open-recent'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen size={14} className="text-[#38bdf8]" />
                  <span>Open Recent</span>
                </span>
                <ChevronRight size={13} className="text-[#64748b]" />
              </button>

              <div className="h-[1px] bg-white/[0.08] my-1 mx-2" />

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('save'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Save size={14} className="text-[#34d399]" />
                  <span>Save</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl+S</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('save-as'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Save size={14} className="text-[#34d399]" />
                  <span>Save As...</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl+Shift+S</span>
              </button>
            </div>
          )}
        </div>

        {/* EDIT MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('edit')}
            onMouseEnter={() => handleMenuHover('edit')}
            className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors text-xs font-medium ${
              activeMenu === 'edit'
                ? 'bg-indigo-600/30 text-white border border-indigo-500/30'
                : 'hover:text-white hover:bg-white/[0.06] text-[#cbd5e1]'
            }`}
          >
            Edit
          </button>

          {activeMenu === 'edit' && (
            <div className="absolute left-0 top-full mt-1.5 w-56 bg-[#141724]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1.5 text-xs text-[#cbd5e1] z-50">
              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('undo'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Undo2 size={14} className="text-[#94a3b8]" />
                  <span>Undo</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl+Z</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('redo'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Redo2 size={14} className="text-[#94a3b8]" />
                  <span>Redo</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl+Y</span>
              </button>

              <div className="h-[1px] bg-white/[0.08] my-1 mx-2" />

              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('cut'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Scissors size={14} className="text-[#94a3b8]" />
                  <span>Cut</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl+X</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('copy'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Copy size={14} className="text-[#94a3b8]" />
                  <span>Copy</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl+C</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('paste'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Clipboard size={14} className="text-[#94a3b8]" />
                  <span>Paste</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl+V</span>
              </button>

              <div className="h-[1px] bg-white/[0.08] my-1 mx-2" />

              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('find'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Search size={14} className="text-[#94a3b8]" />
                  <span>Find</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl+F</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('replace'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Replace size={14} className="text-[#94a3b8]" />
                  <span>Replace</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl+H</span>
              </button>
            </div>
          )}
        </div>

        {/* VIEW MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('view')}
            onMouseEnter={() => handleMenuHover('view')}
            className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors text-xs font-medium ${
              activeMenu === 'view'
                ? 'bg-indigo-600/30 text-white border border-indigo-500/30'
                : 'hover:text-white hover:bg-white/[0.06] text-[#cbd5e1]'
            }`}
          >
            View
          </button>

          {activeMenu === 'view' && (
            <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#141724]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1.5 text-xs text-[#cbd5e1] z-50">
              <button
                type="button"
                onClick={() => executeAction(() => onZoomChange?.('in'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ZoomIn size={14} className="text-[#38bdf8]" />
                  <span>Zoom In</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl +</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onZoomChange?.('out'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ZoomOut size={14} className="text-[#38bdf8]" />
                  <span>Zoom Out</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl -</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onZoomChange?.('reset'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw size={14} className="text-[#38bdf8]" />
                  <span>Reset Zoom ({zoomPercent}%)</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl 0</span>
              </button>

              <div className="h-[1px] bg-white/[0.08] my-1 mx-2" />

              <button
                type="button"
                onClick={() => executeAction(onToggleTerminal)}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Terminal size={14} className="text-[#34d399]" />
                  <span>Toggle Terminal</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">Ctrl + `</span>
              </button>
            </div>
          )}
        </div>

        {/* TERMINAL DIRECT BUTTON */}
        <button
          type="button"
          onClick={onToggleTerminal}
          className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors text-xs font-medium ${
            isTerminalOpen
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'hover:text-white hover:bg-white/[0.06] text-[#cbd5e1]'
          }`}
        >
          Terminal
        </button>

        {/* HELP MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('help')}
            onMouseEnter={() => handleMenuHover('help')}
            className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors text-xs font-medium ${
              activeMenu === 'help'
                ? 'bg-indigo-600/30 text-white border border-indigo-500/30'
                : 'hover:text-white hover:bg-white/[0.06] text-[#cbd5e1]'
            }`}
          >
            Help
          </button>

          {activeMenu === 'help' && (
            <div className="absolute left-0 top-full mt-1.5 w-72 bg-[#141724]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1.5 text-xs text-[#cbd5e1] z-50">
              <button
                type="button"
                onClick={() => executeAction(() => onOpenHelp?.('overview'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle size={14} className="text-[#38bdf8]" />
                  <span>Pusat Bantuan & Dokumentasi</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-mono">F1</span>
              </button>

              <div className="h-[1px] bg-white/[0.08] my-1 mx-2" />

              <button
                type="button"
                onClick={() => executeAction(() => onOpenHelp?.('create-agent'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <Bot size={14} className="text-[#34d399]" />
                <span>Panduan: Cara Membuat Agent</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onOpenHelp?.('plan-mode'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <Layers size={14} className="text-[#fb923c]" />
                <span>Panduan: Plan Mode</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onOpenHelp?.('build-mode'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <CheckCircle2 size={14} className="text-[#38bdf8]" />
                <span>Panduan: Build Mode & Task Graph</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onOpenHelp?.('terminal'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <ShieldCheck size={14} className="text-[#facc15]" />
                <span>Panduan: Terminal & Izin Eksekusi</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onOpenHelp?.('shortcuts'))}
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Keyboard size={14} className="text-[#a78bfa]" />
                  <span>Daftar Shortcut Keyboard</span>
                </span>
              </button>

              <div className="h-[1px] bg-white/[0.08] my-1 mx-2" />

              <button
                type="button"
                onClick={() => executeAction(onOpenShortcutSetup)}
                className="w-[calc(100%-8px)] mx-1 flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <Rocket size={14} className="text-[#38bdf8]" />
                <span>Pengaturan Shortcut Desktop & Start Menu...</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(onOpenAbout)}
                className="w-[calc(100%-8px)] mx-1 flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-600/25 hover:text-white rounded-lg transition-colors"
              >
                <Info size={14} className="text-[#94a3b8]" />
                <span>Tentang Multi-Agent Desktop</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center Search / Workspace Indicator */}
      <div className="flex-1 flex justify-center">
        <div
          onClick={() => onOpenHelp?.('overview')}
          className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-5 py-1 rounded-full text-[11px] text-[#94a3b8] hover:text-white cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
          title="Klik untuk membuka dokumentasi dan bantuan"
        >
          <svg className="w-3.5 h-3.5 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Multi-Agent Workspace — Tekan F1 untuk Panduan</span>
        </div>
      </div>
    </div>
  );
};
