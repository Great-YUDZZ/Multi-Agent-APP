import type { Session, SessionMessage, PlanDocument } from '../types';

const STORAGE_KEY = 'multi_agent_sessions_v1';

export class SessionStore {
  /**
   * Auto-generates session title from the first user message (Blueprint Section 13.3)
   */
  static generateTitle(firstUserMessage: string): string {
    if (!firstUserMessage.trim()) return 'Sesi Baru';
    const clean = firstUserMessage.trim().replace(/\s+/g, ' ');
    if (clean.length <= 40) return clean;
    const truncated = clean.slice(0, 40);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }

  static loadSessions(): Session[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as Session[];
    } catch (err) {
      console.warn('Gagal memuat sessions dari storage:', err);
      return [];
    }
  }

  static saveSessions(sessions: Session[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.error('Gagal menyimpan sessions ke storage:', err);
    }
  }

  static saveSession(session: Session): void {
    const all = this.loadSessions();
    const existingIndex = all.findIndex((s) => s.id === session.id);
    if (existingIndex >= 0) {
      all[existingIndex] = session;
    } else {
      all.unshift(session);
    }
    this.saveSessions(all);
  }

  static deleteSession(sessionId: string): Session[] {
    const all = this.loadSessions().filter((s) => s.id !== sessionId);
    this.saveSessions(all);
    return all;
  }

  static appendMessage(sessionId: string, message: SessionMessage): Session | null {
    const all = this.loadSessions();
    const session = all.find((s) => s.id === sessionId);
    if (!session) return null;

    session.messages.push(message);
    session.lastActiveAt = Date.now();

    // Auto-update title if default 'Sesi Baru' and message from user
    if (session.title === 'Sesi Baru' && message.speaker.type === 'user') {
      session.title = this.generateTitle(message.content);
    }

    this.saveSessions(all);
    return session;
  }

  static updatePlanDocument(sessionId: string, plan: PlanDocument): void {
    const all = this.loadSessions();
    const session = all.find((s) => s.id === sessionId);
    if (session) {
      session.planDocument = plan;
      session.lastActiveAt = Date.now();
      this.saveSessions(all);
    }
  }
}
