import { useEffect, useState } from 'react';

import type { EnvironmentBug } from '../../domain/entities/EnvironmentBug';
import { environmentService } from '../../main/factories/environmentServiceFactory';

export const useEnvironmentBugs = (environmentId: string | null | undefined) => {
  const [bugs, setBugs] = useState<EnvironmentBug[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!environmentId) {
      setBugs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = environmentService.observeBugs(environmentId, (nextBugs) => {
      setBugs(nextBugs);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [environmentId]);

  return { bugs, isLoading };
};
