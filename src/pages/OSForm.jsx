import { useAuth } from '@clerk/clerk-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const customerAutocompleteRef = useRef(null);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState('geral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false);
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
  const filteredCustomers = useMemo(() => {
    const query = formData.customer.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) => {
      const searchableText = `${customer.name} ${customer.address}`.toLowerCase();
      return searchableText.includes(query);
    });
  }, [customers, formData.customer]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!customerAutocompleteRef.current?.contains(event.target)) {
        setIsCustomerMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

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

    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleCustomerChange = (event) => {
    const { value } = event.target;
    const exactMatch = customers.find(
      (customer) => customer.name.trim().toLowerCase() === value.trim().toLowerCase(),
    );

    setIsCustomerMenuOpen(true);
    setFormData((previous) => ({
      ...previous,
      address: exactMatch?.address || previous.address,
      customer: value,
      customerId: exactMatch?.id || '',
    }));
  };

  const handleCustomerSelect = (customer) => {
    setFormData((previous) => ({
      ...previous,
      address: customer.address || previous.address,
      customer: customer.name,
      customerId: customer.id,
    }));
    setIsCustomerMenuOpen(false);
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

              <div className="os-row cols-1 os-client-row">
                <div className="os-field os-client-field" ref={customerAutocompleteRef}>
                  <label className="os-label">Cliente *</label>
                  <div className="os-underline os-autocomplete-shell">
                    <input
                      className="os-input"
                      type="text"
                      name="customer"
                      required
                      autoComplete="off"
                      value={formData.customer}
                      onChange={handleCustomerChange}
                      onFocus={() => setIsCustomerMenuOpen(true)}
                      onClick={() => setIsCustomerMenuOpen(true)}
                    />
                  </div>

                  {isCustomerMenuOpen ? (
                    <div className="os-autocomplete-panel">
                      {filteredCustomers.length ? (
                        filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            className="os-autocomplete-item"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleCustomerSelect(customer);
                            }}
                          >
                            <span>{customer.name}</span>
                            <small>{customer.address}</small>
                          </button>
                        ))
                      ) : (
                        <div className="os-autocomplete-empty">
                          Nenhum cliente encontrado.
                        </div>
                      )}
                    </div>
                  ) : null}
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
