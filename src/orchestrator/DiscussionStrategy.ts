import type { Agent, SessionMessage, UserProfile } from '../types';
import type { ModeratorEvaluation } from './ModeratorAgent';

export interface DiscussionCallbacks {
  onAgentStartThinking: (agent: Agent) => void;
  onAgentMessage: (message: SessionMessage) => void;
  onRoundComplete: (roundNumber: number, evaluation: ModeratorEvaluation) => void;
  onPlanGenerated: (evaluation: ModeratorEvaluation) => void;
  onStrategyStatus?: (status: string) => void;
}

/**
 * Strategy Pattern Interface untuk orkestrasi diskusi multi-agent (Blueprint Bagian 5).
 * Memungkinkan pergantian mulus antara Round-Robin Mode dan Hierarchical Mode.
 */
export interface DiscussionStrategy {
  readonly modeName: 'round-robin' | 'hierarchical';

  execute(
    userPrompt: string,
    roundNumber: number,
    activeAgents: Agent[],
    userProfile: UserProfile,
    allMessages: SessionMessage[],
    callbacks: DiscussionCallbacks,
    mentionedAgentId?: string
  ): Promise<ModeratorEvaluation>;
}
