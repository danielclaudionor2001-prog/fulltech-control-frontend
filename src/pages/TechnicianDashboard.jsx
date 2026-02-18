
import React, { useEffect, useState } from 'react';
import { getServiceOrders, updateServiceOrder, updateLocation } from '../services/api';
import OSCard from '../components/OSCard';
import { MapPin } from 'lucide-react';

export default function TechnicianDashboard() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const techId = 1; // Hardcoded for prototype

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const data = await getServiceOrders();
            // Filter for this technician
            const myOrders = data.filter(os => os.technicianId === techId);
            setOrders(myOrders);
        } catch (error) {
            console.error("Failed to fetch orders", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();

        // Start sending location updates
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                updateLocation(techId, position.coords.latitude, position.coords.longitude);
            },
            (error) => console.error("Location error:", error),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const handleStatusUpdate = async (id, status) => {
        if (confirm("Confirmar finalização da OS?")) {
            await updateServiceOrder(id, { status });
            fetchOrders();
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Minhas Ordens de Serviço</h2>
                <div className="status-badge status-progress" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} />
                    <span>Rastreamento Ativo</span>
                </div>
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : orders.length === 0 ? (
                <p>Nenhuma OS atribuída.</p>
            ) : (
                <div className="grid">
                    {orders.map(os => (
                        <OSCard
                            key={os.id}
                            os={os}
                            isTechnician={true}
                            onStatusUpdate={handleStatusUpdate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
