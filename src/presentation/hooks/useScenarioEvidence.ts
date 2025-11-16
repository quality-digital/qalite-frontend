import { useCallback, useState } from 'react';

import type { EnvironmentScenarioStatus } from '../../domain/entities/Environment';
import { environmentService } from '../../main/factories/environmentServiceFactory';

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
    async (scenarioId: string, status: EnvironmentScenarioStatus) => {
      if (!environmentId) {
        throw new Error('Ambiente inválido.');
      }

      setIsUpdating(true);
      try {
        await environmentService.updateScenarioStatus(environmentId, scenarioId, status);
      } finally {
        setIsUpdating(false);
      }
    },
    [environmentId],
  );

  return { isUpdating, handleEvidenceUpload, changeScenarioStatus };
};
