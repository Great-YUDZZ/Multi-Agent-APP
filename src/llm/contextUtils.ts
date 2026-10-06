import type { Message } from '../types';

/**
 * Estimates token count using standard ~4 characters per token heuristic
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(messages: Message[]): number {
  return messages.reduce((acc, msg) => acc + estimateTokenCount(msg.content) + 4, 0);
}

/**
 * Truncates oldest non-system messages to keep total tokens under maxContextTokens.
 * Always preserves the first system message if present.
 */
export function truncateContext(messages: Message[], maxContextTokens: number, safetyBuffer: number = 500): Message[] {
  const allowedTokens = Math.max(500, maxContextTokens - safetyBuffer);
  let totalTokens = estimateMessagesTokens(messages);

  if (totalTokens <= allowedTokens) {
    return messages;
  }

  const systemMessage = messages.find((m) => m.role === 'system');
  const workingMessages = messages.filter((m) => m.role !== 'system');

  while (workingMessages.length > 1 && totalTokens > allowedTokens) {
    const removed = workingMessages.shift();
    if (removed) {
      totalTokens -= estimateTokenCount(removed.content) + 4;
    }
  }

  return systemMessage ? [systemMessage, ...workingMessages] : workingMessages;
}
