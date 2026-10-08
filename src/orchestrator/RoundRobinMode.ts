import type { Agent, SessionMessage, UserProfile } from '../types';
import { TurnQueue } from './TurnQueue';
import { ModeratorAgent, type ModeratorEvaluation } from './ModeratorAgent';
import { globalProviderRegistry } from '../llm/ProviderRegistry';
import { globalSkillRegistry } from '../skills/SkillRegistry';
import { WebTool } from '../tools/WebTool';
import { ObsidianTool } from '../tools/ObsidianTool';
import type { DiscussionStrategy, DiscussionCallbacks } from './DiscussionStrategy';

export type RoundRobinCallbacks = DiscussionCallbacks;

export class RoundRobinMode implements DiscussionStrategy {
  readonly modeName = 'round-robin' as const;
  private turnQueue: TurnQueue;
  private moderator: ModeratorAgent;
  private maxRounds: number;

  constructor(agentIds: string[], maxRounds = 3) {
    this.turnQueue = new TurnQueue(agentIds);
    this.moderator = new ModeratorAgent();
    this.maxRounds = maxRounds;
  }

  /**
   * Implementasi kontrak DiscussionStrategy.execute
   */
  async execute(
    userPrompt: string,
    roundNumber: number,
    activeAgents: Agent[],
    userProfile: UserProfile,
    allMessages: SessionMessage[],
    callbacks: DiscussionCallbacks,
    mentionedAgentId?: string
  ): Promise<ModeratorEvaluation> {
    return this.executeRound(
      userPrompt,
      roundNumber,
      activeAgents,
      userProfile,
      allMessages,
      callbacks,
      mentionedAgentId
    );
  }

  /**
   * Menjalankan putaran diskusi bergiliran (Round-Robin)
   */
  async executeRound(
    userPrompt: string,
    roundNumber: number,
    activeAgents: Agent[],
    userProfile: UserProfile,
    allMessages: SessionMessage[],
    callbacks: DiscussionCallbacks,
    mentionedAgentId?: string
  ): Promise<ModeratorEvaluation> {
    if (mentionedAgentId) {
      this.turnQueue.requestPriority(mentionedAgentId);
    }

    const currentRoundMessages: SessionMessage[] = [];

    // Setiap agent mengambil giliran pada putaran ini
    for (let i = 0; i < activeAgents.length; i++) {
      const nextAgentId = this.turnQueue.nextTurn();
      if (!nextAgentId) break;

      const agent = activeAgents.find((a) => a.id === nextAgentId);
      if (!agent) continue;

      callbacks.onAgentStartThinking(agent);

      // Konteks riwayat percakapan yang aman
      const conversationContext = [
        ...allMessages.slice(-8).map((m) => ({
          role: m.speaker.type === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.content,
        })),
        { role: 'user' as const, content: userPrompt },
      ];

      // Format skill & security guard & Obsidian tool
      const skillBlock = globalSkillRegistry.formatSkillsPrompt(agent.skillIds || []);
      const securityNotice =
        agent.permissions.internetAccess === 'allowed'
          ? `\n${WebTool.SYSTEM_SECURITY_NOTICE}`
          : '';
      const obsidianNotice =
        agent.permissions.obsidianAccess !== 'denied'
          ? `\n${ObsidianTool.TOOL_INSTRUCTIONS}`
          : '';

      const agentSystemPrompt = {
        role: 'system' as const,
        content: `${agent.instructions}
Nama pengguna adalah ${userProfile.displayName}. Diskusi Plan Mode, putaran ${roundNumber}.
Berikan analisis teknis terstruktur dan kriteria implementasi yang jelas.${skillBlock}${securityNotice}${obsidianNotice}`,
      };

      try {
        const result = await globalProviderRegistry.sendMessageWithFallback(
          agent.llmProviderId,
          [],
          [agentSystemPrompt, ...conversationContext]
        );

        let finalContent = result.response.content;
        let lastObsidianAction: SessionMessage['obsidianAction'] = undefined;

        // Otonom: Parse dan eksekusi tool call Obsidian jika ada
        const obsidianCalls = ObsidianTool.parseToolCalls(result.response.content);
        if (obsidianCalls.length > 0) {
          for (const call of obsidianCalls) {
            callbacks.onStrategyStatus?.(
              `[Obsidian] ${agent.name} sedang ${
                call.action === 'read'
                  ? 'membaca'
                  : call.action === 'write'
                  ? 'menulis'
                  : 'mencari'
              } [[${call.title || call.query}]]...`
            );

            const toolRes = await ObsidianTool.execute(call, agent.permissions);
            lastObsidianAction = {
              action: call.action,
              target: call.title || call.query || 'Note',
              resultSummary: toolRes.message,
            };

            // Jika agen meminta baca/cari, beri putaran sintesis agar jawaban memanfaatkan data tersebut
            if (toolRes.success && (call.action === 'read' || call.action === 'search')) {
              try {
                const followUp = await globalProviderRegistry.sendMessageWithFallback(
                  agent.llmProviderId,
                  [],
                  [
                    agentSystemPrompt,
                    ...conversationContext,
                    { role: 'assistant', content: result.response.content },
                    {
                      role: 'user',
                      content: `Hasil dari Obsidian:\n${toolRes.formattedOutput}\nLanjutkan analisis dan rekomendasi Anda mengacu pada data Obsidian di atas.`,
                    },
                  ]
                );
                finalContent = followUp.response.content;
              } catch (followErr) {
                console.warn('Sintesis tool Obsidian gagal, menggunakan konten awal:', followErr);
              }
            }
          }
        }

        const newMsg: SessionMessage = {
          id: `msg-${agent.id}-${Date.now()}`,
          timestamp: Date.now(),
          speaker: {
            type: 'agent',
            agentId: agent.id,
            agentName: agent.name,
            initial: agent.initial,
            color: agent.color,
          },
          content: finalContent,
          obsidianAction: lastObsidianAction,
        };

        currentRoundMessages.push(newMsg);
        callbacks.onAgentMessage(newMsg);
      } catch (err: unknown) {
        console.error(`Error during turn of ${agent.name}:`, err);
        throw err;
      }
    }

    // Evaluasi putaran melalui ModeratorAgent secara asinkron
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

    this.turnQueue.resetRound();
    return evaluation;
  }
}
