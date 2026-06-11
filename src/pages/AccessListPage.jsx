import { useAuth } from '@clerk/clerk-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MailPlus, Plus, RefreshCw, Trash2 } from 'lucide-react';
import ModalShell from '../components/ModalShell';
import SelectField from '../components/SelectField';
import SkeletonBlock from '../components/SkeletonBlock';
import { useAppAuth } from '../auth/useAppAuth';
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
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('TECH');
  const [roleDrafts, setRoleDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyAllowedEmailId, setBusyAllowedEmailId] = useState('');
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');

  const isInitialLoading = loading && allowedEmails.length === 0;

  const sortedAllowedEmails = useMemo(
    () => [...allowedEmails].sort((left, right) => left.email.localeCompare(right.email)),
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
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchAllowedEmails();
  }, [fetchAllowedEmails]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEmail('');
    setRole('TECH');
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim() || isSubmitting) {
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      await createAllowedEmail(email, role, getToken);
      await fetchAllowedEmails();
      closeModal();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Falha ao autorizar e-mail.';
      setFormError(message);
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
    setPageError('');

    try {
      await createAllowedEmail(allowedEmail.email, nextRole, getToken);
      await fetchAllowedEmails();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Falha ao atualizar o perfil.';
      setPageError(message);
    } finally {
      setBusyAllowedEmailId('');
    }
  };

  const handleDelete = async (id) => {
    setBusyAllowedEmailId(id);
    setPageError('');

    try {
      await removeAllowedEmail(id, getToken);
      await fetchAllowedEmails();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : 'Falha ao remover o acesso.';
      setPageError(message);
    } finally {
      setBusyAllowedEmailId('');
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
            onClick={() => void fetchAllowedEmails()}
            title="Atualizar"
            type="button"
          >
            <RefreshCw size={20} />
            Atualizar
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

                    return (
                      <tr key={allowedEmail.id}>
                        <td>
                          <div className="table-primary-cell">
                            <strong>{allowedEmail.email}</strong>
                            <small>
                              {isCurrentUser
                                ? 'Seu usuário atual'
                                : `ID: ${allowedEmail.id.slice(0, 8)}`}
                            </small>
                          </div>
                        </td>
                        <td>
                          <SelectField
                            buttonClassName="table-select-trigger"
                            className="table-select"
                            disabled={isBusy || isCurrentUser}
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
                                currentDraftRole === allowedEmail.role
                              }
                              onClick={() => void handleSaveRole(allowedEmail)}
                              type="button"
                            >
                              {isBusy ? 'Salvando...' : 'Salvar'}
                            </button>

                            <button
                              className="btn btn-outline btn-compact"
                              disabled={isBusy || isCurrentUser}
                              onClick={() => void handleDelete(allowedEmail.id)}
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
            <span>E-mail permitido</span>
            <input
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tecnico@empresa.com"
              type="email"
              value={email}
            />
          </label>

          <label className="simple-form-field">
            <span>Perfil de acesso</span>
            <SelectField
              options={ROLE_OPTIONS}
              onChange={setRole}
              value={role}
            />
          </label>

          {formError ? <div className="inline-error">{formError}</div> : null}

          <button className="btn btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Salvando...' : 'Salvar acesso'}
          </button>
        </form>
      </ModalShell>
    </div>
  );
}
