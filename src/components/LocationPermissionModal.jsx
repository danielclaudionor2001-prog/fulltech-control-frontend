import React from 'react';
import { MapPinned } from 'lucide-react';
import ModalShell from './ModalShell';

export default function LocationPermissionModal({
  description,
  guidance,
  onClose,
  onRetry,
  open,
  title,
}) {
  return (
    <ModalShell
      description={description}
      icon={MapPinned}
      onClose={onClose}
      open={open}
      title={title || guidance?.title || 'Permita a localização'}
    >
      <div className="location-modal-copy">
        <p className="section-subtitle">
          Siga este caminho no navegador para liberar o acesso e continuar.
        </p>

        <ol className="location-guidance-list">
          {(guidance?.steps || []).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose} type="button">
          Fechar
        </button>

        <button className="btn btn-primary" onClick={onRetry} type="button">
          Tentar novamente
        </button>
      </div>
    </ModalShell>
  );
}
