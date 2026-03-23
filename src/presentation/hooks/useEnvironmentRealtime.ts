import { useEffect, useMemo, useState } from 'react';
import i18n from '../../lib/i18n';

import type { Environment } from '../../domain/entities/environment';
import { environmentService } from '../../infrastructure/services/environmentService';
import { getEnvironmentCached } from '../../infrastructure/external/environments';

export const useEnvironmentRealtime = (environmentId: string | null | undefined) => {
  const cachedEnvironment = useMemo(
    () => (environmentId ? getEnvironmentCached(environmentId) : null),
    [environmentId],
  );
  const [environment, setEnvironment] = useState<Environment | null>(cachedEnvironment);
  const [isLoading, setIsLoading] = useState(Boolean(environmentId) && !cachedEnvironment);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!environmentId) {
      setEnvironment(null);
      setIsLoading(false);
      setError(i18n.t('environmentRealtime.notFound'));
      return;
    }

    let isMounted = true;
    setEnvironment(cachedEnvironment);
    setIsLoading(!cachedEnvironment);
    setError(null);

    const unsubscribe = environmentService.observeEnvironment(environmentId, (nextValue) => {
      if (!isMounted) {
        return;
      }
      setEnvironment(nextValue);
      setIsLoading(false);
      setError(nextValue ? null : i18n.t('environmentRealtime.notFound'));
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [cachedEnvironment, environmentId]);

  return { environment, isLoading, error };
};
