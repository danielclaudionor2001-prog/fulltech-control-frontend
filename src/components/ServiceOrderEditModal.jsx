import React, { useMemo, useState } from 'react';
import { FilePenLine } from 'lucide-react';
import ButtonSpinner from './ButtonSpinner';
import ModalShell from './ModalShell';
import SelectField from './SelectField';
import { useToast } from './ToastContext';

const ORDER_TYPE_OPTIONS = [
  { label: 'Manutencao mensal', value: 'manutencao_mensal' },
  { label: 'SERVICOS/INSTALACOES', value: 'servicos_interacao' },
  { label: 'Vistoria', value: 'vistoria' },
  { label: 'Atendimento de chamado', value: 'atendimento_chamado' },
];

const DEADLINE_OPTIONS = [
  { label: 'Sem prazo', value: '' },
  { label: '1 dia', value: 'D1_dia' },
  { label: '3 dias', value: 'D3_dias' },
  { label: '7 dias', value: 'D7_dias' },
  { label: '15 dias', value: 'D15_dias' },
  { label: '30 dias', value: 'D30_dias' },
];

const toDateInputValue = (dateLike) => {
  if (!dateLike) {
    return '';
  }

  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (dateLike, fallback) => {
  if (fallback) {
    return fallback;
  }

  if (!dateLike) {
    return '';
  }

  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
};

const normalizePhonesForInput = (phones) =>
  Array.isArray(phones) ? phones.filter(Boolean).join(', ') : '';

const normalizePhonesForPayload = (value) =>
  value
    .split(/[,;\n]/)
    .map((phone) => phone.trim())
    .filter(Boolean);

const getUserLabel = (user) => {
  const roleLabel = user.role === 'SUPERVISOR' ? 'Supervisor' : 'Tecnico';
  return `${user.name || user.email || user.clerkUserId} - ${roleLabel}`;
};

const buildInitialForm = (os) => ({
  address: os.address || '',
  assignedToId: os.assignedToId || '',
  customer: os.customer || '',
  customerEmail: os.customerEmail || '',
  customerId: '',
  customerPhones: normalizePhonesForInput(os.customerPhones),
  deadline: os.deadline || '',
  description: os.description || '',
  osType: os.osType || '',
  scheduleDate: toDateInputValue(os.scheduleAt),
  scheduleTime: toTimeInputValue(os.scheduleAt, os.scheduleTimeText),
});

export default function ServiceOrderEditModal({
  assignableUsers = [],
  customers = [],
  isSubmitting = false,
  onClose,
  onSubmit,
  os,
}) {
  const { showWarning } = useToast();
  const [formData, setFormData] = useState(() => buildInitialForm(os));

  const customerOptions = useMemo(
    () => [
      { label: 'Manter dados atuais', value: '' },
      ...customers.map((customer) => ({
        label: customer.email ? `${customer.name} (${customer.email})` : customer.name,
        value: customer.id,
      })),
    ],
    [customers],
  );

  const assignableUserOptions = useMemo(
    () => [
      { label: 'Sem responsavel', value: '' },
      ...assignableUsers
        .filter((user) => user.isActive !== false)
        .map((user) => ({
          label: getUserLabel(user),
          value: user.id,
        })),
    ],
    [assignableUsers],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCustomerSelect = (customerId) => {
    const selectedCustomer = customers.find((customer) => customer.id === customerId);

    if (!selectedCustomer) {
      setFormData((previous) => ({
        ...previous,
        customerId: '',
      }));
      return;
    }

    setFormData((previous) => ({
      ...previous,
      address: selectedCustomer.address || previous.address,
      customer: selectedCustomer.name || previous.customer,
      customerEmail: selectedCustomer.email || '',
      customerId,
      customerPhones: normalizePhonesForInput(selectedCustomer.phones),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.osType) {
      showWarning('Informe o tipo da OS.');
      return;
    }

    if (!formData.customer.trim()) {
      showWarning('Informe o cliente da OS.');
      return;
    }

    if (!formData.description.trim()) {
      showWarning('Informe a descricao da OS.');
      return;
    }

    if (!formData.scheduleDate) {
      showWarning('Informe a data do agendamento.');
      return;
    }

    onSubmit({
      address: formData.address || undefined,
      assignedToId: formData.assignedToId || null,
      customer: formData.customer.trim(),
      customerEmail: formData.customerEmail || undefined,
      customerPhones: normalizePhonesForPayload(formData.customerPhones),
      deadline: formData.deadline || null,
      description: formData.description.trim(),
      osType: formData.osType,
      scheduleDate: formData.scheduleDate,
      scheduleTime: formData.scheduleTime || undefined,
    });
  };

  return (
    <ModalShell
      description={os.identifier ? `OS #${os.identifier}` : `OS #${os.id.slice(0, 8)}`}
      icon={FilePenLine}
      onClose={isSubmitting ? undefined : onClose}
      open
      title="Editar OS"
    >
      <form className="simple-form" onSubmit={handleSubmit}>
        <div className="os-row cols-3b">
          <label className="simple-form-field">
            <span>Tipo de OS *</span>
            <SelectField
              onChange={(value) =>
                setFormData((previous) => ({ ...previous, osType: value }))
              }
              options={ORDER_TYPE_OPTIONS}
              placeholder="Selecione o tipo"
              value={formData.osType}
            />
          </label>

          <label className="simple-form-field">
            <span>Prazo</span>
            <SelectField
              onChange={(value) =>
                setFormData((previous) => ({ ...previous, deadline: value }))
              }
              options={DEADLINE_OPTIONS}
              placeholder="Sem prazo"
              value={formData.deadline}
            />
          </label>

          <label className="simple-form-field">
            <span>Tecnico responsavel</span>
            <SelectField
              onChange={(value) =>
                setFormData((previous) => ({ ...previous, assignedToId: value }))
              }
              options={assignableUserOptions}
              placeholder="Selecione"
              value={formData.assignedToId}
            />
          </label>
        </div>

        <label className="simple-form-field">
          <span>Cliente cadastrado</span>
          <SelectField
            onChange={handleCustomerSelect}
            options={customerOptions}
            placeholder="Selecione um cliente"
            value={formData.customerId}
          />
        </label>

        <div className="os-row cols-3b">
          <label className="simple-form-field">
            <span>Nome do cliente *</span>
            <input
              className="form-control"
              name="customer"
              onChange={handleChange}
              value={formData.customer}
            />
          </label>

          <label className="simple-form-field">
            <span>Telefone(s)</span>
            <input
              className="form-control"
              name="customerPhones"
              onChange={handleChange}
              placeholder="Separe por virgula"
              value={formData.customerPhones}
            />
          </label>

          <label className="simple-form-field">
            <span>E-mail</span>
            <input
              className="form-control"
              name="customerEmail"
              onChange={handleChange}
              type="email"
              value={formData.customerEmail}
            />
          </label>
        </div>

        <label className="simple-form-field">
          <span>Endereco</span>
          <input
            className="form-control"
            name="address"
            onChange={handleChange}
            value={formData.address}
          />
        </label>

        <div className="os-row cols-3b">
          <label className="simple-form-field">
            <span>Data do agendamento *</span>
            <input
              className="form-control"
              name="scheduleDate"
              onChange={handleChange}
              type="date"
              value={formData.scheduleDate}
            />
          </label>

          <label className="simple-form-field">
            <span>Hora do agendamento</span>
            <input
              className="form-control"
              name="scheduleTime"
              onChange={handleChange}
              type="time"
              value={formData.scheduleTime}
            />
          </label>
        </div>

        <label className="simple-form-field">
          <span>Descricao da ordem de servico *</span>
          <textarea
            className="os-textarea"
            maxLength={5000}
            name="description"
            onChange={handleChange}
            value={formData.description}
          />
        </label>

        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? <ButtonSpinner /> : null}
            {isSubmitting ? 'Salvando...' : 'Salvar OS'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
