import { useEffect, useState } from 'react';

import type { Environment } from '../../domain/entities/Environment';
import { getEnvironmentByIdRealtime } from '../../infra/firebase/environmentService';

export const useEnvironmentRealtime = (environmentId: string | null | undefined) => {
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!environmentId) {
      setEnvironment(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = getEnvironmentByIdRealtime(environmentId, (data) => {
      setEnvironment(data);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [environmentId]);

  useEffect(() => {
    if (!environmentId) {
      setError('Ambiente não encontrado.');
    } else {
      setError(null);
    }
  }, [environmentId]);

  return { environment, isLoading, error };
};
