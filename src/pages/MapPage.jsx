import { useAuth } from '@clerk/clerk-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, RefreshCw, Users } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import ButtonSpinner from '../components/ButtonSpinner';
import SelectField from '../components/SelectField';
import { useToast } from '../components/ToastContext';
import { getLocations } from '../services/api';
import {
  buildGoogleMapsUrl,
  formatCoordinateAddress,
} from '../utils/locationSupport';

const SAO_PAULO_STATE_CENTER = [-22.55, -48.63];
const SAO_PAULO_STATE_ZOOM = 7;
const RESPONSIBLE_COLORS = [
  '#0057b8',
  '#0f9f6e',
  '#c76b00',
  '#7c3aed',
  '#c0266d',
  '#047481',
  '#b91c1c',
  '#2563eb',
  '#5b7f00',
  '#9333ea',
];

const defaultIcon = L.icon({
  iconAnchor: [12, 41],
  iconSize: [25, 41],
  iconUrl: icon,
  shadowUrl: iconShadow,
});

L.Marker.prototype.options.icon = defaultIcon;

const getResponsibleName = (responsible) =>
  responsible?.name ||
  responsible?.email ||
  responsible?.clerkUserId ||
  'Responsável';

const getResponsibleRoleLabel = (role) =>
  role === 'SUPERVISOR'
    ? 'Supervisor'
    : role === 'TECH'
      ? 'Técnico'
      : 'Responsável';

const createResponsibleIcon = (color) =>
  L.divIcon({
    className: 'responsible-marker-icon',
    html: `<span class="responsible-marker-pin" style="--marker-color:${color}"><span></span></span>`,
    iconAnchor: [17, 40],
    iconSize: [34, 42],
    popupAnchor: [0, -34],
  });

function MapViewport({ locations }) {
  const map = useMap();

  useEffect(() => {
    const syncMapSize = () => {
      map.invalidateSize();
    };

    syncMapSize();
    const frameId = window.requestAnimationFrame(syncMapSize);
    const timeoutId = window.setTimeout(syncMapSize, 350);

    if (locations.length === 0) {
      map.setView(SAO_PAULO_STATE_CENTER, SAO_PAULO_STATE_ZOOM);
      return () => {
        window.cancelAnimationFrame(frameId);
        window.clearTimeout(timeoutId);
      };
    }

    const bounds = L.latLngBounds(
      locations.map((location) => [location.lat, location.lng]),
    );

    map.fitBounds(bounds, {
      maxZoom: 14,
      padding: [42, 42],
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
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
  const [selectedResponsibleId, setSelectedResponsibleId] = useState('');

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

  const responsibleColorById = useMemo(() => {
    const responsibleIds = Array.from(
      new Set(
        locations
          .map((location) => location.responsible?.id)
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));

    return new Map(
      responsibleIds.map((responsibleId, index) => [
        responsibleId,
        RESPONSIBLE_COLORS[index % RESPONSIBLE_COLORS.length],
      ]),
    );
  }, [locations]);

  const markerIconsByResponsibleId = useMemo(
    () =>
      new Map(
        Array.from(responsibleColorById.entries()).map(([responsibleId, color]) => [
          responsibleId,
          createResponsibleIcon(color),
        ]),
      ),
    [responsibleColorById],
  );

  const responsibleOptions = useMemo(() => {
    const responsibleById = new Map();

    locations.forEach((location) => {
      const responsible = location.responsible;

      if (!responsible?.id || responsibleById.has(responsible.id)) {
        return;
      }

      responsibleById.set(responsible.id, responsible);
    });

    const options = Array.from(responsibleById.values())
      .sort((left, right) =>
        getResponsibleName(left).localeCompare(getResponsibleName(right)),
      )
      .map((responsible) => ({
        label: `${getResponsibleName(responsible)} - ${getResponsibleRoleLabel(
          responsible.role,
        )}`,
        value: responsible.id,
      }));

    return [{ label: 'Todos', value: '' }, ...options];
  }, [locations]);

  const filteredLocations = useMemo(
    () =>
      selectedResponsibleId
        ? locations.filter(
            (location) => location.responsible?.id === selectedResponsibleId,
          )
        : locations,
    [locations, selectedResponsibleId],
  );

  useEffect(() => {
    if (
      selectedResponsibleId &&
      !locations.some(
        (location) => location.responsible?.id === selectedResponsibleId,
      )
    ) {
      setSelectedResponsibleId('');
    }
  }, [locations, selectedResponsibleId]);

  const emptyStateMessage = useMemo(
    () =>
      selectedResponsibleId
        ? 'Nenhuma localização foi encontrada para o responsável selecionado.'
        : 'Nenhuma localização de responsável foi registrada ainda. O mapa já está posicionado no estado de São Paulo.',
    [selectedResponsibleId],
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

      <section className="section-card map-filter-card">
        <div className="section-title">
          <Users size={18} />
          <div>
            <h3>Filtro de localização</h3>
            <p className="section-subtitle">
              Selecione um técnico ou supervisor para visualizar somente a
              localização dele no mapa.
            </p>
          </div>
        </div>

        <div className="map-filter-grid">
          <label className="simple-form-field">
            <span>Responsável</span>
            <SelectField
              onChange={setSelectedResponsibleId}
              options={responsibleOptions}
              placeholder="Todos"
              value={selectedResponsibleId}
            />
          </label>

          <div className="map-legend" aria-label="Cores dos responsáveis">
            {responsibleOptions.slice(1).map((option) => (
              <span className="map-legend-item" key={option.value}>
                <span
                  className="map-color-dot"
                  style={{
                    backgroundColor:
                      responsibleColorById.get(option.value) ||
                      RESPONSIBLE_COLORS[0],
                  }}
                />
                {option.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card map-card">
        <div className="map-frame map-frame-rich">
          <MapContainer
            className="team-map-container"
            center={SAO_PAULO_STATE_CENTER}
            zoom={SAO_PAULO_STATE_ZOOM}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapViewport locations={filteredLocations} />

            {filteredLocations.map((location) => (
              <Marker
                icon={
                  markerIconsByResponsibleId.get(location.responsible?.id) ||
                  defaultIcon
                }
                key={`${location.responsible?.id || 'responsavel'}-${location.timestamp}`}
                position={[location.lat, location.lng]}
              >
                <Popup>
                  <strong>{getResponsibleName(location.responsible)}</strong>
                  <br />
                  Perfil: {getResponsibleRoleLabel(location.responsible?.role)}
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

          {!loading && filteredLocations.length === 0 ? (
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
