import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { MapPin, RefreshCw } from 'lucide-react';
import OSCard from '../components/OSCard';
import {
  getServiceOrders,
  startServiceOrder,
  updateLocation,
  updateServiceOrder,
} from '../services/api';
import { useAppAuth } from '../auth/useAppAuth';

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalizacao nao suportada neste navegador.'));
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationState, setLocationState] = useState('checking');
  const [locationError, setLocationError] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getServiceOrders(getToken);
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchOrders();
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
          'Nao foi possivel atualizar sua localizacao em segundo plano.',
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
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

  const handleClaim = async (id) => {
    try {
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
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Voce precisa permitir a localizacao para iniciar o atendimento.';
      setLocationError(message);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    await updateServiceOrder(id, { status }, getToken);
    await fetchOrders();
  };

  const locationBadgeLabel =
    locationState === 'granted'
      ? 'Localizacao liberada'
      : locationState === 'denied'
        ? 'Permissao negada'
        : 'Localizacao exigida';

  return (
    <div className="dashboard-stack">
      <div className="dashboard-header">
        <div>
          <h2>Painel do Tecnico</h2>
          <p className="section-subtitle">
            Para iniciar um atendimento, o navegador precisa liberar sua
            localizacao.
          </p>
        </div>

        <div className="dashboard-actions">
          <div className="status-badge status-progress tracking-badge">
            <MapPin size={16} />
            <span>{locationBadgeLabel}</span>
          </div>

          <button className="btn btn-outline" onClick={() => void fetchOrders()} title="Atualizar">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {locationError ? <div className="inline-error">{locationError}</div> : null}

      <section className="section-card">
        <h3>Minhas OS</h3>
        {loading ? (
          <p>Carregando...</p>
        ) : myOrders.length === 0 ? (
          <p>Voce ainda nao assumiu nenhuma OS.</p>
        ) : (
          <div className="grid">
            {myOrders.map((os) => (
              <OSCard
                key={os.id}
                os={os}
                isTechnician
                onClaim={handleClaim}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        )}
      </section>

      <section className="section-card">
        <h3>OS disponiveis</h3>
        {loading ? (
          <p>Carregando...</p>
        ) : availableOrders.length === 0 ? (
          <p>Nenhuma OS disponivel no momento.</p>
        ) : (
          <div className="grid">
            {availableOrders.map((os) => (
              <OSCard
                key={os.id}
                os={os}
                isTechnician
                onClaim={handleClaim}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
