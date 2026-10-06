import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, ShieldCheck, FileCode, Bot } from 'lucide-react';
import type { SessionMessage, Agent, PlanDocument } from '../types';

interface ChatFeedProps {
  messages: SessionMessage[];
  currentMode: 'plan' | 'build' | 'free-chat';
  typingAgent?: Agent | null;
  userDisplayName: string;
  planDocument?: PlanDocument;
  onSwitchToBuild?: () => void;
}

export const ChatFeed: React.FC<ChatFeedProps> = ({
  messages,
  currentMode,
  typingAgent,
  userDisplayName,
  planDocument,
  onSwitchToBuild,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingAgent, planDocument]);

  // Syntax highlighting for inline code with modern obsidian styling
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="px-2 py-0.5 mx-0.5 bg-[#141724] border border-cyan-500/20 text-cyan-300 rounded-lg font-mono text-[11px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0c0d14] text-[#cbd5e1] font-sans">
      {/* Centered Mode Header */}
      <div className="h-9 flex items-center justify-between px-4 bg-[#10121d] border-b border-white/[0.06] select-none text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
          <span className="font-semibold text-white tracking-wide">
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
            <div className="w-12 h-12 rounded-2xl bg-[#141724] border border-white/10 flex items-center justify-center text-cyan-400 shadow-md">
              <Bot size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                Ruang Diskusi Multi-Agent Siap
              </h3>
              <p className="text-xs text-[#94a3b8] max-w-sm">
                Ketik instruksi arsitektur atau sebut agen spesifik dengan <span className="font-mono text-cyan-300">@NamaAgent</span> untuk memulai kolaborasi.
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
                {/* Agent Avatar */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5 shadow-md"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.initial}
                </div>

                {/* Message Body */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold tracking-wide" style={{ color: agent.color }}>
                      {agent.agentName}
                    </span>
                    <span className="text-[11px] text-[#64748b]">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="bg-[#141724]/90 border border-white/[0.08] rounded-2xl p-4 text-xs text-[#cbd5e1] leading-relaxed shadow-md font-sans">
                    {renderMessageContent(msg.content)}
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
                className="flex flex-col items-end space-y-1.5 ml-auto max-w-2xl"
              >
                <div className="flex items-center gap-2 text-xs text-[#64748b] mr-1">
                  <span className="font-semibold text-[#cbd5e1]">Kamu ({userDisplayName})</span>
                  <div className="w-6 h-6 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md">
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-950/80 to-blue-950/80 border border-indigo-500/30 rounded-2xl p-4 text-xs text-white leading-relaxed shadow-lg space-y-2">
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-1.5 border-b border-white/10">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 bg-black/30 border border-white/10 px-2.5 py-1.5 rounded-xl text-xs"
                        >
                          {att.content.type === 'image' ? (
                            <img
                              src={att.content.base64}
                              alt={att.fileName}
                              className="w-16 h-16 object-cover rounded-lg border border-white/10"
                            />
                          ) : (
                            <>
                              <FileCode size={13} className="text-[#38bdf8]" />
                              <div className="text-[11px] font-mono leading-tight">
                                <div>{att.fileName}</div>
                                <div className="text-[9px] text-[#93c5fd]">
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
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5 shadow-md animate-pulse"
              style={{ backgroundColor: typingAgent.color }}
            >
              {typingAgent.initial}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold" style={{ color: typingAgent.color }}>
                  {typingAgent.name}
                </span>
                <span className="text-[10px] text-[#64748b] italic">sedang berpikir...</span>
              </div>
              <div className="bg-[#141724]/90 border border-white/[0.08] rounded-2xl p-4 space-y-2 shadow-md">
                <div className="flex items-center space-x-1.5 pb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-white/10 rounded-full w-3/4 animate-pulse" />
                  <div className="h-2 bg-white/10 rounded-full w-1/2 animate-pulse" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Generated PlanDocument Consensus Card */}
        {planDocument && currentMode === 'plan' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.99, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-[#141724]/95 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-3.5 max-w-3xl my-4 backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-cyan-400" />
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    PlanDocument Disepakati (Konsensus Moderator)
                  </h3>
                  <p className="text-[11px] text-cyan-300">{planDocument.goal}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full font-bold">
                FINISHED
              </span>
            </div>

            {/* Task Breakdown */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
                Task Dependency Graph:
              </div>
              {planDocument.tasks.map((task, idx) => (
                <div
                  key={task.id}
                  className="bg-[#0c0d14]/80 border border-white/10 rounded-xl p-3 text-xs space-y-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      #{idx + 1}. {task.description}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-full font-medium">
                      Assignee: {task.assignedAgentId}
                    </span>
                  </div>
                  {task.rationale && (
                    <div className="text-[#94a3b8] text-[11px] italic">
                      Rationale: {task.rationale}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px] pt-0.5">
                    <CheckCircle2 size={12} />
                    <span>Deviasi Check: {task.successCriteria}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Switch to Build */}
            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={onSwitchToBuild}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-98 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <span>Setujui & Beralih ke Build Mode</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
