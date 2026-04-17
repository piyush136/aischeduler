import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const VARIANT_STYLES = {
  confirm: {
    icon: AlertTriangle,
    iconClass: 'bg-amber-100 text-amber-600',
    accentClass: 'from-amber-500 to-orange-500',
    confirmClass: 'bg-slate-900 hover:bg-slate-800 text-white'
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'bg-emerald-100 text-emerald-600',
    accentClass: 'from-emerald-500 to-teal-500',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-500 text-white'
  },
  error: {
    icon: XCircle,
    iconClass: 'bg-rose-100 text-rose-600',
    accentClass: 'from-rose-500 to-pink-500',
    confirmClass: 'bg-rose-600 hover:bg-rose-500 text-white'
  },
  info: {
    icon: Info,
    iconClass: 'bg-indigo-100 text-indigo-600',
    accentClass: 'from-indigo-500 to-violet-500',
    confirmClass: 'bg-indigo-600 hover:bg-indigo-500 text-white'
  }
};

export default function ActionDialog({
  isOpen,
  variant = 'info',
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  loading = false,
  autoCloseMs
}) {
  useEffect(() => {
    if (!isOpen || !autoCloseMs || onConfirm) return undefined;
    const timeoutId = window.setTimeout(() => {
      onClose?.();
    }, autoCloseMs);
    return () => window.clearTimeout(timeoutId);
  }, [autoCloseMs, isOpen, onClose, onConfirm]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.info;
  const Icon = styles.icon;

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.25)]">
        <div className={`h-1.5 w-full bg-gradient-to-r ${styles.accentClass}`} />
        <button
          type="button"
          onClick={loading ? undefined : onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="px-6 pb-6 pt-7">
          <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${styles.iconClass}`}>
            <Icon size={28} />
          </div>

          <h3 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>

          <div className="mt-7 flex gap-3">
            {onConfirm ? (
              <>
                <button
                  type="button"
                  onClick={loading ? undefined : onClose}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${styles.confirmClass} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {loading ? 'Working...' : confirmLabel}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${styles.confirmClass}`}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
