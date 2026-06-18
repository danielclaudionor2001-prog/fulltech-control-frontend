import { useAuth } from '@clerk/clerk-react';
import {
  Clock3,
  MailPlus,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppAuth } from '../auth/useAppAuth';
import ButtonSpinner from '../components/ButtonSpinner';
import ModalShell from '../components/ModalShell';
import SelectField from '../components/SelectField';
import SkeletonBlock from '../components/SkeletonBlock';
import { useToast } from '../components/ToastContext';
import {
  createAllowedEmail,
  getAccessList,
  getLocationStatuses,
  removeAllowedEmail,
} from '../services/api';

const ROLE_OPTIONS = [
  {
    label: 'Técnico',
    value: 'TECH',
  },
  {
    label: 'Supervisor',
    value: 'SUPERVISOR',
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

const getLocationStatusMeta = (status) => {
  if (status === 'ACTIVE') {
    return {
      className: 'status-done',
      icon: Wifi,
      label: 'Ativa',
      tone: 'active',
    };
  }

  if (status === 'DISABLED') {
    return {
      className: 'status-canceled',
      icon: WifiOff,
      label: 'Desligada',
      tone: 'disabled',
    };
  }

  if (status === 'STALE') {
    return {
      className: 'status-warning',
      icon: Clock3,
      label: 'Sem sinal',
      tone: 'stale',
    };
  }

  if (status === 'UNAVAILABLE') {
    return {
      className: 'status-canceled',
      icon: WifiOff,
      label: 'Indisponivel',
      tone: 'unavailable',
    };
  }

  return {
    className: 'status-pending',
    icon: MapPin,
    label: 'Nunca enviada',
    tone: 'unknown',
  };
};

const getLocationUserName = (row) =>
  row.user?.name || row.user?.email || row.user?.clerkUserId || 'Responsavel';

const getLocationRoleLabel = (role) =>
  role === 'SUPERVISOR' ? 'Supervisor' : 'Tecnico';

export default function AccessListPage() {
  const { getToken } = useAuth();
  const { appUser, refreshCurrentUser } = useAppAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const [activeTab, setActiveTab] = useState('emails');
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [locationStatuses, setLocationStatuses] = useState([]);
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

  const locationSummary = useMemo(
    () =>
      locationStatuses.reduce(
        (summary, row) => {
          if (row.status === 'ACTIVE') {
            summary.active += 1;
          } else if (row.status === 'DISABLED') {
            summary.disabled += 1;
          } else if (row.status === 'STALE') {
            summary.stale += 1;
          } else {
            summary.unknown += 1;
          }

          summary.total += 1;
          return summary;
        },
        {
          active: 0,
          disabled: 0,
          stale: 0,
          total: 0,
          unknown: 0,
        },
      ),
    [locationStatuses],
  );

  const sortedLocationStatuses = useMemo(
    () =>
      [...locationStatuses].sort((left, right) => {
        const priority = {
          DISABLED: 0,
          STALE: 1,
          UNAVAILABLE: 2,
          UNKNOWN: 3,
          ACTIVE: 4,
        };
        const priorityDiff =
          (priority[left.status] ?? 5) - (priority[right.status] ?? 5);

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        return getLocationUserName(left).localeCompare(getLocationUserName(right));
      }),
    [locationStatuses],
  );

  const fetchAllowedEmails = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const [data, locationData] = await Promise.all([
        getAccessList(getToken),
        getLocationStatuses(getToken),
      ]);

      setAllowedEmails(data);
      setLocationStatuses(Array.isArray(locationData) ? locationData : []);
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
      if (allowedEmail.isCurrentUser) {
        await refreshCurrentUser();
      }
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

      <div className="access-tabs" role="tablist" aria-label="Areas de acesso">
        <button
          className={`access-tab ${activeTab === 'emails' ? 'active' : ''}`.trim()}
          onClick={() => setActiveTab('emails')}
          role="tab"
          type="button"
        >
          <MailPlus size={18} />
          E-mails
        </button>
        <button
          className={`access-tab ${activeTab === 'locations' ? 'active' : ''}`.trim()}
          onClick={() => setActiveTab('locations')}
          role="tab"
          type="button"
        >
          <Navigation size={18} />
          Localizacao
        </button>
      </div>

      {activeTab === 'emails' ? (
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
                    const disableRoleChange = isBusy || isProtected;
                    const disableDelete = isBusy || isCurrentUser || isProtected;

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
                            disabled={disableRoleChange}
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
                              disabled={disableDelete}
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
      ) : (
      <section className="section-card location-status-card">
        <div className="section-title">
          <Navigation size={18} />
          <div>
            <h3>Status de localizacao</h3>
            <p className="section-subtitle">
              Acompanhe o sinal de localizacao dos tecnicos e supervisores em
              campo.
            </p>
          </div>
        </div>

        <div className="location-status-summary">
          <article className="location-summary-card location-summary-active">
            <Wifi size={20} />
            <div>
              <span>Ativos</span>
              <strong>{loading ? '...' : locationSummary.active}</strong>
            </div>
          </article>
          <article className="location-summary-card location-summary-disabled">
            <WifiOff size={20} />
            <div>
              <span>Desligados</span>
              <strong>{loading ? '...' : locationSummary.disabled}</strong>
            </div>
          </article>
          <article className="location-summary-card location-summary-stale">
            <Clock3 size={20} />
            <div>
              <span>Sem sinal</span>
              <strong>{loading ? '...' : locationSummary.stale}</strong>
            </div>
          </article>
          <article className="location-summary-card location-summary-total">
            <MapPin size={20} />
            <div>
              <span>Monitorados</span>
              <strong>{loading ? '...' : locationSummary.total}</strong>
            </div>
          </article>
        </div>

        {isInitialLoading ? (
          <div className="location-status-list">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="location-status-row" key={`location-skeleton-${index}`}>
                <div className="skeleton-card-stack">
                  <SkeletonBlock className="skeleton-line-short" />
                  <SkeletonBlock className="skeleton-line" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedLocationStatuses.length === 0 ? (
          <div className="empty-state">
            <MapPin size={18} />
            <span>Nenhum tecnico ou supervisor encontrado para monitoramento.</span>
          </div>
        ) : (
          <div className="location-status-list">
            {sortedLocationStatuses.map((row) => {
              const meta = getLocationStatusMeta(row.status);
              const StatusIcon = meta.icon;
              const locationDetail =
                row.status === 'DISABLED'
                  ? `Desligada em: ${formatDateTime(row.disabledAt)}`
                  : row.status === 'STALE'
                    ? `Sem sinal desde: ${formatDateTime(row.staleSince)}`
                    : `Ultimo sinal: ${formatDateTime(row.lastLocationAt)}`;

              return (
                <article
                  className={`location-status-row location-status-${meta.tone}`}
                  key={row.user.id}
                >
                  <div className="location-user-copy">
                    <span className="user-avatar">
                      {row.user.imageUrl ? (
                        <img alt="" src={row.user.imageUrl} />
                      ) : (
                        getLocationUserName(row).slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <div>
                      <strong>{getLocationUserName(row)}</strong>
                      <small>
                        {(row.user.email || 'Sem e-mail')} •{' '}
                        {getLocationRoleLabel(row.user.role)}
                      </small>
                    </div>
                  </div>

                  <div className="location-signal-copy">
                    <span className={`status-badge ${meta.className}`}>
                      <StatusIcon size={15} />
                      {meta.label}
                    </span>
                    <small>{locationDetail}</small>
                    <small>
                      {row.lastLocationAddress ||
                        (row.lastLocationLat && row.lastLocationLng
                          ? `${Number(row.lastLocationLat).toFixed(5)}, ${Number(
                              row.lastLocationLng,
                            ).toFixed(5)}`
                          : 'Endereco ainda nao informado')}
                    </small>
                  </div>

                  <div className="location-order-copy">
                    <span>OS em andamento</span>
                    <strong>
                      {row.serviceOrder
                        ? row.serviceOrder.identifier || row.serviceOrder.id
                        : 'Nenhuma'}
                    </strong>
                    <small>{row.serviceOrder?.customer || 'Sem atendimento ativo'}</small>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      )}

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
