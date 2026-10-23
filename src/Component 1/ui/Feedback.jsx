import { useCallback, useEffect, useRef, useState } from 'react';
import { FeedbackContext } from './feedbackContext';
import './Feedback.css';

const toastIcons = {
  success: '✓',
  error: '!',
  warning: '⚠',
  info: 'i',
};

let nextToastId = 1;

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div className={`ui-toast ${toast.type}`} role="status">
      <span className="ui-toast-icon">{toastIcons[toast.type]}</span>
      <div className="ui-toast-copy">
        <strong>{toast.title}</strong>
        {toast.message && <p>{toast.message}</p>}
      </div>
      <button
        type="button"
        className="ui-toast-close"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
      >
        ×
      </button>
      <span
        className="ui-toast-timer"
        style={{ animationDuration: `${toast.duration}ms` }}
      />
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, footer, size = 'medium' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);

    const firstField = dialogRef.current?.querySelector(
      'input, select, textarea, button:not(.ui-modal-close)'
    );
    firstField?.focus();

    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="ui-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`ui-modal ${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="ui-modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            type="button"
            className="ui-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="ui-modal-body">{children}</div>
        {footer && <footer className="ui-modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}

function Dialog({ dialog, onResolve }) {
  const [value, setValue] = useState(dialog.defaultValue || '');
  const isPrompt = dialog.kind === 'prompt';

  const submit = (event) => {
    event?.preventDefault();
    if (isPrompt) {
      if (!value.trim()) return;
      onResolve(value.trim());
    } else {
      onResolve(true);
    }
  };

  return (
    <Modal
      title={dialog.title}
      size="small"
      onClose={() => onResolve(isPrompt ? null : false)}
      footer={
        <>
          <button
            type="button"
            className="ui-button secondary"
            onClick={() => onResolve(isPrompt ? null : false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`ui-button ${dialog.danger ? 'danger' : 'primary'}`}
            onClick={submit}
            disabled={isPrompt && !value.trim()}
          >
            {dialog.confirmLabel || (isPrompt ? 'Save' : 'Confirm')}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        {dialog.message && <p className="ui-dialog-message">{dialog.message}</p>}
        {isPrompt && (
          <label className="ui-field">
            <span>{dialog.label}</span>
            <input
              value={value}
              placeholder={dialog.placeholder}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
        )}
      </form>
    </Modal>
  );
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  const dismissToast = useCallback((id) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((title, options = {}) => {
    const toast = {
      id: nextToastId++,
      type: options.type || 'info',
      title,
      message: options.message,
      duration: options.duration || 3800,
    };
    setToasts((previous) => [...previous.slice(-3), toast]);
  }, []);

  const openDialog = useCallback(
    (kind, options) =>
      new Promise((resolve) => {
        setDialog({ ...options, kind, resolve });
      }),
    []
  );

  const confirm = useCallback((options) => openDialog('confirm', options), [openDialog]);
  const prompt = useCallback((options) => openDialog('prompt', options), [openDialog]);

  const resolveDialog = (result) => {
    dialog.resolve(result);
    setDialog(null);
  };

  return (
    <FeedbackContext.Provider value={{ notify, confirm, prompt }}>
      {children}

      {dialog && <Dialog dialog={dialog} onResolve={resolveDialog} />}

      <div className="ui-toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

export function Spinner() {
  return <span className="ui-spinner" aria-hidden="true" />;
}
