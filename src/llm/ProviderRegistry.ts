import type { Message, LLMResponse, ProviderConfig } from '../types';
import type { LLMProvider } from './LLMProvider';
import { LocalProvider } from './LocalProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { MockProvider } from './MockProvider';

import { ProviderStore } from '../storage/ProviderStore';

export class ProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();

  constructor() {
    // Default Mock Provider always present
    const mock = new MockProvider();
    this.providers.set('mock-offline', mock);
  }

  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(providerId: string): LLMProvider {
    let provider = this.providers.get(providerId);
    if (!provider) {
      // Dynamic lookup from user configured providers in ProviderStore
      try {
        const stored = ProviderStore.loadProviders();
        const found = stored.find((p) => p.id === providerId);
        if (found) {
          provider = ProviderRegistry.createFromConfig(found);
          this.providers.set(providerId, provider);
          return provider;
        }
      } catch (err) {
        console.warn('Provider lookup error:', err);
      }
      return this.providers.get('mock-offline') || new MockProvider();
    }
    return provider;
  }

  listAll(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  static createFromConfig(config: ProviderConfig): LLMProvider {
    switch (config.providerType) {
      case 'lm-studio':
        return new LocalProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'openai-compatible':
      case 'custom':
        return new OpenAIProvider(config);
      default:
        return new MockProvider();
    }
  }

  /**
   * Sends message with chained fallback strategy (Blueprint Section 13.4)
   */
  async sendMessageWithFallback(
    primaryId: string,
    fallbackIds: string[],
    messages: Message[]
  ): Promise<{ response: LLMResponse; usedProviderId: string; wasFallback: boolean }> {
    const queue = [primaryId, ...fallbackIds, 'mock-offline'];
    let lastError: Error | null = null;

    for (let i = 0; i < queue.length; i++) {
      const pid = queue[i];
      const provider = this.get(pid);

      try {
        const response = await provider.sendMessage(messages);
        return {
          response,
          usedProviderId: pid,
          wasFallback: i > 0,
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`Provider [${pid}] gagal: ${lastError.message}. Mencoba fallback berikutnya...`);
      }
    }

    throw new Error(`Semua provider gagal merespons: ${lastError?.message}`);
  }
}

export const globalProviderRegistry = new ProviderRegistry();
