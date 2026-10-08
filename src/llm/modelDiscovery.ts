import type { ProviderType } from '../types';

export interface DiscoverOptions {
  providerType: ProviderType;
  baseUrl?: string;
  apiKey?: string;
}

const CURATED_ANTHROPIC_MODELS = [
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
];

export async function discoverModels(options: DiscoverOptions): Promise<string[]> {
  const { providerType, baseUrl, apiKey } = options;
  const cleanBase = (baseUrl || '').replace(/\/+$/, '');

  // Provider: Anthropic
  if (providerType === 'anthropic' || cleanBase.includes('anthropic.com')) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('API Key Anthropic wajib diisi untuk mendeteksi model');
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          const ids = json.data
            .map((item: { id?: string }) => item.id)
            .filter((id: unknown): id is string => typeof id === 'string');
          if (ids.length > 0) return ids.sort();
        }
      }
    } catch {
      // Fallback ke daftar model resmi jika endpoint /v1/models belum didukung browser/CORS
    }

    return CURATED_ANTHROPIC_MODELS;
  }

  // Provider: LM Studio, Ollama, OpenAI-compatible, atau Custom
  if (!cleanBase) {
    throw new Error('Base URL tidak boleh kosong');
  }

  // Jika cloud endpoint dan butuh API Key
  const isLocal =
    cleanBase.includes('localhost') ||
    cleanBase.includes('127.0.0.1') ||
    providerType === 'lm-studio';

  if (!isLocal && (!apiKey || !apiKey.trim())) {
    throw new Error('API Key wajib diisi untuk mendeteksi model dari Cloud Endpoint');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const modelsUrl = `${cleanBase}/models`;

  try {
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `HTTP ${response.status}: Gagal menghubungi endpoint (${response.statusText})`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error?.message) {
          errorMsg = `HTTP ${response.status}: ${parsed.error.message}`;
        }
      } catch {
        if (errorText) errorMsg = `HTTP ${response.status}: ${errorText.slice(0, 150)}`;
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(`API Key tidak valid atau tidak memiliki izin akses (HTTP ${response.status})`);
      }
      throw new Error(errorMsg);
    }

    const json = await response.json();
    const modelsFound: string[] = [];

    // Format OpenAI standar: { data: [{ id: "model-name" }] }
    if (Array.isArray(json.data)) {
      for (const item of json.data) {
        if (typeof item === 'string') {
          modelsFound.push(item);
        } else if (item && typeof item.id === 'string') {
          modelsFound.push(item.id);
        }
      }
    }

    // Format Ollama: { models: [{ name: "llama3.2:latest", model: "llama3.2" }] }
    if (Array.isArray(json.models)) {
      for (const item of json.models) {
        if (typeof item === 'string') {
          modelsFound.push(item);
        } else if (item && typeof item.name === 'string') {
          modelsFound.push(item.name);
        } else if (item && typeof item.id === 'string') {
          modelsFound.push(item.id);
        }
      }
    }

    // Format array langsung: ["model1", "model2"]
    if (Array.isArray(json)) {
      for (const item of json) {
        if (typeof item === 'string') {
          modelsFound.push(item);
        } else if (item && typeof item.id === 'string') {
          modelsFound.push(item.id);
        }
      }
    }

    // Deduplikasi
    const unique = Array.from(new Set(modelsFound));
    if (unique.length === 0) {
      throw new Error('Endpoint terhubung, namun tidak ada model yang dikembalikan');
    }

    // Urutkan dengan memprioritaskan model chat/instruct umum
    return unique.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const isAPriority = aLower.includes('gpt-4') || aLower.includes('claude') || aLower.includes('llama-3') || aLower.includes('deepseek');
      const isBPriority = bLower.includes('gpt-4') || bLower.includes('claude') || bLower.includes('llama-3') || bLower.includes('deepseek');
      if (isAPriority && !isBPriority) return -1;
      if (!isAPriority && isBPriority) return 1;
      return a.localeCompare(b);
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Koneksi ke ${modelsUrl} gagal: ${String(err)}`);
  }
}
