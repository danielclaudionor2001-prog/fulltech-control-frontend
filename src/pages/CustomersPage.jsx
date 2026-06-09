import { useAuth } from '@clerk/clerk-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Building2, RefreshCw, Trash2 } from 'lucide-react';
import { createCustomer, deleteCustomer, getCustomers } from '../services/api';

const initialFormState = {
  address: '',
  name: '',
};

export default function CustomersPage() {
  const { getToken } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers(getToken);
      setCustomers(data);
    } catch (fetchError) {
      console.error('Failed to fetch customers', fetchError);
      setError('Nao foi possivel carregar os clientes.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.address.trim() || isSubmitting) {
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await createCustomer(formData, getToken);
      setFormData(initialFormState);
      await fetchCustomers();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Falha ao cadastrar cliente.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteCustomer(id, getToken);
    await fetchCustomers();
  };

  return (
    <div className="dashboard-stack">
      <div className="dashboard-header">
        <div>
          <h2>Clientes</h2>
          <p className="section-subtitle">
            Cadastro simples de clientes com nome e endereco para uso no fluxo
            operacional.
          </p>
        </div>

        <button className="btn btn-outline" onClick={() => void fetchCustomers()} title="Atualizar">
          <RefreshCw size={20} />
        </button>
      </div>

      <section className="section-card">
        <div className="section-title">
          <Building2 size={18} />
          <h3>Novo cliente</h3>
        </div>

        <form className="simple-form" onSubmit={handleSubmit}>
          <label className="simple-form-field">
            <span>Nome do cliente</span>
            <input
              name="name"
              onChange={handleChange}
              placeholder="Ex.: Cliente ABC"
              value={formData.name}
            />
          </label>

          <label className="simple-form-field">
            <span>Endereco</span>
            <input
              name="address"
              onChange={handleChange}
              placeholder="Rua, numero, cidade"
              value={formData.address}
            />
          </label>

          {error ? <div className="inline-error">{error}</div> : null}

          <button className="btn btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Salvando...' : 'Cadastrar cliente'}
          </button>
        </form>
      </section>

      <section className="section-card">
        <h3>Clientes cadastrados</h3>
        {loading ? (
          <p>Carregando clientes...</p>
        ) : customers.length === 0 ? (
          <p>Nenhum cliente cadastrado.</p>
        ) : (
          <div className="user-list">
            {customers.map((customer) => (
              <div className="user-item" key={customer.id}>
                <div>
                  <strong>{customer.name}</strong>
                  <p>{customer.address}</p>
                </div>

                <button className="btn btn-outline" onClick={() => void handleDelete(customer.id)}>
                  <Trash2 size={16} />
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
