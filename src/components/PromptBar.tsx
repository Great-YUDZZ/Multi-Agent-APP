import React, { useState, useRef } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import { Plus, Mic, ArrowRight, Paperclip, X, FileCode, BookOpen } from 'lucide-react';
import type { Agent, DiscussionModeType, AttachedFile, ObsidianNoteMeta } from '../types';
import { ObsidianStore } from '../storage/ObsidianStore';
import { Tooltip } from './Tooltip';

interface PromptBarProps {
  onSendMessage: (text: string, mentionedAgentId?: string, attachments?: AttachedFile[]) => void;
  onOpenAgentSelector: () => void;
  activeAgents: Agent[];
  currentMode: 'plan' | 'build' | 'free-chat';
  onToggleMode: (mode: 'plan' | 'build') => void;
  discussionStrategy?: DiscussionModeType;
  onToggleDiscussionStrategy?: (strategy: DiscussionModeType) => void;
  disabled?: boolean;
}

export const PromptBar: React.FC<PromptBarProps> = ({
  onSendMessage,
  onOpenAgentSelector,
  activeAgents,
  currentMode,
  onToggleMode,
  discussionStrategy = 'round-robin',
  onToggleDiscussionStrategy,
  disabled,
}) => {
  const [text, setText] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showObsidianMenu, setShowObsidianMenu] = useState(false);
  const [obsidianFilter, setObsidianFilter] = useState('');
  const [cachedNotes, setCachedNotes] = useState<ObsidianNoteMeta[]>([]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');

      if (isImg) {
        reader.onload = () => {
          const base64 = reader.result as string;
          const newAtt: AttachedFile = {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            fileName: file.name,
            mimeType: file.type || 'image/png',
            sizeBytes: file.size,
            content: { type: 'image', base64 },
          };
          setAttachments((prev) => [...prev, newAtt]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const textContent = reader.result as string;
          const newAtt: AttachedFile = {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            fileName: file.name,
            mimeType: file.type || 'text/plain',
            sizeBytes: file.size,
            content: { type: 'text', text: textContent },
          };
          setAttachments((prev) => [...prev, newAtt]);
        };
        reader.readAsText(file);
      }
    });

    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleTextChange = (val: string) => {
    setText(val);

    // Deteksi @ mention
    const atIndex = val.lastIndexOf('@');
    if (atIndex !== -1 && atIndex === val.length - 1) {
      setShowMentionMenu(true);
      setShowObsidianMenu(false);
      setMentionFilter('');
    } else if (atIndex !== -1 && showMentionMenu) {
      const query = val.slice(atIndex + 1);
      if (query.includes(' ')) {
        setShowMentionMenu(false);
      } else {
        setMentionFilter(query.toLowerCase());
      }
    } else {
      setShowMentionMenu(false);
    }

    // Deteksi [[ Obsidian wikilink
    const wikiIndex = val.lastIndexOf('[[');
    if (wikiIndex !== -1 && !val.slice(wikiIndex).includes(']]')) {
      const config = ObsidianStore.loadConfig();
      setCachedNotes(config.notesCache || []);
      setShowObsidianMenu(true);
      setShowMentionMenu(false);
      const query = val.slice(wikiIndex + 2);
      setObsidianFilter(query.toLowerCase());
    } else {
      setShowObsidianMenu(false);
    }
  };

  const handleSelectMention = (agent: Agent) => {
    const atIndex = text.lastIndexOf('@');
    const beforeAt = text.slice(0, atIndex);
    setText(`${beforeAt}@${agent.name} `);
    setShowMentionMenu(false);
  };

  const handleSelectObsidianNote = (note: ObsidianNoteMeta) => {
    const wikiIndex = text.lastIndexOf('[[');
    if (wikiIndex !== -1) {
      const beforeWiki = text.slice(0, wikiIndex);
      setText(`${beforeWiki}[[${note.title}]] `);
    } else {
      setText((prev) => `${prev} [[${note.title}]] `);
    }
    setShowObsidianMenu(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setShowMentionMenu(false);
      setShowObsidianMenu(false);
    }
    if (e.key === 'Enter' && !e.shiftKey && !showMentionMenu && !showObsidianMenu) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || disabled) return;
    const trimmed = text.trim();

    // Check shortcuts /plan, /build, /roundrobin, /hierarchical
    if (trimmed === '/plan') {
      onToggleMode('plan');
      setText('');
      return;
    }
    if (trimmed === '/build') {
      onToggleMode('build');
      setText('');
      return;
    }
    if (trimmed === '/roundrobin' && onToggleDiscussionStrategy) {
      onToggleDiscussionStrategy('round-robin');
      setText('');
      return;
    }
    if (trimmed === '/hierarchical' && onToggleDiscussionStrategy) {
      onToggleDiscussionStrategy('hierarchical');
      setText('');
      return;
    }

    // Detect if an agent was mentioned
    const mentionedAgent = activeAgents.find((a) =>
      trimmed.toLowerCase().includes(`@${a.name.toLowerCase()}`) ||
      trimmed.toLowerCase().includes(`@agent ${a.initial.toLowerCase()}`)
    );

    onSendMessage(trimmed, mentionedAgent?.id, attachments.length > 0 ? attachments : undefined);
    setText('');
    setAttachments([]);
    setShowMentionMenu(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-3 select-none relative font-sans">
      {/* Mention Popup Menu (VS Code QuickPick style) */}
      {showMentionMenu && (
        <div className="absolute bottom-full mb-2 left-4 w-64 bg-[#252526] border border-[#3c3c3c] rounded shadow-2xl p-1 z-30">
          <div className="text-[10px] font-bold text-[#858585] uppercase px-2 py-1 tracking-wider">
            Mention Agent
          </div>
          <div className="space-y-0.5">
            {activeAgents
              .filter((a) =>
                a.name.toLowerCase().includes(mentionFilter) ||
                a.role.toLowerCase().includes(mentionFilter)
              )
              .map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => handleSelectMention(agent)}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-[#2a2d2e] cursor-pointer transition-colors"
                >
                  <div
                    className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#cccccc] truncate">
                      {agent.name}
                    </div>
                    <div className="text-[10px] text-[#858585] truncate">
                      {agent.role}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Obsidian Note Mention Popup Menu */}
      {showObsidianMenu && (
        <div className="absolute bottom-full mb-2 left-4 w-72 bg-[#252526] border border-[#3c3c3c] rounded-2xl shadow-2xl p-2 z-30 max-h-60 overflow-y-auto">
          <div className="text-[10px] font-bold text-[#858585] uppercase px-2 py-1 tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-[#9cdcfe]" /> Catatan Obsidian
            </span>
            <span className="text-[9px] text-[#666]">Pilih untuk [[mention]]</span>
          </div>
          <div className="space-y-0.5">
            {cachedNotes.length === 0 ? (
              <div className="p-2 text-xs text-[#858585] text-center">
                Belum ada catatan terindeks. Hubungkan Vault di Pengaturan.
              </div>
            ) : (
              cachedNotes
                .filter(
                  (n) =>
                    n.title.toLowerCase().includes(obsidianFilter) ||
                    n.relativePath.toLowerCase().includes(obsidianFilter)
                )
                .slice(0, 10)
                .map((note) => (
                  <div
                    key={note.absolutePath}
                    onClick={() => handleSelectObsidianNote(note)}
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-[#2a2d2e] cursor-pointer transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#4ec9b0] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-[#cccccc] truncate">
                        [[{note.title}]]
                      </div>
                      <div className="text-[10px] text-[#858585] truncate font-mono">
                        {note.relativePath}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Outer Prompt Container (VS Code Chat/Input panel) */}
      <div className="bg-[#252526] border border-[#333333] focus-within:border-[#007fd4] rounded-2xl p-3 shadow-lg transition-colors">
        {/* Hidden File Input for Attachments */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          className="hidden"
        />

        {/* Attachment preview chips */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-xs text-[#cccccc] shadow-sm"
              >
                {att.content.type === 'image' ? (
                  <img
                    src={att.content.base64}
                    alt={att.fileName}
                    className="w-4 h-4 object-cover rounded shrink-0"
                  />
                ) : (
                  <FileCode size={13} className="text-[#4ec9b0] shrink-0" />
                )}
                <span className="truncate max-w-[130px] font-mono text-[11px] text-[#cccccc]">
                  {att.fileName}
                </span>
                <span className="text-[10px] text-[#777777]">
                  ({Math.round(att.sizeBytes / 1024) || 1} KB)
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="hover:text-red-400 text-[#858585] ml-0.5 p-0.5 rounded cursor-pointer transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, @ to mention, / for actions"
          rows={2}
          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] rounded p-2 outline-none text-xs text-[#cccccc] placeholder-[#858585] font-sans leading-relaxed resize-none"
        />

        {/* Action Row */}
        <div className="flex items-center justify-between pt-2 mt-1">
          {/* Left Actions: + Agents, Agent Badges, Mode Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* + Agents Button */}
            <button
              onClick={onOpenAgentSelector}
              className="flex items-center gap-1 px-2 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded text-xs transition-colors border border-[#3c3c3c]"
            >
              <Plus size={12} />
              <span>Agents</span>
            </button>

            {/* Active Agent Chips */}
            <div className="flex items-center -space-x-1 overflow-hidden">
              {activeAgents.map((agent) => (
                <Tooltip key={agent.id} content={`${agent.name} (${agent.role})`} position="top">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white border border-[#252526] shadow cursor-pointer hover:scale-105 transition-transform"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.initial}
                  </div>
                </Tooltip>
              ))}
            </div>

            {/* Mode Switch: Plan / Build (Smooth Pill Segmented Control) */}
            <div className="flex items-center bg-[#1e1e1e] border border-[#333333] p-0.5 rounded-full text-xs ml-2">
              <button
                onClick={() => onToggleMode('plan')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  currentMode === 'plan'
                    ? 'bg-[#0e639c] text-white shadow-sm'
                    : 'text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                Plan
              </button>
              <button
                onClick={() => onToggleMode('build')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  currentMode === 'build'
                    ? 'bg-[#0e639c] text-white shadow-sm'
                    : 'text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                Build
              </button>
            </div>

            {/* Strategy Switch (Round-Robin vs Hierarchical) when in Plan mode */}
            {currentMode === 'plan' && onToggleDiscussionStrategy && (
              <div className="flex items-center bg-[#1e1e1e] border border-[#333333] p-0.5 rounded-full text-xs ml-1.5">
                <Tooltip content="Strategi Round-Robin" position="top">
                  <button
                    onClick={() => onToggleDiscussionStrategy('round-robin')}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] transition-all cursor-pointer ${
                      discussionStrategy === 'round-robin'
                        ? 'bg-[#1e3a2f] text-[#4ec9b0] font-semibold shadow-xs'
                        : 'text-[#858585] hover:text-[#cccccc]'
                    }`}
                  >
                    Round-Robin
                  </button>
                </Tooltip>
                <Tooltip content="Strategi Hierarchical" position="top">
                  <button
                    onClick={() => onToggleDiscussionStrategy('hierarchical')}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] transition-all cursor-pointer ${
                      discussionStrategy === 'hierarchical'
                        ? 'bg-[#2a4365] text-[#90cdf4] font-semibold shadow-xs'
                        : 'text-[#858585] hover:text-[#cccccc]'
                    }`}
                  >
                    Hierarchical
                  </button>
                </Tooltip>
              </div>
            )}
          </div>

          {/* Right Actions: Paperclip, Mic & Send Button */}
          <div className="flex items-center gap-1.5">
            <Tooltip content="Catatan Obsidian" position="top">
              <button
                type="button"
                onClick={() => {
                  const config = ObsidianStore.loadConfig();
                  setCachedNotes(config.notesCache || []);
                  setShowObsidianMenu((prev) => !prev);
                }}
                className="p-1.5 text-[#858585] hover:text-[#4ec9b0] hover:bg-[#2a2d2e] rounded-lg transition-colors cursor-pointer"
              >
                <BookOpen size={14} />
              </button>
            </Tooltip>

            <Tooltip content="Lampirkan Berkas" position="top">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] rounded-lg transition-colors cursor-pointer"
              >
                <Paperclip size={14} />
              </button>
            </Tooltip>

            <Tooltip content="Input Suara" position="top">
              <button
                className="p-1.5 text-[#858585] hover:text-white hover:bg-[#2a2d2e] rounded-lg transition-colors cursor-pointer"
              >
                <Mic size={14} />
              </button>
            </Tooltip>

            <button
              onClick={handleSend}
              disabled={(!text.trim() && attachments.length === 0) || disabled}
              className="w-8 h-8 rounded-full bg-[#0e639c] hover:bg-[#1177bb] active:scale-95 disabled:bg-[#333333] disabled:text-[#666666] text-white flex items-center justify-center transition-all shadow-md cursor-pointer shrink-0"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
