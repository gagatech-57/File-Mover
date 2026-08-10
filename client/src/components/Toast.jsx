import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div className={`toast ${toast.type || 'info'}`}>
      {toast.type === 'success' && <CheckCircle2 size={18} color="var(--success)" />}
      {toast.type === 'error' && <AlertCircle size={18} color="var(--danger)" />}
      {toast.type === 'info' && <Info size={18} color="var(--primary)" />}

      <span style={{ flex: 1, fontSize: '0.9rem' }}>{toast.message}</span>

      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
