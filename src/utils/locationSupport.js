const DEFAULT_LOCATION_TIMEOUT = 12000;
const RECENT_LOCATION_FALLBACK_MAX_AGE = 60000;
const RECENT_LOCATION_FALLBACK_TIMEOUT = 5000;
const LOCATION_DEBUG_LOG_KEY = 'fulltech-location-debug-log';
const LOCATION_DEBUG_LOG_LIMIT = 60;
const LOCATION_DEBUG_PREFIX = '[Fulltech Location]';
const APP_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID || 'development';

const IOS_STEPS = [
  'Toque no cadeado ou no ícone ao lado do endereço do site.',
  'Abra a opção de localização deste site.',
  'Permita o acesso à sua localização e volte para a página.',
];

const ANDROID_STEPS = [
  'Abra as permissões do site no navegador.',
  'Ative a localização para este site.',
  'Se necessário, confira se o GPS do aparelho também está ligado.',
];

const DESKTOP_CHROME_STEPS = [
  'Clique no cadeado ao lado do endereço do site.',
  'Na opção Localização, selecione Permitir.',
  'Recarregue a página e tente novamente.',
];

const DESKTOP_FIREFOX_STEPS = [
  'Clique no ícone de permissões ao lado do endereço.',
  'Permita o acesso à localização deste site.',
  'Atualize a página para aplicar a permissão.',
];

const DESKTOP_SAFARI_STEPS = [
  'Abra o menu Safari e depois Configurações para este site.',
  'Permita o acesso à localização.',
  'Atualize a página e tente novamente.',
];

const DESKTOP_EDGE_STEPS = [
  'Clique no cadeado ao lado do endereço.',
  'Localize a permissão de localização.',
  'Selecione Permitir e recarregue a página.',
];

export function buildGoogleMapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function formatCoordinateAddress(lat, lng) {
  return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
}

export function detectLocationSupportContext() {
  const userAgent = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isFirefox = /Firefox|FxiOS/i.test(userAgent);
  const isEdge = /Edg/i.test(userAgent);
  const isChrome = /Chrome|CriOS/i.test(userAgent) && !isEdge;
  const isSafari =
    /Safari/i.test(userAgent) && !/Chrome|CriOS|Edg|OPR|FxiOS/i.test(userAgent);
  const isMobile =
    isIOS ||
    isAndroid ||
    window.matchMedia?.('(max-width: 900px)').matches ||
    false;

  let browserName = 'navegador';
  if (isSafari) {
    browserName = 'Safari';
  } else if (isEdge) {
    browserName = 'Edge';
  } else if (isFirefox) {
    browserName = 'Firefox';
  } else if (isChrome) {
    browserName = 'Chrome';
  }

  return {
    browserName,
    isAndroid,
    isChrome,
    isDesktop: !isMobile,
    isEdge,
    isFirefox,
    isIOS,
    isMobile,
    isSafari,
  };
}

function sanitizeLocationOptions(options) {
  return {
    enableHighAccuracy: Boolean(options.enableHighAccuracy),
    maximumAge: options.maximumAge,
    timeout: options.timeout,
  };
}

function getGeolocationErrorName(code) {
  if (code === 1) {
    return 'PERMISSION_DENIED';
  }

  if (code === 2) {
    return 'POSITION_UNAVAILABLE';
  }

  if (code === 3) {
    return 'TIMEOUT';
  }

  return 'UNKNOWN';
}

function summarizeGeolocationError(error) {
  return {
    code: error?.code ?? null,
    message: error?.message || String(error || 'Unknown geolocation error'),
    name: getGeolocationErrorName(error?.code),
  };
}

function summarizePosition(position) {
  const latitude = Number(position?.coords?.latitude);
  const longitude = Number(position?.coords?.longitude);
  const timestamp = Number(position?.timestamp);

  return {
    accuracyMeters: position?.coords?.accuracy ?? null,
    altitudeAccuracyMeters: position?.coords?.altitudeAccuracy ?? null,
    heading: position?.coords?.heading ?? null,
    hasCoordinates: Number.isFinite(latitude) && Number.isFinite(longitude),
    latitudeApprox: Number.isFinite(latitude) ? Number(latitude.toFixed(4)) : null,
    longitudeApprox: Number.isFinite(longitude)
      ? Number(longitude.toFixed(4))
      : null,
    positionAgeMs: Number.isFinite(timestamp) ? Date.now() - timestamp : null,
    speed: position?.coords?.speed ?? null,
    timestamp: Number.isFinite(timestamp)
      ? new Date(timestamp).toISOString()
      : null,
  };
}

