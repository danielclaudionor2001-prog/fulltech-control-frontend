import { SignIn, useClerk } from '@clerk/clerk-react';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAppAuth } from '../auth/useAppAuth';

export default function Login() {
  const { signOut } = useClerk();
  const { appUser, clerkUser, error, isLoaded, isSignedIn, refreshCurrentUser, status } =
    useAppAuth();

  if (!isLoaded || status === 'loading') {
    return (
      <div className="page-state">
        <div className="page-state-card page-state-card-compact">
          <div className="session-spinner" aria-hidden />
          <h1>Fulltech Control</h1>
        </div>
      </div>
    );
  }

  if (isSignedIn && status === 'ready' && appUser) {
    return <Navigate to={appUser.role === 'ADMIN' ? '/admin' : '/tech'} replace />;
  }

  if (isSignedIn && status === 'pending') {
    return (
      <div className="page-state">
        <div className="page-state-card access-card">
          <div className="access-icon">
            <ShieldCheck size={28} />
          </div>
          <h1>Acesso nao autorizado</h1>
          <p>
            O login foi concluido, mas esse e-mail ainda nao foi liberado por um
            administrador para entrar na aplicacao.
          </p>
          <p className="access-email">
            {clerkUser?.primaryEmailAddress?.emailAddress || 'E-mail indisponivel'}
          </p>
          <div className="access-actions">
            <button className="btn btn-primary" onClick={() => void refreshCurrentUser()}>
              Tentar novamente
            </button>
            <button className="btn btn-outline" onClick={() => void signOut()}>
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSignedIn && status === 'error') {
    return (
      <div className="page-state">
        <div className="page-state-card access-card">
          <h1>Falha ao carregar o acesso</h1>
          <p>{error || 'Nao foi possivel validar o perfil da aplicacao.'}</p>
          <div className="access-actions">
            <button className="btn btn-primary" onClick={() => void refreshCurrentUser()}>
              Tentar novamente
            </button>
            <button className="btn btn-outline" onClick={() => void signOut()}>
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel auth-copy">
        <img
          alt="Fulltech Elevadores"
          className="auth-brand-logo"
          src="/brand/fulltech-logo.png"
        />
        <span className="auth-badge">Operacao conectada</span>
        <h1>Fulltech Control</h1>

        <div className="auth-highlights">
          <div className="auth-highlight">
            <ShieldCheck size={18} />
            <span>Acesso controlado por perfil e por e-mail autorizado</span>
          </div>
        </div>
      </div>

      <div className="auth-panel auth-form-panel">
        <SignIn
          appearance={{
            elements: {
              card: 'clerk-card',
              footerActionLink: 'clerk-link',
              formButtonPrimary: 'clerk-primary-button',
            },
          }}
          fallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        />
      </div>
    </div>
  );
}
