import type {
  Agent,
  SessionMessage,
  UserProfile,
  DiscussionModeType,
  PlanDocument,
  CommandApprovalRequest,
} from '../types';
import { RoundRobinMode } from './RoundRobinMode';
import { HierarchicalMode } from './HierarchicalMode';
import type { DiscussionStrategy, DiscussionCallbacks } from './DiscussionStrategy';
import { BuildModeController, type BuildModeCallbacks } from './BuildModeController';
import type { ModeratorEvaluation } from './ModeratorAgent';

export interface OrchestratorOptions {
  strategyType?: DiscussionModeType;
  maxRounds?: number;
  onRequestCommandApproval?: (request: CommandApprovalRequest) => Promise<boolean>;
}

/**
 * Orchestrator — Router dan koordinator utama sistem multi-agent (Blueprint Bagian 2 & 5).
 * Bertindak sebagai facade tunggal antara lapisan UI dan engine eksekusi (Plan / Build / Tools).
 */
export class Orchestrator {
  private strategyType: DiscussionModeType;
  private maxRounds: number;
  private buildController: BuildModeController | null = null;
  private onRequestCommandApproval?: (request: CommandApprovalRequest) => Promise<boolean>;

  constructor(options: OrchestratorOptions = {}) {
    this.strategyType = options.strategyType || 'round-robin';
    this.maxRounds = options.maxRounds || 3;
    this.onRequestCommandApproval = options.onRequestCommandApproval;
  }

  setRequestApprovalHandler(handler: (request: CommandApprovalRequest) => Promise<boolean>): void {
    this.onRequestCommandApproval = handler;
  }

  getRequestApprovalHandler(): ((request: CommandApprovalRequest) => Promise<boolean>) | undefined {
    return this.onRequestCommandApproval;
  }

  setStrategy(type: DiscussionModeType): void {
    this.strategyType = type;
  }

  getStrategy(): DiscussionModeType {
    return this.strategyType;
  }

  /**
   * Membuat instance strategi yang sesuai (Strategy Pattern)
   */
  private createStrategyInstance(agentIds: string[]): DiscussionStrategy {
    if (this.strategyType === 'hierarchical') {
      return new HierarchicalMode(agentIds, this.maxRounds);
    }
    return new RoundRobinMode(agentIds, this.maxRounds);
  }

  /**
   * Menjalankan putaran diskusi dalam Plan Mode
   */
  async executePlanDiscussion(
    userPrompt: string,
    roundNumber: number,
    activeAgents: Agent[],
    userProfile: UserProfile,
    allMessages: SessionMessage[],
    callbacks: DiscussionCallbacks,
    mentionedAgentId?: string,
    workspaceContext?: { path: string; files: string[] }
  ): Promise<ModeratorEvaluation> {
    const strategy = this.createStrategyInstance(activeAgents.map((a) => a.id));

    return strategy.execute(
      userPrompt,
      roundNumber,
      activeAgents,
      userProfile,
      allMessages,
      callbacks,
      mentionedAgentId,
      workspaceContext
    );
  }

  /**
   * Mempersiapkan dan memulai eksekusi Build Mode
   */
  async startBuildExecution(
    plan: PlanDocument,
    availableAgents: Agent[],
    callbacks: BuildModeCallbacks,
    workspacePath?: string
  ): Promise<void> {
    this.buildController = new BuildModeController(plan, availableAgents, workspacePath);
    await this.buildController.startBuild(callbacks);
  }

  /**
   * Menyetujui alternatif deviasi pada task tertentu di Build Mode
   */
  async approveTaskDeviation(
    taskId: string,
    callbacks: BuildModeCallbacks
  ): Promise<void> {
    if (!this.buildController) {
      throw new Error('Build controller belum diinisialisasi.');
    }
    await this.buildController.approveDeviation(taskId, callbacks);
  }

  getBuildController(): BuildModeController | null {
    return this.buildController;
  }
}

export const globalOrchestrator = new Orchestrator();
