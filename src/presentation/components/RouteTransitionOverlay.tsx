import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { PageLoader } from './PageLoader';
import { ROUTE_TRANSITION_READY_EVENT } from './routeTransitionEvents';

const ROUTE_MESSAGES: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /^\/login/, message: 'Validando suas credenciais...' },
  { pattern: /^\/(register|forgot-password)/, message: 'Preparando acesso seguro...' },
  { pattern: /^\/dashboard/, message: 'Atualizando painel principal...' },
  { pattern: /^\/organization/, message: 'Organizando dados da empresa...' },
  { pattern: /^\/stores\//, message: 'Conectando à loja selecionada...' },
  { pattern: /^\/environments\//, message: 'Configurando o ambiente solicitado...' },
  { pattern: /^\/profile/, message: 'Carregando preferências do usuário...' },
  { pattern: /^\/admin/, message: 'Carregando console administrativo...' },
];

const getRouteMessage = (pathname: string) => {
  const routeMatch = ROUTE_MESSAGES.find((route) => route.pattern.test(pathname));

  if (routeMatch) {
    return routeMatch.message;
  }

  if (pathname === '/') {
    return 'Carregando experiências QaLite...';
  }

  return 'Carregando próximo módulo...';
};

const MIN_VISIBLE_MS = 550;
const FADE_OUT_MS = 220;
const WAIT_FOR_READY_TIMEOUT_MS = 6000;

const WAIT_FOR_READY_ROUTES: RegExp[] = [/^\/stores\//];

export const RouteTransitionOverlay = () => {
  const location = useLocation();
  const [isRendering, setIsRendering] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [message, setMessage] = useState(() => getRouteMessage(location.pathname));
  const isFirstRender = useRef(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitForReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldWaitForReadyRef = useRef(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const clearWaitForReadyTimer = useCallback(() => {
    if (waitForReadyTimerRef.current) {
      clearTimeout(waitForReadyTimerRef.current);
      waitForReadyTimerRef.current = null;
    }
  }, []);

  const startFadeOutSequence = useCallback(() => {
    clearHideTimer();

    hideTimerRef.current = setTimeout(() => {
      setIsFadingOut(true);

      hideTimerRef.current = setTimeout(() => {
        setIsRendering(false);
        setIsFadingOut(false);
      }, FADE_OUT_MS);
    }, MIN_VISIBLE_MS);
  }, [clearHideTimer]);

  const handleRouteReady = useCallback(() => {
    if (!shouldWaitForReadyRef.current) {
      return;
    }

    shouldWaitForReadyRef.current = false;
    clearWaitForReadyTimer();
    startFadeOutSequence();
  }, [clearWaitForReadyTimer, startFadeOutSequence]);

  useEffect(
    () => () => {
      clearHideTimer();
      clearWaitForReadyTimer();
    },
    [clearHideTimer, clearWaitForReadyTimer],
  );

  useEffect(() => {
    window.addEventListener(ROUTE_TRANSITION_READY_EVENT, handleRouteReady);

    return () => {
      window.removeEventListener(ROUTE_TRANSITION_READY_EVENT, handleRouteReady);
    };
  }, [handleRouteReady]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setMessage(getRouteMessage(location.pathname));
    setIsRendering(true);
    setIsFadingOut(false);
    clearHideTimer();
    clearWaitForReadyTimer();

    const shouldWaitForReady = WAIT_FOR_READY_ROUTES.some((pattern) =>
      pattern.test(location.pathname),
    );
    shouldWaitForReadyRef.current = shouldWaitForReady;

    if (shouldWaitForReady) {
      waitForReadyTimerRef.current = setTimeout(() => {
        shouldWaitForReadyRef.current = false;
        startFadeOutSequence();
      }, WAIT_FOR_READY_TIMEOUT_MS);
    } else {
      startFadeOutSequence();
    }
  }, [
    clearHideTimer,
    clearWaitForReadyTimer,
    location.key,
    location.pathname,
    location.search,
    startFadeOutSequence,
  ]);

  if (!isRendering) {
    return null;
  }

  return <PageLoader variant="overlay" message={message} isFadingOut={isFadingOut} />;
};
