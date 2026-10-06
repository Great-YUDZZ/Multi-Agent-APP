import type { Message, LLMResponse } from '../types';
import type { LLMProvider } from './LLMProvider';

export class MockProvider implements LLMProvider {
  readonly id: string = 'mock-provider';
  readonly name: string = 'Simulasi Offline (Mock)';
  readonly maxContextTokens: number = 32000;
  readonly supportsVision: boolean = true;
  readonly supportsToolUse: boolean = true;

  async sendMessage(messages: Message[]): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';

    // Simulate thinking delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    let reply = '';
    if (systemPrompt.includes('Researcher')) {
      reply = `Berdasarkan analisis teknis terhadap permintaan "${lastMessage}", saya telah memvalidasi referensi arsitektur. Struktur data sudah memenuhi kriteria modularitas dan kompatibel dengan pipeline PlanDocument.`;
    } else if (systemPrompt.includes('Reviewer')) {
      reply = `Saya menyetujui evaluasi tersebut. Sebagai reviewer, saya memastikan successCriteria untuk setiap task terdefinisi dengan jelas agar Build Mode dapat mendeteksi deviasi secara otomatis.`;
    } else if (systemPrompt.includes('QA')) {
      reply = `Skenario test case telah dipetakan: validasi boundary state (loading, empty, error handling, dan success feedback) berjalan normal.`;
    } else if (systemPrompt.includes('DevOps')) {
      reply = `Environment runtime lokal siap: konfigurasi port dan permission security isolasi container telah diverifikasi.`;
    } else {
      reply = `Menerima instruksi: "${lastMessage}". Menyiapkan langkah eksekusi berikutnya...`;
    }

    return {
      content: reply,
      usage: { inputTokens: 45, outputTokens: 60 },
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    return {
      success: true,
      message: 'Provider Mock aktif (siap testing offline 0ms)',
      latencyMs: 1,
    };
  }
}
