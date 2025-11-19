import { useCallback } from 'react';

import type { Environment } from '../../lib/types';
import { environmentService } from '../../services';
import { useRealtimeResource } from './useRealtimeResource';

export const useEnvironmentRealtime = (environmentId: string | null | undefined) => {
  const subscribeToEnvironment = useCallback(
    (id: string, handler: (environment: Environment | null) => void) =>
      environmentService.observeEnvironment(id, handler),
    [],
  );

  const { value, isLoading, error } = useRealtimeResource<Environment | null>({
    resourceId: environmentId,
    getInitialValue: () => null,
    subscribe: subscribeToEnvironment,
    missingResourceMessage: 'Ambiente não encontrado.',
  });

  return { environment: value, isLoading, error };
};
