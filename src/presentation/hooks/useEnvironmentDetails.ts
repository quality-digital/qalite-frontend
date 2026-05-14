import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Environment, EnvironmentScenarioPlatform } from '../../domain/entities/environment';
import {
  SCENARIO_COMPLETED_STATUSES,
  getEnvironmentColumns,
  getScenarioPlatformStatuses,
} from '../../infrastructure/external/environments';
import { translateEnvironmentOption } from '../constants/environmentOptions';

interface ScenarioStats {
  total: number;
  concluded: number;
  pending: number;
  running: number;
}

interface UseEnvironmentDetailsResult {
  platformScenarioStats: Record<EnvironmentScenarioPlatform, ScenarioStats>;
  combinedScenarioStats: ScenarioStats;
  progressPercentage: number;
  progressLabel: string;
  scenarioCount: number;
  executedScenariosCount: number;
  headerMeta: string[];
  urls: string[];
  shareLinks: {
    private: string;
    invite: string;
    public: string;
  };
}

const createEmptyScenarioStats = (): ScenarioStats => ({
  total: 0,
  concluded: 0,
  pending: 0,
  running: 0,
});

const formatProgressLabel = (
  concluded: number,
  total: number,
  t: (key: string, options?: Record<string, number>) => string,
) => {
  if (total === 0) {
    return t('environmentDetails.noScenarios');
  }

  return t('environmentDetails.progress', { concluded, total });
};

const buildShareLinks = (environment: Environment | null | undefined) => {
  if (!environment) {
    return { private: '', invite: '', public: '' };
  }

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const baseUrl = `${origin}/environments?id=${environment.id}`;
  const publicLink = `${origin}/environments/public?id=${environment.id}`;

  return {
    private: baseUrl,
    invite: `${baseUrl}&invite=true`,
    public: publicLink,
  };
};

export const useEnvironmentDetails = (
  environment: Environment | null | undefined,
): UseEnvironmentDetailsResult => {
  const { t } = useTranslation();

  return useMemo(() => {
    const environmentColumns = getEnvironmentColumns(environment);
    const platformScenarioStats = environmentColumns.reduce<
      Record<EnvironmentScenarioPlatform, ScenarioStats>
    >((acc, column) => {
      acc[column] = createEmptyScenarioStats();
      return acc;
    }, {});

    Object.values(environment?.scenarios ?? {}).forEach((scenario) => {
      const statuses = getScenarioPlatformStatuses(scenario, environmentColumns);

      environmentColumns.forEach((platform) => {
        const stats = platformScenarioStats[platform];
        const status = statuses[platform];

        stats.total += 1;

        if (SCENARIO_COMPLETED_STATUSES.includes(status)) {
          stats.concluded += 1;
          return;
        }

        if (status === 'em_andamento') {
          stats.running += 1;
          return;
        }

        stats.pending += 1;
      });
    });

    const combinedScenarioStats = environmentColumns.reduce<ScenarioStats>((combined, platform) => {
      const stats = platformScenarioStats[platform];
      combined.total += stats.total;
      combined.concluded += stats.concluded;
      combined.pending += stats.pending;
      combined.running += stats.running;
      return combined;
    }, createEmptyScenarioStats());

    const progressPercentage =
      combinedScenarioStats.total === 0
        ? 0
        : Math.round((combinedScenarioStats.concluded / combinedScenarioStats.total) * 100);

    return {
      platformScenarioStats,
      combinedScenarioStats,
      progressPercentage,
      progressLabel: formatProgressLabel(
        combinedScenarioStats.concluded,
        combinedScenarioStats.total,
        t,
      ),
      scenarioCount: combinedScenarioStats.total,
      executedScenariosCount: combinedScenarioStats.concluded,
      headerMeta: [
        ...(environment?.momento
          ? [
              `${t('environmentSummary.moment')}: ${translateEnvironmentOption(
                environment.momento,
                t,
              )}`,
            ]
          : []),
        ...(environment?.release
          ? [`${t('environmentSummary.release')}: ${environment.release}`]
          : []),
      ],
      urls: environment?.urls ?? [],
      shareLinks: buildShareLinks(environment),
    };
  }, [environment, t]);
};
