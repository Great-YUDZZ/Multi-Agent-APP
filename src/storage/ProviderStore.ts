import type { ProviderConfig } from '../types';

const PROVIDER_STORAGE_KEY = 'multi_agent_custom_providers_v1';

export const defaultProviders: ProviderConfig[] = [
  {
    id: 'prov-lm-studio',
    category: 'local',
    providerType: 'lm-studio',
    label: 'LM Studio (Lokal)',
    baseUrl: 'http://localhost:1234/v1',
    model: 'local-model',
  },
  {
    id: 'prov-ollama',
    category: 'local',
    providerType: 'openai-compatible',
    label: 'Ollama (Lokal)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
  },
  {
    id: 'prov-mock',
    category: 'local',
    providerType: 'custom',
    label: 'Simulasi Offline (Mock)',
    baseUrl: '',
    model: 'mock-agent-v1',
  },
];

export class ProviderStore {
  static loadProviders(): ProviderConfig[] {
    try {
      const data = localStorage.getItem(PROVIDER_STORAGE_KEY);
      if (!data) return defaultProviders;
      const parsed = JSON.parse(data) as ProviderConfig[];
      if (!parsed || parsed.length === 0) return defaultProviders;
      
      return parsed.map((p) => {
        if (!p.category) {
          const isLocal =
            p.providerType === 'lm-studio' ||
            p.baseUrl?.includes('localhost') ||
            p.baseUrl?.includes('127.0.0.1');
          return { ...p, category: isLocal ? 'local' : 'endpoint' };
        }
        return p;
      });
    } catch {
      return defaultProviders;
    }
  }

  static saveProviders(providers: ProviderConfig[]): void {
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(providers));
    } catch (err) {
      console.error('Gagal menyimpan providers:', err);
    }
  }

  static addProvider(provider: ProviderConfig): ProviderConfig[] {
    const list = this.loadProviders();
    const updated = [provider, ...list];
    this.saveProviders(updated);
    return updated;
  }

  static updateProvider(id: string, updated: Partial<ProviderConfig>): ProviderConfig[] {
    const list = this.loadProviders();
    const result = list.map((p) => (p.id === id ? { ...p, ...updated } : p));
    this.saveProviders(result);
    return result;
  }

  static deleteProvider(id: string): ProviderConfig[] {
    const list = this.loadProviders();
    const result = list.filter((p) => p.id !== id);
    this.saveProviders(result);
    return result;
  }
}
