import { useAuth } from '@clerk/clerk-react';
import {
  BarChart3,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ButtonSpinner from '../components/ButtonSpinner';
import SelectField from '../components/SelectField';
import SkeletonBlock from '../components/SkeletonBlock';
import { useToast } from '../components/ToastContext';
import {
  getCustomers,
  getServiceOrders,
  getUsers,
} from '../services/api';
import {
  formatServiceOrderDateTime,
  getServiceOrderStatusLabel,
} from '../utils/serviceOrderStatus';
import { sortServiceOrdersByLatest } from '../utils/serviceOrdersFilter';

const STATUS_OPTIONS = [
  { label: 'Todos os status', value: '' },
  { label: 'Pendente', value: 'OPEN' },
  { label: 'Em andamento', value: 'IN_PROGRESS' },
  { label: 'Finalizado', value: 'DONE' },
  { label: 'Com pendencia', value: 'WITH_PENDING' },
  { label: 'Cancelada', value: 'CANCELED' },
];

const OS_TYPE_LABELS = {
  instalacao: 'SERVICOS/INSTALACOES',
  manutencao: 'Manutencao mensal',
  suporte: 'Atendimento de chamado',
  vistoria: 'Vistoria',
};

const INITIAL_FILTERS = {
  assignedToId: '',
  customer: '',
  endDate: '',
  osType: '',
  search: '',
  startDate: '',
  status: '',
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const getOrderDate = (order) => order.scheduleAt || order.createdAt || '';

const getDateKey = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStatusClassName = (status) => {
  if (status === 'DONE') {
    return 'status-done';
  }

  if (status === 'WITH_PENDING') {
    return 'status-warning';
  }

  if (status === 'CANCELED') {
    return 'status-canceled';
  }

  if (status === 'IN_PROGRESS') {
    return 'status-progress';
  }

  return 'status-pending';
};

const getTypeLabel = (type) => OS_TYPE_LABELS[type] || type || 'Nao informado';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const getUserName = (user) => user?.name || user?.email || user?.clerkUserId || '';

function ReportMetric({ description, icon, label, tone, value }) {
  const Icon = icon;

  return (
    <article className={`report-metric-card report-metric-${tone}`}>
      <span className="report-metric-icon">
        <Icon size={22} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </article>
  );
}

export default function ReportsPage() {
  const { getToken } = useAuth();
  const { showError, showSuccess } = useToast();
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);

    try {
      const [ordersData, usersData, customersData] = await Promise.all([
        getServiceOrders(getToken),
        getUsers(getToken),
        getCustomers(getToken),
      ]);

      setOrders(sortServiceOrdersByLatest(ordersData));
      setUsers(usersData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Failed to load reports', error);
      showError('Nao foi possivel carregar os relatorios agora.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getToken, showError]);

  useEffect(() => {
    void loadReports().catch(() => {});
  }, [loadReports]);

  const responsibleOptions = useMemo(
    () => [
      { label: 'Todos', value: '' },
      ...users
        .filter((user) => user.role === 'TECH' || user.role === 'SUPERVISOR')
        .map((user) => ({
          label: `${getUserName(user)} - ${
            user.role === 'SUPERVISOR' ? 'Supervisor' : 'Tecnico'
          }`,
          value: user.id,
        })),
    ],
    [users],
  );

  const customerOptions = useMemo(
    () => [
      { label: 'Todos', value: '' },
      ...customers.map((customer) => ({
        label: customer.email ? `${customer.name} (${customer.email})` : customer.name,
        value: customer.name,
      })),
    ],
    [customers],
  );

  const typeOptions = useMemo(() => {
    const orderTypes = Array.from(
      new Set(orders.map((order) => order.osType).filter(Boolean)),
    );

    const options = orderTypes.map((type) => ({
      label: getTypeLabel(type),
      value: type,
    }));

    return [{ label: 'Todos os tipos', value: '' }, ...options];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = normalizeText(filters.search);
    const startDate = filters.startDate || '';
    const endDate = filters.endDate || '';

    return orders.filter((order) => {
      if (filters.status && order.status !== filters.status) {
        return false;
      }

      if (filters.assignedToId && order.assignedToId !== filters.assignedToId) {
        return false;
      }

      if (filters.customer && order.customer !== filters.customer) {
        return false;
      }

      if (filters.osType && order.osType !== filters.osType) {
        return false;
      }

      const orderDate = getDateKey(getOrderDate(order));

      if (startDate && (!orderDate || orderDate < startDate)) {
        return false;
      }

      if (endDate && (!orderDate || orderDate > endDate)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableFields = [
        order.identifier,
        order.id,
        order.customer,
        order.customerEmail,
        order.address,
        order.description,
        getTypeLabel(order.osType),
        getServiceOrderStatusLabel(order.status),
        order.assignedTo?.name,
        order.assignedTo?.email,
      ];

      return searchableFields
        .map(normalizeText)
        .some((value) => value.includes(normalizedSearch));
    });
  }, [filters, orders]);

  const statusSummary = useMemo(() => {
    const total = Math.max(filteredOrders.length, 1);

    return STATUS_OPTIONS.slice(1).map((option) => {
      const value = filteredOrders.filter((order) => order.status === option.value)
        .length;

      return {
        ...option,
        percent: Math.round((value / total) * 100),
        status: option.value,
        value,
      };
    });
  }, [filteredOrders]);

  const finishedOrders = filteredOrders.filter(
    (order) => order.status === 'DONE' || order.status === 'WITH_PENDING',
  );
  const inProgressOrders = filteredOrders.filter(
    (order) => order.status === 'IN_PROGRESS',
  );
  const pendingOrders = filteredOrders.filter((order) => order.status === 'OPEN');

  const handleFilterChange = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadReports();
      showSuccess('Relatorios atualizados.');
    } catch {
      // Toast emitted by loadReports.
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleExportExcel = () => {
    const rows = filteredOrders.map((order) => [
      order.identifier || order.id,
      order.customer,
      order.address,
      getTypeLabel(order.osType),
      getServiceOrderStatusLabel(order.status),
      formatServiceOrderDateTime(getOrderDate(order)),
      order.assignedTo?.name || order.assignedTo?.email || 'Nao informado',
      order.description || '',
    ]);

    const header = [
      'Identificador',
      'Cliente',
      'Endereco',
      'Tipo',
      'Status',
      'Data',
      'Responsavel',
      'Descricao',
    ];

    const tableRows = [header, ...rows]
      .map(
        (row) =>
          `<tr>${row
            .map((cell) => `<td>${escapeHtml(cell)}</td>`)
            .join('')}</tr>`,
      )
      .join('');

    const html = `<!doctype html><html><head><meta charset="UTF-8" /></head><body><table>${tableRows}</table></body></html>`;
    const blob = new Blob([html], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-os-${getDateKey(new Date())}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    showSuccess('Relatorio exportado para Excel.');
  };

  return (
    <div className="dashboard-stack reports-page">
      <section className="page-hero reports-hero">
        <div>
          <span className="page-eyebrow">Relatorios</span>
          <h1 className="page-title">Relatorios operacionais</h1>
          <p className="page-subtitle">
            Filtre ordens de servico por periodo, status, cliente e responsavel
            para exportar uma leitura clara da operacao.
          </p>
        </div>

        <div className="reports-hero-actions">
          <button
            className="btn btn-secondary"
            disabled={refreshing}
            onClick={() => void handleRefresh()}
            type="button"
          >
            {refreshing ? <ButtonSpinner /> : <RefreshCw size={20} />}
            {refreshing ? 'Atualizando...' : 'Atualizar dados'}
          </button>

          <button
            className="btn btn-primary"
            disabled={loading || filteredOrders.length === 0}
            onClick={handleExportExcel}
            type="button"
          >
            <Download size={20} />
            Exportar Excel
          </button>
        </div>
      </section>

      <section className="report-metric-grid">
        <ReportMetric
          description="Resultado depois dos filtros aplicados"
          icon={FileSpreadsheet}
          label="Total filtrado"
          tone="blue"
          value={loading ? '...' : filteredOrders.length}
        />
        <ReportMetric
          description="Ordens aguardando inicio"
          icon={CalendarDays}
          label="Pendentes"
          tone="orange"
          value={loading ? '...' : pendingOrders.length}
        />
        <ReportMetric
          description="Atendimentos em campo"
          icon={BarChart3}
          label="Em andamento"
          tone="purple"
          value={loading ? '...' : inProgressOrders.length}
        />
        <ReportMetric
          description="Concluidas ou com pendencia"
          icon={FileSpreadsheet}
          label="Finalizadas"
          tone="green"
          value={loading ? '...' : finishedOrders.length}
        />
      </section>

      <section className="reports-workspace">
        <div className="section-card reports-filter-card">
          <div className="section-title">
            <Filter size={18} />
            <div>
              <h3>Filtros de pesquisa</h3>
              <p className="section-subtitle">
                Combine parametros para gerar uma visao pronta para exportacao.
              </p>
            </div>
          </div>

          <div className="reports-filter-grid">
            <label className="simple-form-field reports-search-field">
              <span>Busca geral</span>
              <div className="input-with-icon">
                <Search size={18} />
                <input
                  className="form-control has-leading-icon"
                  onChange={(event) =>
                    handleFilterChange('search', event.target.value)
                  }
                  placeholder="Buscar OS, cliente, endereco..."
                  type="search"
                  value={filters.search}
                />
              </div>
            </label>

            <label className="simple-form-field">
              <span>Status</span>
              <SelectField
                onChange={(value) => handleFilterChange('status', value)}
                options={STATUS_OPTIONS}
                value={filters.status}
              />
            </label>

            <label className="simple-form-field">
              <span>Responsavel</span>
              <SelectField
                onChange={(value) => handleFilterChange('assignedToId', value)}
                options={responsibleOptions}
                value={filters.assignedToId}
              />
            </label>

            <label className="simple-form-field">
              <span>Cliente</span>
              <SelectField
                onChange={(value) => handleFilterChange('customer', value)}
                options={customerOptions}
                value={filters.customer}
              />
            </label>

            <label className="simple-form-field">
              <span>Tipo de OS</span>
              <SelectField
                onChange={(value) => handleFilterChange('osType', value)}
                options={typeOptions}
                value={filters.osType}
              />
            </label>

            <label className="simple-form-field">
              <span>Data inicial</span>
              <input
                className="form-control"
                onChange={(event) =>
                  handleFilterChange('startDate', event.target.value)
                }
                type="date"
                value={filters.startDate}
              />
            </label>

            <label className="simple-form-field">
              <span>Data final</span>
              <input
                className="form-control"
                onChange={(event) =>
                  handleFilterChange('endDate', event.target.value)
                }
                type="date"
                value={filters.endDate}
              />
            </label>
          </div>

          <div className="reports-filter-actions">
            <button
              className="btn btn-secondary"
              onClick={handleClearFilters}
              type="button"
            >
              Limpar filtros
            </button>
            <button
              className="btn btn-primary"
              disabled={filteredOrders.length === 0}
              onClick={handleExportExcel}
              type="button"
            >
              <Download size={20} />
              Exportar Excel
            </button>
          </div>
        </div>

        <div className="section-card reports-chart-card">
          <div className="analytics-card-header">
            <div>
              <h3>Distribuicao por status</h3>
              <span>Base dinamica conforme os filtros selecionados</span>
            </div>
            <BarChart3 size={18} />
          </div>

          <div className="report-status-bars">
            {statusSummary.map((item) => (
              <div className="report-status-row" key={item.value + item.label}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <div className="report-status-track">
                  <span
                    className={`report-status-fill ${getStatusClassName(
                      item.status,
                    )}`}
                    style={{ width: `${Math.max(item.percent, item.value ? 8 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card reports-table-card">
        <div className="section-title">
          <FileSpreadsheet size={18} />
          <div>
            <h3>Resultado do relatorio</h3>
            <p className="section-subtitle">
              {loading
                ? 'Carregando registros...'
                : `${filteredOrders.length} OS encontradas para os filtros atuais.`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="skeleton-card-stack">
            <SkeletonBlock className="skeleton-line" />
            <SkeletonBlock className="skeleton-line" />
            <SkeletonBlock className="skeleton-line-short" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <FileSpreadsheet size={22} />
            <span>Nenhuma OS encontrada para os filtros selecionados.</span>
          </div>
        ) : (
          <div className="reports-table-wrap">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>OS</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Responsavel</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.identifier || order.id}</strong>
                      <span>{order.address || 'Endereco nao informado'}</span>
                    </td>
                    <td>{order.customer || 'Nao informado'}</td>
                    <td>{getTypeLabel(order.osType)}</td>
                    <td>
                      <span
                        className={`status-badge ${getStatusClassName(order.status)}`}
                      >
                        {getServiceOrderStatusLabel(order.status)}
                      </span>
                    </td>
                    <td>
                      {order.assignedTo?.name ||
                        order.assignedTo?.email ||
                        'Nao informado'}
                    </td>
                    <td>{formatServiceOrderDateTime(getOrderDate(order))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
