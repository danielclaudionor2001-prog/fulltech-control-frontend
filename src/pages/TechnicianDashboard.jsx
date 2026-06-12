import { useAuth } from '@clerk/clerk-react';
import { CircleAlert, MapPin, RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppAuth } from '../auth/useAppAuth';
import ButtonSpinner from '../components/ButtonSpinner';
import OSCard from '../components/OSCard';
import SkeletonBlock from '../components/SkeletonBlock';
import { useToast } from '../components/ToastProvider';
import {
  getServiceOrders,
  startServiceOrder,
  updateLocation,
  updateServiceOrder,
} from '../services/api';

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada neste navegador.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });
  });
}

export default function TechnicianDashboard() {
  const { getToken } = useAuth();
  const { appUser } = useAppAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationState, setLocationState] = useState('checking');
  const [locationError, setLocationError] = useState('');
  const [busyOrderId, setBusyOrderId] = useState('');
  const [busyOrderAction, setBusyOrderAction] = useState('');
  const [pageError, setPageError] = useState('');

  const isInitialLoading = loading && orders.length === 0;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const data = await getServiceOrders(getToken);
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders', error);
      setPageError('Não foi possível carregar as ordens agora.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchOrders().catch(() => {});
  }, [fetchOrders]);

  useEffect(() => {
    if (!navigator.permissions?.query) {
      setLocationState('unknown');
      return undefined;
    }

    let isCancelled = false;
    let permissionStatus;

    const loadPermission = async () => {
      try {
        permissionStatus = await navigator.permissions.query({
          name: 'geolocation',
        });

        if (isCancelled) {
          return;
        }

        setLocationState(permissionStatus.state);
        permissionStatus.onchange = () => {
          setLocationState(permissionStatus.state);
        };
      } catch {
        if (!isCancelled) {
          setLocationState('unknown');
        }
      }
    };

    void loadPermission();

    return () => {
      isCancelled = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!appUser || locationState !== 'granted' || !navigator.geolocation) {
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocationError('');
        void updateLocation(
          position.coords.latitude,
          position.coords.longitude,
          getToken,
        ).catch((error) => {
          console.error('Failed to send location', error);
        });
      },
      () => {
        setLocationError(
          'Não foi possível atualizar sua localização em segundo plano.',
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [appUser, getToken, locationState]);

  const availableOrders = useMemo(
    () => orders.filter((os) => !os.assignedToId && os.status === 'OPEN'),
    [orders],
  );
  const myOrders = useMemo(
    () => orders.filter((os) => os.assignedToId === appUser?.id),
    [appUser?.id, orders],
  );
  const inProgressOrders = useMemo(
    () => myOrders.filter((os) => os.status === 'IN_PROGRESS'),
    [myOrders],
  );
  const completedOrders = useMemo(
    () => myOrders.filter((os) => os.status === 'DONE'),
    [myOrders],
  );

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await fetchOrders();
      showSuccess('Painel atualizado com sucesso.');
    } catch {
      showError('Não foi possível atualizar o painel agora.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleClaim = async (id) => {
    try {
      setBusyOrderId(id);
      setBusyOrderAction('claim');
      setLocationError('');
      const position = await getCurrentPosition();
      setLocationState('granted');

      await startServiceOrder(
        id,
        position.coords.latitude,
        position.coords.longitude,
        getToken,
      );

      await fetchOrders();
      showSuccess('Atendimento iniciado com sucesso.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Você precisa permitir a localização para iniciar o atendimento.';
      setLocationError(message);
      showWarning(message);
    } finally {
      setBusyOrderId('');
      setBusyOrderAction('');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    setBusyOrderId(id);
    setBusyOrderAction(status === 'DONE' ? 'done' : 'progress');

    try {
      await updateServiceOrder(id, { status }, getToken);
      await fetchOrders();
      showSuccess('Ordem de serviço atualizada.');
    } catch (error) {
      console.error('Failed to update service order', error);
      showError('Não foi possível atualizar a OS agora.');
    } finally {
      setBusyOrderId('');
      setBusyOrderAction('');
    }
  };

  const locationBadgeLabel =
    locationState === 'granted'
      ? 'Localização liberada'
      : locationState === 'denied'
        ? 'Permissão negada'
        : 'Localização exigida';

  return (
    <div className="dashboard-stack">
      <section className="hero-panel">
        <div className="page-hero">
          <div>
            <span className="page-eyebrow">Atendimento em campo</span>
            <h1 className="page-title">Painel do técnico</h1>
            <p className="page-subtitle">
              Para iniciar um atendimento, o navegador precisa liberar sua
              localização e mantê-la ativa durante a execução.
            </p>
          </div>

          <div className="dashboard-actions">
            <div className="status-badge status-progress tracking-badge">
              <MapPin size={16} />
              <span>{locationBadgeLabel}</span>
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
        </div>

        <div className="summary-grid">
          <div className="summary-card summary-card-blue">
            <span className="summary-label">Minhas OS</span>
            {isInitialLoading ? (
              <SkeletonBlock className="skeleton-number" />
            ) : (
              <strong>{myOrders.length}</strong>
            )}
            <small>Ordens já vinculadas ao seu usuário</small>
          </div>
          <div className="summary-card summary-card-sky">
            <span className="summary-label">Em andamento</span>
            {isInitialLoading ? (
              <SkeletonBlock className="skeleton-number" />
            ) : (
              <strong>{inProgressOrders.length}</strong>
            )}
            <small>Atendimentos ativos neste momento</small>
          </div>
          <div className="summary-card summary-card-slate">
            <span className="summary-label">Disponíveis</span>
            {isInitialLoading ? (
              <SkeletonBlock className="skeleton-number" />
            ) : (
              <strong>{availableOrders.length}</strong>
            )}
            <small>Chamados abertos aguardando aceite</small>
          </div>
          <div className="summary-card summary-card-amber">
            <span className="summary-label">Finalizadas</span>
            {isInitialLoading ? (
              <SkeletonBlock className="skeleton-number" />
            ) : (
              <strong>{completedOrders.length}</strong>
            )}
            <small>Ordens finalizadas por você</small>
          </div>
        </div>
      </section>

      {pageError ? <div className="inline-error">{pageError}</div> : null}
      {locationError ? <div className="inline-error">{locationError}</div> : null}

      <div className="content-grid content-grid-dashboard mobile-orders-first">
        <section className="section-card section-card-orders">
          <div className="section-title">
            <MapPin size={18} />
            <div>
              <h3>Minhas ordens</h3>
              <p className="section-subtitle">
                Acompanhe o que já está no seu nome e finalize os atendimentos
                encerrados.
              </p>
            </div>
          </div>

          {isInitialLoading ? (
            <div className="grid">
              {Array.from({ length: 2 }).map((_, index) => (
                <div className="skeleton-card" key={`my-orders-skeleton-${index}`}>
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
          ) : myOrders.length === 0 ? (
            <div className="empty-state">
              <CircleAlert size={18} />
              <span>Você ainda não assumiu nenhuma OS.</span>
            </div>
          ) : (
            <div className="grid">
              {myOrders.map((os) => (
                <OSCard
                  busyAction={busyOrderId === os.id ? busyOrderAction : ''}
                  key={os.id}
                  isTechnician
                  onClaim={handleClaim}
                  onStatusUpdate={handleStatusUpdate}
                  os={os}
                />
              ))}
            </div>
          )}
        </section>

        <section className="section-card">
          <div className="section-title">
            <CircleAlert size={18} />
            <div>
              <h3>OS disponíveis</h3>
              <p className="section-subtitle">
                Ordens livres para assumir assim que a localização estiver
                liberada.
              </p>
            </div>
          </div>

          {isInitialLoading ? (
            <div className="grid">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  className="skeleton-card"
                  key={`available-orders-skeleton-${index}`}
                >
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
          ) : availableOrders.length === 0 ? (
            <div className="empty-state">
              <CircleAlert size={18} />
              <span>Nenhuma OS disponível no momento.</span>
            </div>
          ) : (
            <div className="grid">
              {availableOrders.map((os) => (
                <OSCard
                  busyAction={busyOrderId === os.id ? busyOrderAction : ''}
                  key={os.id}
                  isTechnician
                  onClaim={handleClaim}
                  onStatusUpdate={handleStatusUpdate}
                  os={os}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
