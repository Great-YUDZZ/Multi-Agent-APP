import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Trash2,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { executeTerminalCommand, type CommandResult } from '../tauri/terminalBridge';
import { isTauriEnvironment, getCurrentWorkingDir } from '../tauri/fsBridge';

interface TerminalEntry {
  id: string;
  command: string;
  timestamp: number;
  result?: CommandResult;
  isLoading?: boolean;
}

interface TerminalViewProps {
  isOpen: boolean;
  onClose: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  isOpen,
  onClose,
  isMaximized = false,
  onToggleMaximize,
}) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'output'>('terminal');
  const [inputVal, setInputVal] = useState<string>('');
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [cwd, setCwd] = useState<string>('~');

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isNative = isTauriEnvironment();

  // Load real current working directory on mount
  useEffect(() => {
    getCurrentWorkingDir().then((dir) => {
      if (dir && dir !== '.') {
        setCwd(dir);
      }
    });
  }, []);

  // Auto-scroll when new command or result appears
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleRunCommand = async (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === 'clear') {
      setEntries([]);
      setInputVal('');
      setHistoryIndex(-1);
      return;
    }

    const entryId = `cmd-${Date.now()}`;
    const newEntry: TerminalEntry = {
      id: entryId,
      command: trimmed,
      timestamp: Date.now(),
      isLoading: true,
    };

    setEntries((prev) => [...prev, newEntry]);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInputVal('');

    try {
      const res = await executeTerminalCommand(trimmed, cwd);

      if (res.new_cwd) {
        setCwd(res.new_cwd);
      }

      setEntries((prev) =>
        prev.map((item) =>
          item.id === entryId ? { ...item, result: res, isLoading: false } : item
        )
      );
    } catch (err) {
      setEntries((prev) =>
        prev.map((item) =>
          item.id === entryId
            ? {
                ...item,
                isLoading: false,
                result: {
                  stdout: '',
                  stderr: String(err),
                  exit_code: 1,
                  duration_ms: 0,
                },
              }
            : item
        )
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRunCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInputVal(history[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= history.length) {
        setHistoryIndex(-1);
        setInputVal('');
      } else {
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx] || '');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`border-t border-[#262626] bg-[#0c0c0c] flex flex-col font-mono text-xs select-text shadow-2xl transition-all duration-200 ${
        isMaximized ? 'h-[75vh]' : 'h-64'
      }`}
    >
      {/* Top Header / Tab Bar */}
      <div className="h-8 bg-[#181818] border-b border-[#262626] flex items-center justify-between px-3 select-none font-sans shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-t font-medium transition-colors ${
              activeTab === 'terminal'
                ? 'bg-[#0c0c0c] text-white border-t-2 border-[#22c55e]'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <TerminalIcon size={12} className="text-[#22c55e]" />
            <span className="font-mono text-[11px] font-semibold tracking-wide">bash</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                isNative ? 'bg-[#143821] text-[#4ade80]' : 'bg-[#262626] text-[#a3a3a3]'
              }`}
            >
              {isNative ? 'NATIVE' : 'PTY'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('output')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-t transition-colors ${
              activeTab === 'output'
                ? 'bg-[#0c0c0c] text-white border-t-2 border-[#22c55e]'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <span className="text-[11px]">OUTPUT LOG</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 text-[#858585]">
          <button
            onClick={() => setEntries([])}
            className="p-1 hover:text-white hover:bg-[#262626] rounded transition-colors cursor-pointer"
            title="Clear Terminal (clear)"
          >
            <Trash2 size={12} />
          </button>

          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1 hover:text-white hover:bg-[#262626] rounded transition-colors cursor-pointer"
              title={isMaximized ? 'Restore Panel' : 'Maximize Panel'}
            >
              {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 hover:text-white hover:bg-[#262626] rounded transition-colors cursor-pointer"
            title="Close Terminal"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Terminal Content Body */}
      {activeTab === 'terminal' ? (
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex-1 flex flex-col p-3 overflow-y-auto font-mono text-[12px] leading-relaxed text-[#e5e5e5] bg-[#0c0c0c] cursor-text space-y-1.5"
        >
          {/* Minimal Terminal Host Banner */}
          <div className="text-[#737373] text-[11px] pb-1 select-none">
            Multi-Agent App Terminal [host: {isNative ? 'native-shell' : 'pty-bridge'}]
            <br />
            Type commands and press Enter. 'clear' to clear console.
          </div>

          {/* Command History Entries */}
          {entries.map((entry) => (
            <div key={entry.id} className="space-y-0.5">
              {/* Command Prompt Line */}
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[#22c55e] font-semibold">user@desktop</span>
                <span className="text-[#737373]">:</span>
                <span className="text-[#38bdf8]">{cwd}</span>
                <span className="text-[#e5e5e5] font-bold">$</span>
                <span className="text-[#f5f5f5] font-normal">{entry.command}</span>
              </div>

              {/* Execution State */}
              {entry.isLoading ? (
                <div className="text-[#737373] text-[11px] pl-2 animate-pulse">
                  [running...]
                </div>
              ) : entry.result ? (
                <div className="pl-1">
                  {/* Stdout Output */}
                  {entry.result.stdout && (
                    <pre className="whitespace-pre-wrap font-mono text-[#d4d4d4] text-[12px] leading-5">
                      {entry.result.stdout}
                    </pre>
                  )}

                  {/* Stderr Error Output (Pure Raw Terminal Style) */}
                  {entry.result.stderr && (
                    <pre className="whitespace-pre-wrap font-mono text-[#ef4444] text-[12px] leading-5">
                      {entry.result.stderr}
                    </pre>
                  )}
                </div>
              ) : null}
            </div>
          ))}

          {/* Active Input Line */}
          <div className="flex items-baseline gap-1.5 flex-wrap pt-0.5">
            <span className="text-[#22c55e] font-semibold">user@desktop</span>
            <span className="text-[#737373]">:</span>
            <span className="text-[#38bdf8]">{cwd}</span>
            <span className="text-[#e5e5e5] font-bold">$</span>
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-[200px] bg-transparent text-[#f5f5f5] focus:outline-none font-mono text-[12px] border-none p-0 caret-[#22c55e]"
              spellCheck={false}
              autoComplete="off"
              autoFocus
            />
          </div>

          <div ref={bottomRef} />
        </div>
      ) : (
        <div className="flex-1 p-3 overflow-y-auto text-[#a3a3a3] text-xs font-mono space-y-1 bg-[#0c0c0c]">
          <div className="text-white font-medium mb-1">[Multi-Agent Workspace Output Log]</div>
          <div>[INFO] Tauri native host shell initialized.</div>
          <div>[INFO] Active Providers loaded from ProviderStore.</div>
          <div>[INFO] Agent Registry ready with active skills.</div>
          <div>[INFO] Session watcher active.</div>
        </div>
      )}
    </div>
  );
};
