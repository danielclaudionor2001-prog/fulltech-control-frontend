import { useAuth, useUser } from '@clerk/clerk-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppAuthContext } from './AppAuthContext';
import { getCurrentUser } from '../services/api';

function normalizeAccessError(error) {
  const rawMessage =
    error instanceof Error ? error.message : 'Falha ao carregar o acesso.';
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes('invalid clerk token') ||
    normalized.includes('"unauthorized"') ||
    normalized.includes('"statuscode":401') ||
    normalized.includes('401')
  ) {
    return {
      message:
        'Sua sessão expirou ou não pode ser validada. Entre novamente para continuar.',
      status: 'error',
    };
  }

  if (
    normalized.includes('first and last name') ||
    normalized.includes('nome e sobrenome') ||
    normalized.includes('complete first') ||
    normalized.includes('complete seu perfil')
  ) {
    return {
      message:
        'Complete nome e sobrenome no cadastro do Clerk antes de acessar o sistema.',
      status: 'error',
    };
  }

  if (
    normalized.includes('pending approval') ||
    normalized.includes('inactive') ||
    normalized.includes('403') ||
    normalized.includes('not authorized')
  ) {
    return {
      message:
        'O login foi concluído, mas esse e-mail ainda não foi liberado por um administrador.',
      status: 'pending',
    };
  }

  return {
    message: 'Não foi possível validar seu acesso agora. Tente novamente em instantes.',
    status: 'error',
  };
}

const initialResolvedState = {
  appUser: null,
  error: '',
  resolvedUserId: null,
  status: 'idle',
};

export function AppAuthProvider({ children }) {
  const { getToken, isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const [state, setState] = useState(initialResolvedState);

  const resolveCurrentUser = useCallback(async () => {
    if (!isSignedIn || !user?.id) {
      return;
    }

    try {
      const appUser = await getCurrentUser(getToken);
      setState({
        appUser,
        error: '',
        resolvedUserId: user.id,
        status: 'ready',
      });
    } catch (error) {
      const normalizedError = normalizeAccessError(error);

      setState({
        appUser: null,
        error: normalizedError.message,
        resolvedUserId: user.id,
        status: normalizedError.status,
      });
    }
  }, [getToken, isSignedIn, user]);

  useEffect(() => {
    if (!isAuthLoaded || !isUserLoaded || !isSignedIn || !user?.id) {
      return;
    }

    let isCancelled = false;

    const load = async () => {
      try {
        const appUser = await getCurrentUser(getToken);
        if (isCancelled) {
          return;
        }

        setState({
          appUser,
          error: '',
          resolvedUserId: user.id,
          status: 'ready',
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const normalizedError = normalizeAccessError(error);

        setState({
          appUser: null,
          error: normalizedError.message,
          resolvedUserId: user.id,
          status: normalizedError.status,
        });
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [getToken, isAuthLoaded, isSignedIn, isUserLoaded, user?.id]);

  const status = useMemo(() => {
    if (!isAuthLoaded || !isUserLoaded) {
      return 'loading';
    }

    if (!isSignedIn) {
      return 'signed_out';
    }

    if (state.resolvedUserId !== user?.id) {
      return 'loading';
    }

    return state.status;
  }, [isAuthLoaded, isSignedIn, isUserLoaded, state.resolvedUserId, state.status, user?.id]);

  const value = useMemo(
    () => ({
      appUser: status === 'ready' ? state.appUser : null,
      clerkUser: user ?? null,
      error: status === 'error' || status === 'pending' ? state.error : '',
      isLoaded: isAuthLoaded && isUserLoaded,
      isSignedIn: Boolean(isSignedIn),
      refreshCurrentUser: resolveCurrentUser,
      status,
    }),
    [
      isAuthLoaded,
      isSignedIn,
      isUserLoaded,
      resolveCurrentUser,
      state.appUser,
      state.error,
      status,
      user,
    ],
  );

  return (
    <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
  );
}
