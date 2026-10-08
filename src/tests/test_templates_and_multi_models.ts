import { AGENT_ROLE_TEMPLATES } from '../data/agentTemplates';
import { ProviderRegistry } from '../llm/ProviderRegistry';
import { ProviderStore } from '../storage/ProviderStore';
import type { ProviderConfig } from '../types';

function runTests() {
  console.log('--- START TEST: Agent Role Templates & Multi-Model Resolution ---');

  // Test 1: Verify 5 Role Templates
  const expectedRoles = ['pemimpin', 'frontend', 'backend', 'web-search', 'tester'];
  console.log(`[1/4] Verifikasi keberadaan 5 role template...`);
  if (AGENT_ROLE_TEMPLATES.length !== 5) {
    throw new Error(`Expected 5 templates, found ${AGENT_ROLE_TEMPLATES.length}`);
  }

  expectedRoles.forEach((roleKey) => {
    const found = AGENT_ROLE_TEMPLATES.find((t) => t.roleKey === roleKey);
    if (!found) {
      throw new Error(`Role template '${roleKey}' tidak ditemukan!`);
    }
    if (!found.instructions || found.instructions.length < 50) {
      throw new Error(`Instruksi untuk role '${roleKey}' terlalu pendek atau kosong!`);
    }
    if (!found.initial || !found.color || !found.role) {
      throw new Error(`Metadata untuk role '${roleKey}' tidak lengkap!`);
    }
    console.log(`  ✓ Role '${roleKey}': ${found.name} (${found.role}) - ${found.instructions.length} chars`);
  });

  // Test 2: ProviderStore multi-model saving & loading
  console.log(`[2/4] Verifikasi ProviderStore dengan multi-model...`);
  // Mock localStorage for node environment
  if (typeof globalThis.localStorage === 'undefined') {
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; },
    };
  }

  const testProvider: ProviderConfig = {
    id: 'prov-test-9router',
    label: '9router Local',
    providerType: 'openai-compatible',
    baseUrl: 'http://localhost:20128/v1',
    apiKey: 'sk-test-key-12345',
    model: 'ag/gemini-3.7-flash-high',
    models: [
      'ag/gemini-3.7-flash-high',
      'ag/gemini-3.6-flash-high',
      'ag/gemini-3.5-flash-low',
    ],
  };

  ProviderStore.saveProviders([testProvider]);
  const loaded = ProviderStore.loadProviders();
  const prov = loaded.find((p) => p.id === 'prov-test-9router');
  if (!prov || prov.models?.length !== 3) {
    throw new Error('Provider dengan 3 model aktif gagal disimpan/dimuat!');
  }
  console.log(`  ✓ Provider '${prov.label}' memiliki ${prov.models.length} model aktif tersimpan.`);

  // Test 3: ProviderRegistry multi-model resolution
  console.log(`[3/4] Verifikasi resolusi multi-model pada ProviderRegistry...`);
  const registry = new ProviderRegistry();

  // Resolve Model 1: default
  const inst1 = registry.get('prov-test-9router');
  if (!inst1 || (inst1 as any).model !== 'ag/gemini-3.7-flash-high') {
    throw new Error(`Model default resolusi salah: ${(inst1 as any)?.model}`);
  }
  console.log(`  ✓ Sub-model default resolved: ${(inst1 as any).model}`);

  // Resolve Model 2: sub-model ag/gemini-3.6-flash-high
  const inst2 = registry.get('prov-test-9router:::ag/gemini-3.6-flash-high');
  if (!inst2 || (inst2 as any).model !== 'ag/gemini-3.6-flash-high') {
    throw new Error(`Sub-model 2 resolusi salah: ${(inst2 as any)?.model}`);
  }
  console.log(`  ✓ Sub-model 2 resolved: ${(inst2 as any).model}`);

  // Resolve Model 3: sub-model ag/gemini-3.5-flash-low
  const inst3 = registry.get('prov-test-9router:::ag/gemini-3.5-flash-low');
  if (!inst3 || (inst3 as any).model !== 'ag/gemini-3.5-flash-low') {
    throw new Error(`Sub-model 3 resolusi salah: ${(inst3 as any)?.model}`);
  }
  console.log(`  ✓ Sub-model 3 resolved: ${(inst3 as any).model}`);

  // Test 4: Isolation check
  console.log(`[4/4] Verifikasi isolasi antar model dari satu API key...`);
  if ((inst2 as any).model === (inst3 as any).model) {
    throw new Error('Model instance 2 dan 3 bertabrakan!');
  }
  if ((inst2 as any).apiKey !== (inst3 as any).apiKey) {
    throw new Error('API key berbeda padahal dari 1 provider config!');
  }
  console.log(`  ✓ Satu API Key berhasil menyediakan model-model berbeda secara independen.`);

  console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
}

runTests();
