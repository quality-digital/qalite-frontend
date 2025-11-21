import { useMemo } from 'react';

import type {
  Environment,
  EnvironmentScenarioPlatform,
  EnvironmentBug,
} from '../../domain/entities/environment';
import {
  SCENARIO_COMPLETED_STATUSES,
  getScenarioPlatformStatuses,
} from '../../infrastructure/external/environments';

interface ScenarioStats {
  total: number;
  concluded: number;
  pending: number;
  running: number;
}

interface UseEnvironmentDetailsResult {
  bugCountByScenario: Record<string, number>;
  platformScenarioStats: Record<EnvironmentScenarioPlatform, ScenarioStats>;
  combinedScenarioStats: ScenarioStats;
  progressPercentage: number;
  progressLabel: string;
  scenarioCount: number;
  executedScenariosCount: number;
  suiteDescription: string;
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

const buildInitialPlatformStats = (): Record<EnvironmentScenarioPlatform, ScenarioStats> => ({
  mobile: createEmptyScenarioStats(),
  desktop: createEmptyScenarioStats(),
});

const formatProgressLabel = (concluded: number, total: number) => {
  if (total === 0) {
    return 'Nenhum cenário cadastrado ainda.';
  }

  return `${concluded} de ${total} concluídos`;
};

const buildShareLinks = (environment: Environment | null | undefined) => {
  if (!environment) {
    return { private: '', invite: '', public: '' };
  }

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const baseUrl = `${origin}/environments/${environment.id}`;

  return {
    private: baseUrl,
    invite: `${baseUrl}?invite=true`,
    public: `${baseUrl}/public`,
  };
};

export const useEnvironmentDetails = (
  environment: Environment | null | undefined,
  bugs: EnvironmentBug[],
): UseEnvironmentDetailsResult =>
  useMemo(() => {
    const bugCountByScenario = bugs.reduce<Record<string, number>>((acc, bug) => {
      if (bug.scenarioId) {
        acc[bug.scenarioId] = (acc[bug.scenarioId] ?? 0) + 1;
      }
      return acc;
    }, {});

    const platformScenarioStats = buildInitialPlatformStats();

    Object.values(environment?.scenarios ?? {}).forEach((scenario) => {
      const statuses = getScenarioPlatformStatuses(scenario);

      (['mobile', 'desktop'] as EnvironmentScenarioPlatform[]).forEach((platform) => {
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

    const combinedScenarioStats = (
      ['mobile', 'desktop'] as EnvironmentScenarioPlatform[]
    ).reduce<ScenarioStats>((combined, platform) => {
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
      bugCountByScenario,
      platformScenarioStats,
      combinedScenarioStats,
      progressPercentage,
      progressLabel: formatProgressLabel(
        combinedScenarioStats.concluded,
        combinedScenarioStats.total,
      ),
      scenarioCount: combinedScenarioStats.total,
      executedScenariosCount: combinedScenarioStats.concluded,
      suiteDescription: environment?.suiteName ?? 'Suíte não informada',
      headerMeta: [
        ...(environment?.momento ? [`Momento: ${environment.momento}`] : []),
        ...(environment?.release ? [`Release: ${environment.release}`] : []),
      ],
      urls: environment?.urls ?? [],
      shareLinks: buildShareLinks(environment),
    };
  }, [bugs, environment]);
