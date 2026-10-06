import { globalProviderRegistry } from '../llm/ProviderRegistry';
import { truncateContext, estimateTokenCount, estimateMessagesTokens } from '../llm/contextUtils';
import { TerminalTool } from '../tools/TerminalTool';
import { ModeratorAgent } from '../orchestrator/ModeratorAgent';
import type { Agent, SessionMessage, Message } from '../types';

async function runStage3Verification() {
  console.log('=== MEMULAI VERIFIKASI TAHAP 3: POLISH & MULTI-PROVIDER RESILIENCE ===\n');

  // 1. Pengujian Token Truncation & Estimation
  console.log('[1/4] Menguji Estimasi Token & Truncate Context...');
  const textSample = 'Rancang arsitektur multi-agent untuk sistem desktop lintas platform.';
  const tokens = estimateTokenCount(textSample);
  console.log(`- Teks (${textSample.length} karakter) -> estimasi ${tokens} token.`);
  if (tokens <= 0) throw new Error('Estimasi token gagal.');

  const sampleMessages: Message[] = [
    { role: 'system', content: 'Kamu adalah arsitek utama sistem.' },
    { role: 'user', content: 'Pesan awal yang sangat panjang '.repeat(50) },
    { role: 'assistant', content: 'Respons agen pertama '.repeat(50) },
    { role: 'user', content: 'Pesan terkini yang harus tetap ada.' },
  ];
  const initialTokens = estimateMessagesTokens(sampleMessages);
  const truncated = truncateContext(sampleMessages, 100, 20);
  const truncatedTokens = estimateMessagesTokens(truncated);
  console.log(`- Token awal: ${initialTokens} -> Setelah truncate budget 100: ${truncatedTokens}`);
  console.log(`- Pesan tersisa: ${truncated.length} (System message tetap dipertahankan: ${truncated[0].role === 'system'})`);
  if (truncated.length >= sampleMessages.length && initialTokens > 100) {
    throw new Error('Truncation context tidak mereduksi pesan.');
  }

  // 2. Pengujian Multi-Provider Fallback (LM Studio -> Mock Provider)
  console.log('\n[2/4] Menguji Multi-Provider Fallback...');
  const fallbackResult = await globalProviderRegistry.sendMessageWithFallback(
    'local-lm-studio',
    ['local-lm-studio', 'mock-offline'],
    [{ role: 'user', content: 'Halo, berikan status kesiapan sistem.' }]
  );
  console.log(`- Provider yang merespons: ${fallbackResult.usedProviderId}`);
  console.log(`- Konten respons: "${fallbackResult.response.content.slice(0, 70)}..."`);
  if (!fallbackResult.response.content) throw new Error('Multi-provider fallback gagal menghasilkan respons.');

  // 3. Pengujian TerminalTool Cross-Platform Linux & Windows
  console.log('\n[3/4] Menguji Validasi Perintah Terminal Lintas-Platform...');
  const platform = TerminalTool.detectPlatform();
  console.log(`- Terdeteksi Platform: ${platform}`);

  const isDangerousLinux = TerminalTool.isDangerousCommand('rm -rf /tmp/data');
  const isDangerousWin = TerminalTool.isDangerousCommand('del /F /Q C:\\Windows');
  const isSafeCommand = TerminalTool.isDangerousCommand('git status');
  console.log(`- 'rm -rf' berbahaya: ${isDangerousLinux}`);
  console.log(`- 'del' berbahaya: ${isDangerousWin}`);
  console.log(`- 'git status' berbahaya: ${isSafeCommand}`);
  if (!isDangerousLinux || !isDangerousWin || isSafeCommand) {
    throw new Error('Filter keamanan perintah gagal membedakan command berbahaya.');
  }

  // 4. Pengujian Moderator Plan Extraction
  console.log('\n[4/4] Menguji Moderator Extraction & Consensus Evaluation...');
  const mockAgents: Agent[] = [
    {
      id: 'agent-researcher',
      name: 'Researcher',
      initial: 'R',
      role: 'Research & Tech Lead',
      color: '#4ec9b0',
      instructions: 'Riset arsitektur',
      skillIds: ['code-audit'],
      permissions: { internetAccess: 'allowed', terminalAccess: { mode: 'whitelist-safe' } },
      llmProviderId: 'mock-offline',
    },
  ];

  const mockSessionMsgs: SessionMessage[] = [
    { id: '1', timestamp: Date.now(), speaker: { type: 'user' }, content: 'Buat aplikasi desktop dengan Tauri v2 dan React' },
    { id: '2', timestamp: Date.now(), speaker: { type: 'agent', agentId: 'agent-researcher', agentName: 'Researcher', initial: 'R', color: '#4ec9b0' }, content: 'Saya menyarankan arsitektur PTY terminal dan State Manager lokal' },
  ];

  const moderator = new ModeratorAgent();
  const evalResult = await moderator.evaluateDiscussion(
    mockSessionMsgs,
    mockAgents,
    3,
    3
  );
  console.log(`- Status Evaluasi: ${evalResult.status}`);
  console.log(`- Goal: ${evalResult.planDocument?.goal}`);
  console.log(`- Jumlah Tugas: ${evalResult.planDocument?.tasks.length}`);
  if (!evalResult.planDocument || evalResult.planDocument.tasks.length === 0) {
    throw new Error('Moderator gagal menghasilkan PlanDocument.');
  }

  console.log('\n=== SEMUA PENGUJIAN TAHAP 3 BERHASIL 100% ===');
}

runStage3Verification().catch((err) => {
  console.error('Pengujian gagal:', err);
  throw err;
});
