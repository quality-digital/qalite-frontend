export const ROUTE_TRANSITION_READY_EVENT = 'route-transition:ready';

export const signalRouteTransitionReady = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(ROUTE_TRANSITION_READY_EVENT));
};
