export interface TurnQueueState {
  normalOrder: string[];       // agentIds in regular order
  currentIndex: number;
  priorityOverride?: string;   // agentId prioritized via @ mention
  mentionChainCount: number;   // number of consecutive mentions in current round
  maxMentionChainPerRound: number;
}

export class TurnQueue {
  private state: TurnQueueState;

  constructor(agentIds: string[], maxMentionChainPerRound = 3) {
    this.state = {
      normalOrder: [...agentIds],
      currentIndex: 0,
      mentionChainCount: 0,
      maxMentionChainPerRound,
    };
  }

  /**
   * Sets priority override when an agent is mentioned via @
   */
  requestPriority(agentId: string): boolean {
    if (!this.state.normalOrder.includes(agentId)) {
      return false;
    }

    if (this.state.mentionChainCount >= this.state.maxMentionChainPerRound) {
      console.warn('Batas rantai mention tercapai, kembali ke urutan giliran normal.');
      return false;
    }

    this.state.priorityOverride = agentId;
    this.state.mentionChainCount += 1;
    return true;
  }

  /**
   * Gets the next agentId in turn
   */
  nextTurn(): string | null {
    if (this.state.normalOrder.length === 0) return null;

    if (this.state.priorityOverride) {
      const priority = this.state.priorityOverride;
      this.state.priorityOverride = undefined;
      return priority;
    }

    const currentAgent = this.state.normalOrder[this.state.currentIndex];
    this.state.currentIndex = (this.state.currentIndex + 1) % this.state.normalOrder.length;
    return currentAgent;
  }

  /**
   * Resets queue state for a new discussion round
   */
  resetRound(): void {
    this.state.currentIndex = 0;
    this.state.priorityOverride = undefined;
    this.state.mentionChainCount = 0;
  }

  get queue(): string[] {
    return [...this.state.normalOrder];
  }
}
