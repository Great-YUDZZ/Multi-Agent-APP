import type { Message, LLMResponse, ProviderConfig } from '../types';
import type { LLMProvider } from './LLMProvider';
import { truncateContext, estimateTokenCount } from './contextUtils';

export class OpenAIProvider implements LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly maxContextTokens: number = 128000;
  readonly supportsVision: boolean = true;
  readonly supportsToolUse: boolean = true;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    this.id = config.id;
    this.name = config.label || 'OpenAI';
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'gpt-4o';
    this.baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  }

  async sendMessage(messages: Message[]): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key belum dikonfigurasi di Settings -> Providers.');
    }

    const truncated = truncateContext(messages, this.maxContextTokens);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: truncated,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage
        ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
        : { inputTokens: estimateTokenCount(messages.map((m) => m.content).join(' ')), outputTokens: estimateTokenCount(content) };

      return { content, usage };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`OpenAI request gagal: ${msg}`);
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    if (!this.apiKey) {
      return { success: false, message: 'API key kosong' };
    }
    const start = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        return {
          success: true,
          message: `OpenAI valid (${latencyMs}ms)`,
          latencyMs,
        };
      }
      return { success: false, message: `HTTP ${res.status}: Gagal memvalidasi API key` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg };
    }
  }
}
