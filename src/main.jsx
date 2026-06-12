import { ClerkProvider } from '@clerk/clerk-react';
import { ptBR } from '@clerk/localizations';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AppAuthProvider } from './auth/AppAuthProvider';
import './index.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is required');
}

const clerkLocalization = {
  ...ptBR,
  signUp: {
    ...ptBR.signUp,
    continue: {
      ...ptBR.signUp?.continue,
      actionLink: 'Entrar',
      actionText: 'Ja possui uma conta?',
      subtitle: 'para continuar no Fulltech Control',
      title: 'Preencha os campos ausentes',
    },
    start: {
      ...ptBR.signUp?.start,
      actionLink: 'Entrar',
      actionText: 'Ja possui uma conta?',
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
      publishableKey={clerkPublishableKey}
      afterSignOutUrl="/"
      localization={clerkLocalization}
    >
      <BrowserRouter>
        <AppAuthProvider>
          <App />
        </AppAuthProvider>
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
