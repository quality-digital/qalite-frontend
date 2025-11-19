import { useCallback, useState } from 'react';

import type { EnvironmentScenarioPlatform, EnvironmentScenarioStatus } from '../../lib/types';
import { environmentService } from '../../services';

export const useScenarioEvidence = (environmentId: string | null | undefined) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEvidenceUpload = useCallback(
    async (scenarioId: string, file: File) => {
      if (!environmentId) {
        throw new Error('Ambiente inválido.');
      }

      setIsUpdating(true);
      try {
        return await environmentService.uploadScenarioEvidence(environmentId, scenarioId, file);
      } finally {
        setIsUpdating(false);
      }
    },
    [environmentId],
  );

  const changeScenarioStatus = useCallback(
    async (
      scenarioId: string,
      status: EnvironmentScenarioStatus,
      platform: EnvironmentScenarioPlatform,
    ) => {
      if (!environmentId) {
        throw new Error('Ambiente inválido.');
      }

      setIsUpdating(true);
      try {
        await environmentService.updateScenarioStatus(environmentId, scenarioId, status, platform);
      } finally {
        setIsUpdating(false);
      }
    },
    [environmentId],
  );

  return { isUpdating, handleEvidenceUpload, changeScenarioStatus };
};
