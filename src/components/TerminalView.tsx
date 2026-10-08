import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Trash2,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import {
  executeTerminalCommand,
  cancelTerminalCommand,
  type CommandResult,
} from '../tauri/terminalBridge';
import { isTauriEnvironment, getCurrentWorkingDir } from '../tauri/fsBridge';
import { Tooltip } from './Tooltip';

interface TerminalEntry {
  id: string;
  command: string;
  timestamp: number;
  result?: CommandResult;
  isLoading?: boolean;
}

interface TerminalStreamPayload {
  text: string;
  is_stderr: boolean;
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
  const isAnyLoading = entries.some((e) => e.isLoading);

  // Load real current working directory on mount
  useEffect(() => {
    getCurrentWorkingDir().then((dir) => {
      if (dir && dir !== '.') {
        setCwd(dir);
      }
    });
  }, []);

  // Listen to live stdout / stderr stream from Tauri backend
  useEffect(() => {
    if (!isNative) return;

    let unlistenFn: (() => void) | null = null;
    listen<TerminalStreamPayload>('terminal_stream', (event) => {
      setEntries((prev) => {
        if (prev.length === 0) return prev;
        const lastIndex = prev.length - 1;
        const last = prev[lastIndex];
        if (!last.isLoading) return prev;

        const currentStdout = last.result?.stdout || '';
        const currentStderr = last.result?.stderr || '';

        const updatedResult: CommandResult = {
          stdout: event.payload.is_stderr ? currentStdout : currentStdout + event.payload.text,
          stderr: event.payload.is_stderr ? currentStderr + event.payload.text : currentStderr,
          exit_code: last.result?.exit_code ?? 0,
          duration_ms: last.result?.duration_ms ?? 0,
          new_cwd: last.result?.new_cwd,
        };

        return [
          ...prev.slice(0, lastIndex),
          { ...last, result: updatedResult },
        ];
      });
    }).then((unlisten) => {
      unlistenFn = unlisten;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [isNative]);

  // Auto-scroll when new command or stream chunk appears
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

  const handleCancelCommand = async () => {
    await cancelTerminalCommand();
    setEntries((prev) => {
      if (prev.length === 0) return prev;
      const lastIndex = prev.length - 1;
      const last = prev[lastIndex];
      if (!last.isLoading) return prev;

      const currentStdout = (last.result?.stdout || '') + '^C\n';
      return [
        ...prev.slice(0, lastIndex),
        {
          ...last,
          isLoading: false,
          result: {
            stdout: currentStdout,
            stderr: last.result?.stderr || '',
            exit_code: 130,
            duration_ms: Date.now() - last.timestamp,
            new_cwd: last.result?.new_cwd,
          },
        },
      ];
    });
  };

  // Keyboard shortcut Ctrl+C to cancel running process without any helper text
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if ((e.key === 'c' || e.key === 'C') && e.ctrlKey) {
        const selection = window.getSelection()?.toString();
        if (!selection && isAnyLoading) {
          e.preventDefault();
          handleCancelCommand();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, isAnyLoading]);

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
      result: {
        stdout: '',
        stderr: '',
        exit_code: 0,
        duration_ms: 0,
      },
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
          item.id === entryId
            ? {
                ...item,
                isLoading: false,
                result: {
                  ...res,
                  stdout: res.stdout || item.result?.stdout || '',
                  stderr: res.stderr || item.result?.stderr || '',
                },
              }
            : item
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
                  stdout: item.result?.stdout || '',
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
    if ((e.key === 'c' || e.key === 'C') && e.ctrlKey) {
      if (isAnyLoading) {
        e.preventDefault();
        handleCancelCommand();
        return;
      }
    }

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
      <div className="h-9 bg-[#181818] border-b border-[#262626] flex items-center justify-between px-3 select-none font-sans shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-xl font-medium transition-colors cursor-pointer ${
              activeTab === 'terminal'
                ? 'bg-[#0c0c0c] text-white border-t-2 border-[#22c55e]'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <TerminalIcon size={12} className="text-[#22c55e]" />
            <span className="font-mono text-[11px] font-semibold tracking-wide">bash</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                isNative ? 'bg-[#143821] text-[#4ade80]' : 'bg-[#262626] text-[#a3a3a3]'
              }`}
            >
              {isNative ? 'NATIVE' : 'PTY'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('output')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-xl transition-colors cursor-pointer ${
              activeTab === 'output'
                ? 'bg-[#0c0c0c] text-white border-t-2 border-[#38bdf8]'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <span className="font-sans text-[11px]">OUTPUT LOG</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-[#858585]">
          <Tooltip content="Bersihkan Terminal" position="bottom">
            <button
              onClick={() => setEntries([])}
              className="p-1.5 hover:text-white hover:bg-[#262626] rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          </Tooltip>

          {onToggleMaximize && (
            <Tooltip content={isMaximized ? 'Perkecil Panel' : 'Perbesar Panel'} position="bottom">
              <button
                onClick={onToggleMaximize}
                className="p-1.5 hover:text-white hover:bg-[#262626] rounded-lg transition-colors cursor-pointer"
              >
                {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </Tooltip>
          )}

          <Tooltip content="Tutup Terminal" position="bottom">
            <button
              onClick={onClose}
              className="p-1.5 hover:text-white hover:bg-[#262626] rounded-lg transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Terminal Content Body */}
      {activeTab === 'terminal' ? (
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex-1 flex flex-col p-3 overflow-y-auto font-mono text-[12px] leading-relaxed text-[#e5e5e5] bg-[#0c0c0c] cursor-text space-y-1.5 custom-scrollbar"
        >
          {/* Minimal Terminal Host Banner */}
          <div className="text-[#737373] text-[11px] pb-1 select-none">
            Multi-Agent App Terminal [host: {isNative ? 'native-shell' : 'pty-bridge'}]
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

              {/* Live Streaming Output */}
              {entry.result && (
                <div className="pl-1">
                  {entry.result.stdout && (
                    <pre className="whitespace-pre-wrap font-mono text-[#d4d4d4] text-[12px] leading-5">
                      {entry.result.stdout}
                    </pre>
                  )}

                  {entry.result.stderr && (
                    <pre className="whitespace-pre-wrap font-mono text-[#ef4444] text-[12px] leading-5">
                      {entry.result.stderr}
                    </pre>
                  )}
                </div>
              )}
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
