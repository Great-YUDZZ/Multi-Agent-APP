import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Bot,
  Layers,
  Terminal,
  Keyboard,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CubesLogo } from './CubesLogo';

export type HelpTabType =
  | 'overview'
  | 'create-agent'
  | 'plan-mode'
  | 'build-mode'
  | 'terminal'
  | 'shortcuts';

interface HelpDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: HelpTabType;
}

export const HelpDocumentationModal: React.FC<HelpDocumentationModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<HelpTabType>(initialTab);

  if (!isOpen) return null;

  const tabs: { id: HelpTabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Tentang Aplikasi', icon: <BookOpen size={14} /> },
    { id: 'create-agent', label: 'Membuat Agen', icon: <Bot size={14} /> },
    { id: 'plan-mode', label: 'Plan Mode', icon: <Layers size={14} /> },
    { id: 'build-mode', label: 'Build Mode', icon: <CheckCircle2 size={14} /> },
    { id: 'terminal', label: 'Terminal & Keamanan', icon: <Terminal size={14} /> },
    { id: 'shortcuts', label: 'Shortcut Keyboard', icon: <Keyboard size={14} /> },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden text-[#cccccc]"
        >
          {/* Modal Header */}
          <div className="h-12 bg-[#252526] border-b border-[#2d2d2d] px-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <CubesLogo size={26} withGlow={true} />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Dokumentasi & Pusat Bantuan Multi-Agent Desktop
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-[#858585] hover:text-white hover:bg-[#333333] p-1.5 rounded transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Modal Body: Sidebar + Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Navigation Tabs */}
            <div className="w-56 bg-[#252526] border-r border-[#2d2d2d] p-2 space-y-1 shrink-0 overflow-y-auto">
              <div className="text-[10px] font-bold text-[#858585] uppercase tracking-wider px-2 py-1">
                DAFTAR PANDUAN
              </div>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#094771] text-white font-medium'
                      : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                  }`}
                >
                  <span className={activeTab === tab.id ? 'text-[#4ec9b0]' : 'text-[#858585]'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Document Content View */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs leading-relaxed text-[#cccccc] bg-[#1e1e1e]">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-[#252526] text-[#4ec9b0] border border-[#333333]">
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white">Selamat Datang di Multi-Agent Desktop</h3>
                      <p className="text-[#858585] text-[11px]">Aplikasi desktop orkestrasi kolaborasi multi-agen LLM dan otomasi tugas native.</p>
                    </div>
                  </div>

                  <p>
                    Aplikasi ini dirancang untuk memfasilitasi musyawarah arsitektur perangkat lunak antar agen cerdas (seperti <em>Researcher</em>, <em>Reviewer</em>, <em>QA</em>, dan <em>DevOps</em>) dengan format <strong>Dual-Engine</strong>:
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-[#252526] border border-[#333333] p-3 rounded-lg space-y-1">
                      <div className="font-semibold text-[#4ec9b0] flex items-center gap-1.5">
                        <Layers size={14} /> Plan Mode
                      </div>
                      <p className="text-[#999999] text-[11px]">
                        Diskusi multi-putaran antar agen untuk merumuskan spesifikasi, dependency task graph, dan kriteria keberhasilan hingga mencapai konsensus moderator.
                      </p>
                    </div>

                    <div className="bg-[#252526] border border-[#333333] p-3 rounded-lg space-y-1">
                      <div className="font-semibold text-[#569cd6] flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Build Mode
                      </div>
                      <p className="text-[#999999] text-[11px]">
                        Visualisasi eksekusi graf tugas dengan pengecekan deviasi otomatis (*Deviation Check*) dan rekap deliverable proyek.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'create-agent' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Bot size={16} className="text-[#4ec9b0]" /> Panduan Membuat & Menyesuaikan Agen
                  </h3>
                  <p>
                    Anda dapat membuat agen baru menggunakan <strong>5-Step Agent Builder Wizard</strong> melalui tombol <em>Settings &gt; Agent Registry &gt; Buat Agen Baru</em>.
                  </p>

                  <div className="space-y-3">
                    <div className="bg-[#252526] border border-[#333333] p-3 rounded space-y-1">
                      <div className="font-semibold text-white">1. Identitas & Persona</div>
                      <p className="text-[#999999] text-[11px]">Tentukan nama agen, inisial badge avatar, palet warna visual, dan tugas peran utamanya.</p>
                    </div>

                    <div className="bg-[#252526] border border-[#333333] p-3 rounded space-y-1">
                      <div className="font-semibold text-white">2. Preset Trust Level</div>
                      <p className="text-[#999999] text-[11px]">Pilih tingkat kepercayaan agen: <code>Secure</code> (pembacaan aman), <code>Review-Driven</code> (tanya izin untuk aksi kritis), atau <code>Agent-Driven</code>.</p>
                    </div>

                    <div className="bg-[#252526] border border-[#333333] p-3 rounded space-y-1">
                      <div className="font-semibold text-white">3. Integrasi Skill Markdown</div>
                      <p className="text-[#999999] text-[11px]">Hubungkan keahlian khusus melalui Skill Registry (misalnya <code>web-search</code>, <code>code-audit</code>, <code>docker-tool</code>).</p>
                    </div>

                    <div className="bg-[#252526] border border-[#333333] p-3 rounded space-y-1">
                      <div className="font-semibold text-white">4. Sandbox Testing Interaktif</div>
                      <p className="text-[#999999] text-[11px]">Uji respon dan kepatuhan instruksi agen dalam memori sebelum menyimpannya ke sistem utama.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'plan-mode' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers size={16} className="text-[#4ec9b0]" /> Panduan Plan Mode & Konsensus
                  </h3>
                  <p>
                    Dalam <strong>Plan Mode</strong>, agen-agen berkolaborasi untuk menyusun rencana arsitektur secara mendalam:
                  </p>

                  <ul className="list-disc list-inside space-y-2 text-[#cccccc] pl-1">
                    <li><strong>Round-Robin Mode:</strong> Agen berbicara bergiliran secara adil sesuai urutan antrean.</li>
                    <li><strong>Hierarchical Mode:</strong> Moderator mengarahkan diskusi dan memanggil agen yang paling relevan.</li>
                    <li><strong>Penyebutan Spesifik:</strong> Gunakan <code>@NamaAgent</code> (contoh: <code>@Agent A</code>) di bilah prompt untuk mengarahkan pesan langsung ke agen tersebut.</li>
                    <li><strong>Konsensus Otomatis:</strong> Moderator LLM mengevaluasi kesepakatan dan secara otomatis menghasilkan dokumen rencana kerja (<code>PlanDocument</code>).</li>
                  </ul>
                </div>
              )}

              {activeTab === 'build-mode' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#4ec9b0]" /> Panduan Build Mode & Visualisasi Graf
                  </h3>
                  <p>
                    Setelah PlanDocument disetujui, alihkan workspace ke <strong>Build Mode</strong> untuk memantau implementasi:
                  </p>
                  <div className="space-y-2">
                    <div className="p-2.5 bg-[#252526] border border-[#333333] rounded">
                      <span className="font-semibold text-white">Task Dependency Graph:</span> Menampilkan relasi antar tugas secara visual beserta status (<em>Pending</em>, <em>Running</em>, <em>Completed</em>, <em>Failed</em>).
                    </div>
                    <div className="p-2.5 bg-[#252526] border border-[#333333] rounded">
                      <span className="font-semibold text-white">Deviation Check:</span> Sistem secara berkala memverifikasi apakah eksekusi sesuai kriteria rencana awal atau terdapat deviasi tak terduga.
                    </div>
                    <div className="p-2.5 bg-[#252526] border border-[#333333] rounded">
                      <span className="font-semibold text-white">Deliverables Panel:</span> Menyediakan tombol <strong>Copy MD</strong> dan <strong>Download .md</strong> untuk mengekspor hasil ke berkas markdown permanen.
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'terminal' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Terminal size={16} className="text-[#4ec9b0]" /> Panduan Terminal Native & Keamanan
                  </h3>
                  <p>
                    Aplikasi ini terhubung langsung ke shell sistem operasi Anda (<code>bash/sh</code> di Linux, <code>cmd.exe</code> di Windows).
                  </p>

                  <div className="p-3 bg-[#252526] border border-[#333333] rounded space-y-2">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <ShieldCheck size={16} className="text-[#4ec9b0]" /> Proteksi Permission Gate
                    </div>
                    <p className="text-[11px] text-[#999999]">
                      Setiap perintah terminal berbahaya seperti <code>rm -rf</code>, <code>del</code>, atau <code>format</code> akan memicu dialog persetujuan (*Command Approval Modal*). Agen tidak akan dapat menjalankan perintah tersebut tanpa izin eksplisit Anda.
                    </p>
                  </div>

                  <p className="text-[11px] text-[#858585]">
                    Tekan <kbd className="px-1.5 py-0.5 bg-[#333333] rounded font-mono text-white">Ctrl + `</kbd> untuk membuka atau menyembunyikan dok Terminal kapan saja.
                  </p>
                </div>
              )}

              {activeTab === 'shortcuts' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Keyboard size={16} className="text-[#4ec9b0]" /> Daftar Shortcut Keyboard Lengkap
                  </h3>

                  <div className="border border-[#333333] rounded overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#252526] text-[#858585] border-b border-[#333333]">
                        <tr>
                          <th className="p-2.5">Kombinasi Tombol</th>
                          <th className="p-2.5">Aksi / Perintah</th>
                          <th className="p-2.5">Cakupan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2d2d2d]">
                        <tr>
                          <td className="p-2.5 font-mono text-[#9cdcfe]">Ctrl + `</td>
                          <td className="p-2.5 text-white">Buka / Tutup Terminal Dock</td>
                          <td className="p-2.5 text-[#858585]">Global</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-[#9cdcfe]">Ctrl + N</td>
                          <td className="p-2.5 text-white">Mulai Sesi Baru</td>
                          <td className="p-2.5 text-[#858585]">Global</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-[#9cdcfe]">Ctrl + S</td>
                          <td className="p-2.5 text-white">Simpan Berkas Aktif</td>
                          <td className="p-2.5 text-[#858585]">Editor</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-[#9cdcfe]">Ctrl + +</td>
                          <td className="p-2.5 text-white">Perbesar Tampilan (Zoom In)</td>
                          <td className="p-2.5 text-[#858585]">Tampilan</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-[#9cdcfe]">Ctrl + -</td>
                          <td className="p-2.5 text-white">Perkecil Tampilan (Zoom Out)</td>
                          <td className="p-2.5 text-[#858585]">Tampilan</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-[#9cdcfe]">Ctrl + 0</td>
                          <td className="p-2.5 text-white">Reset Ukuran Tampilan (100%)</td>
                          <td className="p-2.5 text-[#858585]">Tampilan</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-[#9cdcfe]">F11</td>
                          <td className="p-2.5 text-white">Toggle Fullscreen</td>
                          <td className="p-2.5 text-[#858585]">Jendela</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="h-10 bg-[#252526] border-t border-[#2d2d2d] px-5 flex items-center justify-between text-[11px] text-[#858585] shrink-0">
            <span>Multi-Agent Desktop v0.1.4 — Dokumentasi Lengkap</span>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white rounded text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
