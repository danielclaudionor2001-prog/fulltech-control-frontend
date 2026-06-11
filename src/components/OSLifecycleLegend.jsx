import React from 'react';
import { CheckCircle2, Circle, Clock3, XCircle } from 'lucide-react';
import { SERVICE_ORDER_STATUS_STEPS } from '../utils/serviceOrderStatus';

const STATUS_ICONS = {
  CANCELED: XCircle,
  DONE: CheckCircle2,
  IN_PROGRESS: Clock3,
  OPEN: Circle,
};

export default function OSLifecycleLegend() {
  return (
    <div className="os-lifecycle" aria-label="Ciclo de vida da ordem de servico">
      {SERVICE_ORDER_STATUS_STEPS.map((step) => {
        const Icon = STATUS_ICONS[step.status] || Circle;

        return (
          <div className="os-lifecycle-step" key={step.status}>
            <span className={`os-lifecycle-icon status-${step.status.toLowerCase()}`}>
              <Icon size={16} />
            </span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.description}</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}
