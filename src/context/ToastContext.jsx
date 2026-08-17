import React, { createContext, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', options = {}) => {
    const duration = typeof options === 'number' ? options : options?.duration || 4000;
    const actionLabel = typeof options === 'object' ? options?.actionLabel : null;
    const onAction = typeof options === 'object' ? options?.onAction : null;

    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type, actionLabel, onAction }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Render Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-xl border backdrop-blur-md transition-all ${
                toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-100 border-emerald-500/40' :
                toast.type === 'warning' ? 'bg-amber-900/90 text-amber-100 border-amber-500/40' :
                toast.type === 'error' ? 'bg-rose-900/90 text-rose-100 border-rose-500/40' :
                'bg-indigo-900/90 text-indigo-100 border-indigo-500/40'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-400 shrink-0" />}
                <span className="text-sm font-medium truncate">{toast.message}</span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {toast.actionLabel && toast.onAction && (
                  <button
                    onClick={() => {
                      toast.onAction();
                      removeToast(toast.id);
                    }}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg transition-colors"
                  >
                    {toast.actionLabel}
                  </button>
                )}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-slate-300 hover:text-white transition-colors p-0.5"
                  aria-label="Close notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
