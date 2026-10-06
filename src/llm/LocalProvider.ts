import type { Message, LLMResponse, ProviderConfig } from '../types';
import type { LLMProvider } from './LLMProvider';
import { truncateContext, estimateTokenCount } from './contextUtils';

export class LocalProvider implements LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly maxContextTokens: number = 8192;
  readonly supportsVision: boolean = false;
  readonly supportsToolUse: boolean = true;
  private baseUrl: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.id = config.id;
    this.name = config.label || 'LM Studio (Lokal)';
    this.baseUrl = (config.baseUrl || 'http://localhost:1234/v1').replace(/\/+$/, '');
    this.model = config.model || 'local-model';
    if (this.model.toLowerCase().includes('vision')) {
      this.supportsVision = true;
    }
  }

  async sendMessage(messages: Message[]): Promise<LLMResponse> {
    const truncated = truncateContext(messages, this.maxContextTokens);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: truncated,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LM Studio error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage
        ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
        : { inputTokens: estimateTokenCount(messages.map((m) => m.content).join(' ')), outputTokens: estimateTokenCount(content) };

      return { content, usage };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Koneksi LM Studio gagal: ${msg}. Pastikan server LM Studio aktif di ${this.baseUrl}`);
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const start = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}/models`, { method: 'GET' });
      const latencyMs = Math.round(performance.now() - start);

      if (res.ok) {
        return {
          success: true,
          message: `Terhubung ke LM Studio (${latencyMs}ms)`,
          latencyMs,
        };
      }
      return {
        success: false,
        message: `HTTP ${res.status}: Gagal memuat daftar model dari LM Studio`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Server LM Studio offline di ${this.baseUrl} (${msg})`,
      };
    }
  }
}
