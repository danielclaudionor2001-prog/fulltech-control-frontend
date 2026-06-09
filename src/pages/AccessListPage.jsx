import { useAuth } from '@clerk/clerk-react';
import React, { useCallback, useEffect, useState } from 'react';
import { MailPlus, RefreshCw, Trash2 } from 'lucide-react';
import {
  createAllowedEmail,
  getAccessList,
  removeAllowedEmail,
} from '../services/api';

export default function AccessListPage() {
  const { getToken } = useAuth();
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchAllowedEmails = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAccessList(getToken);
      setAllowedEmails(data);
    } catch (fetchError) {
      console.error('Failed to fetch access list', fetchError);
      setError('Nao foi possivel carregar os e-mails autorizados.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchAllowedEmails();
  }, [fetchAllowedEmails]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim() || isSubmitting) {
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await createAllowedEmail(email, getToken);
      setEmail('');
      await fetchAllowedEmails();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Falha ao autorizar e-mail.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    await removeAllowedEmail(id, getToken);
    await fetchAllowedEmails();
  };

  return (
    <div className="dashboard-stack">
      <div className="dashboard-header">
        <div>
          <h2>Acessos por e-mail</h2>
          <p className="section-subtitle">
            Somente e-mails cadastrados aqui poderao entrar como tecnico na
            aplicacao.
          </p>
        </div>

        <button className="btn btn-outline" onClick={() => void fetchAllowedEmails()} title="Atualizar">
          <RefreshCw size={20} />
        </button>
      </div>

      <section className="section-card">
        <div className="section-title">
          <MailPlus size={18} />
          <h3>Autorizar novo e-mail</h3>
        </div>

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

          {error ? <div className="inline-error">{error}</div> : null}

          <button className="btn btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Salvando...' : 'Autorizar acesso'}
          </button>
        </form>
      </section>

      <section className="section-card">
        <h3>E-mails autorizados</h3>
        {loading ? (
          <p>Carregando e-mails...</p>
        ) : allowedEmails.length === 0 ? (
          <p>Nenhum e-mail autorizado ainda.</p>
        ) : (
          <div className="user-list">
            {allowedEmails.map((allowedEmail) => (
              <div className="user-item" key={allowedEmail.id}>
                <div>
                  <strong>{allowedEmail.email}</strong>
                  <p>Autorizado para entrar como tecnico.</p>
                </div>

                <button className="btn btn-outline" onClick={() => void handleDelete(allowedEmail.id)}>
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
