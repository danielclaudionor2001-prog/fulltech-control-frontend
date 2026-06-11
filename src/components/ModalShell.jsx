import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function ModalShell({
  children,
  description,
  icon: Icon,
  onClose,
  open,
  title,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="modal-backdrop"
      onClick={() => onClose?.()}
    >
      <div
        aria-modal="true"
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-header">
          <div className="modal-title-row">
            {Icon ? (
              <div className="modal-icon">
                <Icon size={18} />
              </div>
            ) : null}

            <div className="modal-copy">
              <h3 className="modal-title">{title}</h3>
              {description ? <p className="modal-subtitle">{description}</p> : null}
            </div>
          </div>

          <button
            aria-label="Fechar modal"
            className="modal-close"
            onClick={() => onClose?.()}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
