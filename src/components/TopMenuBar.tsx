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
      className="h-8.5 w-full bg-[#1f1f1f] border-b border-[#2d2d2d] flex items-center px-3 text-xs text-[#969696] select-none z-40 font-sans relative"
    >
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-2.5 mr-3">
        <img src="/logo.png" alt="Multi-Agent Logo" className="w-6 h-6 object-contain drop-shadow-md shrink-0" />
        <span
          onClick={() => onOpenAbout?.()}
          className="font-semibold text-[#cccccc] hover:text-white cursor-pointer transition-colors"
        >
          Multi-Agent Desktop
        </span>
      </div>

      {/* Menus */}
      <div className="flex items-center space-x-1">
        {/* FILE MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('file')}
            onMouseEnter={() => handleMenuHover('file')}
            className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-xs ${
              activeMenu === 'file'
                ? 'bg-[#094771] text-white'
                : 'hover:text-white hover:bg-[#2a2d2e] text-[#cccccc]'
            }`}
          >
            File
          </button>

          {activeMenu === 'file' && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-[#252526] border border-[#454545] rounded shadow-2xl py-1 text-xs text-[#cccccc] z-50">
              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('new-file'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} className="text-[#858585]" />
                  <span>New File</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl+N</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('new-text-file'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} className="text-[#858585]" />
                  <span>New Text File</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('new-window'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Maximize2 size={14} className="text-[#858585]" />
                  <span>New Window</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl+Shift+N</span>
              </button>

              <div className="h-[1px] bg-[#3c3c3c] my-1" />

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('open-file'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} className="text-[#858585]" />
                  <span>Open File...</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl+O</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('open-folder'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen size={14} className="text-[#858585]" />
                  <span>Open Folder...</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl+K Ctrl+O</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('open-workspace'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen size={14} className="text-[#858585]" />
                  <span>Open Workspace from File</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('open-recent'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen size={14} className="text-[#858585]" />
                  <span>Open Recent</span>
                </span>
                <ChevronRight size={13} className="text-[#666666]" />
              </button>

              <div className="h-[1px] bg-[#3c3c3c] my-1" />

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('save'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Save size={14} className="text-[#858585]" />
                  <span>Save</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl+S</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onFileAction?.('save-as'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Save size={14} className="text-[#858585]" />
                  <span>Save As...</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl+Shift+S</span>
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
            className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-xs ${
              activeMenu === 'edit'
                ? 'bg-[#094771] text-white'
                : 'hover:text-white hover:bg-[#2a2d2e] text-[#cccccc]'
            }`}
          >
            Edit
          </button>

          {activeMenu === 'edit' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-[#252526] border border-[#454545] rounded shadow-2xl py-1 text-xs text-[#cccccc] z-50">
              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('undo'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Undo2 size={14} className="text-[#858585]" />
                  <span>Undo</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl+Z</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('redo'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Redo2 size={14} className="text-[#858585]" />
                  <span>Redo</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl+Y</span>
              </button>

              <div className="h-[1px] bg-[#3c3c3c] my-1" />

              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('cut'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Scissors size={14} className="text-[#858585]" />
                  <span>Cut</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl+X</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('copy'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Copy size={14} className="text-[#858585]" />
                  <span>Copy</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl+C</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('paste'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Clipboard size={14} className="text-[#858585]" />
                  <span>Paste</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl+V</span>
              </button>

              <div className="h-[1px] bg-[#3c3c3c] my-1" />

              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('find'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Search size={14} className="text-[#858585]" />
                  <span>Find</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl+F</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onEditAction?.('replace'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Replace size={14} className="text-[#858585]" />
                  <span>Replace</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl+H</span>
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
            className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-xs ${
              activeMenu === 'view'
                ? 'bg-[#094771] text-white'
                : 'hover:text-white hover:bg-[#2a2d2e] text-[#cccccc]'
            }`}
          >
            View
          </button>

          {activeMenu === 'view' && (
            <div className="absolute left-0 top-full mt-1 w-60 bg-[#252526] border border-[#454545] rounded shadow-2xl py-1 text-xs text-[#cccccc] z-50">
              <button
                type="button"
                onClick={() => executeAction(() => onZoomChange?.('in'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ZoomIn size={14} className="text-[#858585]" />
                  <span>Zoom In</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl +</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onZoomChange?.('out'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ZoomOut size={14} className="text-[#858585]" />
                  <span>Zoom Out</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl -</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onZoomChange?.('reset'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw size={14} className="text-[#858585]" />
                  <span>Reset Zoom ({zoomPercent}%)</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl 0</span>
              </button>

              <div className="h-[1px] bg-[#3c3c3c] my-1" />

              <button
                type="button"
                onClick={() => executeAction(onToggleTerminal)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Terminal size={14} className="text-[#858585]" />
                  <span>Toggle Terminal</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">Ctrl + `</span>
              </button>
            </div>
          )}
        </div>

        {/* TERMINAL DIRECT BUTTON */}
        <button
          type="button"
          onClick={onToggleTerminal}
          className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-xs ${
            isTerminalOpen
              ? 'bg-[#37373d] text-white font-medium'
              : 'hover:text-white hover:bg-[#2a2d2e] text-[#cccccc]'
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
            className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-xs ${
              activeMenu === 'help'
                ? 'bg-[#094771] text-white'
                : 'hover:text-white hover:bg-[#2a2d2e] text-[#cccccc]'
            }`}
          >
            Help
          </button>

          {activeMenu === 'help' && (
            <div className="absolute left-0 top-full mt-1 w-72 bg-[#252526] border border-[#454545] rounded shadow-2xl py-1 text-xs text-[#cccccc] z-50">
              <button
                type="button"
                onClick={() => executeAction(() => onOpenHelp?.('overview'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle size={14} className="text-[#3794ff]" />
                  <span>Pusat Bantuan & Dokumentasi</span>
                </span>
                <span className="text-[11px] text-[#777777] font-mono">F1</span>
              </button>

              <div className="h-[1px] bg-[#3c3c3c] my-1" />

              <button
                type="button"
                onClick={() => executeAction(() => onOpenHelp?.('create-agent'))}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <Bot size={14} className="text-[#4ec9b0]" />
                <span>Panduan: Cara Membuat Agent</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onOpenHelp?.('plan-mode'))}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <Layers size={14} className="text-[#ce9178]" />
                <span>Panduan: Plan Mode</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onOpenHelp?.('build-mode'))}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <CheckCircle2 size={14} className="text-[#22c55e]" />
                <span>Panduan: Build Mode & Task Graph</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onOpenHelp?.('terminal'))}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <ShieldCheck size={14} className="text-[#eab308]" />
                <span>Panduan: Terminal & Izin Eksekusi</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(() => onOpenHelp?.('shortcuts'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Keyboard size={14} className="text-[#9cdcfe]" />
                  <span>Daftar Shortcut Keyboard</span>
                </span>
              </button>

              <div className="h-[1px] bg-[#3c3c3c] my-1" />

              <button
                type="button"
                onClick={() => executeAction(onOpenShortcutSetup)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <Rocket size={14} className="text-[#3794ff]" />
                <span>Pengaturan Shortcut Desktop & Start Menu...</span>
              </button>

              <button
                type="button"
                onClick={() => executeAction(onOpenAbout)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                <Info size={14} className="text-[#858585]" />
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
          className="bg-[#2d2d2d] hover:bg-[#383838] px-12 py-0.5 rounded text-[11px] text-[#cccccc] border border-[#3c3c3c] cursor-pointer flex items-center gap-1.5 transition-colors"
          title="Klik untuk membuka dokumentasi dan bantuan"
        >
          <svg className="w-3 h-3 text-[#858585]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Multi-Agent Workspace — Tekan F1 untuk Panduan</span>
        </div>
      </div>
    </div>
  );
};
