import { useAuth } from '@clerk/clerk-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Folder, UserPlus, X } from 'lucide-react';
import { createServiceOrder, getCustomers } from '../services/api';
import '../index.css';

const getTodayInputValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function OSForm() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState('geral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [formData, setFormData] = useState({
    address: '',
    collaborator: '',
    customer: '',
    customerId: '',
    deadline: '',
    description: '',
    durationMinutes: '',
    identifier: '',
    osType: '',
    scheduleDate: getTodayInputValue(),
    scheduleTime: '',
  });

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await getCustomers(getToken);
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  const descriptionCount = formData.description.length;

  const canSubmit = useMemo(
    () =>
      Boolean(
        formData.osType &&
          formData.customer &&
          formData.description &&
          formData.durationMinutes &&
          formData.scheduleDate,
      ),
    [formData],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setSubmitError('');
    setIsSubmitting(true);

    try {
      await createServiceOrder(formData, getToken);
      navigate('/admin');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao criar OS';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === 'customerId') {
      const selectedCustomer = customers.find((customer) => customer.id === value);
      setFormData((previous) => ({
        ...previous,
        address: selectedCustomer?.address || previous.address,
        customer: selectedCustomer?.name || previous.customer,
        customerId: value,
      }));
      return;
    }

    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  return (
    <div className="os-shell">
      <div className="os-header">
        <div className="os-header-left">
          <Folder size={20} />
          <div className="os-header-title">Nova atividade</div>
        </div>

        <div className="os-header-actions">
          <button
            type="button"
            className="os-icon-btn"
            onClick={() => navigate('/admin')}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="os-tabs">
        <button
          type="button"
          className={`os-tab ${activeTab === 'geral' ? 'active' : ''}`}
          onClick={() => setActiveTab('geral')}
        >
          GERAL
        </button>
        <button
          type="button"
          className={`os-tab ${activeTab === 'localizacao' ? 'active' : ''}`}
          onClick={() => setActiveTab('localizacao')}
        >
          LOCALIZACAO
        </button>
        <button
          type="button"
          className={`os-tab ${activeTab === 'anexos' ? 'active' : ''}`}
          onClick={() => setActiveTab('anexos')}
        >
          ANEXOS
        </button>
      </div>

      <div className="os-content">
        <form className="os-form" onSubmit={handleSubmit}>
          {activeTab === 'geral' ? (
            <div className="os-form-inner">
              <div className="os-row cols-3">
                <div className="os-field">
                  <label className="os-label">Identificador</label>
                  <div className="os-underline">
                    <input
                      className="os-input"
                      type="text"
                      name="identifier"
                      value={formData.identifier}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="os-field">
                  <label className="os-label">Selecione um tipo de OS *</label>
                  <div className="os-underline os-select-shell">
                    <select
                      className="os-select"
                      name="osType"
                      required
                      value={formData.osType}
                      onChange={handleChange}
                    >
                      <option value="" disabled>
                        Selecione
                      </option>
                      <option value="instalacao">Instalacao</option>
                      <option value="manutencao">Manutencao</option>
                      <option value="vistoria">Vistoria</option>
                      <option value="suporte">Suporte</option>
                    </select>
                    <span className="os-caret">
                      <ChevronDown size={18} />
                    </span>
                  </div>
                </div>

                <div className="os-field">
                  <label className="os-label">Prazo</label>
                  <div className="os-underline os-select-shell">
                    <select
                      className="os-select"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleChange}
                    >
                      <option value="">Sem prazo</option>
                      <option value="D1_dia">1 dia</option>
                      <option value="D3_dias">3 dias</option>
                      <option value="D7_dias">7 dias</option>
                      <option value="D15_dias">15 dias</option>
                      <option value="D30_dias">30 dias</option>
                    </select>
                    <span className="os-caret">
                      <ChevronDown size={18} />
                    </span>
                  </div>
                </div>
              </div>

              <div className="os-row cols-1">
                <div className="os-field">
                  <label className="os-label">Cliente cadastrado</label>
                  <div className="os-underline os-select-shell">
                    <select
                      className="os-select"
                      name="customerId"
                      value={formData.customerId}
                      onChange={handleChange}
                    >
                      <option value="">Selecionar cliente salvo</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                    <span className="os-caret">
                      <ChevronDown size={18} />
                    </span>
                  </div>
                </div>
              </div>

              <div className="os-row cols-1 os-client-row">
                <div className="os-field">
                  <label className="os-label">Cliente *</label>
                  <div className="os-underline">
                    <input
                      className="os-input"
                      type="text"
                      name="customer"
                      required
                      value={formData.customer}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="os-client-action"
                  onClick={() => navigate('/admin/customers')}
                  aria-label="Cadastrar cliente"
                >
                  <UserPlus size={20} />
                </button>
              </div>

              <div className="os-textarea-wrap">
                <textarea
                  className="os-textarea"
                  name="description"
                  placeholder="Descricao da ordem de servico"
                  maxLength={5000}
                  required
                  value={formData.description}
                  onChange={handleChange}
                />
                <div className="os-counter">({descriptionCount} / 5000)</div>
              </div>

              <div className="os-row cols-3b">
                <div className="os-field">
                  <label className="os-label">Duracao estimada (min) *</label>
                  <div className="os-underline">
                    <input
                      className="os-input"
                      type="number"
                      min="1"
                      name="durationMinutes"
                      required
                      value={formData.durationMinutes}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="os-field">
                  <label className="os-label">Data do agendamento *</label>
                  <div className="os-underline">
                    <input
                      className="os-input"
                      type="date"
                      name="scheduleDate"
                      required
                      value={formData.scheduleDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="os-field">
                  <label className="os-label">Hora do agendamento</label>
                  <div className="os-underline">
                    <input
                      className="os-input"
                      type="time"
                      name="scheduleTime"
                      value={formData.scheduleTime}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="os-row cols-1">
                <div className="os-field">
                  <label className="os-label">Colaborador</label>
                  <div className="os-underline">
                    <input
                      className="os-input"
                      type="text"
                      name="collaborator"
                      value={formData.collaborator}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="os-divider" />
            </div>
          ) : null}

          {activeTab === 'localizacao' ? (
            <div className="os-form-inner">
              <div className="os-row cols-1">
                <div className="os-field">
                  <label className="os-label">Endereco</label>
                  <div className="os-underline">
                    <input
                      className="os-input"
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
              <div className="os-divider" />
            </div>
          ) : null}

          {activeTab === 'anexos' ? (
            <div className="os-form-inner">
              <div className="os-row cols-1">
                <div className="os-field">
                  <label className="os-label">Anexos</label>
                  <div className="os-underline">
                    <input
                      className="os-input"
                      type="text"
                      value=""
                      readOnly
                      placeholder="Envio de anexos"
                    />
                  </div>
                </div>
              </div>
              <div className="os-divider" />
            </div>
          ) : null}

          {submitError ? <div className="os-form-error">{submitError}</div> : null}

          <div className="os-actions">
            <button
              className="os-create"
              type="submit"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'CRIANDO...' : 'CRIAR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
