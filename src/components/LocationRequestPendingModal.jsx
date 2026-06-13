import React from 'react';
import { MapPinned } from 'lucide-react';
import ModalShell from './ModalShell';

export default function LocationRequestPendingModal({
  description = 'Aceite a solicitação de localização exibida pelo navegador para continuarmos.',
  onClose,
  open,
  title = 'Aguardando permissão do navegador',
}) {
  return (
    <ModalShell
      description={description}
      icon={MapPinned}
      onClose={onClose}
      open={open}
      title={title}
    >
      <div className="location-pending-state">
        <div className="session-spinner" aria-hidden="true" />
        <p>
          Assim que a localização for autorizada, o sistema continua
          automaticamente.
        </p>
      </div>
    </ModalShell>
  );
}
