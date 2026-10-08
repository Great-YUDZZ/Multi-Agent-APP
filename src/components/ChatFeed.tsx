import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, ShieldCheck, FileCode, Bot, KeyRound, AlertCircle, BookOpen } from 'lucide-react';
import type { SessionMessage, Agent, PlanDocument } from '../types';

interface ChatFeedProps {
  messages: SessionMessage[];
  currentMode: 'plan' | 'build' | 'free-chat';
  typingAgent?: Agent | null;
  userDisplayName: string;
  planDocument?: PlanDocument;
  availableAgents?: Agent[];
  onSwitchToBuild?: () => void;
  onOpenSettings?: () => void;
}

export const ChatFeed: React.FC<ChatFeedProps> = ({
  messages,
  currentMode,
  typingAgent,
  userDisplayName,
  planDocument,
  availableAgents,
  onSwitchToBuild,
  onOpenSettings,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingAgent, planDocument]);

  // Syntax highlighting for inline code in VS Code style
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 mx-0.5 bg-[#1e1e1e] border border-[#383838] text-[#9cdcfe] rounded font-mono text-[12px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1e1e1e] text-[#cccccc] font-sans">
      {/* Centered Mode Header (VS Code Editor Tab/Header style) */}
      <div className="h-9 flex items-center justify-between px-4 bg-[#252526] border-b border-[#2d2d2d] select-none text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#4ec9b0]" />
          <span className="font-semibold text-[#ffffff]">
            {currentMode === 'plan' ? 'Plan Mode — Architecture Discussion' : 'Build Mode — Execution Graph'}
          </span>
        </div>
      </div>

      {/* Messages Scroll Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-5 max-w-4xl w-full mx-auto"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#252526] border border-[#333333] flex items-center justify-center text-[#4ec9b0] shadow-md">
              <Bot size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                Ruang Diskusi Multi-Agent Siap
              </h3>
              <p className="text-xs text-[#858585] max-w-sm">
                Ketik instruksi arsitektur atau sebut agen spesifik dengan <span className="font-mono text-[#9cdcfe]">@NamaAgent</span> untuk memulai kolaborasi.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.speaker.type === 'agent') {
            const agent = msg.speaker;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-start gap-3 max-w-3xl"
              >
                {/* Agent Avatar (VS Code initial badge) */}
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5 shadow-sm"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.initial}
                </div>

                {/* Message Body */}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold" style={{ color: agent.color }}>
                      {agent.agentName}
                    </span>
                    <span className="text-[11px] text-[#858585]">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="bg-[#252526] border border-[#333333] rounded-2xl p-3.5 text-xs text-[#cccccc] leading-relaxed shadow-sm font-sans space-y-2">
                    {msg.obsidianAction && (
                      <div className="flex items-center gap-2 px-2.5 py-1 bg-[#1a2333] border border-[#2b3a55] rounded-lg text-[11px] text-[#9cdcfe]">
                        <BookOpen className="w-3.5 h-3.5 text-[#4ec9b0] shrink-0" />
                        <span>
                          {msg.obsidianAction.action === 'read'
                            ? 'Membaca Obsidian:'
                            : msg.obsidianAction.action === 'write'
                            ? 'Menulis Catatan Obsidian:'
                            : 'Mencari di Obsidian:'}{' '}
                          <code className="text-[#ce9178] font-mono">[[{msg.obsidianAction.target}]]</code>
                          <span className="text-[#858585] ml-1.5 text-[10px]">({msg.obsidianAction.resultSummary})</span>
                        </span>
                      </div>
                    )}
                    <div>{renderMessageContent(msg.content)}</div>
                  </div>
                </div>
              </motion.div>
            );
          }

          if (msg.speaker.type === 'user') {
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-end space-y-1 ml-auto max-w-2xl"
              >
                <div className="flex items-center gap-2 text-xs text-[#858585] mr-1">
                  <span className="font-semibold text-[#cccccc]">Kamu ({userDisplayName})</span>
                  <div className="w-5 h-5 rounded-lg bg-[#0e639c] text-white flex items-center justify-center text-[10px] font-bold">
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="bg-[#264f78] border border-[#38587d] rounded-2xl p-3.5 text-xs text-[#ffffff] leading-relaxed shadow-sm space-y-2">
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-1.5 border-b border-[#38587d]/60">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-1.5 bg-[#1b3b5e] border border-[#446b95] px-2 py-1 rounded text-xs"
                        >
                          {att.content.type === 'image' ? (
                            <img
                              src={att.content.base64}
                              alt={att.fileName}
                              className="w-16 h-16 object-cover rounded border border-[#446b95]"
                            />
                          ) : (
                            <>
                              <FileCode size={13} className="text-[#4ec9b0]" />
                              <div className="text-[11px] font-mono leading-tight">
                                <div>{att.fileName}</div>
                                <div className="text-[9px] text-[#90cdf4]">
                                  {Math.round(att.sizeBytes / 1024) || 1} KB
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.content && renderMessageContent(msg.content)}
                </div>
              </motion.div>
            );
          }

          if (msg.speaker.type === 'system') {
            const isApiKeyMissing = msg.speaker.event === 'api-key-missing';
            const isApiKeyError = msg.speaker.event === 'api-key-error';

            if (isApiKeyMissing || isApiKeyError) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="w-full max-w-2xl mx-auto my-2"
                >
                  <div
                    className={`rounded-xl border p-4 shadow-lg ${
                      isApiKeyMissing
                        ? 'bg-[#252526] border-[#cca700]/50 text-[#d4d4d4]'
                        : 'bg-[#252526] border-[#f14c4c]/60 text-[#d4d4d4]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isApiKeyMissing
                            ? 'bg-[#cca700]/20 text-[#cca700]'
                            : 'bg-[#f14c4c]/20 text-[#f14c4c]'
                        }`}
                      >
                        {isApiKeyMissing ? <KeyRound size={16} /> : <AlertCircle size={16} />}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              isApiKeyMissing ? 'text-[#cca700]' : 'text-[#f14c4c]'
                            }`}
                          >
                            {isApiKeyMissing ? 'Konfigurasi API Key Diperlukan' : 'Kesalahan Pada API Key'}
                          </span>
                          <span className="text-[10px] text-[#858585] font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-xs leading-relaxed text-[#cccccc]">
                          {msg.content}
                        </p>

                        {onOpenSettings && (
                          <div className="pt-2">
                            <button
                              onClick={onOpenSettings}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium text-white transition-all shadow-sm ${
                                isApiKeyMissing
                                  ? 'bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#007acc]'
                                  : 'bg-[#a31515] hover:bg-[#c72e2e] active:bg-[#851010]'
                              }`}
                            >
                              <KeyRound size={13} />
                              <span>
                                {isApiKeyMissing ? 'Buka Pengaturan API Key' : 'Periksa API Key di Pengaturan'}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            }

            return (
              <div key={msg.id} className="w-full text-center my-2">
                <span className="px-3 py-1 rounded-full bg-[#252526] border border-[#333333] text-[11px] text-[#858585]">
                  {msg.content}
                </span>
              </div>
            );
          }

          return null;
        })}

        {/* Loading Skeleton / Typing Indicator for active agent */}
        {typingAgent && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 max-w-md"
          >
            <div
              className="w-7 h-7 rounded flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5 shadow-sm animate-pulse"
              style={{ backgroundColor: typingAgent.color }}
            >
              {typingAgent.initial}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold" style={{ color: typingAgent.color }}>
                  {typingAgent.name}
                </span>
                <span className="text-[10px] text-[#858585] italic">sedang berpikir...</span>
              </div>
              <div className="bg-[#252526] border border-[#333333] rounded-2xl p-3.5 space-y-2 shadow-sm">
                <div className="flex items-center space-x-1.5 pb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ec9b0] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ec9b0] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ec9b0] animate-bounce" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-[#333333] rounded-full w-3/4 animate-pulse" />
                  <div className="h-2 bg-[#333333] rounded-full w-1/2 animate-pulse" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Generated PlanDocument Consensus Card (VS Code Diagnostic Panel Style) */}
        {planDocument && currentMode === 'plan' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.99, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-[#252526] border-2 border-[#4ec9b0]/80 rounded-2xl p-4.5 shadow-xl space-y-3.5 max-w-3xl my-4"
          >
            <div className="flex items-center justify-between border-b border-[#333333] pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#4ec9b0]" />
                <div>
                  <h3 className="text-xs font-bold text-[#ffffff] uppercase tracking-wider">
                    USULAN RENCANA KERJA TIM (DRAFT PROPOSAL)
                  </h3>
                  <p className="text-[11px] text-[#9cdcfe] font-medium">{planDocument.goal}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#1e3a2f] text-[#4ec9b0] border border-[#2d5a47] rounded-full font-bold">
                SIAP DIEKSEKUSI
              </span>
            </div>

            <p className="text-[11px] text-[#cccccc] leading-relaxed bg-[#1b1b1c] p-2.5 rounded-xl border border-[#2d2d2d]">
              💡 Tim telah merumuskan pembagian tugas teknis di bawah ini. Anda dapat menginterupsi atau mengajukan revisi melalui chat, atau klik tombol di bawah untuk menyetujui rencana dan mulai menulis kode nyata di <strong>Build Mode</strong>.
            </p>

            {/* Task Breakdown */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider">
                Pembagian Tugas Tim Spesialis:
              </div>
              {planDocument.tasks.map((task, idx) => {
                const assignedAgent = availableAgents?.find((a) => a.id === task.assignedAgentId);

                return (
                  <div
                    key={task.id}
                    className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-3 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-semibold text-[#ffffff]">
                        #{idx + 1}. {task.description}
                      </span>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-[#37373d] font-semibold"
                        style={{
                          backgroundColor: `${assignedAgent?.color || '#37373d'}20`,
                          color: assignedAgent?.color || '#4ec9b0',
                        }}
                      >
                        Pelaksana: {assignedAgent ? `${assignedAgent.name} (${assignedAgent.role})` : task.assignedAgentId}
                      </span>
                    </div>
                    {task.rationale && (
                      <div className="text-[#858585] text-[11px] italic">
                        Alasan: {task.rationale}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[#4ec9b0] font-medium text-[11px] pt-0.5">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>Kriteria Sukses: {task.successCriteria}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA Switch to Build */}
            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={onSwitchToBuild}
                className="flex items-center gap-2 px-4 py-2 bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#094771] text-white text-xs font-semibold rounded-xl shadow transition-colors cursor-pointer"
              >
                <span>Setujui Rencana & Mulai Build Mode</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
