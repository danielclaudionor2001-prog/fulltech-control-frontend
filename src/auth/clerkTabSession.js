const TAB_SESSION_ID_KEY = 'fulltech:clerk-tab-session-id';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && Boolean(window.sessionStorage);

export const readTabSessionId = () => {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    return window.sessionStorage.getItem(TAB_SESSION_ID_KEY);
  } catch {
    return null;
  }
};

export const writeTabSessionId = (sessionId) => {
  if (!sessionId || !canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(TAB_SESSION_ID_KEY, sessionId);
  } catch {
    // Some privacy modes can block sessionStorage. Clerk still works normally.
  }
};

export const clearTabSessionId = () => {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(TAB_SESSION_ID_KEY);
  } catch {
    // Ignore storage failures caused by browser privacy settings.
  }
};

export const findSessionById = (sessions, sessionId) =>
  sessions.find((session) => session.id === sessionId) ?? null;

export const selectInitialTabSession = (client) => {
  const sessions = Array.isArray(client?.signedInSessions)
    ? client.signedInSessions
    : [];

  if (sessions.length === 0) {
    clearTabSessionId();
    return null;
  }

  const storedSession = findSessionById(sessions, readTabSessionId());

  if (storedSession) {
    return storedSession;
  }

  const lastActiveSession = findSessionById(
    sessions,
    client.lastActiveSessionId,
  );
  const selectedSession = lastActiveSession ?? sessions[0] ?? null;

  writeTabSessionId(selectedSession?.id);
  return selectedSession;
};
