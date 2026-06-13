const DEFAULT_LOCATION_TIMEOUT = 12000;

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
    normalized.includes('localiza') ||
    normalized.includes('geolocal') ||
    normalized.includes('gps') ||
    normalized.includes('navegador') ||
    normalized.includes('permiss') ||
    normalized.includes('bloquead') ||
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

export function requestBrowserLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error('Este navegador não oferece suporte para localização.'),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        reject(new Error(normalizeGeolocationError(error)));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: DEFAULT_LOCATION_TIMEOUT,
        ...options,
      },
    );
  });
}
