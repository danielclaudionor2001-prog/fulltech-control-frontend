import { useAuth } from '@clerk/clerk-react';
import {
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ListFilter,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ButtonSpinner from '../components/ButtonSpinner';
import LocationPermissionModal from '../components/LocationPermissionModal';
import LocationRequestPendingModal from '../components/LocationRequestPendingModal';
import OSCard from '../components/OSCard';
import ProximityWarningModal from '../components/ProximityWarningModal';
import SelectField from '../components/SelectField';
import ServiceOrderSlider from '../components/ServiceOrderSlider';
import SkeletonBlock from '../components/SkeletonBlock';
import { useToast } from '../components/ToastContext';
import {
  getCustomers,
  getServiceOrders,
  getUsers,
  startServiceOrder,
  updateLocation,
  updateServiceOrder,
  updateUserRole,
} from '../services/api';
import {
  buildLocationGuidance,
  isDistanceValidationMessage,
  isLocationPermissionMessage,
  isTechnicalLocationSyncMessage,
  requestBrowserLocation,
} from '../utils/locationSupport';
import {
  filterServiceOrders,
  ORDER_STATUS_FILTER_OPTIONS,
  sortServiceOrdersByLatest,
} from '../utils/serviceOrdersFilter';

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

const getUserDisplayName = (user) => user.name || user.email || user.clerkUserId;

const initialOrderFilters = {
  assignedToId: '',
  customer: '',
  endDate: '',
  startDate: '',
};

const initialDisplayFilters = {
  search: '',
  status: '',
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
  const [orderFilters, setOrderFilters] = useState(initialOrderFilters);
  const [displayFilters, setDisplayFilters] = useState(initialDisplayFilters);
  const [pageError, setPageError] = useState('');
  const [isLocationHelpOpen, setIsLocationHelpOpen] = useState(false);
  const [isLocationPendingOpen, setIsLocationPendingOpen] = useState(false);
  const [proximityAlertMessage, setProximityAlertMessage] = useState('');
  const [pendingStartOrderId, setPendingStartOrderId] = useState('');

  const guidance = useMemo(() => buildLocationGuidance(), []);

  const isInitialLoading =
    loading && orders.length === 0 && users.length === 0 && customers.length === 0;

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const [ordersData, usersData, customersData] = await Promise.all([
        getServiceOrders(getToken, orderFilters),
        getUsers(getToken),
        getCustomers(getToken),
      ]);

      setOrders(sortServiceOrdersByLatest(ordersData));
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
  }, [getToken, orderFilters]);

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
  const operationalUsers = useMemo(
    () => users.filter((user) => user.role === 'TECH' || user.role === 'SUPERVISOR'),
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
  const teamOrderStats = useMemo(
    () =>
      operationalUsers
        .map((user) => {
          const userOrders = orders.filter((order) => order.assignedToId === user.id);
          const pending = userOrders.filter((order) => order.status === 'OPEN').length;
          const inProgress = userOrders.filter(
            (order) => order.status === 'IN_PROGRESS',
          ).length;
          const finished = userOrders.filter(
            (order) => order.status === 'DONE' || order.status === 'WITH_PENDING',
          ).length;
          const canceled = userOrders.filter(
            (order) => order.status === 'CANCELED',
          ).length;
          const total = userOrders.length;

          return {
            canceled,
            finished,
            inProgress,
            pending,
            role: user.role,
            subtitle: user.email || user.clerkUserId,
            total,
            userId: user.id,
            userName: getUserDisplayName(user),
          };
        })
        .sort((left, right) => {
          if (right.total !== left.total) {
            return right.total - left.total;
          }

          return left.userName.localeCompare(right.userName);
        }),
    [operationalUsers, orders],
  );
  const maxTeamOrders = useMemo(
    () => Math.max(1, ...teamOrderStats.map((stat) => stat.total)),
    [teamOrderStats],
  );

  const visibleOrders = useMemo(
    () =>
      filterServiceOrders(sortServiceOrdersByLatest(orders), displayFilters),
    [displayFilters, orders],
  );

  const handleFilterChange = (name, value) => {
    setFilterDrafts((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleApplyFilters = () => {
    setOrderFilters(filterDrafts);
  };

  const handleClearFilters = () => {
    setFilterDrafts(initialOrderFilters);
    setOrderFilters(initialOrderFilters);
    setDisplayFilters(initialDisplayFilters);
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

  const handleRetryLocationAccess = async () => {
    setIsLocationHelpOpen(false);

    if (pendingStartOrderId) {
      await handleStartOrderWithValidation(pendingStartOrderId);
      return;
    }
    setIsLocationPendingOpen(true);

    try {
      const position = await requestBrowserLocation();
      await updateLocation(
        position.coords.latitude,
        position.coords.longitude,
        getToken,
      );
      showSuccess('Localizacao atualizada com sucesso.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel obter sua localizacao agora.';

      if (isLocationPermissionMessage(message)) {
        setIsLocationHelpOpen(true);
      } else if (!isTechnicalLocationSyncMessage(message)) {
        showWarning(message);
      }
    } finally {
      setIsLocationPendingOpen(false);
    }
  };

  const handleStartOrderWithValidation = async (id) => {
    setBusyOrderId(id);
    setBusyOrderAction('progress');
    setPendingStartOrderId(id);
    setProximityAlertMessage('');
    setIsLocationPendingOpen(true);

    try {
      const position = await requestBrowserLocation();

      await startServiceOrder(
        id,
        position.coords.latitude,
        position.coords.longitude,
        getToken,
      );

      await fetchDashboard();
      showSuccess('Atendimento iniciado com sucesso.');
      setPendingStartOrderId('');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel validar sua localizacao para iniciar a OS.';

      if (isDistanceValidationMessage(message)) {
        setProximityAlertMessage(message);
      } else if (isLocationPermissionMessage(message)) {
        setIsLocationHelpOpen(true);
      } else if (!isTechnicalLocationSyncMessage(message)) {
        showWarning(message);
      }
    } finally {
      setIsLocationPendingOpen(false);
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
            <span className="summary-label">Ordens</span>
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
            <span className="summary-label">Equipe técnica</span>
            {isInitialLoading ? (
              <SkeletonBlock className="skeleton-number" />
            ) : (
              <strong>{operationalUsers.length}</strong>
            )}
            <small>Técnicos e supervisores em execução operacional</small>
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

          <div className="team-workload-panel">
            <div className="team-workload-heading">
              <div>
                <span className="mini-overline">Produtividade</span>
                <h4>OS por técnico ou supervisor</h4>
              </div>

              <BarChart3 size={20} />
            </div>

            <div className="team-workload-legend" aria-label="Legenda do gráfico">
              <span><i className="legend-dot legend-pending" />Pendentes</span>
              <span><i className="legend-dot legend-progress" />Em andamento</span>
              <span><i className="legend-dot legend-done" />Finalizadas</span>
            </div>

            {isInitialLoading ? (
              <div className="skeleton-card-stack">
                <SkeletonBlock className="skeleton-line" />
                <SkeletonBlock className="skeleton-line" />
                <SkeletonBlock className="skeleton-line-short" />
              </div>
            ) : teamOrderStats.length === 0 ? (
              <div className="empty-state compact-empty">
                <CircleAlert size={18} />
                <span>Nenhum técnico ou supervisor cadastrado ainda.</span>
              </div>
            ) : (
              <div className="team-workload-list">
                {teamOrderStats.map((stat) => {
                  const pendingWidth = stat.total
                    ? `${(stat.pending / maxTeamOrders) * 100}%`
                    : '0%';
                  const progressWidth = stat.total
                    ? `${(stat.inProgress / maxTeamOrders) * 100}%`
                    : '0%';
                  const doneWidth = stat.total
                    ? `${(stat.finished / maxTeamOrders) * 100}%`
                    : '0%';

                  return (
                    <div className="team-workload-row" key={stat.userId}>
                      <div className="team-workload-copy">
                        <div>
                          <strong>{stat.userName}</strong>
                          <small>
                            {getRoleLabel(stat.role)} • {stat.subtitle || 'Sem e-mail'}
                          </small>
                        </div>
                        <span>{stat.total} OS</span>
                      </div>

                      <div
                        aria-label={`${stat.userName}: ${stat.pending} pendente(s), ${stat.inProgress} em andamento e ${stat.finished} finalizada(s)`}
                        className="team-workload-bar"
                        role="img"
                      >
                        <span
                          className="team-workload-segment workload-pending"
                          style={{ width: pendingWidth }}
                        />
                        <span
                          className="team-workload-segment workload-progress"
                          style={{ width: progressWidth }}
                        />
                        <span
                          className="team-workload-segment workload-done"
                          style={{ width: doneWidth }}
                        />
                      </div>

                      <div className="team-workload-counts">
                        <span>{stat.pending} pendente</span>
                        <span>{stat.inProgress} andamento</span>
                        <span>{stat.finished} finalizada</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                      {(user.email || 'Sem e-mail')} • {getRoleLabel(user.role)}
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
          <ListFilter size={18} />
          <div>
            <h3>Filtros de ordem de serviço</h3>
            <p className="section-subtitle">
              Combine filtros de carteira e busca rápida para localizar ordens com
              mais precisão.
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

          <label className="simple-form-field">
            <span>Busca rápida</span>
            <div className="input-with-icon">
              <Search size={18} />
              <input
                className="form-control has-leading-icon"
                onChange={(event) =>
                  setDisplayFilters((previous) => ({
                    ...previous,
                    search: event.target.value,
                  }))
                }
                placeholder="Cliente, OS, endereço ou responsável"
                type="text"
                value={displayFilters.search}
              />
            </div>
          </label>

          <label className="simple-form-field">
            <span>Status</span>
            <SelectField
              onChange={(value) =>
                setDisplayFilters((previous) => ({
                  ...previous,
                  status: value,
                }))
              }
              options={ORDER_STATUS_FILTER_OPTIONS}
              placeholder="Todos os status"
              value={displayFilters.status}
            />
          </label>
        </div>

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

        {isInitialLoading ? (
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
        ) : visibleOrders.length === 0 ? (
          <div className="empty-state">
            <CircleAlert size={18} />
            <span>
              {orders.length === 0
                ? 'Nenhuma ordem cadastrada até o momento.'
                : 'Nenhuma ordem encontrada com os filtros atuais.'}
            </span>
          </div>
        ) : (
          <ServiceOrderSlider
            items={visibleOrders}
            renderItem={(os) => (
              <OSCard
                busyAction={busyOrderId === os.id ? busyOrderAction : ''}
                key={os.id}
                isTechnician={false}
                onAssign={handleStartOrderWithValidation}
                onStatusUpdate={handleStatusUpdate}
                os={os}
              />
            )}
          />
        )}
      </section>

      <LocationRequestPendingModal
        description="Aceite a solicitacao de localizacao do navegador para validarmos sua presenca perto do cliente."
        onClose={() => setIsLocationPendingOpen(false)}
        open={isLocationPendingOpen}
        title="Validando sua localizacao"
      />

      <LocationPermissionModal
        description="Para iniciar o atendimento, o navegador precisa informar sua localizacao atual."
        guidance={guidance}
        onClose={() => setIsLocationHelpOpen(false)}
        onRetry={() => {
          setIsLocationHelpOpen(false);
          void handleRetryLocationAccess();
        }}
        open={isLocationHelpOpen}
        title={guidance.title}
      />

      <ProximityWarningModal
        message={proximityAlertMessage}
        onClose={() => setProximityAlertMessage('')}
        onRetry={
          pendingStartOrderId
            ? () => {
                void handleStartOrderWithValidation(pendingStartOrderId);
              }
            : undefined
        }
        open={Boolean(proximityAlertMessage)}
      />
    </div>
  );
}
