import type { Agent, PlanDocument, PlannedTask, SessionMessage, Message } from '../types';
import { globalProviderRegistry } from '../llm/ProviderRegistry';
import { truncateContext } from '../llm/contextUtils';

export interface ModeratorEvaluation {
  status: 'CONTINUE' | 'FINISHED';
  reason: string;
  roundNumber: number;
  planDocument?: PlanDocument;
}

/**
 * ModeratorAgent — Agen penilai independen yang memoderasi diskusi putaran
 * dan menghasilkan PlanDocument terstruktur (Blueprint Bagian 5 & 6).
 */
export class ModeratorAgent {
  readonly name = 'Moderator';

  /**
   * Mengevaluasi kondisi diskusi antara agen-agen
   */
  async evaluateDiscussion(
    messages: SessionMessage[],
    activeAgents: Agent[],
    roundNumber: number,
    maxRounds = 5,
    workspaceContext?: { path: string; files: string[] }
  ): Promise<ModeratorEvaluation> {
    const agentMessages = messages.filter((m) => m.speaker.type === 'agent');

    // Hard limit safety: jika batas putaran tercapai, rangkum usulan
    if (roundNumber >= maxRounds) {
      return this.forceSummarize(
        messages,
        activeAgents,
        roundNumber,
        'Batas maksimal putaran tercapai. Merangkum draf rencana kerja tim.',
        workspaceContext
      );
    }

    // Cek apakah setiap active agent telah berkontribusi pada putaran ini
    const participatingIds = new Set(
      agentMessages.slice(-activeAgents.length).map((m) =>
        m.speaker.type === 'agent' ? m.speaker.agentId : ''
      )
    );

    const allAgentsSpoke = activeAgents.every((a) => participatingIds.has(a.id));

    if (allAgentsSpoke && roundNumber >= 1) {
      // Konsensus tercapai: buat draf rencana kerja tim
      return this.generatePlanDocument(
        messages,
        activeAgents,
        roundNumber,
        'Tim telah menyelesaikan putaran diskusi dan merumuskan usulan rencana kerja.',
        workspaceContext
      );
    }

    return {
      status: 'CONTINUE',
      reason: `Putaran ${roundNumber} selesai. Menunggu masukan tambahan dari pengguna atau putaran lanjutan.`,
      roundNumber,
    };
  }

  /**
   * Merangkum diskusi menjadi PlanDocument saat batas hard-limit tercapai
   */
  async forceSummarize(
    messages: SessionMessage[],
    activeAgents: Agent[],
    roundNumber: number,
    reason: string,
    workspaceContext?: { path: string; files: string[] }
  ): Promise<ModeratorEvaluation> {
    return this.generatePlanDocument(messages, activeAgents, roundNumber, reason, workspaceContext);
  }

  /**
   * Helper cerdas untuk memastikan task jatuh ke spesialis yang tepat jika ID tidak valid
   */
  private resolveBestAgentForTask(taskText: string, suggestedId: string | undefined, activeAgents: Agent[]): string {
    const found = activeAgents.find((a) => a.id === suggestedId);
    if (found) return found.id;

    const lower = taskText.toLowerCase();

    // 1. Frontend / UI
    if (lower.includes('html') || lower.includes('css') || lower.includes('ui') || lower.includes('frontend') || lower.includes('tampilan') || lower.includes('layout')) {
      const fe = activeAgents.find((a) => a.role.toLowerCase().includes('frontend') || a.name.toLowerCase().includes('frontend') || a.role.toLowerCase().includes('ui'));
      if (fe) return fe.id;
    }

    // 2. Backend / API / Logika
    if (lower.includes('backend') || lower.includes('server') || lower.includes('api') || lower.includes('database') || lower.includes('logic') || lower.includes('endpoint')) {
      const be = activeAgents.find((a) => a.role.toLowerCase().includes('backend') || a.name.toLowerCase().includes('backend'));
      if (be) return be.id;
    }

    // 3. Tester / Validasi / QA
    if (lower.includes('test') || lower.includes('uji') || lower.includes('qa') || lower.includes('verifikasi') || lower.includes('cek')) {
      const tester = activeAgents.find((a) => a.role.toLowerCase().includes('test') || a.name.toLowerCase().includes('test') || a.role.toLowerCase().includes('qa'));
      if (tester) return tester.id;
    }

    // 4. Web Search / Scout
    if (lower.includes('cari') || lower.includes('search') || lower.includes('riset') || lower.includes('aset') || lower.includes('gambar')) {
      const scout = activeAgents.find((a) => a.role.toLowerCase().includes('search') || a.name.toLowerCase().includes('search') || a.role.toLowerCase().includes('scout'));
      if (scout) return scout.id;
    }

    return activeAgents[0]?.id || 'agent-a';
  }

