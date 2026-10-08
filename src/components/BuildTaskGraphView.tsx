import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Loader2, 
  FileText,
  Code,
  Copy,
  Check,
  ExternalLink,
  Folder
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { PlanDocument, Agent } from '../types';
import { BuildModeController, type TaskRuntimeState, type BuildRunProgress } from '../orchestrator/BuildModeController';

interface BuildTaskGraphViewProps {
  planDocument?: PlanDocument;
  availableAgents: Agent[];
  workspacePath?: string;
  onSwitchToPlan: () => void;
  onSaveWalkthrough?: (summary: string) => void;
  onOpenFileInEditor?: (filePath: string) => void;
}

export const BuildTaskGraphView: React.FC<BuildTaskGraphViewProps> = ({
  planDocument,
  availableAgents,
  workspacePath,
  onSwitchToPlan,
  onSaveWalkthrough,
  onOpenFileInEditor,
}) => {
  const [controller] = useState<BuildModeController | null>(() => {
    if (!planDocument) return null;
    return new BuildModeController(planDocument, availableAgents, workspacePath);
  });

  const [activeFileTabs, setActiveFileTabs] = useState<Record<string, number>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const handleCopyCode = (key: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1e1e1e] text-[#cccccc] font-sans select-none">
      {/* Top Header & Execution Bar */}
      <div className="h-14 flex items-center justify-between px-5 bg-[#252526] border-b border-[#2d2d2d]">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4ec9b0]" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-[#ffffff] uppercase tracking-wider">
                Build Mode — Execution Engine
              </h2>
              {workspacePath && (
                <span className="flex items-center gap-1 text-[10px] bg-[#1e1e1e] text-[#4ec9b0] px-2 py-0.5 rounded border border-[#333333] font-mono truncate max-w-xs">
                  <Folder size={10} />
                  {workspacePath}
                </span>
              )}
            </div>
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
        <div className="space-y-4">
          <div className="text-[11px] font-bold text-[#858585] uppercase tracking-wider flex items-center justify-between">
            <span>Dependency Graph Nodes:</span>
            <span className="text-[10px] text-[#4ec9b0] normal-case">
              Kode yang ditulis oleh setiap agen otomatis terhubung ke workspace
            </span>
          </div>

          {taskStates.map((state, idx) => {
            const agent = availableAgents.find((a) => a.id === state.task.assignedAgentId);
            const files = state.filesWritten || [];
            const activeTabIndex = activeFileTabs[state.task.id] || 0;
            const currentFile = files[activeTabIndex] || files[0];

            return (
              <div
                key={state.task.id}
                className={`bg-[#252526] border rounded-lg p-4 space-y-3 transition-colors ${
                  state.status === 'running'
                    ? 'border-[#007acc] shadow-lg shadow-[#007acc]/10'
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
                <div className="flex items-center justify-between text-[11px] text-[#858585] flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span>Pelaksana:</span>
                    <span className="font-semibold px-2 py-0.5 rounded bg-[#1e1e1e] border border-[#333333]" style={{ color: agent?.color || '#569cd6' }}>
                      {agent?.name || state.task.assignedAgentId} ({agent?.role || 'Spesialis'})
                    </span>
                  </div>

                  {state.task.dependsOn && state.task.dependsOn.length > 0 && (
                    <div className="font-mono text-[10px] text-[#9cdcfe]">
                      Bergantung pada: [{state.task.dependsOn.join(', ')}]
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-[#4ec9b0] bg-[#1e1e1e] p-2 rounded border border-[#333333] flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="shrink-0" />
                  <span>Kriteria Sukses: {state.task.successCriteria}</span>
                </div>

                {/* LIVE CODE VIEWER: Jika ada berkas yang ditulis oleh agen */}
                {files.length > 0 && (
                  <div className="mt-3 border border-[#333333] rounded-lg overflow-hidden bg-[#181818]">
                    {/* Tab Bar Berkas */}
                    <div className="flex items-center justify-between bg-[#1f1f1f] px-2 border-b border-[#2d2d2d] overflow-x-auto">
                      <div className="flex items-center gap-1 py-1">
                        <span className="text-[10px] font-bold text-[#858585] uppercase tracking-wider px-2 flex items-center gap-1">
                          <Code size={12} className="text-[#4ec9b0]" />
                          Berkas Ditulis ({files.length}):
                        </span>
                        {files.map((file, fileIdx) => (
                          <button
                            key={file.path}
                            onClick={() =>
                              setActiveFileTabs((prev) => ({ ...prev, [state.task.id]: fileIdx }))
                            }
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                              (activeFileTabs[state.task.id] || 0) === fileIdx
                                ? 'bg-[#2d2d2d] text-[#ffffff] font-semibold shadow-sm'
                                : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#252526]'
                            }`}
                          >
                            <FileText size={12} />
                            <span>{file.path}</span>
                          </button>
                        ))}
                      </div>

                      {/* Aksi Berkas: Copy & Buka di Editor */}
                      {currentFile && (
                        <div className="flex items-center gap-1.5 py-1">
                          <button
                            onClick={() => handleCopyCode(`${state.task.id}-${currentFile.path}`, currentFile.content)}
                            title="Salin Kode Berkas"
                            className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded bg-[#252526] hover:bg-[#333333] text-[#cccccc] transition-colors border border-[#3c3c3c]"
                          >
                            {copiedKey === `${state.task.id}-${currentFile.path}` ? (
                              <>
                                <Check size={11} className="text-[#4ec9b0]" />
                                <span className="text-[#4ec9b0]">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>Salin</span>
                              </>
                            )}
                          </button>

                          {onOpenFileInEditor && workspacePath && (
                            <button
                              onClick={() => {
                                const cleanPath = currentFile.path.replace(/^[/\\]+/, '');
                                const full = workspacePath.endsWith('/') || workspacePath.endsWith('\\')
                                  ? `${workspacePath}${cleanPath}`
                                  : `${workspacePath}/${cleanPath}`;
                                onOpenFileInEditor(full);
                              }}
                              title="Buka Berkas di Editor"
                              className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded bg-[#0e639c]/30 hover:bg-[#0e639c] text-[#9cdcfe] hover:text-white transition-colors border border-[#0e639c]/50"
                            >
                              <ExternalLink size={11} />
                              <span>Buka Editor</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Preview Konten Kode */}
                    {currentFile && (
                      <div className="relative p-3 font-mono text-xs text-[#d4d4d4] bg-[#141414] overflow-x-auto max-h-72 select-text">
                        <pre className="leading-relaxed whitespace-pre font-mono">
                          {currentFile.content}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Execution Output Text / Logs */}
                {state.output && files.length === 0 && (
                  <div className="bg-[#1e1e1e] p-2.5 rounded text-xs border border-[#333333] text-[#cccccc]">
                    <div className="text-[10px] font-bold text-[#858585] uppercase mb-1">
                      Keluaran Tugas:
                    </div>
                    <div className="text-xs font-mono text-[#9cdcfe] leading-relaxed whitespace-pre-wrap">
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
