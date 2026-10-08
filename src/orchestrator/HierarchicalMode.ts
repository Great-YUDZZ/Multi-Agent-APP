import type { Agent, SessionMessage, UserProfile } from '../types';
import { ModeratorAgent, type ModeratorEvaluation } from './ModeratorAgent';
import { globalProviderRegistry } from '../llm/ProviderRegistry';
import { globalSkillRegistry } from '../skills/SkillRegistry';
import { WebTool } from '../tools/WebTool';
import { ObsidianTool } from '../tools/ObsidianTool';
import type { DiscussionStrategy, DiscussionCallbacks } from './DiscussionStrategy';

/**
 * HierarchicalMode — Strategi orkestrasi hirarkis (Blueprint Bagian 5).
 * Satu Manager Agent membagi tugas ke worker agents, lalu merangkum hasil kerja kolektif.
 */
export class HierarchicalMode implements DiscussionStrategy {
  readonly modeName = 'hierarchical' as const;
  private moderator: ModeratorAgent;
  private maxRounds: number;

  constructor(_agentIds: string[], maxRounds = 3) {
    this.moderator = new ModeratorAgent();
    this.maxRounds = maxRounds;
  }

  async execute(
    userPrompt: string,
    roundNumber: number,
    activeAgents: Agent[],
    userProfile: UserProfile,
    allMessages: SessionMessage[],
    callbacks: DiscussionCallbacks,
    mentionedAgentId?: string
  ): Promise<ModeratorEvaluation> {
    if (activeAgents.length === 0) {
      throw new Error('Tidak ada agent aktif untuk menjalankan HierarchicalMode.');
    }

    const currentRoundMessages: SessionMessage[] = [];

    // Tentukan Manager Agent (prioritas jika di-mention, atau agent pertama sebagai ketua)
    const managerIndex = mentionedAgentId
      ? activeAgents.findIndex((a) => a.id === mentionedAgentId)
      : 0;
    const manager = managerIndex >= 0 ? activeAgents[managerIndex] : activeAgents[0];
    const workers = activeAgents.filter((a) => a.id !== manager.id);

    callbacks.onStrategyStatus?.(`[Hierarchical] Manager: ${manager.name} menganalisis instruksi...`);
    callbacks.onAgentStartThinking(manager);

    // Langkah 1: Manager membagi tugas/delegasi ke para pekerja
    const managerDirectivePrompt = {
      role: 'system' as const,
      content: `${manager.instructions}
Nama pengguna adalah ${userProfile.displayName}.
Kamu berperan sebagai MANAGER / LEAD ARCHITECT. Tugasmu:
1. Pahami tujuan pengguna: "${userPrompt}".
2. Berikan arahan teknis dan delegasikan sub-tugas spesifik kepada anggota tim: ${workers.map((w) => `${w.name} (${w.role})`).join(', ')}.
${globalSkillRegistry.formatSkillsPrompt(manager.skillIds || [])}`,
    };

    let managerDirectiveContent = '';
    try {
      const managerResult = await globalProviderRegistry.sendMessageWithFallback(
        manager.llmProviderId,
        [],
        [managerDirectivePrompt, { role: 'user', content: userPrompt }]
      );
      managerDirectiveContent = managerResult.response.content;

      const managerMsg: SessionMessage = {
        id: `msg-${manager.id}-${Date.now()}`,
        timestamp: Date.now(),
        speaker: {
          type: 'agent',
          agentId: manager.id,
          agentName: manager.name,
          initial: manager.initial,
          color: manager.color,
        },
        content: `[LEAD DIRECTIVE]\n${managerDirectiveContent}`,
      };

      currentRoundMessages.push(managerMsg);
      callbacks.onAgentMessage(managerMsg);
    } catch (err) {
      console.error(`Manager ${manager.name} gagal memberikan arahan:`, err);
      throw err;
    }

    // Langkah 2: Setiap Worker Agent merespons instruksi manajer sesuai keahliannya
    for (const worker of workers) {
      callbacks.onAgentStartThinking(worker);
      callbacks.onStrategyStatus?.(`[Hierarchical] Worker ${worker.name} sedang mengerjakan delegasi...`);

      const obsidianNotice =
        worker.permissions.obsidianAccess !== 'denied'
          ? `\n${ObsidianTool.TOOL_INSTRUCTIONS}`
          : '';

      const workerPrompt = {
        role: 'system' as const,
        content: `${worker.instructions}
Kamu adalah spesialis: ${worker.role}.
Manajer (${manager.name}) telah memberikan arahan:
"""
${managerDirectiveContent}
"""
Berikan usulan solusi, rancangan kode/arsitektur, dan kriteria sukses sesuai bidangmu.
${globalSkillRegistry.formatSkillsPrompt(worker.skillIds || [])}
${worker.permissions.internetAccess === 'allowed' ? WebTool.SYSTEM_SECURITY_NOTICE : ''}${obsidianNotice}`,
      };

      try {
        const workerResult = await globalProviderRegistry.sendMessageWithFallback(
          worker.llmProviderId,
          [],
          [workerPrompt, { role: 'user', content: `Laksanakan arahan teknis terkait: ${userPrompt}` }]
        );

        let finalContent = workerResult.response.content;
        let lastObsidianAction: SessionMessage['obsidianAction'] = undefined;

        // Otonom: Parse dan eksekusi tool call Obsidian jika ada
        const obsidianCalls = ObsidianTool.parseToolCalls(workerResult.response.content);
        if (obsidianCalls.length > 0) {
          for (const call of obsidianCalls) {
            callbacks.onStrategyStatus?.(
              `[Obsidian] ${worker.name} sedang ${
                call.action === 'read'
                  ? 'membaca'
                  : call.action === 'write'
                  ? 'menulis'
                  : 'mencari'
              } [[${call.title || call.query}]]...`
            );

            const toolRes = await ObsidianTool.execute(call, worker.permissions);
            lastObsidianAction = {
              action: call.action,
              target: call.title || call.query || 'Note',
              resultSummary: toolRes.message,
            };

            if (toolRes.success && (call.action === 'read' || call.action === 'search')) {
              try {
                const followUp = await globalProviderRegistry.sendMessageWithFallback(
                  worker.llmProviderId,
                  [],
                  [
                    workerPrompt,
                    { role: 'assistant', content: workerResult.response.content },
                    {
                      role: 'user',
                      content: `Hasil dari Obsidian:\n${toolRes.formattedOutput}\nLanjutkan rekomendasi teknis Anda mengacu pada data Obsidian di atas.`,
                    },
                  ]
                );
                finalContent = followUp.response.content;
              } catch (followErr) {
                console.warn('Sintesis tool Obsidian worker gagal:', followErr);
              }
            }
          }
        }

        const workerMsg: SessionMessage = {
          id: `msg-${worker.id}-${Date.now()}`,
          timestamp: Date.now(),
          speaker: {
            type: 'agent',
            agentId: worker.id,
            agentName: worker.name,
            initial: worker.initial,
            color: worker.color,
          },
          content: finalContent,
          obsidianAction: lastObsidianAction,
        };

        currentRoundMessages.push(workerMsg);
        callbacks.onAgentMessage(workerMsg);
      } catch (err) {
        console.error(`Worker ${worker.name} gagal merespons:`, err);
        throw err;
      }
    }

    // Langkah 3: Manager melakukan konsolidasi akhir jika ada lebih dari 1 worker
    if (workers.length > 0) {
      callbacks.onAgentStartThinking(manager);
      callbacks.onStrategyStatus?.(`[Hierarchical] Manager ${manager.name} menyintesis seluruh masukan tim...`);

      const synthesisPrompt = {
        role: 'system' as const,
        content: `${manager.instructions}
Kamu adalah Manager. Anggota timmu telah memberikan laporan teknis berikut:
${currentRoundMessages
  .filter((m) => m.speaker.type === 'agent' && m.speaker.agentId !== manager.id)
  .map((m) => `${m.speaker.type === 'agent' ? m.speaker.agentName : ''}: ${m.content}`)
  .join('\n\n')}

Buat ringkasan arsitektur final yang menyatukan seluruh usulan menjadi rencana eksekusi terpadu.`,
      };

      try {
        const synthesisResult = await globalProviderRegistry.sendMessageWithFallback(
          manager.llmProviderId,
          [],
          [synthesisPrompt, { role: 'user', content: 'Sintesiskan konsensus tim final.' }]
        );

        const synthesisMsg: SessionMessage = {
          id: `msg-${manager.id}-synthesis-${Date.now()}`,
          timestamp: Date.now(),
          speaker: {
            type: 'agent',
            agentId: manager.id,
            agentName: manager.name,
            initial: manager.initial,
            color: manager.color,
          },
          content: `[KONSOLIDASI AKHIR]\n${synthesisResult.response.content}`,
        };

        currentRoundMessages.push(synthesisMsg);
        callbacks.onAgentMessage(synthesisMsg);
      } catch (err) {
        console.error('Sintesis manajer gagal:', err);
        throw err;
      }
    }

    // Evaluasi putaran via ModeratorAgent
    const combinedMessages = [...allMessages, ...currentRoundMessages];
    const evaluation = await this.moderator.evaluateDiscussion(
      combinedMessages,
      activeAgents,
      roundNumber,
      this.maxRounds
    );

    callbacks.onRoundComplete(roundNumber, evaluation);

    if (evaluation.status === 'FINISHED' && evaluation.planDocument) {
      callbacks.onPlanGenerated(evaluation);
    }

    return evaluation;
  }
}
