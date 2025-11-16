import { useCallback, useState } from 'react';

import type { EnvironmentScenarioUpdate } from '../../domain/entities/Environment';
import { updateScenarioEvidence, uploadEvidence } from '../../infra/firebase/environmentService';

export const useScenarioEvidence = (environmentId: string | null | undefined) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const persistScenario = useCallback(
    async (scenarioId: string, updates: EnvironmentScenarioUpdate) => {
      if (!environmentId) {
        throw new Error('Ambiente inválido.');
      }

      setIsUpdating(true);
      try {
        await updateScenarioEvidence(environmentId, scenarioId, updates);
      } finally {
        setIsUpdating(false);
      }
    },
    [environmentId],
  );

  const handleEvidenceUpload = useCallback(
    async (scenarioId: string, file: File) => {
      if (!environmentId) {
        throw new Error('Ambiente inválido.');
      }

      setIsUpdating(true);
      try {
        const url = await uploadEvidence(environmentId, scenarioId, file);
        await updateScenarioEvidence(environmentId, scenarioId, { evidenciaArquivoUrl: url });
        return url;
      } finally {
        setIsUpdating(false);
      }
    },
    [environmentId],
  );

  return { isUpdating, persistScenario, handleEvidenceUpload };
};
