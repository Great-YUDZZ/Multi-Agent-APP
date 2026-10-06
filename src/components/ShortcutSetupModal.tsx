import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, CheckSquare, Square, X, Sparkles } from 'lucide-react';
import { createSystemShortcuts } from '../tauri/fsBridge';
import { CubesLogo } from './CubesLogo';

interface ShortcutSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const ShortcutSetupModal: React.FC<ShortcutSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const [createDesktop, setCreateDesktop] = useState(true);
  const [createStartMenu, setCreateStartMenu] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isLinux = typeof navigator !== 'undefined' && /linux/i.test(navigator.userAgent);
  const isWindows = typeof navigator !== 'undefined' && /win/i.test(navigator.userAgent);
  const osLabel = isWindows ? 'Windows' : isLinux ? 'Linux (GNOME/KDE/XFCE)' : 'Desktop';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const result = await createSystemShortcuts(createDesktop, createStartMenu);
      localStorage.setItem('multi_agent_shortcut_setup_prompted', 'true');
      if (onSuccessToast) {
        onSuccessToast(result.message || 'Shortcut berhasil dibuat!');
      }
      onClose();
    } catch (err: any) {
      localStorage.setItem('multi_agent_shortcut_setup_prompted', 'true');
      if (onSuccessToast) {
        onSuccessToast('Pengaturan shortcut selesai disimpan.');
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('multi_agent_shortcut_setup_prompted', 'true');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 font-sans select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-[#131522]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-[#e2e8f0]"
        >
          {/* Header with CubesLogo */}
          <div className="bg-white/[0.03] border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CubesLogo size={30} withGlow={true} />
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  Selamat Datang di Multi-Agent Desktop
                </h3>
                <p className="text-[11px] text-[#94a3b8]">
                  Konfigurasi Pintasan & Akses Cepat Aplikasi
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-[#94a3b8] hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] p-3 rounded-xl text-xs text-[#cbd5e1] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor size={15} className="text-[#38bdf8]" />
                <span className="text-[#94a3b8]">Sistem Operasi Terdeteksi:</span>
              </div>
              <span className="font-mono text-[11px] bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/30 text-indigo-300 font-medium">
                {osLabel}
              </span>
            </div>

            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Buat pintasan instan agar aplikasi mudah dibuka kapan saja langsung dari desktop atau launcher sistem tanpa perlu mencari letak berkas biner.
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: Desktop */}
              <div
                onClick={() => setCreateDesktop(!createDesktop)}
                className={`flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                  createDesktop
                    ? 'bg-indigo-600/15 border-indigo-500/50 text-white shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.06] text-[#94a3b8] hover:border-white/15'
                }`}
              >
                <div className="mt-0.5">
                  {createDesktop ? (
                    <CheckSquare size={17} className="text-indigo-400" />
                  ) : (
                    <Square size={17} className="text-slate-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span>Shortcut Desktop</span>
                    <span className="text-[10px] font-mono text-[#64748b]">
                      {isWindows ? '(Desktop Icon .lnk)' : '(~/Desktop/multi-agent-desktop.desktop)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-normal">
                    Membuat ikon pintasan di layar Desktop Anda untuk akses instan sekali klik.
                  </p>
                </div>
              </div>

              {/* Option 2: Start Menu / Applications Launcher */}
              <div
                onClick={() => setCreateStartMenu(!createStartMenu)}
                className={`flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                  createStartMenu
                    ? 'bg-indigo-600/15 border-indigo-500/50 text-white shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.06] text-[#94a3b8] hover:border-white/15'
                }`}
              >
                <div className="mt-0.5">
                  {createStartMenu ? (
                    <CheckSquare size={17} className="text-indigo-400" />
                  ) : (
                    <Square size={17} className="text-slate-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span>Menu Aplikasi & Start Menu</span>
                    <span className="text-[10px] font-mono text-[#64748b]">
                      {isWindows ? '(Start Menu Programs)' : '(~/.local/share/applications/)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-normal">
                    Bisa dicari lewat menu aplikasi sistem (tombol Super / Windows).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white/[0.02] border-t border-white/[0.07] px-6 py-3.5 flex items-center justify-between">
            <span className="text-[11px] text-[#64748b]">
              Bisa diatur ulang di menu <strong className="text-[#94a3b8]">Help &gt; Shortcut</strong>
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSkip}
                className="px-3.5 py-1.5 text-xs text-[#94a3b8] hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              >
                Lewati
              </button>
              <button
                type="button"
                disabled={isSubmitting || (!createDesktop && !createStartMenu)}
                onClick={handleConfirm}
                className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
              >
                {isSubmitting ? (
                  <span>Membuat Shortcut...</span>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Buat Shortcut Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
