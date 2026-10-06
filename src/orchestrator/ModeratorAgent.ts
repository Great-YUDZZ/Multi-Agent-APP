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
    maxRounds = 3
  ): Promise<ModeratorEvaluation> {
    const agentMessages = messages.filter((m) => m.speaker.type === 'agent');

    // Hard limit safety: jika batas putaran tercapai, paksa rangkum (forceSummarize)
    if (roundNumber >= maxRounds) {
      return this.forceSummarize(
        messages,
        activeAgents,
        roundNumber,
        'Batas maksimal putaran (maxRounds) tercapai. Merangkum konsensus akhir secara otomatis.'
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
      // Konsensus tercapai: generate PlanDocument
      return this.generatePlanDocument(
        messages,
        activeAgents,
        roundNumber,
        'Para agent telah mencapai konsensus teknis dalam diskusi Plan Mode.'
      );
    }

    return {
      status: 'CONTINUE',
      reason: `Putaran ${roundNumber} selesai. Menunggu klarifikasi atau putaran diskusi selanjutnya.`,
      roundNumber,
    };
  }

  /**
   * Merangkum paksa diskusi menjadi PlanDocument saat batas hard-limit tercapai
   */
  async forceSummarize(
    messages: SessionMessage[],
    activeAgents: Agent[],
    roundNumber: number,
    reason: string
  ): Promise<ModeratorEvaluation> {
    return this.generatePlanDocument(messages, activeAgents, roundNumber, reason);
  }

  /**
   * Menghasilkan PlanDocument dinamis dengan ekstraksi LLM cerdas atau fallback terstruktur
   */
  private async generatePlanDocument(
    messages: SessionMessage[],
    activeAgents: Agent[],
    roundNumber: number,
    reason: string
  ): Promise<ModeratorEvaluation> {
    const userPrompt =
      messages.find((m) => m.speaker.type === 'user')?.content ||
      'Pengembangan fitur multi-agent desktop';

    // Coba ekstraksi cerdas melalui LLM
    const contextMsgs: Message[] = messages.map((m) => ({
      role: m.speaker.type === 'user' ? 'user' : 'assistant',
      content: `[${m.speaker.type}]: ${m.content}`,
    }));
    const truncated = truncateContext(contextMsgs, 3000, 200);
    const discussionContext = truncated.map((m) => m.content).join('\n');

    const summaryPrompt = `Berdasarkan diskusi berikut, rangkum tugas teknis menjadi JSON valid dengan struktur:
{
  "goal": "Tujuan utama rencana",
  "tasks": [
    {
      "id": "task-1",
      "description": "Deskripsi tugas konkret",
      "assignedAgentId": "${activeAgents[0]?.id || 'agent-a'}",
      "dependsOn": [],
      "rationale": "Alasan keputusan",
      "successCriteria": "Kriteria sukses objektif"
    }
  ]
}
Diskusi:
${discussionContext}`;

    try {
      const llmResult = await globalProviderRegistry.sendMessageWithFallback(
        activeAgents[0]?.llmProviderId || 'local-lm-studio',
        ['local-lm-studio', 'mock-offline'],
        [
          {
            role: 'system',
            content:
              'Kamu adalah Moderator sistem multi-agent. Balas HANYA dengan raw JSON valid tanpa markdown formatting.',
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
            tasks: parsed.tasks.map((t: any, idx: number) => ({
              id: t.id || `task-${idx + 1}`,
              description: t.description || `Tugas #${idx + 1}`,
              assignedAgentId:
                t.assignedAgentId ||
                activeAgents[idx % activeAgents.length]?.id ||
                'agent-a',
              dependsOn: t.dependsOn || (idx > 0 ? [`task-${idx}`] : []),
              rationale: t.rationale || 'Optimalisasi alur dependensi modul.',
              successCriteria:
                t.successCriteria || 'Lolos verifikasi pengujian tanpa error.',
            })),
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

    // Dynamic Heuristic Fallback yang menyesuaikan dengan prompt user
    const dynamicTasks: PlannedTask[] = [
      {
        id: 'task-1',
        description: `Analisis spesifikasi & arsitektur teknis untuk: "${userPrompt.slice(0, 50)}"`,
        assignedAgentId: activeAgents[0]?.id || 'agent-a',
        rationale: 'Mencegah inkonsistensi arsitektur dan memvalidasi kompatibilitas Linux & Windows.',
        successCriteria: 'Dokumen arsitektur diverifikasi dan disetujui tanpa dependency conflict.',
      },
      {
        id: 'task-2',
        description: `Implementasi modul inti dan integrasi komponen sesuai tugas ${activeAgents[1]?.name || 'Worker'}`,
        assignedAgentId: activeAgents[1]?.id || activeAgents[0]?.id || 'agent-b',
        dependsOn: ['task-1'],
        rationale: 'Menjamin kode modular dan dapat diuji secara terisolasi.',
        successCriteria: 'Semua komponen ter-render dengan 0 runtime error dan lolos typecheck.',
      },
      {
        id: 'task-3',
        description: 'Verifikasi boundary states (Loading, Empty, Error, Success) dan uji lintas platform',
        assignedAgentId: activeAgents[2]?.id || activeAgents[0]?.id || 'agent-q',
        dependsOn: ['task-2'],
        rationale: 'Memastikan stabilitas aplikasi dan ketiadaan overflow tata letak.',
        successCriteria: 'Uji coba manual dan otomasi selesai dengan hasil 100% lulus.',
      },
    ];

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
