import { useAuth } from '@clerk/clerk-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import ButtonSpinner from '../components/ButtonSpinner';
import { useToast } from '../components/ToastProvider';
import { getLocations } from '../services/api';
import {
  buildGoogleMapsUrl,
  formatCoordinateAddress,
} from '../utils/locationSupport';

const SAO_PAULO_STATE_CENTER = [-22.55, -48.63];
const SAO_PAULO_STATE_ZOOM = 7;

const defaultIcon = L.icon({
  iconAnchor: [12, 41],
  iconSize: [25, 41],
  iconUrl: icon,
  shadowUrl: iconShadow,
});

L.Marker.prototype.options.icon = defaultIcon;

function MapViewport({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) {
      map.setView(SAO_PAULO_STATE_CENTER, SAO_PAULO_STATE_ZOOM);
      return;
    }

    const bounds = L.latLngBounds(
      locations.map((location) => [location.lat, location.lng]),
    );

    map.fitBounds(bounds, {
      maxZoom: 14,
      padding: [42, 42],
    });
  }, [locations, map]);

  return null;
}

const formatLastUpdate = (timestamp) => {
  const parsed = new Date(timestamp);

  if (Number.isNaN(parsed.getTime())) {
    return 'Não informado';
  }

  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function MapPage() {
  const { getToken } = useAuth();
  const { showError, showSuccess } = useToast();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLocations = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getLocations(getToken);
      setLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch locations', error);
      showError('Não foi possível carregar o mapa da equipe agora.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getToken, showError]);

  useEffect(() => {
    void fetchLocations().catch(() => {});

    const intervalId = window.setInterval(() => {
      void fetchLocations().catch(() => {});
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [fetchLocations]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await fetchLocations();
      showSuccess('Mapa atualizado com sucesso.');
    } catch {
      // handled by fetchLocations
    } finally {
      setRefreshing(false);
    }
  };

  const emptyStateMessage = useMemo(
    () =>
      'Nenhuma localização de responsável foi registrada ainda. O mapa já está posicionado no estado de São Paulo.',
    [],
  );

  return (
    <div className="dashboard-stack">
      <div className="page-hero">
        <div>
          <span className="page-eyebrow">Rastreamento</span>
          <h1 className="page-title">Mapa da equipe</h1>
          <p className="page-subtitle">
            Visualize a última localização conhecida de cada responsável e qual
            OS estava vinculada naquele momento.
          </p>
        </div>

        <button
          className="btn btn-secondary"
          disabled={refreshing}
          onClick={() => void handleRefresh()}
          type="button"
        >
          {refreshing ? <ButtonSpinner /> : <RefreshCw size={20} />}
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <section className="section-card map-card">
        <div className="map-frame map-frame-rich">
          <MapContainer
            center={SAO_PAULO_STATE_CENTER}
            zoom={SAO_PAULO_STATE_ZOOM}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapViewport locations={locations} />

            {locations.map((location) => (
              <Marker
                key={`${location.responsible.id}-${location.timestamp}`}
                position={[location.lat, location.lng]}
              >
                <Popup>
                  <strong>
                    {location.responsible.name ||
                      location.responsible.email ||
                      location.responsible.clerkUserId ||
                      'Responsável'}
                  </strong>
                  <br />
                  Última atualização: {formatLastUpdate(location.timestamp)}
                  <br />
                  Endereço aproximado:{' '}
                  {location.responsibleAddress ||
                    formatCoordinateAddress(location.lat, location.lng)}
                  <br />
                  {location.serviceOrder ? (
                    <>
                      OS: {location.serviceOrder.identifier || location.serviceOrder.id}
                      <br />
                      Cliente: {location.serviceOrder.customer}
                      <br />
                      Endereço do cliente:{' '}
                      {location.serviceOrder.address || 'Não informado'}
                      <br />
                      <a
                        href={buildGoogleMapsUrl(location.lat, location.lng)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Abrir no Google Maps
                      </a>
                    </>
                  ) : (
                    <>
                      Sem OS em andamento vinculada.
                      <br />
                      <a
                        href={buildGoogleMapsUrl(location.lat, location.lng)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Abrir no Google Maps
                      </a>
                    </>
                  )}
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {!loading && locations.length === 0 ? (
            <div className="map-empty-overlay">
              <MapPin size={18} />
              <span>{emptyStateMessage}</span>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
