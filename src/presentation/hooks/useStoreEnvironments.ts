import { useEffect, useMemo, useState } from 'react';

import type { Environment, EnvironmentStatus } from '../../domain/entities/types';
import { environmentService } from '../../application/use-cases/environment';

interface StatusCounts extends Record<EnvironmentStatus, number> {
  total: number;
}

interface UseStoreEnvironmentsResult {
  environments: Environment[];
  isLoading: boolean;
  statusCounts: StatusCounts;
}

const buildEmptyCounts = (): StatusCounts => ({
  backlog: 0,
  in_progress: 0,
  done: 0,
  total: 0,
});

export const useStoreEnvironments = (
  storeId: string | null | undefined,
): UseStoreEnvironmentsResult => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(storeId));

  useEffect(() => {
    if (!storeId) {
      setEnvironments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = environmentService.observeAll({ storeId }, (list) => {
      setEnvironments(list);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [storeId]);

  const statusCounts = useMemo(() => {
    if (environments.length === 0) {
      return buildEmptyCounts();
    }

    const counts: StatusCounts = buildEmptyCounts();
    counts.total = environments.length;
    environments.forEach((environment) => {
      counts[environment.status] += 1;
    });

    return counts;
  }, [environments]);

  return {
    environments,
    isLoading,
    statusCounts,
  };
};
