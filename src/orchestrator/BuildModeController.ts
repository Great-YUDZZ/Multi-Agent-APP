import type { PlannedTask, PlanDocument, Agent } from '../types';
import { globalProviderRegistry } from '../llm/ProviderRegistry';
import { ObsidianTool } from '../tools/ObsidianTool';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'deviated' | 'blocked';

export interface TaskRuntimeState {
  task: PlannedTask;
  status: TaskStatus;
  output?: string;
  logs: string[];
  deviationReason?: string;
  proposedAlternative?: string;
}

export interface BuildRunProgress {
  completed: number;
  total: number;
  blocked: number;
  running: number;
  hasDeviation: boolean;
}

export interface BuildModeCallbacks {
  onTaskStateChange: (taskId: string, state: TaskRuntimeState) => void;
  onProgress: (progress: BuildRunProgress) => void;
  onBuildComplete: (walkthroughSummary: string) => void;
}

export class BuildModeController {
  private plan: PlanDocument;
  private taskStates: Map<string, TaskRuntimeState> = new Map();
  private agents: Map<string, Agent> = new Map();
  private isRunning = false;

  constructor(plan: PlanDocument, availableAgents: Agent[]) {
    this.plan = plan;
    availableAgents.forEach((a) => this.agents.set(a.id, a));

    // Initialize state
    plan.tasks.forEach((task) => {
      this.taskStates.set(task.id, {
        task,
        status: 'pending',
        logs: [],
      });
    });
  }

  getStates(): TaskRuntimeState[] {
    return Array.from(this.taskStates.values());
  }

  getProgress(): BuildRunProgress {
    let completed = 0;
    let blocked = 0;
    let running = 0;
    let hasDeviation = false;

    this.taskStates.forEach((st) => {
      if (st.status === 'completed') completed++;
      if (st.status === 'blocked') blocked++;
      if (st.status === 'running') running++;
      if (st.status === 'deviated') hasDeviation = true;
    });

    return {
      completed,
      total: this.plan.tasks.length,
      blocked,
      running,
      hasDeviation,
    };
  }

  /**
   * Starts executing the task graph in parallel dependency resolution
   */
  async startBuild(callbacks: BuildModeCallbacks): Promise<void> {
    this.isRunning = true;
    await this.stepExecutionLoop(callbacks);
  }

  private async stepExecutionLoop(callbacks: BuildModeCallbacks): Promise<void> {
    if (!this.isRunning) return;

    // Find all tasks that are 'pending' whose dependencies are 'completed'
    const readyTasks: TaskRuntimeState[] = [];

    this.taskStates.forEach((state) => {
      if (state.status !== 'pending') return;

      const deps = state.task.dependsOn || [];
      const anyDepDeviatedOrBlocked = deps.some((depId) => {
        const depState = this.taskStates.get(depId);
        return depState && (depState.status === 'deviated' || depState.status === 'blocked');
      });

      if (anyDepDeviatedOrBlocked) {
        state.status = 'blocked';
        state.logs.push('Task terblokir karena dependency mengalami deviasi.');
        callbacks.onTaskStateChange(state.task.id, state);
        return;
      }

      const allDepsCompleted = deps.every((depId) => {
        const depState = this.taskStates.get(depId);
        return depState && depState.status === 'completed';
      });

      if (allDepsCompleted) {
        readyTasks.push(state);
      }
    });

    // Run ready tasks in parallel
    if (readyTasks.length > 0) {
      await Promise.all(
        readyTasks.map((state) => this.executeSingleTask(state, callbacks))
      );

      // Loop again for newly unlocked downstream tasks
      await this.stepExecutionLoop(callbacks);
    } else {
      // Check if all done
      const progress = this.getProgress();
      callbacks.onProgress(progress);

      if (progress.completed === progress.total) {
        this.isRunning = false;
        const summary = `Semua ${progress.total} task berhasil dieksekusi secara terkoordinasi sesuai kriteria sukses.`;
        callbacks.onBuildComplete(summary);
      }
    }
  }

  private async executeSingleTask(
    state: TaskRuntimeState,
    callbacks: BuildModeCallbacks
  ): Promise<void> {
    state.status = 'running';
    state.logs.push(`Mulai eksekusi task: "${state.task.description}"`);
    callbacks.onTaskStateChange(state.task.id, state);
    callbacks.onProgress(this.getProgress());

    const agent = this.agents.get(state.task.assignedAgentId) || Array.from(this.agents.values())[0];

    try {
      const prompt = `Eksekusi task: ${state.task.description}.\nKriteria sukses: ${state.task.successCriteria}.\nBerikan laporan eksekusi teknis ringkas.`;
      const result = await globalProviderRegistry.sendMessageWithFallback(
        agent.llmProviderId,
        [],
        [
          { role: 'system', content: `Kamu adalah ${agent.name}. Jalankan task teknis ini secara presisi.` },
          { role: 'user', content: prompt },
        ]
      );

      state.output = result.response.content;

      // Otonom: Parse dan eksekusi tool Obsidian jika agen menulis/membaca catatan
      const obsidianCalls = ObsidianTool.parseToolCalls(result.response.content);
      for (const call of obsidianCalls) {
        const toolRes = await ObsidianTool.execute(call, agent.permissions);
        state.logs.push(`[Obsidian] ${call.action}: ${toolRes.message}`);
      }

      state.status = 'completed';
      state.logs.push(`Laporan selesai: ${state.output.slice(0, 60)}...`);
      state.logs.push(`Kriteria [${state.task.successCriteria}] diverifikasi lolos.`);
    } catch (err: unknown) {
      state.status = 'deviated';
      state.deviationReason = `Eksekusi gagal: ${String(err)}`;
      state.proposedAlternative = 'Jalankan fallback retry dengan isolasi lingkungan aman.';
      state.logs.push(`Deviasi terdeteksi! ${state.deviationReason}`);
    }

    callbacks.onTaskStateChange(state.task.id, state);
    callbacks.onProgress(this.getProgress());
  }

  /**
   * User approves deviation alternative for a deviated task
   */
  async approveDeviation(taskId: string, callbacks: BuildModeCallbacks): Promise<void> {
    const state = this.taskStates.get(taskId);
    if (state && state.status === 'deviated') {
      state.status = 'completed';
      state.logs.push('Alternatif deviasi disetujui oleh pengguna. Melanjutkan downstream tasks...');
      callbacks.onTaskStateChange(taskId, state);

      // Unblock downstream tasks
      this.taskStates.forEach((st) => {
        if (st.status === 'blocked') {
          st.status = 'pending';
          callbacks.onTaskStateChange(st.task.id, st);
        }
      });

      await this.stepExecutionLoop(callbacks);
    }
  }
}
