import React from 'react';
import {
  LayoutDashboard,
  Play,
  Plus,
  Users,
  Settings,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Session, Agent } from '../types';
import { globalSkillRegistry } from '../skills/SkillRegistry';

interface DashboardViewProps {
  sessions: Session[];
  availableAgents: Agent[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onOpenAgentModal: () => void;
  onOpenSettings: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sessions,
  availableAgents,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onOpenAgentModal,
  onOpenSettings,
}) => {
  const activeSessions = sessions.filter(
    (s) => s.mode === 'build' || Date.now() - s.lastActiveAt < 86400000
  );

  const skillsCount = globalSkillRegistry.getAll().length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] font-sans select-none overflow-y-auto">
      {/* Dashboard Top Header */}
      <div className="h-14 border-b border-[#2d2d2d] bg-[#252526] px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#1e3a2f] border border-[#4ec9b0]/40 flex items-center justify-center text-[#4ec9b0]">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white uppercase tracking-wider">
              Mission Control & Workspace Dashboard
            </h1>
            <p className="text-[11px] text-[#858585]">
              Pemantauan status sesi multi-agent, progres build, dan orkestrasi sistem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNewSession}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white rounded text-xs font-medium transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>Sesi Baru</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-[#858585] hover:text-white hover:bg-[#333333] rounded transition-colors"
            title="Buka Pengaturan"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* Main Dashboard Content Area */}
      <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* Quick Stats Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#252526] border border-[#2d2d2d] p-4 rounded-lg space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#858585] tracking-wider">
              Total Sesi Aktif
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {sessions.length}
            </div>
            <div className="text-[11px] text-[#4ec9b0] flex items-center gap-1 pt-1">
              <CheckCircle2 size={12} />
              <span>Tersimpan di storage</span>
            </div>
          </div>

          <div className="bg-[#252526] border border-[#2d2d2d] p-4 rounded-lg space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#858585] tracking-wider">
              Agents Terdaftar
            </div>
            <div className="text-2xl font-bold font-mono text-[#569cd6]">
              {availableAgents.length}
            </div>
            <div className="text-[11px] text-[#858585] flex items-center gap-1 pt-1">
              <Users size={12} />
              <span>Siap berpartisipasi</span>
            </div>
          </div>

          <div className="bg-[#252526] border border-[#2d2d2d] p-4 rounded-lg space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#858585] tracking-wider">
              Skills Markdown
            </div>
            <div className="text-2xl font-bold font-mono text-[#dcdcaa]">
              {skillsCount}
            </div>
            <div className="text-[11px] text-[#858585] flex items-center gap-1 pt-1">
              <ShieldCheck size={12} />
              <span>Skill Registry aktif</span>
            </div>
          </div>

          <div className="bg-[#252526] border border-[#2d2d2d] p-4 rounded-lg space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#858585] tracking-wider">
              Host Runtime
            </div>
            <div className="text-sm font-bold font-mono text-[#4ec9b0] truncate pt-1">
              Linux / Windows Native
            </div>
            <div className="text-[11px] text-[#858585] pt-1">
              Tauri v2 + PTY Engine
            </div>
          </div>
        </div>

        {/* Active & Running Sessions Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Play size={14} className="text-[#0e639c]" />
              <span>Sesi Berjalan & Prioritas Perhatian</span>
            </h2>
            <span className="text-[11px] text-[#858585]">
              {activeSessions.length} sesi termonitor
            </span>
          </div>

          {activeSessions.length === 0 ? (
            <div className="bg-[#252526] border border-[#2d2d2d] rounded-lg p-8 text-center space-y-2 text-xs text-[#858585]">
              <FolderOpen size={32} className="mx-auto text-[#444444]" />
              <p>Belum ada sesi yang aktif berjalan saat ini.</p>
              <button
                onClick={onNewSession}
                className="px-3 py-1 bg-[#0e639c] text-white rounded text-xs transition-colors hover:bg-[#1177bb]"
              >
                Mulai Sesi Baru
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSessions.map((session) => {
                const isCurrent = session.id === currentSessionId;
                const participants = availableAgents.filter((a) =>
                  session.participantAgentIds?.includes(a.id)
                );

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-[#252526] border rounded-lg p-4 space-y-3 transition-colors ${
                      isCurrent
                        ? 'border-[#007acc] shadow-lg'
                        : 'border-[#2d2d2d] hover:border-[#3c3c3c]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase ${
                              session.mode === 'plan'
                                ? 'bg-[#182d40] text-[#9cdcfe]'
                                : 'bg-[#143831] text-[#4ec9b0]'
                            }`}
                          >
                            {session.mode}
                          </span>
                          <span className="font-semibold text-xs text-white truncate">
                            {session.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#858585] flex items-center gap-2 mt-1">
                          <Clock size={11} />
                          <span>
                            {new Date(session.lastActiveAt).toLocaleDateString()} ·{' '}
                            {new Date(session.lastActiveAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectSession(session.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#2d2d2d] hover:bg-[#0e639c] text-[#cccccc] hover:text-white rounded text-xs transition-colors shrink-0"
                      >
                        <span>Buka</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>

                    {/* Participant Avatars & Task Progress Preview */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#2d2d2d] text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#858585]">Agents:</span>
                        <div className="flex items-center -space-x-1">
                          {participants.map((agent) => (
                            <div
                              key={agent.id}
                              title={`${agent.name} (${agent.role})`}
                              className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                              style={{ backgroundColor: agent.color }}
                            >
                              {agent.initial}
                            </div>
                          ))}
                        </div>
                      </div>

                      {session.planDocument ? (
                        <span className="text-[11px] font-mono text-[#4ec9b0] bg-[#1e3a2f] px-2 py-0.5 rounded">
                          {session.planDocument.tasks.length} tasks direncanakan
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#858585]">
                          Fase diskusi awal
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Navigation & Agent Management Banner */}
        <div className="bg-[#252526] border border-[#2d2d2d] rounded-lg p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Agent Builder & Trust Level Presets
            </h3>
            <p className="text-xs text-[#858585] max-w-xl">
              Konfigurasikan tim agent spesialis dengan instruksi custom, skills markdown, dan izin terminal aman (Secure, Review-driven, Agent-driven).
            </p>
          </div>
          <button
            onClick={onOpenAgentModal}
            className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#383838] border border-[#3c3c3c] text-white rounded text-xs font-medium transition-colors shrink-0"
          >
            Kelola Tim Agents
          </button>
        </div>
      </div>
    </div>
  );
};
