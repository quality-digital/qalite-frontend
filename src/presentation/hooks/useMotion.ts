import { useCallback, useEffect, useState } from 'react';

const MOTION_DURATIONS = {
  base: 250,
};

const PAGE_ENTER_DELAY_MS = 10;
const DEFAULT_CONTENT_DELAY_MS = 100;

type TransitionDirection = 'left' | 'right' | 'top' | 'bottom' | 'fade';
type AnimationState = 'entering' | 'entered';

const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};

const usePageTransition = (direction: TransitionDirection = 'right') => {
  const [animationState, setAnimationState] = useState<AnimationState>('entering');
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimationState('entered');
      return;
    }

    const timer = setTimeout(() => {
      setAnimationState('entered');
    }, PAGE_ENTER_DELAY_MS);

    return () => clearTimeout(timer);
  }, [prefersReducedMotion]);

  const getTransitionClass = useCallback((): string => {
    if (prefersReducedMotion) return 'auth-page-transition';

    const directionMap: Record<TransitionDirection, string> = {
      left: 'auth-page-transition--enter-left',
      right: 'auth-page-transition--enter-right',
      top: 'auth-page-transition--enter-top',
      bottom: 'auth-page-transition--enter-bottom',
      fade: 'auth-page-transition--crossfade',
    };

    return animationState === 'entering'
      ? `auth-page-transition ${directionMap[direction]}`
      : 'auth-page-transition';
  }, [animationState, direction, prefersReducedMotion]);

  return { animationState, transitionClass: getTransitionClass() };
};

const useAnimationComplete = (duration: number = MOTION_DURATIONS.base): boolean => {
  const [isComplete, setIsComplete] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsComplete(true);
    }, duration);

    return () => {
      clearTimeout(timer);
      setIsComplete(false);
    };
  }, [duration]);

  return isComplete;
};

export interface UseSequencedAnimationOptions {
  pageTransitionDuration?: number;
  contentDelay?: number;
}

export const useSequencedAnimation = (options: UseSequencedAnimationOptions = {}) => {
  const {
    pageTransitionDuration = MOTION_DURATIONS.base,
    contentDelay = DEFAULT_CONTENT_DELAY_MS,
  } = options;
  const pageTransition = usePageTransition();
  const contentAnimationDelay = useAnimationComplete(pageTransitionDuration + contentDelay);

  return {
    pageTransitionClass: pageTransition.transitionClass,
    showContent: contentAnimationDelay,
    isPageEntered: pageTransition.animationState === 'entered',
  };
};
