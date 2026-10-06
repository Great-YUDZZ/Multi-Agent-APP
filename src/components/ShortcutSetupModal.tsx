import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, CheckSquare, Square, Rocket, X, Sparkles } from 'lucide-react';
import { createSystemShortcuts } from '../tauri/fsBridge';

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-lg overflow-hidden text-[#cccccc]"
        >
          {/* Header */}
          <div className="bg-[#252526] border-b border-[#2d2d2d] px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-[#0e639c]/20 border border-[#0e639c]/40 rounded">
                <Rocket size={18} className="text-[#3794ff]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Selamat Datang di Multi-Agent Desktop</h3>
                <p className="text-[11px] text-[#858585]">Konfigurasi Peluncur Aplikasi Awal</p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-[#858585] hover:text-white p-1 rounded hover:bg-[#333333] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            <div className="bg-[#252526] border border-[#333333] p-3 rounded text-xs text-[#cccccc] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor size={15} className="text-[#4ec9b0]" />
                <span>Sistem Operasi Terdeteksi:</span>
              </div>
              <span className="font-mono text-[11px] bg-[#1e1e1e] px-2 py-0.5 rounded border border-[#3c3c3c] text-[#4ec9b0] font-medium">
                {osLabel}
              </span>
            </div>

            <p className="text-xs text-[#aaaaaa] leading-relaxed">
              Apakah Anda ingin membuat shortcut otomatis agar aplikasi Multi-Agent mudah dibuka langsung kapan saja tanpa perlu mencari lokasi file?
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: Desktop */}
              <div
                onClick={() => setCreateDesktop(!createDesktop)}
                className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all ${
                  createDesktop
                    ? 'bg-[#0e639c]/15 border-[#0e639c] text-white'
                    : 'bg-[#252526] border-[#333333] text-[#999999] hover:border-[#444444]'
                }`}
              >
                <div className="mt-0.5">
                  {createDesktop ? (
                    <CheckSquare size={16} className="text-[#3794ff]" />
                  ) : (
                    <Square size={16} className="text-[#666666]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-white flex items-center gap-1.5">
                    <span>Shortcut Desktop</span>
                    <span className="text-[10px] font-mono text-[#858585]">
                      {isWindows ? '(Desktop Icon .lnk)' : '(~/Desktop/multi-agent-desktop.desktop)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#888888] mt-0.5">
                    Membuat ikon pintasan di layar Desktop Anda untuk akses instan sekali klik.
                  </p>
                </div>
              </div>

              {/* Option 2: Start Menu / Applications Launcher */}
              <div
                onClick={() => setCreateStartMenu(!createStartMenu)}
                className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all ${
                  createStartMenu
                    ? 'bg-[#0e639c]/15 border-[#0e639c] text-white'
                    : 'bg-[#252526] border-[#333333] text-[#999999] hover:border-[#444444]'
                }`}
              >
                <div className="mt-0.5">
                  {createStartMenu ? (
                    <CheckSquare size={16} className="text-[#3794ff]" />
                  ) : (
                    <Square size={16} className="text-[#666666]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-white flex items-center gap-1.5">
                    <span>Menu Aplikasi & Start Menu</span>
                    <span className="text-[10px] font-mono text-[#858585]">
                      {isWindows ? '(Start Menu Programs)' : '(~/.local/share/applications/)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#888888] mt-0.5">
                    Bisa dicari lewat menu pencarian aplikasi sistem (Super/Windows key).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#252526] border-t border-[#2d2d2d] px-5 py-3 flex items-center justify-between">
            <span className="text-[10px] text-[#777777]">
              Dapat diubah kapan saja di menu <strong className="text-[#999999]">Help &gt; Shortcut</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="px-3 py-1.5 text-xs text-[#cccccc] hover:text-white hover:bg-[#333333] rounded transition-colors"
              >
                Lewati
              </button>
              <button
                type="button"
                disabled={isSubmitting || (!createDesktop && !createStartMenu)}
                onClick={handleConfirm}
                className="px-4 py-1.5 text-xs font-medium bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#094771] disabled:opacity-50 text-white rounded transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {isSubmitting ? (
                  <span>Membuat Shortcut...</span>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Buat Shortcut</span>
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
