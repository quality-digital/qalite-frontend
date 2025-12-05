import { useCallback, useState } from 'react';

import type {
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
} from '../../domain/entities/environment';
import { environmentService } from '../../application/use-cases/EnvironmentUseCase';

export const useScenarioEvidence = (environmentId: string | null | undefined) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEvidenceUpload = useCallback(
    async (scenarioId: string, link: string) => {
      if (!environmentId) {
        throw new Error('Ambiente inválido.');
      }

      setIsUpdating(true);
      try {
        return await environmentService.uploadScenarioEvidence(environmentId, scenarioId, link);
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
