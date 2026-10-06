import { globalSkillRegistry } from '../skills/SkillRegistry';
import { TerminalTool } from '../tools/TerminalTool';
import { WebTool } from '../tools/WebTool';
import { globalOrchestrator } from '../orchestrator/Orchestrator';
import { initialAgents, initialUserProfile } from '../data/mockData';
import type { SessionMessage, AgentPermissions } from '../types';

async function runTests() {
  console.log('--- TEST 1: SkillRegistry ---');
  const allSkills = globalSkillRegistry.getAll();
  console.log(`Loaded skills count: ${allSkills.length}`);
  const promptOutput = globalSkillRegistry.formatSkillsPrompt(['web-search', 'docker-tool']);
  if (!promptOutput.includes('Web Researcher') || !promptOutput.includes('Environment & DevOps')) {
    throw new Error('SkillRegistry formatSkillsPrompt failed!');
  }
  console.log('✓ SkillRegistry passed');

  console.log('\n--- TEST 2: TerminalTool Permissions & Cross-Platform ---');
  const platform = TerminalTool.detectPlatform();
  console.log(`Detected Platform: ${platform}`);

  const safePermissions: AgentPermissions = {
    internetAccess: 'allowed',
    terminalAccess: { mode: 'whitelist-safe' }
  };

  const dangerousCommand = 'rm -rf /test';
  const isDanger = TerminalTool.isDangerousCommand(dangerousCommand);
  const reqApproval = TerminalTool.requiresUserApproval(dangerousCommand, safePermissions);
  if (!isDanger || !reqApproval) {
    throw new Error('TerminalTool failed to intercept dangerous command!');
  }

  const safeCommand = 'git status';
  const safeReq = TerminalTool.requiresUserApproval(safeCommand, safePermissions);
  if (safeReq) {
    throw new Error('TerminalTool incorrectly required approval for whitelisted command!');
  }
  console.log('✓ TerminalTool permissions validation passed');

  console.log('\n--- TEST 3: WebTool Anti-Prompt-Injection ---');
  const webResult = await WebTool.search('Tauri cross platform IPC', safePermissions);
  if (!webResult.formattedOutput.includes('trust_level="untrusted"')) {
    throw new Error('WebTool did not include untrusted tag!');
  }
  console.log('✓ WebTool sanitization passed');

  console.log('\n--- TEST 4: Orchestrator & Hierarchical Mode Execution ---');
  globalOrchestrator.setStrategy('hierarchical');
  const testMessages: SessionMessage[] = [
    {
      id: 'm1',
      timestamp: Date.now(),
      speaker: { type: 'user' },
      content: 'Rancang arsitektur microservices untuk autentikasi SSO di Linux dan Windows.'
    }
  ];

  let managerSpoke = false;
  let workerSpoke = false;
  let roundEvaluated = false;

  const evalResult = await globalOrchestrator.executePlanDiscussion(
    'Rancang arsitektur microservices untuk autentikasi SSO di Linux dan Windows.',
    1,
    initialAgents.slice(0, 3),
    initialUserProfile,
    testMessages,
    {
      onAgentStartThinking: (agent) => {
        console.log(`Thinking: ${agent.name}`);
      },
      onAgentMessage: (msg) => {
        if (msg.speaker.type === 'agent') {
          console.log(`Received message from ${msg.speaker.agentName}: ${msg.content.slice(0, 45)}...`);
          if (msg.content.includes('[LEAD DIRECTIVE]')) managerSpoke = true;
          else workerSpoke = true;
        }
      },
      onRoundComplete: (rnd, evaluation) => {
        console.log(`Round ${rnd} completed with status: ${evaluation.status}`);
        roundEvaluated = true;
      },
      onPlanGenerated: (evaluation) => {
        console.log(`Plan generated! Tasks: ${evaluation.planDocument?.tasks.length}`);
      }
    }
  );

  if (!managerSpoke || !workerSpoke || !roundEvaluated) {
    throw new Error('HierarchicalMode execution pipeline incomplete!');
  }
  console.log(`✓ Orchestrator HierarchicalMode passed: ${evalResult.status}`);

  console.log('\n=== SEMUA PENGUJIAN TAHAP 1 BERHASIL 100% ===');
}

runTests().catch((err) => {
  console.error('Test Failed:', err);
  throw err;
});
