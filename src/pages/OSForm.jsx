import { useAuth } from '@clerk/clerk-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  MapPin,
  Paperclip,
  UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppAuth } from '../auth/useAppAuth';
import ButtonSpinner from '../components/ButtonSpinner';
import SelectField from '../components/SelectField';
import { useToast } from '../components/ToastContext';
import { createServiceOrder, getCustomers, getUsers } from '../services/api';

const ORDER_TYPE_OPTIONS = [
  { label: 'Manutenção mensal', value: 'manutencao_mensal' },
  { label: 'Serviços/Instalações', value: 'servicos_interacao' },
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

const getTodayInputValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMissingFields = (formData) => {
  const missingFields = [];

  if (!formData.osType) {
    missingFields.push('tipo de OS');
  }

  if (!formData.customer.trim()) {
    missingFields.push('cliente');
  }

  if (!formData.description.trim()) {
    missingFields.push('descrição');
  }

  if (!formData.scheduleDate) {
    missingFields.push('data do agendamento');
  }

  return missingFields;
};

export default function OSForm() {
  const { getToken } = useAuth();
  const { appUser } = useAppAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const navigate = useNavigate();
  const customerAutocompleteRef = useRef(null);
  const tabsRef = useRef(null);
  const [customers, setCustomers] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('geral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [showTabsLeftHint, setShowTabsLeftHint] = useState(false);
  const [showTabsRightHint, setShowTabsRightHint] = useState(false);
  const isAdmin = appUser?.role === 'ADMIN';

  const [formData, setFormData] = useState({
    address: '',
    assignedToId: '',
    customer: '',
    customerEmail: '',
    customerId: '',
    customerPhones: [],
    deadline: '',
    description: '',
    identifier: '',
    osType: '',
    scheduleDate: getTodayInputValue(),
    scheduleTime: '',
  });

  const fetchCustomers = useCallback(async () => {
    if (!isAdmin) {
      setCustomers([]);
      return;
    }

    try {
      const data = await getCustomers(getToken);
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  }, [getToken, isAdmin]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  const fetchAssignableUsers = useCallback(async () => {
    if (!isAdmin) {
      setAssignableUsers([]);
      return;
    }

    setIsUsersLoading(true);

    try {
      const data = await getUsers(getToken);
      setAssignableUsers(data);
    } catch (error) {
      console.error('Failed to fetch assignable users', error);
    } finally {
      setIsUsersLoading(false);
    }
  }, [getToken, isAdmin]);

  useEffect(() => {
    void fetchAssignableUsers();
  }, [fetchAssignableUsers]);

  const syncTabsHint = useCallback(() => {
    const tabsElement = tabsRef.current;
    if (!tabsElement) {
      setShowTabsLeftHint(false);
      setShowTabsRightHint(false);
      return;
    }

    const hasOverflow = tabsElement.scrollWidth - tabsElement.clientWidth > 12;
    const reachedStart = tabsElement.scrollLeft <= 12;
    const reachedEnd =
      tabsElement.scrollLeft + tabsElement.clientWidth >= tabsElement.scrollWidth - 12;

    setShowTabsLeftHint(hasOverflow && !reachedStart);
    setShowTabsRightHint(hasOverflow && !reachedEnd);
  }, []);

  useEffect(() => {
    const tabsElement = tabsRef.current;
    if (!tabsElement) {
      return undefined;
    }

    syncTabsHint();

    const handleScroll = () => syncTabsHint();
    const handleResize = () => syncTabsHint();

    tabsElement.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      tabsElement.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [syncTabsHint]);

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

  const assignableUserOptions = useMemo(
    () => [
      { label: 'Sem responsável definido', value: '' },
      ...assignableUsers
        .filter(
          (user) =>
            user.isActive &&
            (user.role === 'TECH' || user.role === 'SUPERVISOR'),
        )
        .map((user) => {
        const name = user.name || user.email || user.clerkUserId;
        const roleLabel =
          user.role === 'SUPERVISOR' ? 'Supervisor' : 'Técnico';

        return {
          label: `${name} (${roleLabel})`,
          value: user.id,
        };
      }),
    ],
    [assignableUsers],
  );

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

  const returnPath = isAdmin ? '/admin' : '/tech';

  const handleSubmit = async (event) => {
    event.preventDefault();

    const missingFields = getMissingFields(formData);
    if (missingFields.length > 0) {
      showWarning(
        `Preencha os campos obrigatórios: ${missingFields.join(', ')}.`,
      );
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createServiceOrder(formData, getToken);
      showSuccess('Ordem de serviço criada com sucesso.');
      navigate(returnPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao criar a OS.';
      showError(message);
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
      customerEmail: exactMatch?.email || '',
      customerId: exactMatch?.id || '',
      customerPhones: exactMatch?.phones || [],
    }));
  };

  const handleCustomerSelect = (customer) => {
    setFormData((previous) => ({
      ...previous,
      address: customer.address || previous.address,
      customer: customer.name,
      customerEmail: customer.email || '',
      customerId: customer.id,
      customerPhones: customer.phones || [],
    }));
    setIsCustomerMenuOpen(false);
  };

  const handleScrollTabs = (direction) => {
    tabsRef.current?.scrollBy({
      behavior: 'smooth',
      left: direction === 'left' ? -180 : 180,
    });
  };

  return (
    <div className="dashboard-stack">
      <section className="page-hero">
        <div>
          <span className="page-eyebrow">Despacho</span>
          <h1 className="page-title">Nova ordem de serviço</h1>
        </div>
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

        <div className="os-tabs-shell">
          <div
            ref={tabsRef}
            className={`os-tabs ${showTabsLeftHint ? 'has-left-hint' : ''} ${
              showTabsRightHint ? 'has-right-hint' : ''
            }`.trim()}
            aria-label="Etapas da nova ordem de serviço"
          >
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

          {showTabsLeftHint ? (
            <button
              aria-label="Mostrar abas anteriores"
              className="os-tabs-mobile-hint is-left"
              onClick={() => handleScrollTabs('left')}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
          ) : null}

          {showTabsRightHint ? (
            <button
              aria-label="Mostrar mais abas"
              className="os-tabs-mobile-hint is-right"
              onClick={() => handleScrollTabs('right')}
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          ) : null}
        </div>

        <form className="os-form" onSubmit={handleSubmit}>
          {activeTab === 'geral' ? (
            <div className="os-form-panel">
              <div className="os-row cols-3">
                <label className="simple-form-field">
                  <span>Identificador</span>
                  <input
                    className="form-control"
                    name="identifier"
                    onChange={handleChange}
                    placeholder="Ex.: 24871"
                    type="text"
                    value={formData.identifier}
                  />
                </label>

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
              </div>

              <div className="os-row cols-1 os-client-row">
                <div
                  className={`os-field os-client-field ${
                    isAdmin ? '' : 'os-client-field-full'
                  }`.trim()}
                  ref={customerAutocompleteRef}
                >
                  <label className="simple-form-field">
                    <span>Cliente *</span>
                    <input
                      autoComplete="off"
                      className="form-control"
                      name="customer"
                      onChange={handleCustomerChange}
                      onClick={() => setIsCustomerMenuOpen(true)}
                      onFocus={() => setIsCustomerMenuOpen(true)}
                      placeholder="Digite para buscar clientes"
                      type="text"
                      value={formData.customer}
                    />
                  </label>

                  {isCustomerMenuOpen ? (
                    <div className="os-autocomplete-panel">
                      {filteredCustomers.length ? (
                        filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            className="os-autocomplete-item"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleCustomerSelect(customer);
                            }}
                            type="button"
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

                {isAdmin ? (
                  <button
                    aria-label="Cadastrar cliente"
                    className="os-client-action"
                    onClick={() => navigate('/admin/customers')}
                    type="button"
                  >
                    <UserPlus size={20} />
                  </button>
                ) : null}
              </div>

              <label className="simple-form-field os-textarea-wrap">
                <span>Descrição da ordem de serviço *</span>
                <textarea
                  className="os-textarea"
                  maxLength={5000}
                  name="description"
                  onChange={handleChange}
                  placeholder="Descreva o que precisa ser feito, observações importantes e contexto do atendimento."
                  value={formData.description}
                />
                <div className="os-counter">{descriptionCount} / 5000</div>
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

              {isAdmin ? (
                <div className="os-row cols-1">
                  <label className="simple-form-field">
                    <span>Técnico responsável</span>
                    <SelectField
                      disabled={isUsersLoading}
                      onChange={(value) =>
                        setFormData((previous) => ({
                          ...previous,
                          assignedToId: value,
                        }))
                      }
                      options={assignableUserOptions}
                      placeholder={
                        isUsersLoading
                          ? 'Carregando usuários...'
                          : 'Selecione um usuário'
                      }
                      value={formData.assignedToId}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'localizacao' ? (
            <div className="os-form-panel">
              <div className="os-panel-empty">
                <MapPin size={18} />
                <div>
                  <strong>Endereço do atendimento</strong>
                  <p>
                    Informe onde a equipe deve executar o serviço. Se o cliente já
                    tiver endereço cadastrado, ele pode ser preenchido
                    automaticamente.
                  </p>
                </div>
              </div>

              <div className="os-row cols-1">
                <label className="simple-form-field">
                  <span>Endereço</span>
                  <input
                    className="form-control"
                    name="address"
                    onChange={handleChange}
                    placeholder="Rua, número, bairro, cidade"
                    type="text"
                    value={formData.address}
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
                    O campo de anexos pode ser conectado em seguida, mas a aba já
                    está preparada para receber esse fluxo.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="os-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate(returnPath)}
              type="button"
            >
              Cancelar
            </button>

            <button
              className="btn btn-primary"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? <ButtonSpinner /> : null}
              {isSubmitting ? 'Criando...' : 'Criar OS'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
