import { useAuth } from '@clerk/clerk-react';
import { Building2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ButtonSpinner from '../components/ButtonSpinner';
import ModalShell from '../components/ModalShell';
import SkeletonBlock from '../components/SkeletonBlock';
import { useToast } from '../components/ToastProvider';
import { createCustomer, deleteCustomer, getCustomers } from '../services/api';

const initialFormState = {
  address: '',
  name: '',
};

const formatDateTime = (dateLike) => {
  if (!dateLike) {
    return '—';
  }

  return new Date(dateLike).toLocaleString('pt-BR');
};

export default function CustomersPage() {
  const { getToken } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyCustomerId, setBusyCustomerId] = useState('');
  const [pageError, setPageError] = useState('');

  const isInitialLoading = loading && customers.length === 0;

  const orderedCustomers = useMemo(
    () => [...customers].sort((left, right) => left.name.localeCompare(right.name)),
    [customers],
  );

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const data = await getCustomers(getToken);
      setCustomers(data);
    } catch (fetchError) {
      console.error('Failed to fetch customers', fetchError);
      setPageError('Não foi possível carregar os clientes.');
      throw fetchError;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchCustomers().catch(() => {});
  }, [fetchCustomers]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await fetchCustomers();
      showSuccess('Lista de clientes atualizada.');
    } catch {
      showError('Não foi possível atualizar os clientes agora.');
    } finally {
      setRefreshing(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.address.trim()) {
      showWarning('Preencha os campos obrigatórios de cliente.');
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createCustomer(formData, getToken);
      await fetchCustomers();
      showSuccess('Cliente cadastrado com sucesso.');
      closeModal();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Falha ao cadastrar cliente.';
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setBusyCustomerId(id);
    setPageError('');

    try {
      await deleteCustomer(id, getToken);
      await fetchCustomers();
      showSuccess('Cliente removido com sucesso.');
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : 'Falha ao remover o cliente.';
      setPageError(message);
      showError(message);
    } finally {
      setBusyCustomerId('');
    }
  };

  return (
    <div className="dashboard-stack">
      <div className="page-hero">
        <div>
          <span className="page-eyebrow">Base operacional</span>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">
            Mantenha uma base enxuta de clientes e endereços para acelerar a
            abertura das ordens de serviço.
          </p>
        </div>

        <div className="dashboard-actions">
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

          <button
            className="btn btn-primary btn-icon"
            onClick={() => setIsModalOpen(true)}
            type="button"
          >
            <Plus size={18} />
            Novo cliente
          </button>
        </div>
      </div>

      {pageError ? <div className="inline-error">{pageError}</div> : null}

      <section className="section-card access-table-card">
        <div className="section-title">
          <Building2 size={18} />
          <div>
            <h3>Clientes cadastrados</h3>
            <p className="section-subtitle">
              Relação atual usada pelo time administrativo e pelos técnicos.
            </p>
          </div>
        </div>

        {isInitialLoading ? (
          <div className="data-table-shell">
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Endereço</th>
                    <th>Criado em</th>
                    <th>Atualizado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <tr key={`customer-skeleton-${index}`}>
                      <td className="table-loading-cell">
                        <div className="table-primary-cell">
                          <SkeletonBlock className="skeleton-line-short" />
                          <SkeletonBlock className="skeleton-table-note" />
                        </div>
                      </td>
                      <td className="table-loading-cell">
                        <SkeletonBlock className="skeleton-line" />
                      </td>
                      <td className="table-loading-cell">
                        <SkeletonBlock className="skeleton-line-short" />
                      </td>
                      <td className="table-loading-cell">
                        <SkeletonBlock className="skeleton-line-short" />
                      </td>
                      <td className="table-loading-cell">
                        <div className="table-actions">
                          <SkeletonBlock className="skeleton-button" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : orderedCustomers.length === 0 ? (
          <div className="table-empty">Nenhum cliente cadastrado.</div>
        ) : (
          <div className="data-table-shell">
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Endereço</th>
                    <th>Criado em</th>
                    <th>Atualizado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {orderedCustomers.map((customer) => {
                    const isBusy = busyCustomerId === customer.id;

                    return (
                      <tr key={customer.id}>
                        <td>
                          <div className="table-primary-cell">
                            <strong>{customer.name}</strong>
                            <small>ID: {customer.id.slice(0, 8)}</small>
                          </div>
                        </td>
                        <td>{customer.address}</td>
                        <td>{formatDateTime(customer.createdAt)}</td>
                        <td>{formatDateTime(customer.updatedAt)}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn btn-outline btn-compact"
                              disabled={isBusy}
                              onClick={() => void handleDelete(customer.id)}
                              type="button"
                            >
                              {isBusy ? <ButtonSpinner /> : <Trash2 size={16} />}
                              {isBusy ? 'Removendo...' : 'Remover'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <ModalShell
        description="Nome e endereço já ficam disponíveis no autocomplete da OS."
        icon={Building2}
        onClose={closeModal}
        open={isModalOpen}
        title="Novo cliente"
      >
        <form className="simple-form" onSubmit={handleSubmit}>
          <label className="simple-form-field">
            <span>Nome do cliente *</span>
            <input
              name="name"
              onChange={handleChange}
              placeholder="Ex.: Cliente ABC"
              value={formData.name}
            />
          </label>

          <label className="simple-form-field">
            <span>Endereço *</span>
            <input
              name="address"
              onChange={handleChange}
              placeholder="Rua, número, cidade"
              value={formData.address}
            />
          </label>

          <button className="btn btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? <ButtonSpinner /> : null}
            {isSubmitting ? 'Salvando...' : 'Cadastrar cliente'}
          </button>
        </form>
      </ModalShell>
    </div>
  );
}
