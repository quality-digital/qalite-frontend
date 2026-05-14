import i18n from '../../lib/i18n';
import type { EnvironmentSummaryPayload } from '../../domain/entities/slack';

export interface ExecutionReportData extends EnvironmentSummaryPayload {
  identifier?: string;
  environment?: string;
  status?: string;
  scenariosCount?: number;
  executedScenariosCount?: number;
  totalTime?: string;
  suiteName?: string;
  monitoredUrls?: string[];
}

export const formatExecutionReportToSlack = (data: ExecutionReportData): string => {
  const t = i18n.t.bind(i18n);
  const details = [
    `• *${t('environment.slack.labels.identifier')}:* ${data.identifier ?? '-'}`,
    `• *${t('environment.slack.labels.status')}:* ${data.status ?? '-'}`,
    `• *${t('environment.slack.labels.totalScenarios')}:* ${data.scenariosCount ?? 0}`,
    `• *${t('environment.slack.labels.executedScenarios')}:* ${data.executedScenariosCount ?? 0}`,
    `• *${t('environment.slack.labels.totalTime')}:* ${data.totalTime ?? '-'}`,
  ];

  if (data.suiteName) {
    details.push(`• *${t('environment.slack.labels.suiteName')}:* ${data.suiteName}`);
  }

  return [`*${t('environment.slack.summaryHeader')}*`, ...details].join('\n');
};
