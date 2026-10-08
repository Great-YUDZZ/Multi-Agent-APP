import fs from 'fs';
import path from 'path';
import { ObsidianTool } from '../tools/ObsidianTool';
import { VaultManager } from '../obsidian/VaultManager';
import { ObsidianStore } from '../storage/ObsidianStore';
import type { AgentPermissions, ObsidianToolCall } from '../types';

async function runObsidianAgentIntegrationTest() {
  if (typeof globalThis.localStorage === 'undefined') {
    const memStore = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (key: string) => memStore.get(key) || null,
      setItem: (key: string, value: string) => memStore.set(key, value),
      removeItem: (key: string) => memStore.delete(key),
      clear: () => memStore.clear(),
    };
  }

  console.log('=== MEMULAI TEST INTEGRASI OTONOM: AI AGENT AKSES OBSIDIAN VAULT ===\n');

  const testVaultDir = '/tmp/test_agent_obsidian_vault';
  if (fs.existsSync(testVaultDir)) {
    fs.rmSync(testVaultDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testVaultDir, { recursive: true });

  // Buat berkas awal di vault uji
  const initialNotePath = path.join(testVaultDir, 'SpesifikasiSistem.md');
  const initialNoteContent = `---
tags:
  - backend
  - security
---

# Spesifikasi Sistem Utama

Ini adalah dokumentasi arsitektur sistem.

## Aturan Keamanan & JWT
Semua token harus menggunakan algoritma RS256 dengan masa berlaku 15 menit.
Refresh token disimpan di HttpOnly Cookie.

## Skema Database
Gunakan PostgreSQL 16. Tabel utama: users, sessions, dan audit_logs.
`;
  fs.writeFileSync(initialNotePath, initialNoteContent, 'utf-8');

  // Set konfigurasi store lokal mengarah ke testVaultDir
  ObsidianStore.saveConfig({
    vaultPath: testVaultDir,
    enabled: true,
    maxTokensPerSnippet: 300,
    sessionExportFolder: 'MultiAgent/ADR',
  });

  const vaultManager = VaultManager.getInstance();
  await vaultManager.scanVault(testVaultDir);

  // ========================================================
  // UJI 1: AI Agent Membuat File Baru di Obsidian (Autonomous Write)
  // ========================================================
  console.log('[1/5] Menguji AI Agent membuat (write) catatan baru ke Obsidian...');
  const agentResponseWithWrite = `
Berdasarkan analisis kebutuhan, saya telah merumuskan arsitektur autentikasi.
Saya akan mendokumentasikannya ke Obsidian vault:
<obsidian_write title="ADR-001-AuthStrategy" folder="MultiAgent/ADR">
# ADR 001: Strategi Autentikasi Hybrid

## Keputusan
Kami mengadopsi OAuth2 + JWT dengan refresh token rotasi.

## Konsekuensi
Menjamin keamanan tinggi dan stateless session di server.
</obsidian_write>
Dokumentasi telah selesai saya catat.
`;

  const parsedWriteCalls = ObsidianTool.parseToolCalls(agentResponseWithWrite);
  console.log(`- Terdeteksi ${parsedWriteCalls.length} pemanggilan tool dari respons agen.`);
  if (parsedWriteCalls.length !== 1 || parsedWriteCalls[0].action !== 'write') {
    throw new Error('Gagal mem-parse tag <obsidian_write> dari respons agen!');
  }

  const writePermissions: AgentPermissions = {
    internetAccess: 'denied',
    terminalAccess: { mode: 'whitelist-safe' },
    obsidianAccess: 'read-write', // Diizinkan menulis
  };

  const writeResult = await ObsidianTool.execute(parsedWriteCalls[0], writePermissions);
  console.log(`- Status eksekusi write: ${writeResult.success}`);
  console.log(`- Pesan: "${writeResult.message}"`);

  if (!writeResult.success) {
    throw new Error(`Eksekusi write gagal: ${writeResult.message}`);
  }

  // Verifikasi file fisik benar-benar tercipta di disk Obsidian vault
  const expectedCreatedFilePath = path.join(testVaultDir, 'MultiAgent/ADR/ADR-001-AuthStrategy.md');
  if (!fs.existsSync(expectedCreatedFilePath)) {
    throw new Error(`File fisik tidak ditemukan di: ${expectedCreatedFilePath}`);
  }
  const createdContent = fs.readFileSync(expectedCreatedFilePath, 'utf-8');
  console.log(`- File fisik berhasil diverifikasi di: ${expectedCreatedFilePath}`);
  console.log(`- Cuplikan isi berkas yang dibuat agen:\n${createdContent.slice(0, 180)}...\n`);

  // ========================================================
  // UJI 2: AI Agent Mencari Catatan di Obsidian (Autonomous Search)
  // ========================================================
  console.log('[2/5] Menguji AI Agent mencari (search) catatan di Obsidian...');
  const agentSearchTag = '<obsidian_search query="keamanan" />';
  const parsedSearchCalls = ObsidianTool.parseToolCalls(agentSearchTag);
  if (parsedSearchCalls.length !== 1 || parsedSearchCalls[0].action !== 'search') {
    throw new Error('Gagal mem-parse tag <obsidian_search>!');
  }

  const searchResult = await ObsidianTool.execute(parsedSearchCalls[0], writePermissions);
  console.log(`- Hasil pencarian agen:\n${searchResult.formattedOutput}\n`);
  if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
    throw new Error('Pencarian catatan oleh agen tidak menemukan hasil yang sesuai!');
  }

  // ========================================================
  // UJI 3: AI Agent Membaca File yang Baru Dibuat & File Lama (Autonomous Read)
  // ========================================================
  console.log('[3/5] Menguji AI Agent membaca (read) catatan dari Obsidian...');
  // A. Membaca file spesifik yang baru dibuat agen di Uji 1
  const readCreatedNoteCall: ObsidianToolCall = {
    action: 'read',
    title: 'ADR-001-AuthStrategy',
  };
  const readResult1 = await ObsidianTool.execute(readCreatedNoteCall, writePermissions);
  console.log(`- Membaca file baru [[ADR-001-AuthStrategy]]: ${readResult1.success}`);
  if (!readResult1.success || !readResult1.formattedOutput.includes('ADR 001: Strategi Autentikasi Hybrid')) {
    throw new Error('Agen gagal membaca kembali file yang baru saja dibuatnya di Obsidian!');
  }

  // B. Membaca sub-bab spesifik dari catatan lama (Atomic section extraction)
  const readSectionCall: ObsidianToolCall = {
    action: 'read',
    title: 'SpesifikasiSistem',
    section: 'Aturan Keamanan & JWT',
  };
  const readResult2 = await ObsidianTool.execute(readSectionCall, writePermissions);
  console.log(`- Membaca seksi spesifik [[SpesifikasiSistem#Aturan Keamanan & JWT]]:`);
  console.log(`${readResult2.formattedOutput}\n`);
  if (!readResult2.formattedOutput.includes('RS256') || readResult2.formattedOutput.includes('Skema Database')) {
    throw new Error('Ekstraksi seksi atomik tidak tepat (harus memuat aturan JWT tanpa mengikutsertakan Skema Database)!');
  }

  // ========================================================
  // UJI 4: Kontrol Izin Keamanan (Permission Guards)
  // ========================================================
  console.log('[4/5] Menguji proteksi hak akses agen (Permission Guards)...');
  
  // A. Agent dengan izin read-only DITOLAK saat mencoba menulis
  const readOnlyPermissions: AgentPermissions = {
    internetAccess: 'denied',
    terminalAccess: { mode: 'whitelist-safe' },
    obsidianAccess: 'read-only',
  };
  const blockedWrite = await ObsidianTool.execute(
    { action: 'write', title: 'IlegalNote', content: 'Coba tulis' },
    readOnlyPermissions
  );
  console.log(`- Read-only agent write attempt -> Success: ${blockedWrite.success} (Pesan: "${blockedWrite.message}")`);
  if (blockedWrite.success) {
    throw new Error('Agent dengan hak akses read-only seharusnya DITOLAK saat menulis catatan!');
  }

  // B. Agent dengan izin denied DITOLAK saat membaca
  const deniedPermissions: AgentPermissions = {
    internetAccess: 'denied',
    terminalAccess: { mode: 'whitelist-safe' },
    obsidianAccess: 'denied',
  };
  const blockedRead = await ObsidianTool.execute(
    { action: 'read', title: 'SpesifikasiSistem' },
    deniedPermissions
  );
  console.log(`- Denied agent read attempt -> Success: ${blockedRead.success} (Pesan: "${blockedRead.message}")`);
  if (blockedRead.success) {
    throw new Error('Agent dengan hak akses denied seharusnya DITOLAK saat membaca catatan!');
  }

  // ========================================================
  // UJI 5: Pemotongan Token Budget (Token Optimization Capper)
  // ========================================================
  console.log('\n[5/5] Menguji efisiensi batas token (Token Budget Capper)...');
  // Buat catatan yang sangat panjang di vault (5000 kata)
  const hugeNotePath = path.join(testVaultDir, 'DokumenRaksasa.md');
  const hugeContent = 'Kata koding arsitektur backend '.repeat(2000); // ~10.000 kata
  fs.writeFileSync(hugeNotePath, hugeContent, 'utf-8');

  const budgetRead = await vaultManager.readNote('DokumenRaksasa', undefined, 200);
  console.log(`- Dokumen asli: ~${hugeContent.length / 4} token -> Dipotong menjadi: ~${budgetRead.tokenEstimate} token.`);
  if (budgetRead.tokenEstimate > 220) {
    throw new Error(`Token budget tidak dipatuhi! Hasil baca: ${budgetRead.tokenEstimate} token.`);
  }

  // Bersihkan folder sementara
  fs.rmSync(testVaultDir, { recursive: true, force: true });

  console.log('\n=== SEMUA 5 PENGUJIAN OTONOM OBSIDIAN BERHASIL 100% (PASSED) ===');
}

runObsidianAgentIntegrationTest().catch((err) => {
  console.error('\nTEST INTEGRASI GAGAL:', err);
  process.exit(1);
});
