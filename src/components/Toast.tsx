import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-10 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none select-none font-sans">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 3500);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const config = {
    success: {
      icon: <CheckCircle2 size={16} className="text-[#4ec9b0] shrink-0" />,
      border: 'border-[#4ec9b0]/50',
      bg: 'bg-[#1b2f28]',
    },
    error: {
      icon: <XCircle size={16} className="text-[#f87171] shrink-0" />,
      border: 'border-[#f87171]/50',
      bg: 'bg-[#2d1b1b]',
    },
    warning: {
      icon: <AlertTriangle size={16} className="text-[#e5c07b] shrink-0" />,
      border: 'border-[#e5c07b]/50',
      bg: 'bg-[#2d281a]',
    },
    info: {
      icon: <Info size={16} className="text-[#569cd6] shrink-0" />,
      border: 'border-[#569cd6]/50',
      bg: 'bg-[#1b2838]',
    },
  }[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-2xl border ${config.border} ${config.bg} text-[#cccccc] text-xs backdrop-blur-md`}
    >
      {config.icon}
      <div className="flex-1 min-w-0 pr-1">
        {toast.title && (
          <div className="font-semibold text-white text-xs mb-0.5">{toast.title}</div>
        )}
        <div className="text-[11px] leading-relaxed text-[#cccccc] break-words">
          {toast.message}
        </div>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-[#858585] hover:text-white p-1 rounded-xl cursor-pointer transition-colors hover:bg-white/10"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
};
