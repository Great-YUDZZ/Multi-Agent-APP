import type { Agent } from '../types';
import { initialAgents } from '../data/mockData';

const AGENT_STORAGE_KEY = 'multi_agent_custom_agents_v1';

export class AgentStore {
  static loadAgents(): Agent[] {
    try {
      const data = localStorage.getItem(AGENT_STORAGE_KEY);
      if (!data) return initialAgents;
      const parsed = JSON.parse(data) as Agent[];
      return parsed.length > 0 ? parsed : initialAgents;
    } catch {
      return initialAgents;
    }
  }

  static saveAgents(agents: Agent[]): void {
    try {
      localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(agents));
    } catch (err) {
      console.error('Gagal menyimpan agents:', err);
    }
  }

  static addAgent(agent: Agent): Agent[] {
    const list = this.loadAgents();
    const updated = [...list, agent];
    this.saveAgents(updated);
    return updated;
  }

  static updateAgent(id: string, updated: Partial<Agent>): Agent[] {
    const list = this.loadAgents();
    const result = list.map((a) => (a.id === id ? { ...a, ...updated } : a));
    this.saveAgents(result);
    return result;
  }

  static deleteAgent(id: string): Agent[] {
    const list = this.loadAgents();
    const result = list.filter((a) => a.id !== id);
    this.saveAgents(result);
    return result;
  }
}
