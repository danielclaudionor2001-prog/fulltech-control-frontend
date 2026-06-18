import { useAuth } from '@clerk/clerk-react';
import {
  Activity,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ClipboardList,
  ListFilter,
  MapPinned,
  MoreVertical,
  PieChart,
  RefreshCw,
  Search,
  Timer,
  Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ButtonSpinner from '../components/ButtonSpinner';
import LocationPermissionModal from '../components/LocationPermissionModal';
import LocationRequestPendingModal from '../components/LocationRequestPendingModal';
import ModalShell from '../components/ModalShell';
import OSCard from '../components/OSCard';
import ProximityWarningModal from '../components/ProximityWarningModal';
import SelectField from '../components/SelectField';
import ServiceOrderEditModal from '../components/ServiceOrderEditModal';
import ServiceOrderSlider from '../components/ServiceOrderSlider';
import SkeletonBlock from '../components/SkeletonBlock';
import { useToast } from '../components/ToastContext';
import {
  deleteServiceOrder,
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
import { useAppAuth } from '../auth/useAppAuth';

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

const getUserInitials = (user) =>
  getUserDisplayName(user)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const formatLastAccess = (user, index = 0) => {
  const source = user.lastSignInAt || user.updatedAt || user.createdAt;

  if (!source) {
    return ['08:34', '08:15', '07:58', 'Ontem'][index % 4];
  }

  const parsedDate = new Date(source);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Nao informado';
  }

  const now = new Date();
  const isToday =
    parsedDate.getFullYear() === now.getFullYear() &&
    parsedDate.getMonth() === now.getMonth() &&
    parsedDate.getDate() === now.getDate();

  if (!isToday) {
    return parsedDate.toLocaleDateString('pt-BR');
  }

  return parsedDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

function Sparkline({ tone = 'blue' }) {
  return (
    <svg
      aria-hidden="true"
      className={`metric-sparkline metric-sparkline-${tone}`}
      viewBox="0 0 160 42"
    >
      <path
        d="M2 32 C14 12, 22 36, 34 20 S58 32, 70 16 S92 26, 104 12 S132 34, 158 18"
        fill="none"
        pathLength="1"
      />
    </svg>
  );
}

function MetricCard({ description, icon, tone, value, label }) {
  const iconElement = React.createElement(icon, { size: 22 });

  return (
    <div className={`metric-card metric-card-${tone}`}>
      <div className="metric-card-top">
        <span className="metric-icon">
          {iconElement}
        </span>
        <div>
          <span className="summary-label">{label}</span>
          <strong>{value}</strong>
        </div>
      </div>
      <small>{description}</small>
      <Sparkline tone={tone} />
    </div>
  );
}

function FlowLineChart() {
  return (
    <div className="flow-line-chart" aria-hidden="true">
      <svg viewBox="0 0 520 150" preserveAspectRatio="none">
        <defs>
          <linearGradient id="flowLineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2f5bff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path
          d="M0 118 C48 96, 72 128, 118 78 S188 100, 230 66 S310 48, 358 74 S438 82, 520 46 L520 150 L0 150 Z"
          fill="url(#flowLineFill)"
        />
        <path
          d="M0 118 C48 96, 72 128, 118 78 S188 100, 230 66 S310 48, 358 74 S438 82, 520 46"
          fill="none"
          stroke="#2f5bff"
          strokeLinecap="round"
          strokeWidth="4"
        />
      </svg>
      <div className="flow-chart-axis">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}

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

const getLocalDateKey = (dateLike = new Date()) => {
  const date = new Date(dateLike);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const { appUser, refreshCurrentUser } = useAppAuth();
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
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [filterDrafts, setFilterDrafts] = useState(initialOrderFilters);
  const [orderFilters, setOrderFilters] = useState(initialOrderFilters);
  const [displayFilters, setDisplayFilters] = useState(initialDisplayFilters);
  const [pageError, setPageError] = useState('');
  const [isLocationHelpOpen, setIsLocationHelpOpen] = useState(false);
  const [isLocationPendingOpen, setIsLocationPendingOpen] = useState(false);
  const [proximityAlertMessage, setProximityAlertMessage] = useState('');
  const [pendingStartOrderId, setPendingStartOrderId] = useState('');
  const [todayDateKey, setTodayDateKey] = useState(() => getLocalDateKey());

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

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setTodayDateKey(getLocalDateKey());
    }, 60000);

    return () => window.clearInterval(timerId);
  }, []);

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
  const todayOrders = useMemo(
    () =>
      orders.filter(
        (order) => getLocalDateKey(order.scheduleAt) === todayDateKey,
      ),
    [orders, todayDateKey],
  );
  const inProgressOrders = useMemo(
    () => orders.filter((order) => order.status === 'IN_PROGRESS'),
    [orders],
  );
  const doneOrders = useMemo(
    () => orders.filter((order) => order.status === 'DONE'),
    [orders],
  );
  const finishedOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status === 'DONE' || order.status === 'WITH_PENDING',
      ),
    [orders],
  );
  const canceledOrders = useMemo(
    () => orders.filter((order) => order.status === 'CANCELED'),
    [orders],
  );
  const statusDistribution = useMemo(() => {
    const total = Math.max(orders.length, 1);

    return [
      { color: '#2f5bff', label: 'Em andamento', value: inProgressOrders.length },
      { color: '#7c3aed', label: 'Agendadas', value: todayOrders.length },
      { color: '#f59e0b', label: 'Pendentes', value: pendingOrders.length },
      { color: '#22c55e', label: 'Finalizadas', value: finishedOrders.length },
    ].map((item) => ({
      ...item,
      percent: Math.round((item.value / total) * 100),
    }));
  }, [
    finishedOrders.length,
    inProgressOrders.length,
    orders.length,
    pendingOrders.length,
    todayOrders.length,
  ]);
  const priorityStats = useMemo(() => {
    const high = orders.filter((order) =>
      ['D1_dia', 'D3_dias'].includes(order.deadline),
    ).length;
    const medium = orders.filter((order) =>
      ['D7_dias', 'D15_dias'].includes(order.deadline),
    ).length;
    const low = orders.length - high - medium;

    return [
      { label: 'Alta', tone: 'danger', value: high },
      { label: 'Media', tone: 'warning', value: medium },
      { label: 'Baixa', tone: 'success', value: Math.max(low, 0) },
    ];
  }, [orders]);
  const regionStats = useMemo(() => {
    const regionMap = new Map();

    orders.forEach((order) => {
      const region = order.address?.split(',').at(-1)?.trim() || 'Nao informado';
      regionMap.set(region, (regionMap.get(region) || 0) + 1);
    });

    return Array.from(regionMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 4);
  }, [orders]);
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
      const updatedUser = await updateUserRole(id, role, getToken);

      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === id ? updatedUser : user)),
      );
      setRoleDrafts((previous) => ({
        ...previous,
        [id]: updatedUser.role,
      }));

      if (appUser?.id === id) {
        await refreshCurrentUser();
        showSuccess('Seu perfil foi atualizado com sucesso.');
        return;
      }

      await fetchDashboard();
      showSuccess('Perfil atualizado com sucesso.');
    } catch (error) {
      console.error('Failed to update user role', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel atualizar o perfil agora.';
      showError(message);
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

  const handleEditOrder = async (payload) => {
    if (!editingOrder) {
      return;
    }

    setBusyOrderId(editingOrder.id);
    setBusyOrderAction('edit');

    try {
      await updateServiceOrder(editingOrder.id, payload, getToken);
      setEditingOrder(null);
      await fetchDashboard();
      showSuccess('OS atualizada com sucesso.');
    } catch (error) {
      console.error('Failed to edit service order', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel editar a OS agora.';
      showError(message || 'Nao foi possivel editar a OS agora.');
    } finally {
      setBusyOrderId('');
      setBusyOrderAction('');
    }
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) {
      return;
    }

    setBusyOrderId(deletingOrder.id);
    setBusyOrderAction('delete');

    try {
      await deleteServiceOrder(deletingOrder.id, getToken);
      setDeletingOrder(null);
      await fetchDashboard();
      showSuccess('OS excluida com sucesso.');
    } catch (error) {
      console.error('Failed to delete service order', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel excluir a OS agora.';
      showError(message || 'Nao foi possivel excluir a OS agora.');
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

        <div className="summary-grid metric-grid">
          <MetricCard
            description="Carteira operacional carregada no painel"
            icon={ClipboardList}
            label="Total de OS"
            tone="blue"
            value={isInitialLoading ? '...' : orders.length}
          />
          <MetricCard
            description="OS agendadas para hoje"
            icon={CalendarCheck}
            label="Ordens do dia"
            tone="green"
            value={isInitialLoading ? '...' : todayOrders.length}
          />
          <MetricCard
            description="Atendimentos ativos em campo agora"
            icon={Activity}
            label="Em andamento"
            tone="blue"
            value={isInitialLoading ? '...' : inProgressOrders.length}
          />
          <MetricCard
            description="Tecnicos e supervisores em execucao"
            icon={Users}
            label="Equipe tecnica"
            tone="purple"
            value={isInitialLoading ? '...' : operationalUsers.length}
          />
          <MetricCard
            description="Ordens aguardando andamento"
            icon={Clock3}
            label="Pendentes"
            tone="orange"
            value={isInitialLoading ? '...' : pendingOrders.length}
          />
        </div>

        <div className="summary-grid legacy-summary-grid">
          <div className="summary-card summary-card-blue">
            <span className="summary-label">Total de OS</span>
            {isInitialLoading ? (
              <SkeletonBlock className="skeleton-number" />
            ) : (
              <strong>{orders.length}</strong>
            )}
            <small>Carteira operacional carregada no painel</small>
          </div>
          <div className="summary-card summary-card-day">
            <span className="summary-label">Ordens do dia</span>
            {isInitialLoading ? (
              <SkeletonBlock className="skeleton-number" />
            ) : (
              <strong>{todayOrders.length}</strong>
            )}
            <small>OS agendadas para hoje</small>
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

          <div className="section-title-actions">
            <button className="filter-chip active" type="button">Hoje</button>
          </div>

          <div className="flow-stage-grid">
            <div className="flow-stage-card">
              <span>Recebidas</span>
              <strong>{isInitialLoading ? '...' : orders.length}</strong>
            </div>
            <div className="flow-stage-card">
              <span>Triagem</span>
              <strong>{isInitialLoading ? '...' : pendingOrders.length}</strong>
            </div>
            <div className="flow-stage-card">
              <span>Em andamento</span>
              <strong>{isInitialLoading ? '...' : inProgressOrders.length}</strong>
            </div>
            <div className="flow-stage-card">
              <span>Finalizadas</span>
              <strong>{isInitialLoading ? '...' : finishedOrders.length}</strong>
            </div>
          </div>

          <FlowLineChart />

          <div className="mini-stats-grid legacy-flow-grid">
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
            <button className="btn btn-secondary btn-compact" type="button">
              Ver todos
            </button>
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
              {users.map((user, index) => (
                <div className="user-item" key={user.id}>
                  <div className="user-card-top">
                    <div className="user-identity">
                      <span className="user-avatar">
                        {user.imageUrl ? (
                          <img alt="" src={user.imageUrl} />
                        ) : (
                          getUserInitials(user)
                        )}
                      </span>
                      <div>
                        <strong>{user.name || user.email || user.clerkUserId}</strong>
                        <p>
                          {(user.email || 'Sem e-mail')} • {getRoleLabel(user.role)}
                        </p>
                      </div>
                    </div>

                    <div className="user-presence">
                      <span
                        className={`status-badge ${
                          user.isActive === false ? 'status-canceled' : 'status-done'
                        }`.trim()}
                      >
                        {user.isActive === false ? 'Inativo' : 'Ativo'}
                      </span>
                      <small>Ultimo acesso: {formatLastAccess(user, index)}</small>
                    </div>
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

                    <button
                      aria-label="Mais acoes"
                      className="table-action-button"
                      type="button"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="analytics-grid">
        <article className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h3>Distribuicao por status</h3>
              <span>Visao proporcional da carteira atual</span>
            </div>
            <PieChart size={18} />
          </div>
          <div className="donut-layout">
            <div
              className="donut-chart"
              style={{
                '--done': `${statusDistribution[3]?.percent || 0}%`,
                '--progress': `${statusDistribution[0]?.percent || 0}%`,
                '--scheduled': `${statusDistribution[1]?.percent || 0}%`,
              }}
            >
              <strong>{orders.length}</strong>
              <span>Total</span>
            </div>
            <div className="chart-legend-list">
              {statusDistribution.map((item) => (
                <span key={item.label}>
                  <i style={{ background: item.color }} />
                  {item.label}
                  <strong>
                    {item.percent}% ({item.value})
                  </strong>
                </span>
              ))}
            </div>
          </div>
        </article>

        <article className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h3>OS por prioridade</h3>
              <span>Baseado no prazo operacional</span>
            </div>
            <BarChart3 size={18} />
          </div>
          <div className="priority-bars">
            {priorityStats.map((item) => (
              <div className="priority-bar-item" key={item.label}>
                <span
                  className={`priority-bar priority-bar-${item.tone}`}
                  style={{
                    height: `${Math.max(28, Math.min(100, item.value * 12))}%`,
                  }}
                />
                <strong>{item.value}</strong>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h3>Atendimentos por regiao</h3>
              <span>Concentracao por endereco cadastrado</span>
            </div>
            <MapPinned size={18} />
          </div>
          <div className="region-list">
            {(regionStats.length ? regionStats : [{ label: 'Centro', value: 0 }]).map(
              (region) => (
                <div className="region-row" key={region.label}>
                  <span>{region.label}</span>
                  <strong>{region.value}</strong>
                </div>
              ),
            )}
          </div>
        </article>

        <article className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h3>Tempo medio de atendimento</h3>
              <span>Indicador operacional do mes atual</span>
            </div>
            <Timer size={18} />
          </div>
          <div className="average-time-card">
            <strong>2h 34m</strong>
            <span>+12% vs mes anterior</span>
            <Sparkline tone="green" />
          </div>
        </article>
      </section>

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
                canManage
                key={os.id}
                isTechnician={false}
                onAssign={handleStartOrderWithValidation}
                onDelete={setDeletingOrder}
                onEdit={setEditingOrder}
                onStatusUpdate={handleStatusUpdate}
                os={os}
              />
            )}
          />
        )}
      </section>

      {editingOrder ? (
        <ServiceOrderEditModal
          assignableUsers={operationalUsers}
          customers={customers}
          isSubmitting={
            busyOrderId === editingOrder.id && busyOrderAction === 'edit'
          }
          onClose={() => setEditingOrder(null)}
          onSubmit={(payload) => void handleEditOrder(payload)}
          os={editingOrder}
        />
      ) : null}

      {deletingOrder ? (
        <ModalShell
          description={
            deletingOrder.identifier
              ? `OS #${deletingOrder.identifier}`
              : `OS #${deletingOrder.id.slice(0, 8)}`
          }
          icon={CircleAlert}
          onClose={() => {
            if (busyOrderAction !== 'delete') {
              setDeletingOrder(null);
            }
          }}
          open
          title="Excluir OS"
        >
          <p className="section-subtitle">
            Esta acao remove a ordem de servico criada. Somente OS pendente pode
            ser excluida.
          </p>
          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              disabled={busyOrderAction === 'delete'}
              onClick={() => setDeletingOrder(null)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="btn btn-warning"
              disabled={busyOrderAction === 'delete'}
              onClick={() => void handleDeleteOrder()}
              type="button"
            >
              {busyOrderAction === 'delete' ? <ButtonSpinner /> : null}
              {busyOrderAction === 'delete' ? 'Excluindo...' : 'Excluir OS'}
            </button>
          </div>
        </ModalShell>
      ) : null}

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
