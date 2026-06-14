import { useAuth } from '@clerk/clerk-react';
import {
  CircleAlert,
  ListFilter,
  MapPin,
  RefreshCw,
  Search,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppAuth } from '../auth/useAppAuth';
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
  getServiceOrders,
  startServiceOrder,
  updateLocation,
  updateServiceOrder,
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

const initialFilters = {
  search: '',
  status: '',
};

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
  const [orderFilters, setOrderFilters] = useState(initialFilters);
  const [isLocationHelpOpen, setIsLocationHelpOpen] = useState(false);
  const [isLocationPendingOpen, setIsLocationPendingOpen] = useState(false);
  const [proximityAlertMessage, setProximityAlertMessage] = useState('');
  const [pendingStartOrderId, setPendingStartOrderId] = useState('');

  const guidance = useMemo(() => buildLocationGuidance(), []);
  const isInitialLoading = loading && orders.length === 0;
  const pageTitle =
    appUser?.role === 'SUPERVISOR' ? 'Painel do supervisor' : 'Painel do técnico';

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const data = await getServiceOrders(getToken);
      setOrders(sortServiceOrdersByLatest(data));
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

  const availableOrders = useMemo(() => {
    const filtered = orders.filter((os) => !os.assignedToId && os.status === 'OPEN');
    return filterServiceOrders(sortServiceOrdersByLatest(filtered), orderFilters);
  }, [orderFilters, orders]);

  const myOrders = useMemo(() => {
    const filtered = orders.filter((os) => os.assignedToId === appUser?.id);
    return filterServiceOrders(sortServiceOrdersByLatest(filtered), orderFilters);
  }, [appUser?.id, orderFilters, orders]);

  const rawMyOrders = useMemo(
    () => orders.filter((os) => os.assignedToId === appUser?.id),
    [appUser?.id, orders],
  );

  const rawAvailableOrders = useMemo(
    () => orders.filter((os) => !os.assignedToId && os.status === 'OPEN'),
    [orders],
  );

  const inProgressOrders = useMemo(
    () => rawMyOrders.filter((os) => os.status === 'IN_PROGRESS'),
    [rawMyOrders],
  );

  const completedOrders = useMemo(
    () => rawMyOrders.filter((os) => os.status === 'DONE'),
    [rawMyOrders],
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

  const handleRetryLocationAccess = async () => {
    setIsLocationHelpOpen(false);
    setIsLocationPendingOpen(true);

    try {
      const position = await requestBrowserLocation();
      await updateLocation(
        position.coords.latitude,
        position.coords.longitude,
        getToken,
      );
      setLocationState('granted');
      setLocationError('');
      showSuccess('Localização atualizada com sucesso.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível obter sua localização agora.';
      setLocationError(message);

      if (isLocationPermissionMessage(message)) {
        setIsLocationHelpOpen(true);
      } else if (!isTechnicalLocationSyncMessage(message)) {
        showWarning(message);
      }
    } finally {
      setIsLocationPendingOpen(false);
    }
  };

  const startOrderWithValidation = async (id) => {
    setBusyOrderId(id);
    setBusyOrderAction('start');
    setLocationError('');
    setProximityAlertMessage('');
    setPendingStartOrderId(id);
    setIsLocationPendingOpen(true);

    try {
      const position = await requestBrowserLocation();
      setLocationState('granted');

      await startServiceOrder(
        id,
        position.coords.latitude,
        position.coords.longitude,
        getToken,
      );

      await fetchOrders();
      showSuccess('Atendimento iniciado com sucesso.');
      setPendingStartOrderId('');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Você precisa liberar a localização para iniciar o atendimento.';

      if (isDistanceValidationMessage(message)) {
        setLocationError('');
        setProximityAlertMessage(message);
      } else if (isLocationPermissionMessage(message)) {
        setLocationError(message);
        setIsLocationHelpOpen(true);
      } else {
        setLocationError(message);
        showWarning(message);
      }
    } finally {
      setIsLocationPendingOpen(false);
      setBusyOrderId('');
      setBusyOrderAction('');
    }
  };

  const handleStatusUpdate = async (id, status, conclusionData = {}) => {
    setBusyOrderId(id);
    setBusyOrderAction(
      status === 'DONE' || status === 'WITH_PENDING' ? 'done' : 'progress',
    );

    try {
      await updateServiceOrder(id, { ...conclusionData, status }, getToken);
      await fetchOrders();
      showSuccess('Ordem de serviço atualizada.');
    } catch (error) {
      console.error('Failed to update service order', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar a OS agora.';
      showError(message || 'Não foi possível atualizar a OS agora.');
      throw error;
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
            <h1 className="page-title">{pageTitle}</h1>
            <p className="page-subtitle">
              O navegador precisa informar sua localização no login e novamente
              ao assumir uma OS para validar a proximidade do atendimento.
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
              <strong>{rawMyOrders.length}</strong>
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
              <strong>{rawAvailableOrders.length}</strong>
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

      <section className="section-card">
        <div className="section-title">
          <ListFilter size={18} />
          <div>
            <h3>Filtro de ordens</h3>
            <p className="section-subtitle">
              Pesquise por cliente, identificador, endereço, descrição ou
              responsável.
            </p>
          </div>
        </div>

        <div className="os-row cols-3b">
          <label className="simple-form-field">
            <span>Pesquisar</span>
            <div className="input-with-icon">
              <Search size={18} />
              <input
                className="form-control has-leading-icon"
                onChange={(event) =>
                  setOrderFilters((previous) => ({
                    ...previous,
                    search: event.target.value,
                  }))
                }
                placeholder="Cliente, OS, endereço ou responsável"
                type="text"
                value={orderFilters.search}
              />
            </div>
          </label>

          <label className="simple-form-field">
            <span>Status</span>
            <SelectField
              onChange={(value) =>
                setOrderFilters((previous) => ({
                  ...previous,
                  status: value,
                }))
              }
              options={ORDER_STATUS_FILTER_OPTIONS}
              placeholder="Todos os status"
              value={orderFilters.status}
            />
          </label>

          <div className="simple-form-field">
            <span>Ações</span>
            <div className="table-actions">
              <button
                className="btn btn-secondary btn-compact"
                onClick={() => setOrderFilters(initialFilters)}
                type="button"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>
      </section>

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
              <span>
                {rawMyOrders.length === 0
                  ? 'Você ainda não assumiu nenhuma OS.'
                  : 'Nenhuma OS da sua carteira atende aos filtros atuais.'}
              </span>
            </div>
          ) : (
            <ServiceOrderSlider
              items={myOrders}
              renderItem={(os) => (
                <OSCard
                  busyAction={busyOrderId === os.id ? busyOrderAction : ''}
                  key={os.id}
                  isTechnician
                  onClaim={startOrderWithValidation}
                  onStatusUpdate={handleStatusUpdate}
                  os={os}
                />
              )}
            />
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
              <span>
                {rawAvailableOrders.length === 0
                  ? 'Nenhuma OS disponível no momento.'
                  : 'Nenhuma OS disponível atende aos filtros atuais.'}
              </span>
            </div>
          ) : (
            <ServiceOrderSlider
              items={availableOrders}
              renderItem={(os) => (
                <OSCard
                  busyAction={busyOrderId === os.id ? busyOrderAction : ''}
                  key={os.id}
                  isTechnician
                  onClaim={startOrderWithValidation}
                  onStatusUpdate={handleStatusUpdate}
                  os={os}
                />
              )}
            />
          )}
        </section>
      </div>

      <LocationRequestPendingModal
        description="Aceite a solicitação de localização do navegador para validarmos sua presença perto do cliente."
        onClose={() => setIsLocationPendingOpen(false)}
        open={isLocationPendingOpen}
        title="Validando sua localização"
      />

      <LocationPermissionModal
        description="Para iniciar o atendimento, o navegador precisa informar sua localização atual."
        guidance={guidance}
        onClose={() => setIsLocationHelpOpen(false)}
        onRetry={() => {
          setIsLocationHelpOpen(false);

          if (pendingStartOrderId) {
            void startOrderWithValidation(pendingStartOrderId);
            return;
          }

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
                void startOrderWithValidation(pendingStartOrderId);
              }
            : undefined
        }
        open={Boolean(proximityAlertMessage)}
      />
    </div>
  );
}
