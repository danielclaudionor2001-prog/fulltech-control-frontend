
import React, { useEffect, useState } from 'react';
import { getServiceOrders, updateServiceOrder } from '../services/api';
import OSCard from '../components/OSCard';
import { RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const data = await getServiceOrders();
            setOrders(data);
        } catch (error) {
            console.error("Failed to fetch orders", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleAssign = async (id) => {
        const techId = prompt("Enter Technician ID to assign (e.g., 1):");
        if (techId) {
            await updateServiceOrder(id, { technicianId: parseInt(techId), status: 'Em Andamento' });
            fetchOrders();
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Painel Administrativo</h2>
                <button className="btn btn-outline" onClick={fetchOrders} title="Atualizar">
                    <RefreshCw size={20} />
                </button>
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : (
                <div className="grid">
                    {orders.map(os => (
                        <OSCard
                            key={os.id}
                            os={os}
                            isTechnician={false}
                            onAssign={handleAssign}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
