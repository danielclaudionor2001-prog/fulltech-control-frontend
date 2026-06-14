import { useAuth } from '@clerk/clerk-react';
import { Building2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ButtonSpinner from '../components/ButtonSpinner';
import ModalShell from '../components/ModalShell';
import SkeletonBlock from '../components/SkeletonBlock';
import { useToast } from '../components/ToastContext';
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from '../services/api';

const initialFormState = {
  address: '',
  email: '',
  name: '',
  phones: [''],
};

const normalizePhones = (phones) =>
  Array.from(new Set(phones.map((phone) => phone.trim()).filter(Boolean)));

export default function CustomersPage() {
  const { getToken } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyCustomerId, setBusyCustomerId] = useState('');
  const [pageError, setPageError] = useState('');

  const isInitialLoading = loading && customers.length === 0;
  const isEditing = Boolean(editingCustomer);

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

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      address: customer.address || '',
      email: customer.email || '',
      name: customer.name || '',
      phones: customer.phones?.length ? customer.phones : [''],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData(initialFormState);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handlePhoneChange = (index, value) => {
    setFormData((previous) => ({
      ...previous,
      phones: previous.phones.map((phone, currentIndex) =>
        currentIndex === index ? value : phone,
      ),
    }));
  };

  const addPhone = () => {
    setFormData((previous) => ({
      ...previous,
      phones: [...previous.phones, ''],
    }));
  };

  const removePhone = (index) => {
    setFormData((previous) => {
      const nextPhones = previous.phones.filter((_, currentIndex) => currentIndex !== index);
      return {
        ...previous,
        phones: nextPhones.length ? nextPhones : [''],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const phones = normalizePhones(formData.phones);
    if (!formData.name.trim() || !formData.address.trim() || phones.length === 0) {
      showWarning('Preencha nome, endereço e ao menos um telefone.');
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const payload = {
      address: formData.address,
      email: formData.email || undefined,
      name: formData.name,
      phones,
    };

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload, getToken);
      } else {
        await createCustomer(payload, getToken);
      }

      await fetchCustomers();
      showSuccess(
        editingCustomer
          ? 'Cliente atualizado com sucesso.'
          : 'Cliente cadastrado com sucesso.',
      );
      closeModal();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Falha ao salvar cliente.';
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
            Mantenha dados de contato completos para acelerar a abertura e o
            acompanhamento das ordens de serviço.
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
            onClick={openCreateModal}
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
                    <th>Telefone</th>
                    <th>E-mail</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <tr key={`customer-skeleton-${index}`}>
                      {Array.from({ length: 5 }).map((__, cellIndex) => (
                        <td className="table-loading-cell" key={cellIndex}>
                          <SkeletonBlock className="skeleton-line-short" />
                        </td>
                      ))}
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
                    <th>Telefone</th>
                    <th>E-mail</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {orderedCustomers.map((customer) => {
                    const isBusy = busyCustomerId === customer.id;
                    const phones = customer.phones?.length
                      ? customer.phones.join(' / ')
                      : 'Não informado';

                    return (
                      <tr key={customer.id}>
                        <td>
                          <div className="table-primary-cell">
                            <strong>{customer.name}</strong>
                            <small>ID: {customer.id.slice(0, 8)}</small>
                          </div>
                        </td>
                        <td>{customer.address}</td>
                        <td>{phones}</td>
                        <td>{customer.email || 'Não informado'}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn btn-secondary btn-compact"
                              disabled={isBusy}
                              onClick={() => openEditModal(customer)}
                              type="button"
                            >
                              <Pencil size={16} />
                              Editar
                            </button>

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
        description="Telefones, e-mail e endereço ficam disponíveis no fluxo da OS."
        icon={Building2}
        onClose={closeModal}
        open={isModalOpen}
        title={isEditing ? 'Editar cliente' : 'Novo cliente'}
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

          <label className="simple-form-field">
            <span>E-mail</span>
            <input
              name="email"
              onChange={handleChange}
              placeholder="cliente@empresa.com"
              type="email"
              value={formData.email}
            />
          </label>

          <div className="simple-form-field">
            <span>Telefone *</span>
            {formData.phones.map((phone, index) => (
              <div className="modal-actions" key={`phone-${index}`}>
                <input
                  onChange={(event) => handlePhoneChange(index, event.target.value)}
                  placeholder="(00) 00000-0000"
                  type="tel"
                  value={phone}
                />
                <button
                  className="btn btn-outline btn-compact"
                  disabled={formData.phones.length === 1}
                  onClick={() => removePhone(index)}
                  type="button"
                >
                  Remover
                </button>
              </div>
            ))}

            <button
              className="btn btn-secondary btn-compact"
              onClick={addPhone}
              type="button"
            >
              <Plus size={16} />
              Adicionar telefone
            </button>
          </div>

          <button className="btn btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? <ButtonSpinner /> : null}
            {isSubmitting
              ? 'Salvando...'
              : isEditing
                ? 'Salvar alterações'
                : 'Cadastrar cliente'}
          </button>
        </form>
      </ModalShell>
    </div>
  );
}
