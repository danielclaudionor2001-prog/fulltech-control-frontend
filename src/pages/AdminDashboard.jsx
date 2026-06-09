import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { CheckCircle2, RefreshCw, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import OSCard from '../components/OSCard';
import { getServiceOrders, getUsers, updateServiceOrder, updateUserRole } from '../services/api';

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const [ordersData, usersData] = await Promise.all([
        getServiceOrders(getToken),
        getUsers(getToken),
      ]);

      setOrders(ordersData);
      setUsers(usersData);
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

  const handlePromoteToAdmin = async (id) => {
    setBusyUserId(id);
    try {
      await updateUserRole(id, 'ADMIN', getToken);
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
      <div className="dashboard-header">
        <div>
          <h2>Painel Administrativo</h2>
          <p className="section-subtitle">
            Visao geral da operacao, equipe autenticada e ordens de servico.
          </p>
        </div>

        <button className="btn btn-outline" onClick={() => void fetchDashboard()} title="Atualizar">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">OS totais</span>
          <strong>{orders.length}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Tecnicos</span>
          <strong>{techUsers.length}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Admins</span>
          <strong>{adminUsers.length}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Usuarios registrados</span>
          <strong>{users.length}</strong>
        </div>
      </div>

      <section className="section-card">
        <div className="section-title">
          <Shield size={18} />
          <h3>Configuracoes principais</h3>
        </div>

        <div className="action-grid">
          <Link className="action-link-card" to="/admin/access">
            <strong>Autorizar e-mails</strong>
            <span>Defina quem pode entrar na aplicacao como tecnico.</span>
          </Link>

          <Link className="action-link-card" to="/admin/customers">
            <strong>Cadastrar clientes</strong>
            <span>Mantenha a base simples de clientes com nome e endereco.</span>
          </Link>
        </div>
      </section>

      <section className="section-card">
        <div className="section-title">
          <Users size={18} />
          <h3>Usuarios que ja autenticaram</h3>
        </div>

        {loading ? (
          <p>Carregando usuarios...</p>
        ) : users.length === 0 ? (
          <p>Nenhum usuario autenticado ainda.</p>
        ) : (
          <div className="user-list">
            {users.map((user) => (
              <div className="user-item" key={user.id}>
                <div>
                  <strong>{user.name || user.email || user.clerkUserId}</strong>
                  <p>
                    {(user.email || 'Sem email')} •{' '}
                    {user.role === 'ADMIN' ? 'Administrador' : 'Tecnico'}
                  </p>
                </div>

                {user.role !== 'ADMIN' ? (
                  <button
                    className="btn btn-outline"
                    disabled={busyUserId === user.id}
                    onClick={() => void handlePromoteToAdmin(user.id)}
                  >
                    Tornar admin
                  </button>
                ) : (
                  <span className="status-badge status-progress">Admin</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-title">
          <CheckCircle2 size={18} />
          <h3>Ordens de servico</h3>
        </div>

        {loading ? (
          <p>Carregando OS...</p>
        ) : (
          <div className="grid">
            {orders.map((os) => (
              <OSCard
                key={os.id}
                os={os}
                isTechnician={false}
                onAssign={handleMarkInProgress}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
