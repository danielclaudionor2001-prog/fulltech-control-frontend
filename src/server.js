
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// In-memory data store
let serviceOrders = [
    {
        id: 1,
        customer: "Cliente Exemplo 1",
        address: "Rua Exemplo, 123",
        description: "Instalação de Internet",
        status: "Pendente",
        technicianId: null,
        createdAt: new Date().toISOString()
    },
    {
        id: 2,
        customer: "Cliente Exemplo 2",
        address: "Av. Teste, 456",
        description: "Manutenção de Roteador",
        status: "Em Andamento",
        technicianId: 1, // Assigned to Tech 1
        createdAt: new Date().toISOString()
    }
];

let technicianLocations = {
    1: { lat: -23.55052, lng: -46.633308, timestamp: new Date().toISOString() } // SP coordinates
};

// --- OS Endpoints ---

// Get all OS
app.get('/api/os', (req, res) => {
    res.json(serviceOrders);
});

// Create new OS
app.post('/api/os', (req, res) => {
    const newOS = {
        id: serviceOrders.length + 1,
        ...req.body,
        status: 'Pendente',
        createdAt: new Date().toISOString()
    };
    serviceOrders.push(newOS);
    res.status(201).json(newOS);
});

// Update OS (Assign Tech or Change Status)
app.put('/api/os/:id', (req, res) => {
    const { id } = req.params;
    const index = serviceOrders.findIndex(os => os.id == id);
    if (index !== -1) {
        serviceOrders[index] = { ...serviceOrders[index], ...req.body };
        res.json(serviceOrders[index]);
    } else {
        res.status(404).json({ message: "OS not found" });
    }
});

// --- Location Endpoints ---

// Update Technician Location
app.post('/api/location', (req, res) => {
    const { technicianId, lat, lng } = req.body;
    technicianLocations[technicianId] = { lat, lng, timestamp: new Date().toISOString() };
    res.json({ success: true });
});

// Get All Locations
app.get('/api/locations', (req, res) => {
    res.json(technicianLocations);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