  /**
   * Menghasilkan PlanDocument dinamis dengan ekstraksi LLM cerdas atau fallback terstruktur
   */
  private async generatePlanDocument(
    messages: SessionMessage[],
    activeAgents: Agent[],
    roundNumber: number,
    reason: string,
    workspaceContext?: { path: string; files: string[] }
  ): Promise<ModeratorEvaluation> {
    const userPrompt =
      messages.find((m) => m.speaker.type === 'user')?.content ||
      'Pengembangan fitur multi-agent desktop';

    // Konteks riwayat diskusi
    const contextMsgs: Message[] = messages.map((m) => ({
      role: m.speaker.type === 'user' ? 'user' : 'assistant',
      content: `[${m.speaker.type === 'user' ? 'Pengguna' : m.speaker.type === 'agent' ? m.speaker.agentName : 'Sistem'}]: ${m.content}`,
    }));
    const truncated = truncateContext(contextMsgs, 4000, 200);
    const discussionContext = truncated.map((m) => m.content).join('\n\n');

    const agentsRoster = activeAgents
      .map((a) => `- ID: "${a.id}", Nama: "${a.name}", Spesialisasi: "${a.role}"`)
      .join('\n');

    const workspacePromptInfo = workspaceContext
      ? `Workspace Aktif: ${workspaceContext.path}\nBerkas yang ada saat ini:\n${workspaceContext.files.length > 0 ? workspaceContext.files.map((f) => `- ${f}`).join('\n') : '(Workspace masih kosong - rencanakan berkas baru yang dibutuhkan)'}`
      : 'Workspace: Default';

    const summaryPrompt = `Kamu adalah Moderator Diskusi Multi-Agent.
Berdasarkan jalannya diskusi kolaboratif di bawah ini dan konteks workspace:
${workspacePromptInfo}

DAFTAR ANGGOTA TIM & SPESIALISASI:
${agentsRoster}

TUGASMU:
Rangkum usulan rencana kerja menjadi objek JSON valid.
ATURAN PENTING:
1. Bagi tugas (tasks) secara ADIL dan SPESIFIK ke masing-masing anggota tim yang paling ahli (contoh: desain UI/HTML/CSS ke Frontend, logika/API ke Backend, pengujian/cek fitur ke Tester, koordinasi ke Pemimpin). JANGAN menugaskan semua task ke satu agen saja!
2. Setiap tugas harus konkret (misalnya "Buat index.html dengan layout kartu", "Buat style.css dengan tema dark", "Uji responsivitas tombol").
3. Format output HANYA raw JSON valid dengan struktur berikut:
{
  "goal": "Tujuan utama rencana kerja",
  "tasks": [
    {
      "id": "task-1",
      "description": "Deskripsi tugas konkret mencakup nama berkas yang akan dibuat/diedit",
      "assignedAgentId": "ID salah satu anggota tim di atas",
      "dependsOn": [],
      "rationale": "Alasan penugasan",
      "successCriteria": "Kriteria sukses terukur"
    }
  ]
}

DISKUSI TIM:
${discussionContext}`;

    try {
      const llmResult = await globalProviderRegistry.sendMessageWithFallback(
        activeAgents[0]?.llmProviderId || 'prov-openai',
        [],
        [
          {
            role: 'system',
            content:
              'Kamu adalah Moderator sistem multi-agent. Balas HANYA dengan raw JSON valid tanpa komentar dan tanpa format markdown.',
          },
          { role: 'user', content: summaryPrompt },
        ]
      );

      // Cari block JSON
      const content = llmResult.response.content.trim();
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
        if (parsed.tasks && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
          const planDocument: PlanDocument = {
            id: `plan-${Date.now()}`,
            goal: parsed.goal || `Rencana: ${userPrompt.slice(0, 50)}`,
            createdAt: new Date().toISOString(),
            tasks: parsed.tasks.map((t: any, idx: number) => {
              const assignedId = this.resolveBestAgentForTask(
                t.description || '',
                t.assignedAgentId,
                activeAgents
              );
              return {
                id: t.id || `task-${idx + 1}`,
                description: t.description || `Tugas #${idx + 1}`,
                assignedAgentId: assignedId,
                dependsOn: t.dependsOn || (idx > 0 ? [`task-${idx}`] : []),
                rationale: t.rationale || 'Optimalisasi peran spesialisasi agen.',
                successCriteria:
                  t.successCriteria || 'Selesai dan terverifikasi tanpa error.',
              };
            }),
            openQuestions: [],
          };

          return {
            status: 'FINISHED',
            reason,
            roundNumber,
            planDocument,
          };
        }
      }
    } catch (err) {
      console.warn('Gagal memanggil LLM untuk ekstrak PlanDocument, beralih ke dynamic heuristic:', err);
    }

