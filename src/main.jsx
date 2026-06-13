import { ClerkProvider } from '@clerk/clerk-react';
import { ptBR } from '@clerk/localizations';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AppAuthProvider } from './auth/AppAuthProvider';
import { ClerkTabSessionBoundary } from './auth/ClerkTabSessionBoundary.jsx';
import { selectInitialTabSession } from './auth/clerkTabSession';
import { ToastProvider } from './components/ToastProvider';
import './index.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is required');
}

const clerkLocalization = {
  ...ptBR,
  dividerText: 'ou',
  formButtonPrimary: 'Continuar',
  formFieldLabel__emailAddress: 'E-mail',
  formFieldLabel__password: 'Senha',
  formFieldInputPlaceholder__emailAddress: 'Digite seu e-mail',
  formFieldInputPlaceholder__password: 'Digite sua senha',
  formFieldInputPlaceholder__signUpPassword: 'Crie uma senha',
  signIn: {
    ...ptBR.signIn,
    start: {
      ...ptBR.signIn?.start,
      actionLink: 'Cadastre-se',
      actionText: 'Ainda não possui uma conta?',
      subtitle: 'Entre para continuar no Fulltech Control',
      title: 'Entrar',
    },
  },
  signUp: {
    ...ptBR.signUp,
    continue: {
      ...ptBR.signUp?.continue,
      actionLink: 'Entrar',
      actionText: 'Já possui uma conta?',
      subtitle: 'para continuar no Fulltech Control',
      title: 'Preencha os campos ausentes',
    },
    start: {
      ...ptBR.signUp?.start,
      actionLink: 'Entrar',
      actionText: 'Já possui uma conta?',
      subtitle: 'para continuar no Fulltech Control',
      subtitleCombined: 'para continuar no Fulltech Control',
      title: 'Criar sua conta',
      titleCombined: 'Criar sua conta',
    },
  },
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider
      afterSignOutUrl="/"
      localization={clerkLocalization}
      publishableKey={clerkPublishableKey}
      selectInitialSession={selectInitialTabSession}
      signInFallbackRedirectUrl="/"
      signInUrl="/"
      signUpFallbackRedirectUrl="/"
      signUpUrl="/sign-up"
    >
      <ClerkTabSessionBoundary>
        <BrowserRouter>
          <ToastProvider>
            <AppAuthProvider>
              <App />
            </AppAuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </ClerkTabSessionBoundary>
    </ClerkProvider>
  </StrictMode>,
);
