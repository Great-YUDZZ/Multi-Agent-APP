import React, { useState } from 'react';
import { ShieldAlert, Terminal, AlertTriangle, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CommandApprovalRequest } from '../types';

interface CommandApprovalModalProps {
  request: CommandApprovalRequest | null;
  onConfirm: (approved: boolean, alwaysAllow?: boolean) => void;
}

export const CommandApprovalModal: React.FC<CommandApprovalModalProps> = ({
  request,
  onConfirm,
}) => {
  const [alwaysAllow, setAlwaysAllow] = useState(false);

  if (!request) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-[#252526] border-2 border-[#ce9178] rounded-lg shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-[#3b2020] px-4 py-3 flex items-center justify-between border-b border-[#ce9178]/40">
            <div className="flex items-center gap-2.5 text-[#ce9178]">
              <ShieldAlert size={20} className="shrink-0" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Izin Eksekusi Terminal Diperlukan
                </h3>
                <p className="text-[11px] text-[#ce9178]">
                  Platform Target: <span className="font-mono uppercase font-bold">{request.platform}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => onConfirm(false)}
              className="text-[#858585] hover:text-white p-1 rounded transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 text-xs text-[#cccccc]">
            {/* Warning Note */}
            <div className="flex items-start gap-2 bg-[#2d1b1b] p-3 rounded border border-[#ce9178]/30 text-[11px] leading-relaxed">
              <AlertTriangle size={15} className="text-[#ce9178] shrink-0 mt-0.5" />
              <span>
                Agent <strong className="text-white">{request.agentName}</strong> meminta untuk menjalankan perintah terminal sistem. Verifikasi perintah di bawah ini secara teliti sebelum memberikan izin.
              </span>
            </div>

            {/* Exact Command Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#858585] uppercase tracking-wider flex items-center gap-1">
                <Terminal size={12} className="text-[#007acc]" />
                <span>Perintah Sistem Persis (Exact Command):</span>
              </label>
              <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded p-3 font-mono text-[#4ec9b0] text-xs overflow-x-auto select-text break-all shadow-inner">
                {request.command}
              </div>
            </div>

            {/* Rationale / Reason */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#858585] uppercase tracking-wider">
                Alasan dari Agent:
              </label>
              <p className="bg-[#1e1e1e] border border-[#333333] p-2.5 rounded text-[11px] text-[#cccccc] leading-relaxed">
                {request.reason}
              </p>
            </div>

            {/* Checkbox: Always allow this specific command */}
            <label className="flex items-center gap-2 cursor-pointer pt-1 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={alwaysAllow}
                onChange={(e) => setAlwaysAllow(e.target.checked)}
                className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0e639c] focus:ring-0 w-3.5 h-3.5"
              />
              <span className="text-[11px]">
                Selalu izinkan perintah persis ini di masa mendatang untuk agent ini
              </span>
            </label>
          </div>

          {/* Actions Footer */}
          <div className="bg-[#1e1e1e] px-4 py-3 flex items-center justify-end gap-2 border-t border-[#333333]">
            <button
              onClick={() => onConfirm(false)}
              className="px-3.5 py-1.5 bg-[#333333] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded text-xs transition-colors"
            >
              Tolak Perintah
            </button>
            <button
              onClick={() => onConfirm(true, alwaysAllow)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#ce9178] hover:bg-[#dfa087] text-[#1e1e1e] font-bold rounded text-xs transition-colors shadow"
            >
              <Check size={14} />
              <span>Setujui & Jalankan</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
