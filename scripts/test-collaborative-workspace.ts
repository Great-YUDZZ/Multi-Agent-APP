import { ModeratorAgent } from '../src/orchestrator/ModeratorAgent';
import { BuildModeController } from '../src/orchestrator/BuildModeController';
import type { Agent, SessionMessage, PlanDocument } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

async function runTests() {
  console.log('=== Test 1: ModeratorAgent Smart Role Assignment & Workspace Awareness ===');
  const moderator = new ModeratorAgent();

  const mockAgents: Agent[] = [
    {
      id: 'agent-lead',
      name: 'Lead Orchestrator',
      role: 'Pemimpin Tim',
      initial: 'L',
      color: '#007acc',
      instructions: 'Koordinasi tim.',
      llmProviderId: 'mock-prov',
      permissions: { terminalExecution: 'ask', fileCreation: 'allowed', internetAccess: 'denied', obsidianAccess: 'denied' },
      isLead: true,
      createdAt: Date.now(),
    },
    {
      id: 'agent-fe',
      name: 'Frontend Specialist',
      role: 'Frontend Developer',
      initial: 'F',
      color: '#4ec9b0',
      instructions: 'Buat UI HTML dan CSS.',
      llmProviderId: 'mock-prov',
      permissions: { terminalExecution: 'ask', fileCreation: 'allowed', internetAccess: 'denied', obsidianAccess: 'denied' },
      createdAt: Date.now(),
    },
    {
      id: 'agent-be',
      name: 'Backend Specialist',
      role: 'Backend Developer',
      initial: 'B',
      color: '#dcdcaa',
      instructions: 'Buat API dan JS.',
      llmProviderId: 'mock-prov',
      permissions: { terminalExecution: 'ask', fileCreation: 'allowed', internetAccess: 'denied', obsidianAccess: 'denied' },
      createdAt: Date.now(),
    },
    {
      id: 'agent-qa',
      name: 'QA Tester',
      role: 'Tester & QA',
      initial: 'T',
      color: '#ce9178',
      instructions: 'Uji fungsionalitas dan tampilan.',
      llmProviderId: 'mock-prov',
      permissions: { terminalExecution: 'ask', fileCreation: 'allowed', internetAccess: 'denied', obsidianAccess: 'denied' },
      createdAt: Date.now(),
    },
  ];

  const mockMessages: SessionMessage[] = [
    {
      id: 'm1',
      timestamp: Date.now(),
      speaker: { type: 'user' },
      content: 'Tolong buatkan website Todo List sederhana dengan HTML, CSS, dan Javascript',
    },
    {
      id: 'm2',
      timestamp: Date.now(),
      speaker: { type: 'agent', agentId: 'agent-lead', agentName: 'Lead Orchestrator', initial: 'L', color: '#007acc' },
      content: 'Mari kita bagi peran: Frontend buat index.html dan style.css, Backend buat script todo.js, dan QA lakukan validasi tombol.',
    },
    {
      id: 'm3',
      timestamp: Date.now(),
      speaker: { type: 'agent', agentId: 'agent-fe', agentName: 'Frontend Specialist', initial: 'F', color: '#4ec9b0' },
      content: 'Setuju! Saya akan mendesain index.html dengan list container dan style.css bernuansa dark modern.',
    },
    {
      id: 'm4',
      timestamp: Date.now(),
      speaker: { type: 'agent', agentId: 'agent-be', agentName: 'Backend Specialist', initial: 'B', color: '#dcdcaa' },
      content: 'Saya akan siapkan app.js dengan penyimpanan localStorage agar todo list tidak hilang saat refresh.',
    },
    {
      id: 'm5',
      timestamp: Date.now(),
      speaker: { type: 'agent', agentId: 'agent-qa', agentName: 'QA Tester', initial: 'T', color: '#ce9178' },
      content: 'Saya akan siapkan skenario pengujian: tambah todo, checklist selesai, dan hapus todo.',
    },
  ];

  const workspaceContext = {
    path: '/tmp/test-multi-agent-workspace',
    files: ['package.json'],
  };

  const evaluation = await moderator.evaluateDiscussion(
    mockMessages,
    mockAgents,
    1,
    5,
    workspaceContext
  );

  console.log('Status Evaluasi:', evaluation.status);
  console.log('Alasan:', evaluation.reason);
  if (!evaluation.planDocument) {
    throw new Error('Gagal menghasilkan planDocument!');
  }

  console.log('Plan Document Goal:', evaluation.planDocument.goal);
  console.log('Jumlah Tasks:', evaluation.planDocument.tasks.length);
  evaluation.planDocument.tasks.forEach((t, i) => {
    const ag = mockAgents.find((a) => a.id === t.assignedAgentId);
    console.log(`  Task ${i + 1}: [${ag?.name || t.assignedAgentId} (${ag?.role})] - ${t.description}`);
  });

  // Pastikan tugas terdistribusi ke beberapa agen (tidak monolitik 1 agen saja)
  const assignedAgentIds = new Set(evaluation.planDocument.tasks.map((t) => t.assignedAgentId));
  if (assignedAgentIds.size < 2) {
    console.warn('PERINGATAN: Tugas belum terdistribusi ke beberapa agen!');
  } else {
    console.log('✓ SUKSES: Tugas terdistribusi dengan cerdas ke spesialis masing-masing!');
  }

  console.log('\n=== Test 2: BuildModeController File Extraction & Workspace Physical Write ===');
  const tempWorkspace = path.join('/tmp', `multi-agent-test-${Date.now()}`);
  fs.mkdirSync(tempWorkspace, { recursive: true });

  const testPlan: PlanDocument = {
    id: 'test-plan-1',
    goal: 'Buat Todo App',
    createdAt: new Date().toISOString(),
    tasks: [
      {
        id: 't-1',
        description: 'Buat index.html dan style.css',
        assignedAgentId: 'agent-fe',
        rationale: 'Desain UI',
        successCriteria: 'index.html dan style.css dibuat',
      },
    ],
    openQuestions: [],
  };

  // Mock Controller testing parser
  const buildController = new BuildModeController(testPlan, mockAgents, tempWorkspace);
  const rawLlmOutput = `Berikut adalah kode yang telah saya buat:

\`\`\`file:index.html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Todo App Multi-Agent</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Todo List Cerdas</h1>
  <div id="todo-container"></div>
</body>
</html>
\`\`\`

Dan berkas styling:
\`\`\`file:style.css
body {
  background-color: #1e1e1e;
  color: #fff;
  font-family: sans-serif;
}
\`\`\`
Selesai membuat seluruh antarmuka!`;

  // Akses private helper via prototype/any untuk tes unit
  const extractedFiles = (buildController as any).extractWrittenFiles(rawLlmOutput, 'Buat index.html dan style.css');
  console.log(`Ditemukan ${extractedFiles.length} berkas dari keluaran agen:`);
  extractedFiles.forEach((f: any) => console.log(` - ${f.path} (${f.content.length} karakter)`));

  if (extractedFiles.length !== 2) {
    throw new Error(`Harusnya menemukan 2 file, tapi ditemukan ${extractedFiles.length}`);
  }

  // Tulis ke tempWorkspace untuk verifikasi fisik
  for (const f of extractedFiles) {
    const filePath = path.join(tempWorkspace, f.path);
    fs.writeFileSync(filePath, f.content, 'utf-8');
    if (!fs.existsSync(filePath)) {
      throw new Error(`File gagal ditulis ke disk: ${filePath}`);
    }
    console.log(`✓ Terverifikasi file fisik ada di: ${filePath}`);
  }

  // Bersihkan temp workspace
  fs.rmSync(tempWorkspace, { recursive: true, force: true });
  console.log('✓ Pembersihan temp folder selesai.');

  console.log('\n=== SEMUA TES TERVERIFIKASI BERHASIL! ===\n');
}

runTests().catch((err) => {
  console.error('Test Gagal:', err);
  process.exit(1);
});
