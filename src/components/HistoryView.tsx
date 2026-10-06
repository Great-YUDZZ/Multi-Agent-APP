import React, { useState } from 'react';
import { Search, Trash2, ArrowRight, MessageSquare, Clock } from 'lucide-react';
import type { Session, Agent } from '../types';

interface HistoryViewProps {
  sessions: Session[];
  currentSessionId: string;
  availableAgents: Agent[];
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  currentSessionId,
  availableAgents,
  onSelectSession,
  onDeleteSession,
}) => {
  const [search, setSearch] = useState('');

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] font-sans select-none overflow-hidden">
      {/* Header with Search */}
      <div className="h-12 flex items-center justify-between px-6 bg-[#252526] border-b border-[#2d2d2d]">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#4ec9b0]" />
          <h2 className="text-xs font-bold text-[#ffffff] uppercase tracking-wider">
            Session History ({sessions.length})
          </h2>
        </div>

        <div className="relative w-64">
          <Search size={13} className="absolute left-2.5 top-2 text-[#858585]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari sesi..."
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#4ec9b0] rounded py-1 pl-8 pr-3 text-xs text-[#cccccc] placeholder-[#858585] outline-none"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#858585] text-xs bg-[#252526] border border-[#333333] rounded space-y-2">
            <MessageSquare size={32} className="mx-auto text-[#3c3c3c]" />
            <div className="text-[#cccccc] font-medium">Tidak ada sesi ditemukan</div>
            <div className="text-[11px] text-[#777777]">Coba kata kunci pencarian lain atau mulai sesi baru.</div>
          </div>
        ) : (
          filtered.map((session) => {
            const isCurrent = session.id === currentSessionId;
            const participants = availableAgents.filter((a) =>
              session.participantAgentIds.includes(a.id)
            );

            return (
              <div
                key={session.id}
                className={`bg-[#252526] border rounded p-3.5 flex items-center justify-between transition-colors ${
                  isCurrent ? 'border-[#4ec9b0]/80 shadow' : 'border-[#333333] hover:bg-[#2a2d2e]'
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#ffffff] truncate">
                      {session.title}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                        session.mode === 'plan'
                          ? 'bg-[#182d40] text-[#9cdcfe]'
                          : 'bg-[#143831] text-[#4ec9b0]'
                      }`}
                    >
                      {session.mode}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] text-[#4ec9b0] font-medium font-mono">
                        (Aktif)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-[#858585]">
                    <div className="flex items-center gap-1">
                      <MessageSquare size={12} />
                      <span>{session.messages.length} pesan</span>
                    </div>

                    <span>
                      {new Date(session.lastActiveAt).toLocaleDateString()} ·{' '}
                      {new Date(session.lastActiveAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {/* Participant Avatars */}
                    <div className="flex items-center -space-x-1">
                      {participants.map((agent) => (
                        <div
                          key={agent.id}
                          title={agent.name}
                          className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: agent.color }}
                        >
                          {agent.initial}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectSession(session.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs rounded transition-colors"
                  >
                    <span>Buka</span>
                    <ArrowRight size={12} />
                  </button>

                  <button
                    onClick={() => onDeleteSession(session.id)}
                    title="Hapus Sesi"
                    className="p-1.5 text-[#858585] hover:text-[#ce9178] hover:bg-[#382626] rounded transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