async function readCacheState() {
  const serviceWorkerSupported = Boolean(navigator.serviceWorker);
  let cacheKeys = [];
  let serviceWorkerRegistration = null;

  if (window.caches?.keys) {
    try {
      cacheKeys = await window.caches.keys();
    } catch {
      cacheKeys = ['cache-keys-unavailable'];
    }
  }

  if (navigator.serviceWorker?.getRegistration) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();

      serviceWorkerRegistration = registration
        ? {
            activeScript: registration.active?.scriptURL ?? null,
            installingScript: registration.installing?.scriptURL ?? null,
            scope: registration.scope,
            waitingScript: registration.waiting?.scriptURL ?? null,
          }
        : null;
    } catch {
      serviceWorkerRegistration = {
        error: 'service-worker-registration-unavailable',
      };
    }
  }

  return {
    appBuildId: APP_BUILD_ID,
    cacheKeys,
    cacheSupported: Boolean(window.caches),
    serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
    serviceWorkerControllerScript:
      navigator.serviceWorker?.controller?.scriptURL ?? null,
    serviceWorkerRegistration,
    serviceWorkerSupported,
  };
}

function getLocationRuntimeContext() {
  const supportContext = detectLocationSupportContext();

  return {
    appBuildId: APP_BUILD_ID,
    browserName: supportContext.browserName,
    geolocationSupported: Boolean(navigator.geolocation),
    isAndroid: supportContext.isAndroid,
    isIOS: supportContext.isIOS,
    isMobile: supportContext.isMobile,
    isSecureContext: Boolean(window.isSecureContext),
    origin: window.location.origin,
    pathname: window.location.pathname,
    permissionsApiSupported: Boolean(navigator.permissions?.query),
    protocol: window.location.protocol,
    userAgent: navigator.userAgent || '',
    visibilityState: document.visibilityState,
  };
}

