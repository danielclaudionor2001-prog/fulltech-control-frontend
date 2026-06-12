import { SignUp } from '@clerk/clerk-react';
import { ShieldCheck } from 'lucide-react';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppAuth } from '../auth/useAppAuth';
import BrandLoader from '../components/BrandLoader';

export default function SignUpPage() {
  const { appUser, isLoaded, isSignedIn, status } = useAppAuth();

  if (!isLoaded || status === 'loading') {
    return (
      <div className="page-state">
        <div className="page-state-card">
          <BrandLoader label="Preparando cadastro..." />
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    if (status === 'ready' && appUser) {
      return <Navigate replace to={appUser.role === 'ADMIN' ? '/admin' : '/tech'} />;
    }

    return <Navigate replace to="/" />;
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
        <h1>Fulltech Control</h1>

        <div className="auth-highlights">
          <div className="auth-highlight">
            <ShieldCheck size={18} />
            <span>Acesso controlado por perfil e por e-mail autorizado</span>
          </div>
        </div>
      </div>

      <div className="auth-panel auth-form-panel">
        <SignUp
          appearance={{
            elements: {
              card: 'clerk-card',
              footerActionLink: 'clerk-link',
              formButtonPrimary: 'clerk-primary-button',
            },
          }}
          fallbackRedirectUrl="/"
          path="/sign-up"
          routing="path"
          signInFallbackRedirectUrl="/"
          signInUrl="/"
        />
      </div>
    </div>
  );
}
