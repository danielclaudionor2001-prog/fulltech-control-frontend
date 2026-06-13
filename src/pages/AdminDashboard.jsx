import { useAuth } from '@clerk/clerk-react';
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  RefreshCw,
  Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ButtonSpinner from '../components/ButtonSpinner';
import OSCard from '../components/OSCard';
import SelectField from '../components/SelectField';
import SkeletonBlock from '../components/SkeletonBlock';
import { useToast } from '../components/ToastProvider';
import {
  getCustomers,
  getServiceOrders,
  getUsers,
  updateServiceOrder,
  updateUserRole,
} from '../services/api';

const ROLE_OPTIONS = [
  {
    label: 'Técnico',
    value: 'TECH',
  },
  {
    label: 'Supervisor',
    value: 'SUPERVISOR',
  },
  {
    label: 'Administrador',
    value: 'ADMIN',
  },
];

const getRoleLabel = (role) => {
  if (role === 'ADMIN') {
    return 'Administrador';
  }

  if (role === 'SUPERVISOR') {
    return 'Supervisor';
  }

  return 'Técnico';
};

const initialOrderFilters = {
  assignedToId: '',
  customer: '',
  endDate: '',
  startDate: '',
};

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyUserId, setBusyUserId] = useState('');
  const [busyOrderId, setBusyOrderId] = useState('');
  const [busyOrderAction, setBusyOrderAction] = useState('');
  const [filterDrafts, setFilterDrafts] = useState(initialOrderFilters);
  const [hasAppliedOrderFilter, setHasAppliedOrderFilter] = useState(false);
  const [orderFilters, setOrderFilters] = useState(initialOrderFilters);
  const [pageError, setPageError] = useState('');

  const isInitialLoading =
    loading && orders.length === 0 && users.length === 0 && customers.length === 0;

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const [ordersData, usersData, customersData] = await Promise.all([
        hasAppliedOrderFilter
          ? getServiceOrders(getToken, orderFilters)
          : Promise.resolve([]),
        getUsers(getToken),
        getCustomers(getToken),
      ]);

      setOrders(ordersData);
      setUsers(usersData);
      setCustomers(customersData);
      setRoleDrafts(
        Object.fromEntries(usersData.map((user) => [user.id, user.role])),
      );
    } catch (error) {
      console.error('Failed to load admin dashboard', error);
      setPageError('Não foi possível carregar o painel administrativo.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getToken, hasAppliedOrderFilter, orderFilters]);

  useEffect(() => {
    void fetchDashboard().catch(() => {});
  }, [fetchDashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await fetchDashboard();
      showSuccess('Painel atualizado com sucesso.');
    } catch {
      showError('Não foi possível atualizar o painel agora.');
    } finally {
      setRefreshing(false);
    }
  };

  const techUsers = useMemo(
    () => users.filter((user) => user.role === 'TECH'),
    [users],
  );
  const supervisorUsers = useMemo(
    () => users.filter((user) => user.role === 'SUPERVISOR'),
    [users],
  );
  const adminUsers = useMemo(
    () => users.filter((user) => user.role === 'ADMIN'),
    [users],
  );
  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === 'OPEN'),
    [orders],
  );
  const inProgressOrders = useMemo(
    () => orders.filter((order) => order.status === 'IN_PROGRESS'),
    [orders],
  );
  const doneOrders = useMemo(
    () => orders.filter((order) => order.status === 'DONE'),
    [orders],
  );
  const canceledOrders = useMemo(
    () => orders.filter((order) => order.status === 'CANCELED'),
    [orders],
  );
  const technicianFilterOptions = useMemo(
    () => [
      { label: 'Todos', value: '' },
      ...users
        .filter((user) => user.role === 'TECH' || user.role === 'SUPERVISOR')
        .map((user) => ({
          label: `${user.name || user.email || user.clerkUserId} (${getRoleLabel(user.role)})`,
          value: user.id,
        })),
    ],
    [users],
  );
  const customerFilterOptions = useMemo(
    () => [
      { label: 'Todos', value: '' },
      ...customers.map((customer) => ({
        label: customer.email
          ? `${customer.name} (${customer.email})`
          : customer.name,
        value: customer.name,
      })),
    ],
    [customers],
  );

  const handleFilterChange = (name, value) => {
    setFilterDrafts((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleApplyFilters = () => {
    const hasAnyFilter = Object.values(filterDrafts).some(Boolean);

    if (!hasAnyFilter) {
      showWarning('Escolha pelo menos um filtro para visualizar as ordens.');
      return;
    }

    setHasAppliedOrderFilter(true);
    setOrderFilters(filterDrafts);
  };

  const handleClearFilters = () => {
    setFilterDrafts(initialOrderFilters);
    setHasAppliedOrderFilter(false);
    setOrderFilters(initialOrderFilters);
    setOrders([]);
  };

  const handleUpdateRole = async (id) => {
    const role = roleDrafts[id];
    if (!role) {
      return;
    }

    setBusyUserId(id);

    try {
      await updateUserRole(id, role, getToken);
      await fetchDashboard();
      showSuccess('Perfil atualizado com sucesso.');
    } catch (error) {
      console.error('Failed to update user role', error);
      showError('Não foi possível atualizar o perfil agora.');
    } finally {
      setBusyUserId('');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    setBusyOrderId(id);
    setBusyOrderAction(status === 'DONE' ? 'done' : 'progress');

    try {
      await updateServiceOrder(id, { status }, getToken);
      await fetchDashboard();
      showSuccess('Ordem de serviço atualizada.');
    } catch (error) {
      console.error('Failed to update service order', error);
      showError('Não foi possível atualizar a OS agora.');
    } finally {
      setBusyOrderId('');
      setBusyOrderAction('');
    }
  };

  return (
    <div className="dashboard-stack">
      <section className="hero-panel">
        <div className="page-hero">
          <div>
            <span className="page-eyebrow">Operação</span>
            <h1 className="page-title">Painel administrativo</h1>
            <p className="page-subtitle">
              Acompanhe o dia, distribua a operação e mantenha acessos, clientes e
              ordens sob controle em uma única visão.
            </p>
          </div>

          <button
            className="btn btn-secondary"
            disabled={refreshing}
            onClick={() => void handleRefresh()}
            title="Atualizar"
            type="button"
          >
            {refreshing ? <ButtonSpinner /> : <RefreshCw size={20} />}
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <div className="summary-grid">
          <div className="summary-card summary-card-blue">
            <span className="summary-label">Ordens hoje</span>
            {isInitialLoading ? (
              <SkeletonBlock className="skeleton-number" />
            ) : (
              <strong>{orders.length}</strong>
            )}
            <small>Carteira operacional carregada no painel</small>
          </div>
          <div className="summary-card summary-card-sky">
            <span className="summary-label">Em andamento</span>
            {isInitialLoading ? (
              <SkeletonBlock className="skeleton-number" />
            ) : (
              <strong>{inProgressOrders.length}</strong>
            )}
            <small>Atendimentos ativos em campo agora</small>
          </div>
          <div className="summary-card summary-card-slate">
            <span className="summary-label">Técnicos</span>
            {isInitialLoading ? (
              <SkeletonBlock className="skeleton-number" />
            ) : (
              <strong>{techUsers.length}</strong>
            )}
            <small>Usuários com execução operacional</small>
          </div>
          <div className="summary-card summary-card-amber">
            <span className="summary-label">Pendentes</span>
            {isInitialLoading ? (
              <SkeletonBlock className="skeleton-number" />
            ) : (
              <strong>{pendingOrders.length}</strong>
            )}
            <small>Ordens aguardando andamento</small>
          </div>
        </div>
      </section>

      {pageError ? <div className="inline-error">{pageError}</div> : null}

      <div className="content-grid content-grid-dashboard">
        <section className="section-card">
          <div className="section-title">
            <Clock3 size={18} />
            <div>
              <h3>Fluxo do dia</h3>
              <p className="section-subtitle">
                Leitura rápida do pipeline para saber onde a operação está
                acumulando.
              </p>
            </div>
          </div>

          <div className="mini-stats-grid">
            <div className="mini-stat-card">
              <span>Na base</span>
              {isInitialLoading ? (
                <SkeletonBlock className="skeleton-number" />
              ) : (
                <strong>{pendingOrders.length}</strong>
              )}
              <small>Aguardando início</small>
            </div>
            <div className="mini-stat-card">
              <span>Em rota</span>
              {isInitialLoading ? (
                <SkeletonBlock className="skeleton-number" />
              ) : (
                <strong>{inProgressOrders.length}</strong>
              )}
              <small>Com técnico em atendimento</small>
            </div>
            <div className="mini-stat-card">
              <span>Finalizadas</span>
              {isInitialLoading ? (
                <SkeletonBlock className="skeleton-number" />
              ) : (
                <strong>{doneOrders.length}</strong>
              )}
              <small>Ordens já finalizadas</small>
            </div>
            <div className="mini-stat-card mini-stat-card-alert">
              <span>Canceladas</span>
              {isInitialLoading ? (
                <SkeletonBlock className="skeleton-number" />
              ) : (
                <strong>{canceledOrders.length}</strong>
              )}
              <small>Demandas encerradas sem execução</small>
            </div>
          </div>

          <div className="action-grid">
            <Link className="action-link-card" to="/admin/access">
              <strong>Autorizar e-mails</strong>
              <span>
                Defina quem pode entrar na aplicação como técnico ou administrador.
              </span>
            </Link>

            <Link className="action-link-card" to="/admin/customers">
              <strong>Cadastrar clientes</strong>
              <span>
                Mantenha a base simples de clientes com nome e endereço.
              </span>
            </Link>
          </div>
        </section>

        <section className="section-card">
          <div className="section-title">
            <Users size={18} />
            <div>
              <h3>Equipe autenticada</h3>
              <p className="section-subtitle">
                Ajuste o perfil de quem já entrou no sistema pela primeira vez.
              </p>
            </div>
          </div>

          <div className="mini-stats-inline">
            <div className="mini-inline-pill">
              <span>Admins</span>
              {isInitialLoading ? (
                <SkeletonBlock className="skeleton-number" />
              ) : (
                <strong>{adminUsers.length}</strong>
              )}
            </div>
            <div className="mini-inline-pill">
              <span>Técnicos</span>
              {isInitialLoading ? (
                <SkeletonBlock className="skeleton-number" />
              ) : (
                <strong>{techUsers.length}</strong>
              )}
            </div>
            <div className="mini-inline-pill">
              <span>Supervisores</span>
              {isInitialLoading ? (
                <SkeletonBlock className="skeleton-number" />
              ) : (
                <strong>{supervisorUsers.length}</strong>
              )}
            </div>
            <div className="mini-inline-pill">
              <span>Registrados</span>
              {isInitialLoading ? (
                <SkeletonBlock className="skeleton-number" />
              ) : (
                <strong>{users.length}</strong>
              )}
            </div>
          </div>

          {isInitialLoading ? (
            <div className="user-list">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="user-item" key={`user-skeleton-${index}`}>
                  <div className="skeleton-card-stack" style={{ flex: 1 }}>
                    <SkeletonBlock className="skeleton-line-short" />
                    <SkeletonBlock className="skeleton-line" />
                  </div>

                  <div className="user-role-editor">
                    <SkeletonBlock className="skeleton-select" />
                    <SkeletonBlock className="skeleton-button" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <p>Nenhum usuário autenticado ainda.</p>
          ) : (
            <div className="user-list">
              {users.map((user) => (
                <div className="user-item" key={user.id}>
                  <div>
                    <strong>{user.name || user.email || user.clerkUserId}</strong>
                    <p>
                      {(user.email || 'Sem e-mail')} •{' '}
                      {getRoleLabel(user.role)}
                    </p>
                  </div>

                  <div className="user-role-editor">
                    <SelectField
                      buttonClassName="user-role-select"
                      disabled={busyUserId === user.id}
                      onChange={(nextRole) =>
                        setRoleDrafts((previous) => ({
                          ...previous,
                          [user.id]: nextRole,
                        }))
                      }
                      options={ROLE_OPTIONS}
                      value={roleDrafts[user.id] || user.role}
                    />

                    <button
                      className="btn btn-secondary"
                      disabled={
                        busyUserId === user.id ||
                        (roleDrafts[user.id] || user.role) === user.role
                      }
                      onClick={() => void handleUpdateRole(user.id)}
                      type="button"
                    >
                      {busyUserId === user.id ? <ButtonSpinner /> : null}
                      {busyUserId === user.id ? 'Salvando...' : 'Salvar perfil'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="section-card">
        <div className="section-title">
          <Clock3 size={18} />
          <div>
            <h3>Filtro de ordem de serviço</h3>
            <p className="section-subtitle">
              Refine a visão por técnico responsável, cliente e período de
              agendamento.
            </p>
          </div>
        </div>

        <div className="os-row cols-3b">
          <label className="simple-form-field">
            <span>Técnico</span>
            <SelectField
              onChange={(value) => handleFilterChange('assignedToId', value)}
              options={technicianFilterOptions}
              placeholder="Todos"
              value={filterDrafts.assignedToId}
            />
          </label>

          <label className="simple-form-field">
            <span>Nome do cliente</span>
            <SelectField
              onChange={(value) => handleFilterChange('customer', value)}
              options={customerFilterOptions}
              placeholder="Todos"
              value={filterDrafts.customer}
            />
          </label>

          <label className="simple-form-field">
            <span>Data inicial</span>
            <input
              className="form-control"
              onChange={(event) => handleFilterChange('startDate', event.target.value)}
              type="date"
              value={filterDrafts.startDate}
            />
          </label>
        </div>

        <div className="os-row cols-3b">
          <label className="simple-form-field">
            <span>Data final</span>
            <input
              className="form-control"
              onChange={(event) => handleFilterChange('endDate', event.target.value)}
              type="date"
              value={filterDrafts.endDate}
            />
          </label>

          <div className="simple-form-field">
            <span>Ações</span>
            <div className="table-actions">
              <button
                className="btn btn-primary btn-compact"
                onClick={handleApplyFilters}
                type="button"
              >
                Aplicar filtros
              </button>
              <button
                className="btn btn-secondary btn-compact"
                onClick={handleClearFilters}
                type="button"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-card section-card-orders mobile-orders-first">
        <div className="section-title">
          <CheckCircle2 size={18} />
          <div>
            <h3>Ordens de serviço</h3>
            <p className="section-subtitle">
              Visão consolidada para encaminhar e movimentar o atendimento.
            </p>
          </div>
        </div>

        {!hasAppliedOrderFilter ? (
          <div className="empty-state">
            <CircleAlert size={18} />
            <span>Use o filtro acima para visualizar as ordens de serviço.</span>
          </div>
        ) : isInitialLoading ? (
          <div className="grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="skeleton-card" key={`order-skeleton-${index}`}>
                <div className="skeleton-card-stack">
                  <SkeletonBlock className="skeleton-chip" />
                  <SkeletonBlock className="skeleton-title" />
                  <SkeletonBlock className="skeleton-line" />
                  <SkeletonBlock className="skeleton-line" />
                  <SkeletonBlock className="skeleton-line-short" />
                  <SkeletonBlock className="skeleton-button" />
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <CircleAlert size={18} />
            <span>Nenhuma ordem cadastrada até o momento.</span>
          </div>
        ) : (
          <div className="grid">
            {orders.map((os) => (
              <OSCard
                busyAction={busyOrderId === os.id ? busyOrderAction : ''}
                key={os.id}
                isTechnician={false}
                onStatusUpdate={handleStatusUpdate}
                os={os}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
