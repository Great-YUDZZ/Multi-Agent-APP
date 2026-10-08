import type { Message, LLMResponse, ProviderConfig } from '../types';
import type { LLMProvider } from './LLMProvider';
import { truncateContext, estimateTokenCount } from './contextUtils';
import { ApiKeyMissingError, ApiKeyInvalidError } from './errors';

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
    this.apiKey = (config.apiKey || '').trim();
    this.model = (config.model || 'gpt-4o').trim();
    let rawUrl = (config.baseUrl || 'https://api.openai.com/v1').trim();
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = `http://${rawUrl}`;
    }
    this.baseUrl = rawUrl.replace(/\/+$/, '');
  }

  async sendMessage(messages: Message[]): Promise<LLMResponse> {
    if (!this.apiKey || !this.apiKey.trim()) {
      throw new ApiKeyMissingError(this.id, this.name);
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
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDescription = errorText;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.error?.message) {
            errorDescription = parsed.error.message;
            const match = errorDescription.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const nested = JSON.parse(match[0]);
                if (nested.error?.message) {
                  errorDescription = nested.error.message;
                }
              } catch {}
            }
          }
        } catch {}

        if (response.status === 404) {
          throw new Error(`Model '${this.model}' tidak ditemukan di endpoint ini (HTTP 404: ${errorDescription}). Gunakan fitur Deteksi Model di Settings untuk memilih model yang aktif.`);
        }

        const lowerError = errorText.toLowerCase();
        if (
          response.status === 401 ||
          response.status === 403 ||
          lowerError.includes('api_key') ||
          lowerError.includes('api key') ||
          lowerError.includes('unauthorized') ||
          lowerError.includes('authentication') ||
          lowerError.includes('quota')
        ) {
          throw new ApiKeyInvalidError(this.id, `HTTP ${response.status}: ${errorDescription}`, this.name);
        }
        throw new Error(`${this.name} error (${response.status}): ${errorDescription}`);
      }

      const rawText = await response.text();
      let content = '';
      let usage: { inputTokens: number; outputTokens: number } | undefined;

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') || rawText.trim().startsWith('data:')) {
        // SSE parsing
        const lines = rawText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (dataStr && dataStr !== '[DONE]') {
              try {
                const parsed = JSON.parse(dataStr);
                const chunk = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
                content += chunk;
                if (parsed.usage) {
                  usage = { inputTokens: parsed.usage.prompt_tokens, outputTokens: parsed.usage.completion_tokens };
                }
              } catch {}
            }
          }
        }
      } else {
        // Standard JSON parsing
        try {
          const data = JSON.parse(rawText);
          content = data.choices?.[0]?.message?.content || '';
          if (data.usage) {
            usage = { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens };
          }
        } catch {
          content = rawText;
        }
      }

      if (!usage) {
        usage = {
          inputTokens: estimateTokenCount(messages.map((m) => m.content).join(' ')),
          outputTokens: estimateTokenCount(content),
        };
      }

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
      throw new Error(`Request ke ${this.name} gagal: ${msg}`);
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
          message: `${this.name} terhubung (${latencyMs}ms)`,
          latencyMs,
        };
      }
      const errText = await res.text();
      return { success: false, message: `HTTP ${res.status}: Gagal memvalidasi API key (${errText.slice(0, 100)})` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Gagal terhubung ke ${this.baseUrl}: ${msg}` };
    }
  }
}
