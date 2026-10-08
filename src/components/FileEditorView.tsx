import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileCode,
  Save,
  Check,
  FileText,
  Folder,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { readFileContent, saveFileContent, type FileEntry } from '../tauri/fsBridge';
import { Tooltip } from './Tooltip';

interface FileEditorViewProps {
  selectedFile: FileEntry | null;
  onClose?: () => void;
  onFileSaved?: (path: string, content: string) => void;
}

export const FileEditorView: React.FC<FileEditorViewProps> = ({
  selectedFile,
  onClose,
  onFileSaved,
}) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Find & Replace state
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState<boolean>(false);
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [matchCount, setMatchCount] = useState<{ total: number; current: number }>({
    total: 0,
    current: 0,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Load file content
  useEffect(() => {
    if (!selectedFile) return;

    if (selectedFile.path === 'untitled.txt' && !content) {
      setContent('// Berkas Baru (Untitled)\n// Tulis kode atau catatan Anda di sini...\n');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setIsSaved(false);

    readFileContent(selectedFile.path).then((data) => {
      if (isMounted) {
        setContent(data);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedFile?.path]);

  const handleSave = useCallback(async () => {
    if (!selectedFile) return;
    const ok = await saveFileContent(selectedFile.path, content);
    if (ok) {
      setIsSaved(true);
      if (onFileSaved) onFileSaved(selectedFile.path, content);
      setTimeout(() => setIsSaved(false), 2000);
    }
  }, [selectedFile, content, onFileSaved]);

  // Find & Replace logic
  const updateMatchCount = useCallback(
    (query: string, currentContent: string) => {
      if (!query) {
        setMatchCount({ total: 0, current: 0 });
        return;
      }
      try {
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = currentContent.match(regex);
        const total = matches ? matches.length : 0;
        setMatchCount((prev) => ({
          total,
          current: total > 0 ? (prev.current > 0 && prev.current <= total ? prev.current : 1) : 0,
        }));
      } catch {
        setMatchCount({ total: 0, current: 0 });
      }
    },
    []
  );

  useEffect(() => {
    updateMatchCount(findText, content);
  }, [findText, content, updateMatchCount]);

  const jumpToMatch = useCallback(
    (direction: 'next' | 'prev') => {
      if (!findText || !textareaRef.current) return;
      const lowerContent = content.toLowerCase();
      const lowerQuery = findText.toLowerCase();

      if (!lowerContent.includes(lowerQuery)) return;

      const textarea = textareaRef.current;
      const currentPos = direction === 'next' ? textarea.selectionEnd : textarea.selectionStart - 1;

      let nextIndex = -1;
      if (direction === 'next') {
        nextIndex = lowerContent.indexOf(lowerQuery, currentPos);
        if (nextIndex === -1) {
          nextIndex = lowerContent.indexOf(lowerQuery, 0); // wrap around
        }
      } else {
        nextIndex = lowerContent.lastIndexOf(lowerQuery, Math.max(0, currentPos));
        if (nextIndex === -1) {
          nextIndex = lowerContent.lastIndexOf(lowerQuery); // wrap around
        }
      }

      if (nextIndex !== -1) {
        textarea.focus();
        textarea.setSelectionRange(nextIndex, nextIndex + findText.length);
      }
    },
    [findText, content]
  );

  const handleReplaceOne = () => {
    if (!findText || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);

    if (selected.toLowerCase() === findText.toLowerCase()) {
      const newContent = content.slice(0, start) + replaceText + content.slice(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + replaceText.length);
        jumpToMatch('next');
      }, 0);
    } else {
      jumpToMatch('next');
    }
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const newContent = content.replace(regex, replaceText);
    setContent(newContent);
  };

  // Listen for global editor actions dispatched from TopMenuBar or shortcuts
  useEffect(() => {
    const handleEditorAction = (e: Event) => {
      const customEvent = e as CustomEvent<{ action: string }>;
      const action = customEvent.detail?.action;
      if (!action) return;

      switch (action) {
        case 'save':
          handleSave();
          break;
        case 'find':
          setIsFindOpen(true);
          setTimeout(() => findInputRef.current?.focus(), 50);
          break;
        case 'replace':
          setIsFindOpen(true);
          setIsReplaceOpen(true);
          setTimeout(() => findInputRef.current?.focus(), 50);
          break;
        case 'undo':
          document.execCommand('undo');
          break;
        case 'redo':
          document.execCommand('redo');
          break;
        case 'cut':
          if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            if (start !== end) {
              const selected = content.slice(start, end);
              navigator.clipboard?.writeText(selected);
              setContent(content.slice(0, start) + content.slice(end));
            }
          }
          break;
        case 'copy':
          if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            if (start !== end) {
              const selected = content.slice(start, end);
              navigator.clipboard?.writeText(selected);
            }
          }
          break;
        case 'paste':
          navigator.clipboard?.readText().then((clipText) => {
            if (textareaRef.current && clipText) {
              const start = textareaRef.current.selectionStart;
              const end = textareaRef.current.selectionEnd;
              const newContent = content.slice(0, start) + clipText + content.slice(end);
              setContent(newContent);
              setTimeout(() => {
                textareaRef.current?.setSelectionRange(
                  start + clipText.length,
                  start + clipText.length
                );
              }, 0);
            }
          });
          break;
      }
    };

    window.addEventListener('app:editor-action', handleEditorAction);
    return () => {
      window.removeEventListener('app:editor-action', handleEditorAction);
    };
  }, [handleSave, content]);

  // Keyboard shortcut listener within editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setIsFindOpen(true);
      setTimeout(() => findInputRef.current?.focus(), 50);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      setIsFindOpen(true);
      setIsReplaceOpen(true);
      setTimeout(() => findInputRef.current?.focus(), 50);
    }
  };

  if (!selectedFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#858585]">
        <Folder size={36} className="text-[#3c3c3c] mb-2" />
        <div className="text-xs font-semibold text-[#cccccc]">Tidak ada berkas yang dipilih</div>
        <div className="text-[11px] max-w-xs mt-1">
          Pilih salah satu berkas di panel <strong>EXPLORER: PROJECTS</strong> di sidebar kiri untuk membuka editor, atau klik <strong>File &gt; Open File...</strong>.
        </div>
      </div>
    );
  }

  const lines = content.split('\n');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] overflow-hidden select-text font-mono text-xs relative">
      {/* Editor Tab Bar */}
      <div className="h-9 bg-[#252526] border-b border-[#333333] flex items-center justify-between px-3 select-none font-sans">
        <div className="flex items-center gap-2">
          {selectedFile.name.endsWith('.md') ? (
            <FileText size={14} className="text-[#4ec9b0]" />
          ) : (
            <FileCode size={14} className="text-[#519aba]" />
          )}
          <span className="text-xs font-medium text-white">{selectedFile.name}</span>
          <span className="text-[10px] text-[#858585] font-mono">({selectedFile.path})</span>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="flex items-center gap-1 text-[11px] text-[#4ec9b0]">
              <Check size={12} /> Tersimpan
            </span>
          )}

          <Tooltip content="Cari (Ctrl+F)" position="bottom">
            <button
              onClick={() => {
                setIsFindOpen((prev) => !prev);
                if (!isFindOpen) setTimeout(() => findInputRef.current?.focus(), 50);
              }}
              className={`p-1.5 rounded-lg transition-colors text-xs cursor-pointer ${
                isFindOpen
                  ? 'bg-[#094771] text-white'
                  : 'text-[#858585] hover:text-white hover:bg-[#333333]'
              }`}
            >
              <Search size={13} />
            </button>
          </Tooltip>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] active:scale-[0.98] text-white rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            <Save size={12} />
            <span>Simpan</span>
          </button>

          {onClose && (
            <Tooltip content="Tutup Berkas" position="bottom">
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[#333333] text-[#858585] hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Floating Find & Replace Widget (VS Code Style) */}
      <AnimatePresence>
        {isFindOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.12 }}
            className="absolute top-10 right-4 z-30 bg-[#252526] border border-[#454545] rounded-2xl shadow-2xl p-2.5 font-sans text-xs w-80 space-y-2 select-none"
          >
            {/* Find Row */}
            <div className="flex items-center gap-1.5">
              <Tooltip content="Ganti" position="bottom">
                <button
                  onClick={() => setIsReplaceOpen((prev) => !prev)}
                  className="text-[#858585] hover:text-white p-1 rounded-lg hover:bg-[#333333] transition-colors cursor-pointer"
                >
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-150 ${isReplaceOpen ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>
              </Tooltip>

              <div className="flex-1 flex items-center bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl px-2.5 py-1 focus-within:border-[#0e639c]">
                <input
                  ref={findInputRef}
                  type="text"
                  placeholder="Cari..."
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      jumpToMatch(e.shiftKey ? 'prev' : 'next');
                    } else if (e.key === 'Escape') {
                      setIsFindOpen(false);
                      textareaRef.current?.focus();
                    }
                  }}
                  className="w-full bg-transparent text-[#cccccc] focus:outline-none text-xs"
                />
                <span className="text-[10px] text-[#777777] font-mono shrink-0 ml-1">
                  {findText ? (matchCount.total > 0 ? `${matchCount.current}/${matchCount.total}` : '0') : ''}
                </span>
              </div>

              <Tooltip content="Sebelumnya" position="bottom">
                <button
                  onClick={() => jumpToMatch('prev')}
                  className="p-1.5 hover:bg-[#333333] rounded-lg text-[#858585] hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronUp size={13} />
                </button>
              </Tooltip>
              <Tooltip content="Berikutnya" position="bottom">
                <button
                  onClick={() => jumpToMatch('next')}
                  className="p-1.5 hover:bg-[#333333] rounded-lg text-[#858585] hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronDown size={13} />
                </button>
              </Tooltip>
              <Tooltip content="Tutup" position="bottom">
                <button
                  onClick={() => {
                    setIsFindOpen(false);
                    textareaRef.current?.focus();
                  }}
                  className="p-1.5 hover:bg-[#333333] rounded-lg text-[#858585] hover:text-white transition-colors cursor-pointer"
                >
                  <X size={13} />
                </button>
              </Tooltip>
            </div>

            {/* Replace Row */}
            {isReplaceOpen && (
              <div className="flex items-center gap-1.5 pl-6">
                <div className="flex-1 flex items-center bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl px-2.5 py-1 focus-within:border-[#0e639c]">
                  <input
                    type="text"
                    placeholder="Ganti dengan..."
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleReplaceOne();
                      }
                    }}
                    className="w-full bg-transparent text-[#cccccc] focus:outline-none text-xs"
                  />
                </div>

                <button
                  onClick={handleReplaceOne}
                  className="px-2.5 py-1 bg-[#2a2d2e] hover:bg-[#0e639c] text-white rounded-lg text-[11px] transition-colors cursor-pointer"
                >
                  Ganti
                </button>
                <button
                  onClick={handleReplaceAll}
                  className="px-2.5 py-1 bg-[#2a2d2e] hover:bg-[#0e639c] text-white rounded-lg text-[11px] transition-colors cursor-pointer"
                >
                  Semua
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Body */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-[#858585] gap-2 font-sans">
          <RefreshCw size={14} className="animate-spin text-[#4ec9b0]" />
          <span>Memuat berkas...</span>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Line Numbers */}
          <div className="w-12 bg-[#1e1e1e] border-r border-[#2d2d2d] py-3 text-right pr-3 select-none text-[#555555] font-mono text-xs leading-5">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Editable Code Surface */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 p-3 bg-transparent text-[#d4d4d4] focus:outline-none resize-none font-mono text-xs leading-5 whitespace-pre overflow-auto border-none selection:bg-[#264f78]"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
};
