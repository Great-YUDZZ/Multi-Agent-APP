import React from 'react';
import {
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
import { CubesLogo } from './CubesLogo';

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
    <div className="flex-1 flex flex-col h-full bg-[#0c0d14] text-[#cbd5e1] font-sans select-none overflow-y-auto">
      {/* Dashboard Top Header */}
      <div className="h-16 border-b border-white/[0.08] bg-[#121520]/80 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <CubesLogo size={34} withGlow={true} />
          <div>
            <h1 className="text-xs font-bold text-white uppercase tracking-wider">
              Mission Control & Workspace Dashboard
            </h1>
            <p className="text-[11px] text-[#94a3b8]">
              Pemantauan status sesi multi-agent, progres build, dan orkestrasi sistem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onNewSession}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20"
          >
            <Plus size={14} />
            <span>Sesi Baru</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 text-[#94a3b8] hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Buka Pengaturan"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Main Dashboard Content Area */}
      <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* Quick Stats Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#141724]/90 border border-white/[0.08] p-5 rounded-2xl space-y-1.5 shadow-md">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8] tracking-wider">
              Total Sesi Aktif
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {sessions.length}
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
              <CheckCircle2 size={12} />
              <span>Tersimpan di storage</span>
            </div>
          </div>

          <div className="bg-[#141724]/90 border border-white/[0.08] p-5 rounded-2xl space-y-1.5 shadow-md">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8] tracking-wider">
              Agents Terdaftar
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-400">
              {availableAgents.length}
            </div>
            <div className="text-[11px] text-[#94a3b8] flex items-center gap-1 pt-1">
              <Users size={12} />
              <span>Siap berpartisipasi</span>
            </div>
          </div>

          <div className="bg-[#141724]/90 border border-white/[0.08] p-5 rounded-2xl space-y-1.5 shadow-md">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8] tracking-wider">
              Skills Markdown
            </div>
            <div className="text-2xl font-bold font-mono text-amber-300">
              {skillsCount}
            </div>
            <div className="text-[11px] text-[#94a3b8] flex items-center gap-1 pt-1">
              <ShieldCheck size={12} />
              <span>Skill Registry aktif</span>
            </div>
          </div>

          <div className="bg-[#141724]/90 border border-white/[0.08] p-5 rounded-2xl space-y-1.5 shadow-md">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8] tracking-wider">
              Host Runtime
            </div>
            <div className="text-sm font-bold font-mono text-indigo-400 truncate pt-1">
              Linux / Windows Native
            </div>
            <div className="text-[11px] text-[#94a3b8] pt-1">
              Tauri v2 + PTY Engine
            </div>
          </div>
        </div>

        {/* Active & Running Sessions Section */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Play size={14} className="text-cyan-400" />
              <span>Sesi Berjalan & Prioritas Perhatian</span>
            </h2>
            <span className="text-[11px] text-[#94a3b8]">
              {activeSessions.length} sesi termonitor
            </span>
          </div>

          {activeSessions.length === 0 ? (
            <div className="bg-[#141724]/80 border border-white/[0.08] rounded-2xl p-8 text-center space-y-3 text-xs text-[#94a3b8]">
              <FolderOpen size={36} className="mx-auto text-[#64748b]" />
              <p>Belum ada sesi yang aktif berjalan saat ini.</p>
              <button
                onClick={onNewSession}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 hover:scale-102"
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
                    className={`bg-[#141724]/90 border rounded-2xl p-4 space-y-3 transition-all ${
                      isCurrent
                        ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                        : 'border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase ${
                              session.mode === 'plan'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {session.mode}
                          </span>
                          <span className="font-semibold text-xs text-white truncate">
                            {session.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#94a3b8] flex items-center gap-2 mt-1">
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
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.08] hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 text-[#cbd5e1] hover:text-white rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer"
                      >
                        <span>Buka</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>

                    {/* Participant Avatars & Task Progress Preview */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#94a3b8]">Agents:</span>
                        <div className="flex items-center -space-x-1">
                          {participants.map((agent) => (
                            <div
                              key={agent.id}
                              title={`${agent.name} (${agent.role})`}
                              className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-[#141724]"
                              style={{ backgroundColor: agent.color }}
                            >
                              {agent.initial}
                            </div>
                          ))}
                        </div>
                      </div>

                      {session.planDocument ? (
                        <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                          {session.planDocument.tasks.length} tasks direncanakan
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#94a3b8]">
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
        <div className="bg-[#141724]/90 border border-white/[0.08] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Agent Builder & Trust Level Presets
            </h3>
            <p className="text-xs text-[#94a3b8] max-w-xl">
              Konfigurasikan tim agent spesialis dengan instruksi custom, skills markdown, dan izin terminal aman (Secure, Review-driven, Agent-driven).
            </p>
          </div>
          <button
            onClick={onOpenAgentModal}
            className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shrink-0 cursor-pointer"
          >
            Kelola Tim Agents
          </button>
        </div>
      </div>
    </div>
  );
};
