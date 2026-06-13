import { useAuth, useSessionList } from '@clerk/clerk-react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  clearTabSessionId,
  findSessionById,
  readTabSessionId,
  writeTabSessionId,
} from './clerkTabSession';

export function ClerkTabSessionBoundary({ children }) {
  const { isLoaded: isAuthLoaded, isSignedIn, sessionId } = useAuth();
  const sessionList = useSessionList();
  const isRestoringRef = useRef(false);

  const sessions = useMemo(
    () => (sessionList.isLoaded ? sessionList.sessions : []),
    [sessionList],
  );
  const setActive = sessionList.isLoaded ? sessionList.setActive : null;

  const restoreTabSession = useCallback(async () => {
    if (
      !isAuthLoaded ||
      !sessionList.isLoaded ||
      !setActive ||
      !isSignedIn
    ) {
      return false;
    }

    const storedSessionId = readTabSessionId();

    if (!storedSessionId) {
      writeTabSessionId(sessionId);
      return false;
    }

    if (!sessionId || storedSessionId === sessionId) {
      return false;
    }

    const targetSession = findSessionById(sessions, storedSessionId);

    if (!targetSession) {
      writeTabSessionId(sessionId);
      return false;
    }

    isRestoringRef.current = true;

    try {
      await setActive({ session: targetSession.id });
      return true;
    } catch {
      return false;
    } finally {
      isRestoringRef.current = false;
    }
  }, [
    isAuthLoaded,
    isSignedIn,
    sessionId,
    sessionList.isLoaded,
    sessions,
    setActive,
  ]);

  useEffect(() => {
    if (!isAuthLoaded) {
      return;
    }

    if (!isSignedIn || !sessionId) {
      if (typeof document === 'undefined' || document.hasFocus()) {
        clearTabSessionId();
      }

      return;
    }

    if (!readTabSessionId()) {
      writeTabSessionId(sessionId);
    }
  }, [isAuthLoaded, isSignedIn, sessionId]);

  useEffect(() => {
    if (!isAuthLoaded || !sessionList.isLoaded) {
      return undefined;
    }

    const restoreIfFocused = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
      ) {
        void restoreTabSession();
      }
    };

    const handleFocus = () => {
      void restoreTabSession();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', restoreIfFocused);
    restoreIfFocused();

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', restoreIfFocused);
    };
  }, [isAuthLoaded, restoreTabSession, sessionList.isLoaded]);

  return (
    <React.Fragment key={sessionId || 'signed-out'}>{children}</React.Fragment>
  );
}
