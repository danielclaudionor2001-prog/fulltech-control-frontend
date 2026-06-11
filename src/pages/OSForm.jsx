import { useAuth } from '@clerk/clerk-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderKanban, MapPin, Paperclip, UserPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SelectField from '../components/SelectField';
import { createServiceOrder, getCustomers } from '../services/api';

const ORDER_TYPE_OPTIONS = [
  { label: 'Instalação', value: 'instalacao' },
  { label: 'Manutenção', value: 'manutencao' },
  { label: 'Vistoria', value: 'vistoria' },
  { label: 'Suporte', value: 'suporte' },
];

const DEADLINE_OPTIONS = [
  { label: 'Sem prazo', value: '' },
  { label: '1 dia', value: 'D1_dia' },
  { label: '3 dias', value: 'D3_dias' },
  { label: '7 dias', value: 'D7_dias' },
  { label: '15 dias', value: 'D15_dias' },
  { label: '30 dias', value: 'D30_dias' },
];

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
        error instanceof Error ? error.message : 'Falha ao criar a OS.';
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
    <div className="dashboard-stack">
      <section className="page-hero">
        <div>
          <span className="page-eyebrow">Despacho</span>
          <h1 className="page-title">Nova ordem de serviço</h1>
          <p className="page-subtitle">
            Estruture a OS com cliente, janela de atendimento, prioridade e
            local de execução sem sair do fluxo administrativo.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={() => navigate('/admin')} type="button">
          <X size={18} />
          Fechar
        </button>
      </section>

      <section className="os-shell">
        <div className="os-header">
          <div className="os-header-left">
            <div className="os-header-icon">
              <FolderKanban size={18} />
            </div>
            <div>
              <span className="os-header-kicker">Cadastro</span>
              <div className="os-header-title">Detalhes da nova OS</div>
            </div>
          </div>
        </div>

        <div className="os-tabs">
          <button
            type="button"
            className={`os-tab ${activeTab === 'geral' ? 'active' : ''}`}
            onClick={() => setActiveTab('geral')}
          >
            Geral
          </button>
          <button
            type="button"
            className={`os-tab ${activeTab === 'localizacao' ? 'active' : ''}`}
            onClick={() => setActiveTab('localizacao')}
          >
            Localização
          </button>
          <button
            type="button"
            className={`os-tab ${activeTab === 'anexos' ? 'active' : ''}`}
            onClick={() => setActiveTab('anexos')}
          >
            Anexos
          </button>
        </div>

        <form className="os-form" onSubmit={handleSubmit}>
          {activeTab === 'geral' ? (
            <div className="os-form-panel">
              <div className="os-row cols-3">
                <label className="simple-form-field">
                  <span>Identificador</span>
                  <input
                    className="form-control"
                    type="text"
                    name="identifier"
                    value={formData.identifier}
                    onChange={handleChange}
                    placeholder="Ex.: 24871"
                  />
                </label>

                <label className="simple-form-field">
                  <span>Tipo de OS *</span>
                  <SelectField
                    options={ORDER_TYPE_OPTIONS}
                    onChange={(value) =>
                      setFormData((previous) => ({ ...previous, osType: value }))
                    }
                    placeholder="Selecione o tipo"
                    value={formData.osType}
                  />
                </label>

                <label className="simple-form-field">
                  <span>Prazo</span>
                  <SelectField
                    options={DEADLINE_OPTIONS}
                    onChange={(value) =>
                      setFormData((previous) => ({ ...previous, deadline: value }))
                    }
                    placeholder="Sem prazo"
                    value={formData.deadline}
                  />
                </label>
              </div>

              <div className="os-row cols-1 os-client-row">
                <div className="os-field os-client-field" ref={customerAutocompleteRef}>
                  <label className="simple-form-field">
                    <span>Cliente *</span>
                    <input
                      className="form-control"
                      type="text"
                      name="customer"
                      required
                      autoComplete="off"
                      value={formData.customer}
                      onChange={handleCustomerChange}
                      onFocus={() => setIsCustomerMenuOpen(true)}
                      onClick={() => setIsCustomerMenuOpen(true)}
                      placeholder="Digite para buscar clientes"
                    />
                  </label>

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

              <label className="simple-form-field os-textarea-wrap">
                <span>Descrição da ordem de serviço *</span>
                <textarea
                  className="os-textarea"
                  name="description"
                  placeholder="Descreva o que precisa ser feito, observações importantes e contexto do atendimento."
                  maxLength={5000}
                  required
                  value={formData.description}
                  onChange={handleChange}
                />
                <div className="os-counter">{descriptionCount} / 5000</div>
              </label>

              <div className="os-row cols-3b">
                <label className="simple-form-field">
                  <span>Duração estimada (min) *</span>
                  <input
                    className="form-control"
                    type="number"
                    min="1"
                    name="durationMinutes"
                    required
                    value={formData.durationMinutes}
                    onChange={handleChange}
                    placeholder="60"
                  />
                </label>

                <label className="simple-form-field">
                  <span>Data do agendamento *</span>
                  <input
                    className="form-control"
                    type="date"
                    name="scheduleDate"
                    required
                    value={formData.scheduleDate}
                    onChange={handleChange}
                  />
                </label>

                <label className="simple-form-field">
                  <span>Hora do agendamento</span>
                  <input
                    className="form-control"
                    type="time"
                    name="scheduleTime"
                    value={formData.scheduleTime}
                    onChange={handleChange}
                  />
                </label>
              </div>

              <div className="os-row cols-1">
                <label className="simple-form-field">
                  <span>Colaborador</span>
                  <input
                    className="form-control"
                    type="text"
                    name="collaborator"
                    value={formData.collaborator}
                    onChange={handleChange}
                    placeholder="Nome do contato ou solicitante"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {activeTab === 'localizacao' ? (
            <div className="os-form-panel">
              <div className="os-panel-empty">
                <MapPin size={18} />
                <div>
                  <strong>Endereço do atendimento</strong>
                  <p>
                    Informe onde a equipe deve executar o serviço. Se o cliente
                    já tiver endereço cadastrado, ele pode ser preenchido
                    automaticamente.
                  </p>
                </div>
              </div>

              <div className="os-row cols-1">
                <label className="simple-form-field">
                  <span>Endereço</span>
                  <input
                    className="form-control"
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Rua, número, bairro, cidade"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {activeTab === 'anexos' ? (
            <div className="os-form-panel">
              <div className="os-panel-empty">
                <Paperclip size={18} />
                <div>
                  <strong>Anexos</strong>
                  <p>
                    O campo de anexos pode ser conectado em seguida, mas a aba
                    já está preparada para receber esse fluxo.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {submitError ? <div className="os-form-error">{submitError}</div> : null}

          <div className="os-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/admin')}
              type="button"
            >
              Cancelar
            </button>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Criando...' : 'Criar OS'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