    // Dynamic Heuristic Fallback yang membagi tugas ke seluruh agen
    const dynamicTasks: PlannedTask[] = activeAgents.map((agent, idx) => {
      let desc = `Pelaksanaan tugas spesialisasi: ${agent.role}`;
      const roleLower = agent.role.toLowerCase();
      if (roleLower.includes('frontend') || roleLower.includes('ui')) {
        desc = `Rancang dan buat antarmuka visual (index.html, style.css) dengan desain interaktif`;
      } else if (roleLower.includes('backend') || roleLower.includes('server') || roleLower.includes('api')) {
        desc = `Bangun logika data dan fungsi interaktif pendukung (app.js / server endpoint)`;
      } else if (roleLower.includes('test') || roleLower.includes('qa')) {
        desc = `Lakukan verifikasi tampilan, uji klik tombol, dan pastikan tidak ada error console`;
      } else if (roleLower.includes('search') || roleLower.includes('scout')) {
        desc = `Kumpulkan referensi pustaka CSS/JS dan aset pendukung yang relevan`;
      } else if (roleLower.includes('pemimpin') || roleLower.includes('lead')) {
        desc = `Kordinasikan struktur direktori dan konfigurasi workspace untuk: "${userPrompt.slice(0, 50)}"`;
      }

      return {
        id: `task-${idx + 1}`,
        description: desc,
        assignedAgentId: agent.id,
        dependsOn: idx > 0 ? [`task-${idx}`] : [],
        rationale: `Ditugaskan sesuai spesialisasi ${agent.role} (${agent.name})`,
        successCriteria: 'Berkas berhasil dibuat dan lolos verifikasi.',
      };
    });

    const planDocument: PlanDocument = {
      id: `plan-${Date.now()}`,
      goal: `Rencana Eksekusi: ${userPrompt.slice(0, 60)}...`,
      createdAt: new Date().toISOString(),
      tasks: dynamicTasks,
      openQuestions: [],
    };

    return {
      status: 'FINISHED',
      reason,
      roundNumber,
      planDocument,
    };
  }
}
