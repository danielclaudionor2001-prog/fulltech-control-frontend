import { useAuth } from '@clerk/clerk-react';
import React, { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { getLocations } from '../services/api';

const defaultIcon = L.icon({
  iconAnchor: [12, 41],
  iconSize: [25, 41],
  iconUrl: icon,
  shadowUrl: iconShadow,
});

L.Marker.prototype.options.icon = defaultIcon;

export default function MapPage() {
  const { getToken } = useAuth();
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await getLocations(getToken);
        setLocations(data);
      } catch (error) {
        console.error('Failed to fetch locations', error);
      }
    };

    void fetchLocations();
    const interval = setInterval(() => {
      void fetchLocations();
    }, 10000);

    return () => clearInterval(interval);
  }, [getToken]);

  return (
    <div className="dashboard-stack">
      <div className="page-hero">
        <div>
          <span className="page-eyebrow">Rastreamento</span>
          <h1 className="page-title">Mapa da equipe</h1>
          <p className="page-subtitle">
            Visualize a posição mais recente dos técnicos com atualização
            automática do painel.
          </p>
        </div>
      </div>

      <section className="section-card map-card">
        <div className="map-frame">
          <MapContainer
            center={[-23.55052, -46.633308]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {locations.map((location) => (
              <Marker
                key={location.technician.id}
                position={[location.lat, location.lng]}
              >
                <Popup>
                  <strong>
                    {location.technician.name ||
                      location.technician.email ||
                      location.technician.clerkUserId}
                  </strong>
                  <br />
                  Última atualização:{' '}
                  {new Date(location.timestamp).toLocaleTimeString('pt-BR')}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </section>
    </div>
  );
}
