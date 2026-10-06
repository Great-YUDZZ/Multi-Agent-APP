import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Loader2, 
  FileText 
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { PlanDocument, Agent } from '../types';
import { BuildModeController, type TaskRuntimeState, type BuildRunProgress } from '../orchestrator/BuildModeController';

interface BuildTaskGraphViewProps {
  planDocument?: PlanDocument;
  availableAgents: Agent[];
  onSwitchToPlan: () => void;
  onSaveWalkthrough?: (summary: string) => void;
}

export const BuildTaskGraphView: React.FC<BuildTaskGraphViewProps> = ({
  planDocument,
  availableAgents,
  onSwitchToPlan,
  onSaveWalkthrough,
}) => {
  const [controller] = useState<BuildModeController | null>(() => {
    if (!planDocument) return null;
    return new BuildModeController(planDocument, availableAgents);
  });

  const [taskStates, setTaskStates] = useState<TaskRuntimeState[]>(() => {
    return controller ? controller.getStates() : [];
  });

  const [progress, setProgress] = useState<BuildRunProgress>(() => {
    return controller ? controller.getProgress() : { completed: 0, total: 0, blocked: 0, running: 0, hasDeviation: false };
  });

  const [walkthroughSummary, setWalkthroughSummary] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);

  if (!planDocument) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#1e1e1e] text-[#858585] font-sans">
        <FileText size={36} className="text-[#3c3c3c] mb-3" />
        <h3 className="text-sm font-semibold text-[#cccccc] mb-1">
          Belum Ada PlanDocument Aktif
        </h3>
        <p className="text-xs max-w-sm mb-4">
          Beralih ke Plan Mode terlebih dahulu untuk mendiskusikan kebutuhan arsitektur dan men-generate task graph.
        </p>
        <button
          onClick={onSwitchToPlan}
          className="px-3.5 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs font-semibold rounded shadow transition-colors"
        >
          Buka Plan Mode
        </button>
      </div>
    );
  }

  const handleStartBuild = async () => {
    if (!controller || isBuilding) return;
    setIsBuilding(true);

    await controller.startBuild({
      onTaskStateChange: (_taskId, updatedState) => {
        setTaskStates((prev) =>
          prev.map((s) => (s.task.id === updatedState.task.id ? { ...updatedState } : s))
        );
      },
      onProgress: (p) => setProgress(p),
      onBuildComplete: (summary) => {
        setIsBuilding(false);
        setWalkthroughSummary(summary);
        if (onSaveWalkthrough) onSaveWalkthrough(summary);
      },
    });
  };

  const handleApproveDeviation = async (taskId: string) => {
    if (!controller) return;
    await controller.approveDeviation(taskId, {
      onTaskStateChange: (_tId, updated) => {
        setTaskStates((prev) =>
          prev.map((s) => (s.task.id === updated.task.id ? { ...updated } : s))
        );
      },
      onProgress: (p) => setProgress(p),
      onBuildComplete: (summary) => {
        setIsBuilding(false);
        setWalkthroughSummary(summary);
        if (onSaveWalkthrough) onSaveWalkthrough(summary);
      },
    });
  };

  const percentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1e1e1e] text-[#cccccc] font-sans select-none">
      {/* Top Header & Execution Bar */}
      <div className="h-12 flex items-center justify-between px-5 bg-[#252526] border-b border-[#2d2d2d]">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4ec9b0]" />
          <div>
            <h2 className="text-xs font-bold text-[#ffffff] uppercase tracking-wider">
              Build Mode — Execution Engine
            </h2>
            <p className="text-[11px] text-[#858585] truncate max-w-md">
              {planDocument.goal}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress Badge */}
          <div className="flex items-center gap-2 bg-[#1e1e1e] px-3 py-1 rounded border border-[#333333] text-xs">
            <span className="text-[#858585]">Progress:</span>
            <span className="font-mono font-bold text-[#4ec9b0]">{percentage}%</span>
            <span className="text-[11px] text-[#858585]">({progress.completed}/{progress.total})</span>
          </div>

          {/* Trigger Button */}
          <button
            onClick={handleStartBuild}
            disabled={isBuilding || progress.completed === progress.total}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#007acc] disabled:bg-[#333333] disabled:text-[#666666] text-white text-xs font-semibold rounded shadow transition-colors"
          >
            {isBuilding ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Mengeksekusi...</span>
              </>
            ) : (
              <>
                <Play size={13} />
                <span>{progress.completed === progress.total ? 'Selesai' : 'Mulai Eksekusi'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-4">
        {/* Deviation Alert Banner (Blueprint Section 6) */}
        {taskStates.some((s) => s.status === 'deviated') && (
          <div className="bg-[#3b2020] border-2 border-[#ce9178] rounded p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-[#ce9178] font-bold">
              <AlertTriangle size={16} />
              <span>Deviasi Terdeteksi Pada Salah Satu Task!</span>
            </div>
            <p className="text-[#cccccc]">
              Salah satu task tidak memenuhi <code>successCriteria</code>. Task downstream terhenti sementara menunggu persetujuan alternatif.
            </p>
          </div>
        )}

        {/* Task Graph Nodes */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold text-[#858585] uppercase tracking-wider">
            Dependency Graph Nodes:
          </div>

          {taskStates.map((state, idx) => {
            const agent = availableAgents.find((a) => a.id === state.task.assignedAgentId);

            return (
              <div
                key={state.task.id}
                className={`bg-[#252526] border rounded p-4 space-y-2.5 transition-colors ${
                  state.status === 'running'
                    ? 'border-[#007acc] shadow-md'
                    : state.status === 'completed'
                    ? 'border-[#2e5944]'
                    : state.status === 'deviated'
                    ? 'border-[#ce9178]'
                    : state.status === 'blocked'
                    ? 'border-[#443828]'
                    : 'border-[#333333]'
                }`}
              >
                {/* Node Title & Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#858585]">#{idx + 1}</span>
                    <span className="font-semibold text-xs text-[#ffffff]">
                      {state.task.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Pill */}
                    {state.status === 'pending' && (
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-[#333333] text-[#858585] rounded">
                        PENDING
                      </span>
                    )}
                    {state.status === 'running' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-[#0e639c] text-white rounded">
                        <Loader2 size={10} className="animate-spin" />
                        RUNNING
                      </span>
                    )}
                    {state.status === 'completed' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-[#1e3a2f] text-[#4ec9b0] rounded">
                        <CheckCircle2 size={10} />
                        COMPLETED
                      </span>
                    )}
                    {state.status === 'deviated' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-[#4d281e] text-[#ce9178] rounded">
                        <AlertTriangle size={10} />
                        DEVIATED
                      </span>
                    )}
                    {state.status === 'blocked' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-[#3d321e] text-[#d7ba7d] rounded">
                        <Lock size={10} />
                        BLOCKED
                      </span>
                    )}
                  </div>
                </div>

                {/* Agent & Success Criteria */}
                <div className="flex items-center gap-4 text-[11px] text-[#858585]">
                  <div className="flex items-center gap-1.5">
                    <span>Assignee:</span>
                    <span className="font-medium" style={{ color: agent?.color || '#569cd6' }}>
                      {agent?.name || state.task.assignedAgentId}
                    </span>
                  </div>

                  {state.task.dependsOn && state.task.dependsOn.length > 0 && (
                    <div className="font-mono text-[10px] text-[#9cdcfe]">
                      Depends on: [{state.task.dependsOn.join(', ')}]
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-[#4ec9b0] bg-[#1e1e1e] p-2 rounded border border-[#333333] flex items-center gap-1.5">
                  <CheckCircle2 size={12} />
                  <span>Success Criteria: {state.task.successCriteria}</span>
                </div>

                {/* Output or Deviation Actions */}
                {state.output && (
                  <div className="bg-[#1e1e1e] p-2.5 rounded text-xs border border-[#333333] text-[#cccccc]">
                    <div className="text-[10px] font-bold text-[#858585] uppercase mb-1">
                      Execution Output:
                    </div>
                    <div className="text-xs font-mono text-[#9cdcfe] leading-relaxed">
                      {state.output}
                    </div>
                  </div>
                )}

                {state.status === 'deviated' && (
                  <div className="bg-[#2d1b1b] border border-[#ce9178] p-3 rounded space-y-2 mt-2">
                    <div className="text-xs font-bold text-[#ce9178]">
                      Alasan Deviasi: {state.deviationReason}
                    </div>
                    <div className="text-xs text-[#cccccc]">
                      Saran Alternatif: {state.proposedAlternative}
                    </div>
                    <button
                      onClick={() => handleApproveDeviation(state.task.id)}
                      className="px-3 py-1 bg-[#ce9178] hover:bg-[#dfa087] text-[#1e1e1e] text-xs font-bold rounded shadow transition-colors"
                    >
                      Setujui Alternatif & Lanjutkan
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Walkthrough Summary (Blueprint Section 15.2) */}
        {walkthroughSummary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#252526] border-2 border-[#4ec9b0] rounded p-5 space-y-3 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-[#4ec9b0]" />
              <h3 className="text-xs font-bold text-[#ffffff] uppercase tracking-wider">
                Walkthrough: Eksekusi Build Selesai 100%
              </h3>
            </div>
            <p className="text-xs text-[#cccccc] leading-relaxed">
              {walkthroughSummary}
            </p>
            <div className="flex items-center justify-end pt-2 border-t border-[#333333]">
              <button
                onClick={onSwitchToPlan}
                className="px-3.5 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs font-semibold rounded shadow transition-colors"
              >
                Kembali ke Diskusi (Plan Mode)
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
