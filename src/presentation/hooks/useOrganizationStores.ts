import { useEffect, useMemo, useState } from 'react';

import type { Organization } from '../../lib/types';
import type { Store } from '../../lib/types';
import { organizationService, storeService } from '../../services';
import { useToast } from '../context/ToastContext';

export type OrganizationStoresStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

interface OrganizationStoresState {
  organization: Organization | null;
  stores: Store[];
  status: OrganizationStoresStatus;
  error: string | null;
}

const buildInitialState = (): OrganizationStoresState => ({
  organization: null,
  stores: [],
  status: 'idle',
  error: null,
});

export const useOrganizationStores = (organizationId: string | null) => {
  const { showToast } = useToast();
  const [state, setState] = useState<OrganizationStoresState>(buildInitialState);

  useEffect(() => {
    if (!organizationId) {
      setState(buildInitialState());
      return;
    }

    let isSubscribed = true;

    const loadStores = async () => {
      setState((previous) => ({ ...previous, status: 'loading', error: null }));

      try {
        const [organizationData, storesData] = await Promise.all([
          organizationService.getById(organizationId),
          storeService.listByOrganization(organizationId),
        ]);

        if (!isSubscribed) {
          return;
        }

        setState({
          organization: organizationData,
          stores: storesData,
          status: storesData.length === 0 ? 'empty' : 'ready',
          error: null,
        });
      } catch (error) {
        console.error(error);
        if (!isSubscribed) {
          return;
        }
        const message = 'Não foi possível carregar suas lojas agora. Tente novamente mais tarde.';
        setState((previous) => ({ ...previous, status: 'error', error: message }));
        showToast({ type: 'error', message });
      }
    };

    void loadStores();

    return () => {
      isSubscribed = false;
    };
  }, [organizationId, showToast]);

  const derivedState = useMemo(
    () => ({
      ...state,
      isLoading: state.status === 'loading',
      isEmpty: state.status === 'empty',
      hasError: state.status === 'error',
      hasData: state.status === 'ready',
    }),
    [state],
  );

  return derivedState;
};
