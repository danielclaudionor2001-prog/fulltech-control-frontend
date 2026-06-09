import { useAuth, useUser } from '@clerk/clerk-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppAuthContext } from './AppAuthContext';
import { getCurrentUser } from '../services/api';

function isPendingError(message) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('pending approval') ||
    normalized.includes('inactive') ||
    normalized.includes('403') ||
    normalized.includes('not authorized')
  );
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
      const message =
        error instanceof Error ? error.message : 'Falha ao carregar o acesso.';

      setState({
        appUser: null,
        error: message,
        resolvedUserId: user.id,
        status: isPendingError(message) ? 'pending' : 'error',
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

        const message =
          error instanceof Error ? error.message : 'Falha ao carregar o acesso.';

        setState({
          appUser: null,
          error: message,
          resolvedUserId: user.id,
          status: isPendingError(message) ? 'pending' : 'error',
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