async function readLocationPermissionState() {
  if (!navigator.permissions?.query) {
    return 'permissions-api-unavailable';
  }

  try {
    const permission = await navigator.permissions.query({
      name: 'geolocation',
    });
    return permission.state;
  } catch (error) {
    return `permission-query-failed: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

function appendLocationDebugLog(entry) {
  try {
    const previous = JSON.parse(
      window.localStorage.getItem(LOCATION_DEBUG_LOG_KEY) || '[]',
    );
    const next = [...previous, entry].slice(-LOCATION_DEBUG_LOG_LIMIT);
    window.localStorage.setItem(LOCATION_DEBUG_LOG_KEY, JSON.stringify(next));
    window.fulltechLocationLogs = () =>
      JSON.parse(window.localStorage.getItem(LOCATION_DEBUG_LOG_KEY) || '[]');
    window.fulltechClearLocationLogs = () =>
      window.localStorage.removeItem(LOCATION_DEBUG_LOG_KEY);
  } catch {
    // Diagnostic logging must never block the location flow.
  }
}

function buildLocationDebugMessage(eventName, payload) {
  if (eventName === 'request-start') {
    return `Tentativa de localizacao iniciada (${payload.source}). Permissao: ${payload.permissionState}. Build: ${payload.cache?.appBuildId ?? APP_BUILD_ID}.`;
  }

  if (eventName === 'request-success') {
    return `Localizacao capturada (${payload.source})${
      payload.usedFallback ? ' usando posicao recente do navegador' : ''
    }.`;
  }

  if (eventName === 'request-primary-failed') {
    return `Falha na leitura principal da localizacao (${payload.error?.name ?? 'UNKNOWN'}).`;
  }

  if (eventName === 'request-fallback-start') {
    return 'Tentando usar uma localizacao recente armazenada pelo navegador.';
  }

  if (eventName === 'request-fallback-failed') {
    return `Falha tambem na localizacao recente (${payload.error?.name ?? 'UNKNOWN'}).`;
  }

  if (eventName === 'request-failed') {
    return `Nao foi possivel capturar localizacao (${payload.error?.name ?? 'UNKNOWN'}).`;
  }

  return eventName;
}

function logLocationDebug(level, eventName, payload = {}) {
  const entry = {
    event: eventName,
    level,
    message: buildLocationDebugMessage(eventName, payload),
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const logger = console[level] || console.info;

  appendLocationDebugLog(entry);
  logger(`${LOCATION_DEBUG_PREFIX} ${eventName}`, entry);
  return entry;
}

function reportLocationDebug(debugReporter, entry) {
  if (typeof debugReporter !== 'function') {
    return;
  }

  try {
    void debugReporter(entry);
  } catch (error) {
    console.warn(`${LOCATION_DEBUG_PREFIX} reporter failed`, error);
  }
}

export function buildLocationGuidance() {
  const context = detectLocationSupportContext();

  if (context.isMobile && context.isSafari) {
    return {
      steps: IOS_STEPS,
      title: 'Permita a localização para continuar',
    };
  }

  if (context.isMobile) {
    return {
      steps: ANDROID_STEPS,
      title: 'Permita a localização para continuar',
    };
  }

  if (context.isSafari) {
    return {
      steps: DESKTOP_SAFARI_STEPS,
      title: `Permita a localização no ${context.browserName}`,
    };
  }

  if (context.isFirefox) {
    return {
      steps: DESKTOP_FIREFOX_STEPS,
      title: `Permita a localização no ${context.browserName}`,
    };
  }

  if (context.isEdge) {
    return {
      steps: DESKTOP_EDGE_STEPS,
      title: `Permita a localização no ${context.browserName}`,
    };
  }

  return {
    steps: DESKTOP_CHROME_STEPS,
    title: `Permita a localização no ${context.browserName}`,
  };
}

function normalizeLocationMessage(message) {
  return String(message || '').trim().toLowerCase();
}

export function isLocationPermissionMessage(message) {
  const normalized = normalizeLocationMessage(message);

  return (
    normalized.includes('permiss') ||
    normalized.includes('bloquead') ||
    normalized.includes('blocked') ||
    normalized.includes('denied') ||
    normalized.includes('liber') ||
    normalized.includes('not allowed') ||
    normalized.includes('notallowed') ||
    normalized.includes('only secure origins') ||
    normalized.includes('secure origin') ||
    normalized.includes('suporte para localiza')
  );
}

export function isTechnicalLocationSyncMessage(message) {
  const normalized = normalizeLocationMessage(message);

  return (
    normalized.includes('forbidden resource') ||
    normalized.includes('forbidden') ||
    normalized.includes('unauthorized') ||
    normalized.includes('invalid clerk token') ||
    normalized.includes('status 401') ||
    normalized.includes('status 403') ||
    normalized === '401' ||
    normalized === '403'
  );
}

export function isDistanceValidationMessage(message) {
  const normalized = normalizeLocationMessage(message);

  return (
    normalized.includes('1 km') ||
    normalized.includes('distancia atual') ||
    normalized.includes('distância atual') ||
    normalized.includes('perto do cliente') ||
    normalized.includes('proximidade do atendimento')
  );
}

function normalizeGeolocationError(error) {
  if (!error) {
    return 'Não foi possível obter sua localização agora.';
  }

  if (error.code === 1) {
    return 'A localização foi bloqueada. Libere a permissão do navegador para continuar.';
  }

  if (error.code === 2) {
    return 'Não foi possível identificar sua localização atual. Verifique o sinal do aparelho e tente novamente.';
  }

  if (error.code === 3) {
    return 'A localização demorou para responder. Tente novamente em um local com sinal melhor.';
  }

  return error.message || 'Não foi possível obter sua localização agora.';
}

function isRetryableGeolocationError(error) {
  return error?.code === 2 || error?.code === 3;
}

function createGeolocationError(error) {
  const normalizedError = new Error(normalizeGeolocationError(error));

  if (error?.code) {
    normalizedError.code = error.code;
  }

  return normalizedError;
}

function getBrowserPosition(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error('Este navegador não oferece suporte para localização.'),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      options,
    );
  });
}

export async function requestBrowserLocation(options = {}) {
  const {
    allowRecentFallback = true,
    debugReporter,
    debugSource = 'unknown-location-flow',
    ...positionOptions
  } = options;
  const requestOptions = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: DEFAULT_LOCATION_TIMEOUT,
    ...positionOptions,
  };
  const permissionState = await readLocationPermissionState();
  const runtimeContext = getLocationRuntimeContext();
  const cacheState = await readCacheState();
  const writeDebug = (level, eventName, payload = {}) => {
    const entry = logLocationDebug(level, eventName, {
      source: debugSource,
      ...payload,
    });

    reportLocationDebug(debugReporter, entry);
    return entry;
  };

  writeDebug('info', 'request-start', {
    allowRecentFallback,
    cache: cacheState,
    context: runtimeContext,
    options: sanitizeLocationOptions(requestOptions),
    permissionState,
  });

  try {
    const position = await getBrowserPosition(requestOptions);

    writeDebug('info', 'request-success', {
      position: summarizePosition(position),
      usedFallback: false,
    });

    return position;
  } catch (error) {
    const canUseRecentFallback =
      allowRecentFallback &&
      requestOptions.maximumAge === 0 &&
      isRetryableGeolocationError(error);

    writeDebug('warn', 'request-primary-failed', {
      canUseRecentFallback,
      error: summarizeGeolocationError(error),
      options: sanitizeLocationOptions(requestOptions),
    });

    if (canUseRecentFallback) {
      const fallbackOptions = {
        ...requestOptions,
        maximumAge: RECENT_LOCATION_FALLBACK_MAX_AGE,
        timeout: RECENT_LOCATION_FALLBACK_TIMEOUT,
      };

      writeDebug('info', 'request-fallback-start', {
        options: sanitizeLocationOptions(fallbackOptions),
      });

      try {
        const fallbackPosition = await getBrowserPosition(fallbackOptions);

        writeDebug('info', 'request-success', {
          position: summarizePosition(fallbackPosition),
          usedFallback: true,
        });

        return fallbackPosition;
      } catch (fallbackError) {
        writeDebug('warn', 'request-fallback-failed', {
          error: summarizeGeolocationError(fallbackError),
        });

        throw createGeolocationError(fallbackError);
      }
    }

    writeDebug('warn', 'request-failed', {
      error: summarizeGeolocationError(error),
    });

    throw createGeolocationError(error);
  }
}
