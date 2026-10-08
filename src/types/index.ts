export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface LLMProvider {
  readonly name: string;
  readonly maxContextTokens: number;
  readonly supportsVision: boolean;
  readonly supportsToolUse: boolean;
  sendMessage(messages: Message[]): Promise<LLMResponse>;
}

export type ProviderCategory = 'local' | 'endpoint';
export type ProviderType = 'openai-compatible' | 'anthropic' | 'lm-studio' | 'custom';

export interface ProviderConfig {
  id: string;
  category?: ProviderCategory; // 'local' untuk Local LLM, 'endpoint' untuk Cloud/API Endpoint
  providerType: ProviderType;
  label: string; // Custom name given by user, e.g. "DeepSeek Utama", "Groq Llama 3"
  apiKey?: string;
  baseUrl?: string;
  model: string;
  models?: string[]; // Daftar model aktif yang terdaftar untuk provider ini
  detectedModels?: string[]; // Cache riwayat model yang berhasil dideteksi
}

export interface AgentPermissions {
  internetAccess: 'denied' | 'ask-every-time' | 'allowed';
  terminalAccess: {
    mode: 'ask-every-time' | 'whitelist-safe' | 'allowed';
    alwaysAllow?: string[];
    alwaysAsk?: string[];
  };
  obsidianAccess?: 'denied' | 'read-only' | 'read-write';
}

export * from './obsidian';

export interface Skill {
  id: string;
  filePath: string;
  name: string;
  description: string;
  content?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  initial: string;
  color: string; // hex or tailwind class
  instructions: string;
  skillIds: string[];
  llmProviderId: string;
  permissions: AgentPermissions;
}

export interface PlannedTask {
  id: string;
  description: string;
  assignedAgentId: string;
  dependsOn?: string[];
  rationale?: string;
  successCriteria: string;
}

export interface PlanDocument {
  id: string;
  goal: string;
  createdAt: string;
  tasks: PlannedTask[];
  openQuestions?: string[];
}

export interface AttachedFile {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  content: 
    | { type: 'text'; text: string }
    | { type: 'image'; base64: string }
    | { type: 'unsupported'; reason: string };
}

export interface SessionMessage {
  id: string;
  timestamp: number;
  speaker: 
    | { type: 'user' }
    | { type: 'agent'; agentId: string; agentName: string; initial: string; color: string }
    | { type: 'system'; event: string };
  content: string;
  relatedTaskId?: string;
  attachments?: AttachedFile[];
  obsidianAction?: { action: 'search' | 'read' | 'write'; target: string; resultSummary: string };
}

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

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  lastActiveAt: number;
  mode: 'plan' | 'build' | 'free-chat';
  participantAgentIds: string[];
  planDocument?: PlanDocument;
  messages: SessionMessage[];
  attachedFiles: AttachedFile[];
  walkthrough?: string;
  buildStates?: TaskRuntimeState[];
}

export interface UserProfile {
  displayName: string;
  onboardingCompleted: boolean;
  theme: 'dark' | 'light';
  fontSize: 'Kecil' | 'Sedang' | 'Besar';
  typingAnimation: boolean;
}

export type DiscussionModeType = 'round-robin' | 'hierarchical';

export type TrustLevel = 'secure' | 'review-driven' | 'agent-driven' | 'custom';

export interface CommandApprovalRequest {
  id: string;
  agentId: string;
  agentName: string;
  command: string;
  reason: string;
  platform: 'linux' | 'windows' | 'darwin';
  alwaysAllowOption?: boolean;
}

export interface ScreenshotRef {
  taskId: string;
  imagePath: string;
  caption: string;
}

export interface Walkthrough {
  id: string;
  sessionId: string;
  summary: string;
  completedTasks: PlannedTask[];
  visualEvidence?: ScreenshotRef[];
  generatedAt: number;
}
