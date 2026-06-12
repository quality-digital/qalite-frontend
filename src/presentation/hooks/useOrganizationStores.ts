import { useEffect, useMemo, useState } from 'react';
import i18n from '../../lib/i18n';

import type { Organization } from '../../domain/entities/organization';
import type { Store } from '../../domain/entities/store';
import { organizationService } from '../../infrastructure/services/organizationService';
import { storeService } from '../../infrastructure/services/storeService';
import { useToast } from '../context/ToastContext';

type OrganizationStoresStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

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
          organizationService.getDetail(organizationId),
          storeService.listSummary(organizationId),
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
        const message = i18n.t('organizationStores.loadError');
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
