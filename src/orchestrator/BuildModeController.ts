import type { PlannedTask, PlanDocument, Agent } from '../types';
import { globalProviderRegistry } from '../llm/ProviderRegistry';
import { ObsidianTool } from '../tools/ObsidianTool';
import { saveFileContent } from '../tauri/fsBridge';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'deviated' | 'blocked';

export interface WrittenFile {
  path: string;
  content: string;
  language?: string;
}

export interface TaskRuntimeState {
  task: PlannedTask;
  status: TaskStatus;
  output?: string;
  logs: string[];
  filesWritten?: WrittenFile[];
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
  private workspacePath?: string;

  constructor(plan: PlanDocument, availableAgents: Agent[], workspacePath?: string) {
    this.plan = plan;
    this.workspacePath = workspacePath;
    availableAgents.forEach((a) => this.agents.set(a.id, a));

    // Initialize state
    plan.tasks.forEach((task) => {
      this.taskStates.set(task.id, {
        task,
        status: 'pending',
        logs: [],
        filesWritten: [],
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

  /**
   * Helper untuk mengekstrak file yang ditulis oleh agen
   */
  private extractWrittenFiles(content: string, taskDesc: string): WrittenFile[] {
    const files: WrittenFile[] = [];

    // Pola 1: ```file:path/nama.ext atau ```filepath:path/nama.ext
    const fileBlockRegex = /```(?:file|filepath)[:\s]+([^\n\r]+)[\r\n]([\s\S]*?)```/gi;
    let match: RegExpExecArray | null;

    while ((match = fileBlockRegex.exec(content)) !== null) {
      let rawPath = match[1].trim().replace(/^['"`]+|['"`]+$/g, '');
      const code = match[2].trim();
      if (rawPath && code) {
        // Tentukan ekstensi untuk language highlighter
        const ext = rawPath.split('.').pop()?.toLowerCase();
        files.push({
          path: rawPath,
          content: code,
          language: ext || 'text',
        });
      }
    }

    // Pola 2 (Fallback): Jika tidak ada tag `file:`, tetapi ada blok kode ```html dsb dan taskDesc menyebutkan file tertentu
    if (files.length === 0) {
      const codeBlockRegex = /```([a-zA-Z0-9_-]+)[\r\n]([\s\S]*?)```/gi;
      let codeMatch: RegExpExecArray | null;

      while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
        const lang = codeMatch[1].toLowerCase();
        const code = codeMatch[2].trim();

        // Cari tahu nama file dari task description
        let inferredFilename = '';
        const taskLower = taskDesc.toLowerCase();

        if (lang === 'html' || taskLower.includes('index.html') || taskLower.includes('.html')) {
          const m = taskDesc.match(/([a-zA-Z0-9_\-\/]+\.html)/i);
          inferredFilename = m ? m[1] : 'index.html';
        } else if (lang === 'css' || taskLower.includes('style.css') || taskLower.includes('.css')) {
          const m = taskDesc.match(/([a-zA-Z0-9_\-\/]+\.css)/i);
          inferredFilename = m ? m[1] : 'style.css';
        } else if (['javascript', 'js'].includes(lang) || taskLower.includes('app.js') || taskLower.includes('.js')) {
          const m = taskDesc.match(/([a-zA-Z0-9_\-\/]+\.js)/i);
          inferredFilename = m ? m[1] : 'app.js';
        } else if (['typescript', 'ts'].includes(lang) || taskLower.includes('.ts')) {
          const m = taskDesc.match(/([a-zA-Z0-9_\-\/]+\.ts)/i);
          inferredFilename = m ? m[1] : 'app.ts';
        } else if (lang === 'json' || taskLower.includes('.json')) {
          const m = taskDesc.match(/([a-zA-Z0-9_\-\/]+\.json)/i);
          inferredFilename = m ? m[1] : 'data.json';
        } else if (lang === 'markdown' || lang === 'md' || taskLower.includes('.md')) {
          const m = taskDesc.match(/([a-zA-Z0-9_\-\/]+\.md)/i);
          inferredFilename = m ? m[1] : 'README.md';
        }

        if (inferredFilename && code.length > 20) {
          files.push({
            path: inferredFilename,
            content: code,
            language: lang,
          });
        }
      }
    }

    return files;
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
      const workspaceNotice = this.workspacePath
        ? `\nLOKASI WORKSPACE FISIK: "${this.workspacePath}".\nPastikan path file yang kamu buat relatif terhadap folder root workspace ini.`
        : '';

      const prompt = `Kamu ditugaskan untuk mengeksekusi: "${state.task.description}".
Kriteria sukses: ${state.task.successCriteria}.
${workspaceNotice}

PANDUAN EKSEKUSI TEKNIS:
1. Jika tugas ini mengharuskan pembuatan atau pengubahan berkas kode (HTML, CSS, JS/TS, Python, dsb), WAJIB tuliskan kode lengkap di dalam blok kode berikut:
\`\`\`file:nama_berkas.ext
isi kode lengkap tanpa placeholder atau potongan terputus
\`\`\`
2. Kamu boleh membuat lebih dari satu berkas jika diperlukan.
3. Berikan penjelasan singkat mengenai kode dan berkas yang telah kamu buat.`;

      const result = await globalProviderRegistry.sendMessageWithFallback(
        agent.llmProviderId,
        [],
        [
          {
            role: 'system',
            content: `${agent.instructions}\nKamu adalah ${agent.name} (${agent.role}). Jalankan task teknis ini secara presisi dan hasilkan kode siap pakai.`,
          },
          { role: 'user', content: prompt },
        ]
      );

      state.output = result.response.content;

      // Ekstrak berkas yang dihasilkan agen
      const extractedFiles = this.extractWrittenFiles(state.output, state.task.description);
      state.filesWritten = extractedFiles;

      // Tulis berkas fisik ke disk jika workspacePath tersedia
      if (this.workspacePath && extractedFiles.length > 0) {
        for (const file of extractedFiles) {
          try {
            const cleanRelPath = file.path.replace(/^[/\\]+/, '');
            const fullFilePath = this.workspacePath.endsWith('/') || this.workspacePath.endsWith('\\')
              ? `${this.workspacePath}${cleanRelPath}`
              : `${this.workspacePath}/${cleanRelPath}`;

            const saved = await saveFileContent(fullFilePath, file.content);
            if (saved) {
              state.logs.push(`[Workspace] Berhasil menulis file "${cleanRelPath}" (${file.content.length} karakter) ke direktori fisik.`);
            } else {
              state.logs.push(`[Peringatan] Gagal menyimpan "${cleanRelPath}" via filesystem bridge.`);
            }
          } catch (writeErr) {
            console.error('Error saat menulis berkas fisik:', writeErr);
            state.logs.push(`[Error] Gagal menulis berkas ${file.path}: ${String(writeErr)}`);
          }
        }

        // Picu event kustom agar File Tree Sidebar langsung me-refresh tampilan berkas
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('app:workspace-changed', {
              detail: { path: this.workspacePath },
            })
          );
        }
      } else if (extractedFiles.length > 0) {
        state.logs.push(`[Info] ${extractedFiles.length} berkas kode dihasilkan dan siap dilihat di antarmuka.`);
      }

      // Otonom: Parse dan eksekusi tool Obsidian jika agen menulis/membaca catatan
      const obsidianCalls = ObsidianTool.parseToolCalls(result.response.content);
      for (const call of obsidianCalls) {
        const toolRes = await ObsidianTool.execute(call, agent.permissions);
        state.logs.push(`[Obsidian] ${call.action}: ${toolRes.message}`);
      }

      state.status = 'completed';
      state.logs.push(`Eksekusi tugas selesai.`);
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
