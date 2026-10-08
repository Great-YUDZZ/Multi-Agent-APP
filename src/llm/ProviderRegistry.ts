import type { Message, LLMResponse, ProviderConfig } from '../types';
import type { LLMProvider } from './LLMProvider';
import { LocalProvider } from './LocalProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { MockProvider } from './MockProvider';
import { ProviderStore } from '../storage/ProviderStore';
import { ApiKeyMissingError, ApiKeyInvalidError } from './errors';

export class ProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();

  constructor() {
    // Mock Provider hanya untuk pengujian offline terkontrol jika diminta secara eksplisit
    const mock = new MockProvider();
    this.providers.set('mock-offline', mock);
  }

  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(providerId: string): LLMProvider {
    let provider = this.providers.get(providerId);
    if (!provider) {
      // Check if providerId is in multi-model format (e.g. prov-openai:::gpt-4o-mini)
      const isSubModel = providerId.includes(':::');
      const baseId = isSubModel ? providerId.split(':::')[0] : providerId;
      const targetModel = isSubModel ? providerId.split(':::')[1] : null;

      // Dynamic lookup from user configured providers in ProviderStore
      try {
        const stored = ProviderStore.loadProviders();
        
        // Exact base ID match
        let found = stored.find((p) => p.id === baseId);

        // Alias matching for preset IDs used by initial agents
        if (!found) {
          if (baseId === 'anthropic-claude') {
            found = stored.find((p) => p.id === 'prov-anthropic' || p.providerType === 'anthropic');
          } else if (baseId === 'openai-gpt4o') {
            found = stored.find((p) => p.id === 'prov-openai' || p.model.toLowerCase().includes('gpt-4'));
          } else if (baseId === 'local-lm-studio') {
            found = stored.find((p) => p.id === 'prov-lm-studio' || p.providerType === 'lm-studio');
          }
        }

        if (found) {
          const config = targetModel
            ? { ...found, id: providerId, model: targetModel, label: `${found.label} (${targetModel})` }
            : found;
          provider = ProviderRegistry.createFromConfig(config);
          this.providers.set(providerId, provider);
          return provider;
        }
      } catch (err) {
        console.warn('Provider lookup error:', err);
      }

      // If user specifically requested 'mock-offline'
      if (providerId === 'mock-offline') {
        return this.providers.get('mock-offline') || new MockProvider();
      }

      // If not found and not mock, create an unconfigured endpoint provider that will throw ApiKeyMissingError
      if (providerId.toLowerCase().includes('anthropic') || providerId.toLowerCase().includes('claude')) {
        return new AnthropicProvider({
          id: providerId,
          providerType: 'anthropic',
          label: 'Anthropic Claude',
          model: 'claude-3-5-sonnet-20241022',
          apiKey: '',
        });
      }

      return new OpenAIProvider({
        id: providerId,
        providerType: 'openai-compatible',
        label: providerId,
        model: 'gpt-4o',
        apiKey: '',
      });
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
        return new OpenAIProvider(config);
    }
  }

  /**
   * Mengirim pesan dengan fallback berantai.
   * PENTING: Jangan gunakan mock-offline secara otomatis untuk percakapan pengguna nyata!
   */
  async sendMessageWithFallback(
    primaryId: string,
    fallbackIds: string[],
    messages: Message[],
    allowMock: boolean = false
  ): Promise<{ response: LLMResponse; usedProviderId: string; wasFallback: boolean }> {
    // Filter antrean: mock hanya diperbolehkan jika allowMock === true
    const validFallbacks = fallbackIds.filter((id) => (allowMock ? true : id !== 'mock-offline'));
    const queue = [primaryId, ...validFallbacks];
    let lastError: Error | null = null;

    for (let i = 0; i < queue.length; i++) {
      const pid = queue[i];
      let provider: LLMProvider;
      try {
        provider = this.get(pid);
        // Jika tidak mengizinkan mock dan provider adalah MockProvider, lemparkan ApiKeyMissingError
        if (!allowMock && provider instanceof MockProvider) {
          throw new ApiKeyMissingError(pid);
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (lastError instanceof ApiKeyMissingError || lastError instanceof ApiKeyInvalidError) {
          throw lastError;
        }
        continue;
      }

      try {
        const response = await provider.sendMessage(messages);
        return {
          response,
          usedProviderId: pid,
          wasFallback: i > 0,
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Jika error terkait API key (hilang, unauthorized, invalid, quota), lempar langsung ke UI!
        if (lastError instanceof ApiKeyMissingError || lastError instanceof ApiKeyInvalidError) {
          throw lastError;
        }
        console.warn(`Provider [${pid}] gagal: ${lastError.message}. Mencoba fallback berikutnya jika ada...`);
      }
    }

    if (lastError) {
      throw lastError;
    }
    throw new ApiKeyMissingError(primaryId);
  }
}

export const globalProviderRegistry = new ProviderRegistry();

