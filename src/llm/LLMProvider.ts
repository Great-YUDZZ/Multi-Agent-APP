import type { Message, LLMResponse } from '../types';

export interface LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly maxContextTokens: number;
  readonly supportsVision: boolean;
  readonly supportsToolUse: boolean;

  sendMessage(messages: Message[]): Promise<LLMResponse>;
  testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }>;
}
