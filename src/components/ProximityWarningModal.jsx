import React from 'react';
import { TriangleAlert } from 'lucide-react';
import ModalShell from './ModalShell';

export default function ProximityWarningModal({
  message,
  onClose,
  onRetry,
  open,
}) {
  return (
    <ModalShell
      description="O atendimento só pode ser iniciado quando o responsável estiver próximo do endereço do cliente."
      icon={TriangleAlert}
      onClose={onClose}
      open={open}
      title="Você está longe do cliente"
    >
      <div className="location-modal-copy">
        <p className="section-subtitle">
          {message ||
            'A sua localização atual ainda não está dentro do raio permitido para iniciar esta OS.'}
        </p>
      </div>

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose} type="button">
          Fechar
        </button>

        {onRetry ? (
          <button className="btn btn-primary" onClick={onRetry} type="button">
            Tentar novamente
          </button>
        ) : null}
      </div>
    </ModalShell>
  );
}
