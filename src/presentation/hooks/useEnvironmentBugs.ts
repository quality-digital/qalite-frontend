import { useCallback, useEffect, useState } from 'react';
import i18n from '../../lib/i18n';

import type { EnvironmentBug } from '../../domain/entities/environment';
import { environmentService } from '../../infrastructure/services/environmentService';

export const useEnvironmentBugs = (environmentId: string | null | undefined) => {
  const [bugs, setBugs] = useState<EnvironmentBug[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(environmentId));
  const [error, setError] = useState<string | null>(null);

  const fetchBugs = useCallback(async () => {
    if (!environmentId) {
      setBugs([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const list = await environmentService.listBugs(environmentId);
      setBugs(list);
    } catch (fetchError) {
      console.error(fetchError);
      setBugs([]);
      setError(i18n.t('environmentBugList.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [environmentId]);

  useEffect(() => {
    void fetchBugs();
  }, [fetchBugs]);

  return { bugs, isLoading, error, refetch: fetchBugs };
};
