import React, { useState, useEffect } from 'react';
import { FileCode, Save, Check, FileText, Folder, RefreshCw } from 'lucide-react';
import { readFileContent, saveFileContent, type FileEntry } from '../tauri/fsBridge';

interface FileEditorViewProps {
  selectedFile: FileEntry | null;
  onClose?: () => void;
}

export const FileEditorView: React.FC<FileEditorViewProps> = ({ selectedFile, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedFile) return;

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
  }, [selectedFile]);

  const handleSave = async () => {
    if (!selectedFile) return;
    const ok = await saveFileContent(selectedFile.path, content);
    if (ok) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  if (!selectedFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#858585]">
        <Folder size={36} className="text-[#3c3c3c] mb-2" />
        <div className="text-xs font-semibold text-[#cccccc]">Tidak ada berkas yang dipilih</div>
        <div className="text-[11px] max-w-xs mt-1">
          Pilih salah satu berkas di panel <strong>EXPLORER: PROJECTS</strong> di sidebar kiri untuk membuka editor.
        </div>
      </div>
    );
  }

  const lines = content.split('\n');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] overflow-hidden select-text font-mono text-xs">
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
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#007acc] text-white rounded text-xs transition-colors shadow-sm"
          >
            <Save size={12} />
            <span>Simpan</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#333333] text-[#858585] hover:text-white rounded transition-colors"
              title="Tutup Berkas"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Editor Body */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-[#858585] gap-2">
          <RefreshCw size={14} className="animate-spin" />
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
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 p-3 bg-transparent text-[#d4d4d4] focus:outline-none resize-none font-mono text-xs leading-5 whitespace-pre overflow-auto border-none"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
};
