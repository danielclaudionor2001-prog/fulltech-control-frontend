
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { getLocations } from '../services/api';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet with Vite/Webpack
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function MapPage() {
    const [locations, setLocations] = useState({});

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const data = await getLocations();
                setLocations(data);
            } catch (error) {
                console.error("Failed to fetch locations", error);
            }
        };

        fetchLocations();
        const interval = setInterval(fetchLocations, 10000); // Poll every 10s

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ height: 'calc(100vh - 100px)', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <MapContainer center={[-23.55052, -46.633308]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {Object.entries(locations).map(([id, loc]) => (
                    <Marker key={id} position={[loc.lat, loc.lng]}>
                        <Popup>
                            Técnico {id}<br />
                            Última atualização: {new Date(loc.timestamp).toLocaleTimeString()}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
