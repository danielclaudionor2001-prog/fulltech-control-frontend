import { useAuth } from '@clerk/clerk-react';
import { MailPlus, Plus, RefreshCw, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppAuth } from '../auth/useAppAuth';
import ButtonSpinner from '../components/ButtonSpinner';
import ModalShell from '../components/ModalShell';
import SelectField from '../components/SelectField';
import SkeletonBlock from '../components/SkeletonBlock';
import { useToast } from '../components/ToastProvider';
import {
  createAllowedEmail,
  getAccessList,
  removeAllowedEmail,
} from '../services/api';

const ROLE_OPTIONS = [
  {
    label: 'Técnico',
    value: 'TECH',
  },
  {
    label: 'Administrador',
    value: 'ADMIN',
  },
];

const formatDateTime = (dateLike) => {
  if (!dateLike) {
    return '—';
  }

  return new Date(dateLike).toLocaleString('pt-BR');
};

export default function AccessListPage() {
  const { getToken } = useAuth();
  const { appUser } = useAppAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('TECH');
  const [roleDrafts, setRoleDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyAllowedEmailId, setBusyAllowedEmailId] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [pendingDeleteAllowedEmail, setPendingDeleteAllowedEmail] = useState(null);
  const [pageError, setPageError] = useState('');

  const isInitialLoading = loading && allowedEmails.length === 0;

  const sortedAllowedEmails = useMemo(
    () =>
      [...allowedEmails].sort((left, right) => {
        if (left.role !== right.role) {
          return left.role.localeCompare(right.role);
        }

        return left.email.localeCompare(right.email);
      }),
    [allowedEmails],
  );

  const accessRows = useMemo(() => {
    const currentEmail = appUser?.email?.trim().toLowerCase();
    const rows = sortedAllowedEmails.map((allowedEmail) => ({
      ...allowedEmail,
      isCurrentUser:
        Boolean(currentEmail) &&
        allowedEmail.email.trim().toLowerCase() === currentEmail,
    }));

    if (!appUser?.email || rows.some((row) => row.isCurrentUser)) {
      return rows;
    }

    return [
      {
        createdAt: null,
        email: appUser.email,
        id: `current-user-${appUser.id}`,
        isCurrentUser: true,
        isSyntheticCurrentUser: true,
        role: appUser.role,
        updatedAt: null,
      },
      ...rows,
    ];
  }, [appUser, sortedAllowedEmails]);

  const fetchAllowedEmails = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const data = await getAccessList(getToken);
      setAllowedEmails(data);
      setRoleDrafts(
        Object.fromEntries(data.map((allowedEmail) => [allowedEmail.id, allowedEmail.role])),
      );
    } catch (fetchError) {
      console.error('Failed to fetch access list', fetchError);
      setPageError('Não foi possível carregar os e-mails autorizados.');
      throw fetchError;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchAllowedEmails().catch(() => {});
  }, [fetchAllowedEmails]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await fetchAllowedEmails();
      showSuccess('Lista de acessos atualizada.');
    } catch {
      showError('Não foi possível atualizar os acessos agora.');
    } finally {
      setRefreshing(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEmail('');
    setRole('TECH');
  };

  const closeDeleteModal = () => {
    if (busyAllowedEmailId) {
      return;
    }

    setPendingDeleteAllowedEmail(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      showWarning('Informe o e-mail que será autorizado.');
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createAllowedEmail(email, role, getToken);
      await fetchAllowedEmails();
      showSuccess('Acesso salvo com sucesso.');
      closeModal();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Falha ao autorizar o e-mail.';
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRole = async (allowedEmail) => {
    const nextRole = roleDrafts[allowedEmail.id];
    if (!nextRole || nextRole === allowedEmail.role) {
      return;
    }

    setBusyAllowedEmailId(allowedEmail.id);
    setBusyAction('save');
    setPageError('');

    try {
      await createAllowedEmail(allowedEmail.email, nextRole, getToken);
      await fetchAllowedEmails();
      showSuccess('Perfil atualizado com sucesso.');
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Falha ao atualizar o perfil.';
      setPageError(message);
      showError(message);
    } finally {
      setBusyAllowedEmailId('');
      setBusyAction('');
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteAllowedEmail) {
      return;
    }

    setBusyAllowedEmailId(pendingDeleteAllowedEmail.id);
    setBusyAction('delete');
    setPageError('');

    try {
      await removeAllowedEmail(pendingDeleteAllowedEmail.id, getToken);
      await fetchAllowedEmails();
      setPendingDeleteAllowedEmail(null);
      showSuccess('Usuário removido do banco e do Clerk.');
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : 'Falha ao remover o acesso.';
      setPageError(message);
      showError(message);
    } finally {
      setBusyAllowedEmailId('');
      setBusyAction('');
    }
  };

  return (
    <div className="dashboard-stack">
      <div className="page-hero">
        <div>
          <span className="page-eyebrow">Segurança</span>
          <h1 className="page-title">Acessos por e-mail</h1>
          <p className="page-subtitle">
            Controle quem pode entrar no sistema, defina o perfil correto e
            acompanhe a lista de acessos de forma mais profissional.
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
            Novo usuário
          </button>
        </div>
      </div>

      {pageError ? <div className="inline-error">{pageError}</div> : null}

      <section className="section-card access-table-card">
        <div className="section-title">
          <MailPlus size={18} />
          <div>
            <h3>E-mails autorizados</h3>
            <p className="section-subtitle">
              Edite o perfil, consulte datas e remova acessos diretamente na
              grade.
            </p>
          </div>
        </div>

        {isInitialLoading ? (
          <div className="data-table-shell">
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>Criado em</th>
                    <th>Atualizado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <tr key={`access-skeleton-${index}`}>
                      <td className="table-loading-cell">
                        <div className="table-primary-cell">
                          <SkeletonBlock className="skeleton-line-short" />
                          <SkeletonBlock className="skeleton-table-note" />
                        </div>
                      </td>
                      <td className="table-loading-cell">
                        <SkeletonBlock className="skeleton-select" />
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
                          <SkeletonBlock className="skeleton-button" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : accessRows.length === 0 ? (
          <div className="table-empty">Nenhum e-mail autorizado ainda.</div>
        ) : (
          <div className="data-table-shell">
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>Criado em</th>
                    <th>Atualizado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {accessRows.map((allowedEmail) => {
                    const currentDraftRole =
                      roleDrafts[allowedEmail.id] || allowedEmail.role;
                    const isBusy = busyAllowedEmailId === allowedEmail.id;
                    const isCurrentUser = Boolean(allowedEmail.isCurrentUser);
                    const isProtected = Boolean(allowedEmail.isProtected);
                    const disableRowActions = isBusy || isCurrentUser || isProtected;

                    return (
                      <tr key={allowedEmail.id}>
                        <td>
                          <div className="table-primary-cell">
                            <strong>{allowedEmail.email}</strong>
                            <small>
                              {isProtected
                                ? 'Administrador principal do ambiente'
                                : isCurrentUser
                                  ? 'Seu usuário atual'
                                  : `ID: ${allowedEmail.id.slice(0, 8)}`}
                            </small>
                          </div>
                        </td>
                        <td>
                          <SelectField
                            buttonClassName="table-select-trigger"
                            className="table-select"
                            disabled={disableRowActions}
                            onChange={(nextRole) =>
                              setRoleDrafts((previous) => ({
                                ...previous,
                                [allowedEmail.id]: nextRole,
                              }))
                            }
                            options={ROLE_OPTIONS}
                            value={currentDraftRole}
                          />
                        </td>
                        <td>{formatDateTime(allowedEmail.createdAt)}</td>
                        <td>{formatDateTime(allowedEmail.updatedAt)}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn btn-secondary btn-compact"
                              disabled={
                                isBusy ||
                                isCurrentUser ||
                                isProtected ||
                                currentDraftRole === allowedEmail.role
                              }
                              onClick={() => void handleSaveRole(allowedEmail)}
                              type="button"
                            >
                              {isBusy && busyAction === 'save' ? <ButtonSpinner /> : null}
                              {isBusy && busyAction === 'save'
                                ? 'Salvando...'
                                : 'Salvar'}
                            </button>

                            <button
                              className="btn btn-outline btn-compact"
                              disabled={disableRowActions}
                              onClick={() => setPendingDeleteAllowedEmail(allowedEmail)}
                              type="button"
                            >
                              <Trash2 size={16} />
                              Remover
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
        description="Se o e-mail já existir na lista, salvar novamente atualiza o perfil."
        icon={MailPlus}
        onClose={closeModal}
        open={isModalOpen}
        title="Novo usuário"
      >
        <form className="simple-form" onSubmit={handleSubmit}>
          <label className="simple-form-field">
            <span>E-mail permitido *</span>
            <input
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tecnico@empresa.com"
              type="email"
              value={email}
            />
          </label>

          <label className="simple-form-field">
            <span>Perfil de acesso *</span>
            <SelectField onChange={setRole} options={ROLE_OPTIONS} value={role} />
          </label>

          <button className="btn btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? <ButtonSpinner /> : null}
            {isSubmitting ? 'Salvando...' : 'Salvar acesso'}
          </button>
        </form>
      </ModalShell>

      <ModalShell
        description="Essa ação remove o acesso da aplicação e apaga o cadastro no Clerk, mas as ordens de serviço continuarão no sistema."
        icon={Trash2}
        onClose={closeDeleteModal}
        open={Boolean(pendingDeleteAllowedEmail)}
        title="Excluir usuário"
      >
        <div className="simple-form">
          <div className="inline-error">
            <strong>{pendingDeleteAllowedEmail?.email}</strong>
            <br />
            Ao confirmar, o acesso será removido do banco e do Clerk. As OS já
            registradas serão mantidas. Essa ação não pode ser desfeita.
          </div>

          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              disabled={Boolean(busyAllowedEmailId)}
              onClick={closeDeleteModal}
              type="button"
            >
              Cancelar
            </button>

            <button
              className="btn btn-outline"
              disabled={Boolean(busyAllowedEmailId)}
              onClick={() => void handleDelete()}
              type="button"
            >
              {busyAllowedEmailId && busyAction === 'delete' ? <ButtonSpinner /> : null}
              {busyAllowedEmailId && busyAction === 'delete'
                ? 'Excluindo...'
                : 'Excluir usuário'}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
