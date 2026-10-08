import type { Message, LLMResponse, ProviderConfig } from '../types';
import type { LLMProvider } from './LLMProvider';
import { truncateContext, estimateTokenCount } from './contextUtils';
import { ApiKeyMissingError, ApiKeyInvalidError } from './errors';

export class AnthropicProvider implements LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly maxContextTokens: number = 200000;
  readonly supportsVision: boolean = true;
  readonly supportsToolUse: boolean = true;
  private apiKey: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.id = config.id;
    this.name = config.label || 'Anthropic Claude';
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'claude-3-5-sonnet-20241022';
  }

  async sendMessage(messages: Message[]): Promise<LLMResponse> {
    if (!this.apiKey || !this.apiKey.trim()) {
      throw new ApiKeyMissingError(this.id, this.name);
    }

    const truncated = truncateContext(messages, this.maxContextTokens);
    const systemMessage = truncated.find((m) => m.role === 'system');
    const userAndAssistant = truncated
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          system: systemMessage ? systemMessage.content : undefined,
          messages: userAndAssistant,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const lowerError = errorText.toLowerCase();
        if (
          response.status === 401 ||
          response.status === 403 ||
          lowerError.includes('api_key') ||
          lowerError.includes('api-key') ||
          lowerError.includes('unauthorized') ||
          lowerError.includes('authentication') ||
          lowerError.includes('credit')
        ) {
          throw new ApiKeyInvalidError(this.id, `HTTP ${response.status}: ${errorText}`, this.name);
        }
        throw new Error(`Anthropic error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      const usage = data.usage
        ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
        : { inputTokens: estimateTokenCount(messages.map((m) => m.content).join(' ')), outputTokens: estimateTokenCount(content) };

      return { content, usage };
    } catch (err: unknown) {
      if (err instanceof ApiKeyMissingError || err instanceof ApiKeyInvalidError) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('401') ||
        msg.includes('403') ||
        msg.toLowerCase().includes('api key') ||
        msg.toLowerCase().includes('unauthorized')
      ) {
        throw new ApiKeyInvalidError(this.id, msg, this.name);
      }
      throw new Error(`Anthropic request gagal: ${msg}`);
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    if (!this.apiKey) {
      return { success: false, message: 'API key kosong' };
    }
    const start = performance.now();
    try {
      await this.sendMessage([{ role: 'user', content: 'Ping' }]);
      const latencyMs = Math.round(performance.now() - start);
      return {
        success: true,
        message: `${this.name} terhubung (${latencyMs}ms)`,
        latencyMs,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg };
    }
  }
}
