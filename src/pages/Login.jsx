import { SignIn, useClerk } from '@clerk/clerk-react';
import { ShieldCheck } from 'lucide-react';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppAuth } from '../auth/useAppAuth';
import BrandLoader from '../components/BrandLoader';

export default function Login() {
  const { signOut } = useClerk();
  const { appUser, clerkUser, isLoaded, isSignedIn, refreshCurrentUser, status } =
    useAppAuth();

  if (!isLoaded || status === 'loading') {
    return (
      <div className="page-state">
        <div className="page-state-card">
          <BrandLoader />
        </div>
      </div>
    );
  }

  if (isSignedIn && status === 'ready' && appUser) {
    return <Navigate replace to={appUser.role === 'ADMIN' ? '/admin' : '/tech'} />;
  }

  if (isSignedIn && status === 'pending') {
    return (
      <div className="page-state">
        <div className="page-state-card access-card">
          <div className="access-icon">
            <ShieldCheck size={28} />
          </div>
          <h1>Acesso não autorizado</h1>
          <p>
            O login foi concluído, mas esse e-mail ainda não foi liberado por um
            administrador para entrar na aplicação.
          </p>
          <p className="access-email">
            {clerkUser?.primaryEmailAddress?.emailAddress || 'E-mail indisponível'}
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
          <p>
            Não foi possível validar sua liberação agora. Tente novamente em
            instantes ou saia e entre de novo.
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

  return (
    <div className="auth-shell">
      <div className="auth-panel auth-copy">
        <img
          alt="Fulltech Elevadores"
          className="auth-brand-logo"
          src="/brand/fulltech-wordmark.png"
        />
        <span className="auth-badge">Operação conectada</span>

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
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
}
