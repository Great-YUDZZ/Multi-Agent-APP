import type { Agent, SessionMessage, UserProfile } from '../types';
import { TurnQueue } from './TurnQueue';
import { ModeratorAgent, type ModeratorEvaluation } from './ModeratorAgent';
import { globalProviderRegistry } from '../llm/ProviderRegistry';
import { globalSkillRegistry } from '../skills/SkillRegistry';
import { WebTool } from '../tools/WebTool';
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

      // Format skill & security guard
      const skillBlock = globalSkillRegistry.formatSkillsPrompt(agent.skillIds || []);
      const securityNotice =
        agent.permissions.internetAccess === 'allowed'
          ? `\n${WebTool.SYSTEM_SECURITY_NOTICE}`
          : '';

      const agentSystemPrompt = {
        role: 'system' as const,
        content: `${agent.instructions}
Nama pengguna adalah ${userProfile.displayName}. Diskusi Plan Mode, putaran ${roundNumber}.
Berikan analisis teknis terstruktur dan kriteria implementasi yang jelas.${skillBlock}${securityNotice}`,
      };

      try {
        const result = await globalProviderRegistry.sendMessageWithFallback(
          agent.llmProviderId,
          ['local-lm-studio', 'mock-offline'],
          [agentSystemPrompt, ...conversationContext]
        );

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
          content: result.response.content,
        };

        currentRoundMessages.push(newMsg);
        callbacks.onAgentMessage(newMsg);
      } catch (err: unknown) {
        console.error(`Error during turn of ${agent.name}:`, err);
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
