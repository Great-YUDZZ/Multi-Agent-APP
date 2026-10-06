import type { Agent, Session, UserProfile } from '../types';

export const initialUserProfile: UserProfile = {
  displayName: 'User',
  onboardingCompleted: true,
  theme: 'dark',
  fontSize: 'Sedang',
  typingAnimation: true,
};

export const initialAgents: Agent[] = [
  {
    id: 'agent-a',
    name: 'Agent A — Researcher',
    role: 'Riset referensi & validasi teknis',
    initial: 'A',
    color: '#569cd6', // VS Code Blue
    instructions: 'Kamu adalah Researcher. Validasi referensi dan rancang struktur data teknis.',
    skillIds: ['web-search'],
    llmProviderId: 'local-lm-studio',
    permissions: {
      internetAccess: 'allowed',
      terminalAccess: { mode: 'ask-every-time' }
    }
  },
  {
    id: 'agent-b',
    name: 'Agent B — Reviewer',
    role: 'Cek konsistensi & kualitas rencana',
    initial: 'B',
    color: '#4ec9b0', // VS Code Teal
    instructions: 'Kamu adalah Reviewer. Pastikan kriteria keberhasilan dan konsistensi arsitektur teruji.',
    skillIds: ['code-audit'],
    llmProviderId: 'anthropic-claude',
    permissions: {
      internetAccess: 'ask-every-time',
      terminalAccess: { mode: 'whitelist-safe' }
    }
  },
  {
    id: 'agent-q',
    name: 'Agent Q — QA Tester',
    role: 'Susun skenario pengujian',
    initial: 'Q',
    color: '#ce9178', // VS Code Orange/Terracotta
    instructions: 'Kamu adalah QA Engineer. Susun skenario unit testing dan edge cases.',
    skillIds: ['test-suite'],
    llmProviderId: 'openai-gpt4o',
    permissions: {
      internetAccess: 'denied',
      terminalAccess: { mode: 'whitelist-safe' }
    }
  },
  {
    id: 'agent-d',
    name: 'Agent D — DevOps',
    role: 'Setup environment & deployment',
    initial: 'D',
    color: '#c586c0', // VS Code Purple
    instructions: 'Kamu adalah DevOps Engineer. Setup container, CI/CD, dan environment runtime.',
    skillIds: ['docker-tool'],
    llmProviderId: 'local-lm-studio',
    permissions: {
      internetAccess: 'allowed',
      terminalAccess: { mode: 'ask-every-time', alwaysAsk: ['rm', 'sudo', 'curl'] }
    }
  }
];

export const initialSessions: Session[] = [
  {
    id: 'session-default',
    title: 'Sesi Baru',
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    mode: 'plan',
    participantAgentIds: ['agent-a', 'agent-b'],
    attachedFiles: [],
    messages: []
  }
];
