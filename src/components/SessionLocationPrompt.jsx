import { useAuth } from '@clerk/clerk-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppAuth } from '../auth/useAppAuth';
import { updateLocation } from '../services/api';
import {
  buildLocationGuidance,
  isLocationPermissionMessage,
  isTechnicalLocationSyncMessage,
  requestBrowserLocation,
} from '../utils/locationSupport';
import LocationPermissionModal from './LocationPermissionModal';
import LocationRequestPendingModal from './LocationRequestPendingModal';
import { useToast } from './ToastProvider';

export default function SessionLocationPrompt() {
  const { getToken, isSignedIn, sessionId, userId } = useAuth();
  const { appUser, isLoaded, status } = useAppAuth();
  const { showSuccess } = useToast();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPendingOpen, setIsPendingOpen] = useState(false);
  const lastAttemptKeyRef = useRef('');

  const guidance = useMemo(() => buildLocationGuidance(), []);

  const requestAndStoreLocation = async ({ showSuccessToast = false } = {}) => {
    setIsPendingOpen(true);

    try {
      const position = await requestBrowserLocation();

      try {
        await updateLocation(
          position.coords.latitude,
          position.coords.longitude,
          getToken,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível sincronizar sua localização agora.';

        if (isTechnicalLocationSyncMessage(message)) {
          console.warn('Location sync skipped during session prompt:', message);
        } else {
          throw error;
        }
      }

      setIsHelpOpen(false);

      if (showSuccessToast) {
        showSuccess('Localização atualizada com sucesso.');
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível obter sua localização agora.';

      if (isLocationPermissionMessage(message)) {
        setIsHelpOpen(true);
      } else if (isTechnicalLocationSyncMessage(message)) {
        console.warn('Location sync skipped during session prompt:', message);
      } else {
        console.warn('Location prompt failed:', message);
      }
    } finally {
      setIsPendingOpen(false);
    }
  };

  useEffect(() => {
    if (!isSignedIn) {
      lastAttemptKeyRef.current = '';
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      status !== 'ready' ||
      !appUser ||
      !sessionId ||
      !userId
    ) {
      return;
    }

    const currentAttemptKey = `${sessionId}:${userId}`;

    if (lastAttemptKeyRef.current === currentAttemptKey) {
      return;
    }

    lastAttemptKeyRef.current = currentAttemptKey;
    void requestAndStoreLocation();
  }, [appUser, isLoaded, isSignedIn, sessionId, status, userId]);

  if (!isSignedIn || status !== 'ready') {
    return null;
  }

  return (
    <>
      <LocationRequestPendingModal
        description="Aceite a solicitação de localização exibida pelo navegador para registrar sua posição atual."
        onClose={() => setIsPendingOpen(false)}
        open={isPendingOpen}
      />

      <LocationPermissionModal
        description="O sistema usa sua localização para validar atendimentos, atualizar o mapa da equipe e registrar sua posição no início do trabalho."
        guidance={guidance}
        onClose={() => setIsHelpOpen(false)}
        onRetry={() => {
          void requestAndStoreLocation({ showSuccessToast: true });
        }}
        open={isHelpOpen}
        title={guidance.title}
      />
    </>
  );
}
