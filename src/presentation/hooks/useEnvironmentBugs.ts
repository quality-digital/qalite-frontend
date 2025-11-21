import { useCallback } from 'react';

import type { EnvironmentBug } from '../../domain/entities/types';
import { environmentService } from '../../application/use-cases/environment';
import { useRealtimeResource } from './useRealtimeResource';

export const useEnvironmentBugs = (environmentId: string | null | undefined) => {
  const subscribeToBugs = useCallback(
    (id: string, handler: (bugs: EnvironmentBug[]) => void) =>
      environmentService.observeBugs(id, handler),
    [],
  );

  const { value, isLoading } = useRealtimeResource<EnvironmentBug[]>({
    resourceId: environmentId,
    getInitialValue: () => [],
    subscribe: subscribeToBugs,
  });

  return { bugs: value, isLoading };
};
