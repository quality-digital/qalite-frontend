import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import i18n from '../../lib/i18n';

import type { Store } from '../../domain/entities/store';
import { listenToStores } from '../../infrastructure/external/stores';
import { useOrganizationBranding } from './OrganizationBrandingContext';

interface StoresRealtimeContextValue {
  organizationId: string | null;
  stores: Store[];
  isLoading: boolean;
  error: string | null;
}

const StoresRealtimeContext = createContext<StoresRealtimeContextValue | undefined>(undefined);

const initialState = {
  stores: [],
  isLoading: false,
  error: null,
};

export const StoresRealtimeProvider = ({ children }: { children: ReactNode }) => {
  const { activeOrganization } = useOrganizationBranding();
  const [state, setState] = useState<{ stores: Store[]; isLoading: boolean; error: string | null }>(
    initialState,
  );

  useEffect(() => {
    if (!activeOrganization?.id) {
      setState(initialState);
      return;
    }

    setState({ stores: [], isLoading: true, error: null });

    const unsubscribe = listenToStores(
      activeOrganization.id,
      (stores) => {
        setState({ stores, isLoading: false, error: null });
      },
      (error) => {
        console.error(error);
        setState((previous) => ({
          ...previous,
          isLoading: false,
          error: i18n.t('organizationStores.realtimeError'),
        }));
      },
    );

    return () => {
      unsubscribe();
    };
  }, [activeOrganization?.id]);

  const value = useMemo<StoresRealtimeContextValue>(
    () => ({
      organizationId: activeOrganization?.id ?? null,
      stores: state.stores,
      isLoading: state.isLoading,
      error: state.error,
    }),
    [activeOrganization?.id, state.error, state.isLoading, state.stores],
  );

  return <StoresRealtimeContext.Provider value={value}>{children}</StoresRealtimeContext.Provider>;
};

export const useStoresRealtime = (): StoresRealtimeContextValue => {
  const context = useContext(StoresRealtimeContext);

  if (!context) {
    throw new Error('useStoresRealtime must be used within StoresRealtimeProvider');
  }

  return context;
};
