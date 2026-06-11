import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import OSCard from '../components/OSCard';
import SelectField from '../components/SelectField';
import SkeletonBlock from '../components/SkeletonBlock';
import {
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
    label: 'Administrador',
    value: 'ADMIN',
  },
];

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState('');

  const isInitialLoading = loading && orders.length === 0 && users.length === 0;

  const fetchDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const [ordersData, usersData] = await Promise.all([
        getServiceOrders(getToken),
        getUsers(getToken),
      ]);

      setOrders(ordersData);
      setUsers(usersData);
      setRoleDrafts(
        Object.fromEntries(usersData.map((user) => [user.id, user.role])),
      );
    } catch (error) {
      console.error('Failed to load admin dashboard', error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const techUsers = useMemo(
    () => users.filter((user) => user.role === 'TECH'),
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

  const handleUpdateRole = async (id) => {
    const role = roleDrafts[id];
    if (!role) {
      return;
    }

    setBusyUserId(id);

    try {
      await updateUserRole(id, role, getToken);
      await fetchDashboard();
    } finally {
      setBusyUserId('');
    }
  };

  const handleMarkInProgress = async (id) => {
    await updateServiceOrder(id, { status: 'IN_PROGRESS' }, getToken);
    await fetchDashboard();
  };

  return (
    <div className="dashboard-stack">
      <section className="hero-panel">
        <div className="page-hero">
          <div>
            <span className="page-eyebrow">Operação</span>
            <h1 className="page-title">Painel administrativo</h1>
            <p className="page-subtitle">
              Acompanhe o dia, distribua a operação e mantenha acessos,
              clientes e ordens sob controle em uma única visão.
            </p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => void fetchDashboard()}
            title="Atualizar"
            type="button"
          >
            <RefreshCw size={20} />
            Atualizar
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
              <span>Entregues</span>
              {isInitialLoading ? (
                <SkeletonBlock className="skeleton-number" />
              ) : (
                <strong>{doneOrders.length}</strong>
              )}
              <small>Ordens já concluídas</small>
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
                Defina quem pode entrar na aplicação como técnico ou
                administrador.
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
                      {user.role === 'ADMIN' ? 'Administrador' : 'Técnico'}
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
                      {busyUserId === user.id ? 'Salvando...' : 'Salvar perfil'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="section-card section-card-orders">
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
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <CircleAlert size={18} />
            <span>Nenhuma ordem cadastrada até o momento.</span>
          </div>
        ) : (
          <div className="grid">
            {orders.map((os) => (
              <OSCard
                key={os.id}
                isTechnician={false}
                onAssign={handleMarkInProgress}
                os={os}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
