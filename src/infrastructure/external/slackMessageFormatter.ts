import i18n from '../../lib/i18n';
import type { EnvironmentSummaryPayload } from '../../domain/entities/slack';
import { requiresReleaseField } from '../../shared/utils/environmentOptions';

export interface ExecutionReportData extends EnvironmentSummaryPayload {
  environment?: string;
  environmentType?: string;
  testType?: string;
  executionType?: string;
  release?: string;
  bugsRegistered?: number;
  executionContext?: string;
  jiraTasks?: string[];
  participantEmails?: string[];
}

const t = (key: string, options?: Record<string, unknown>): string => {
  const translated = i18n.t(key, options);
  return translated === key ? key : translated;
};

export const formatExecutionReportToSlack = (data: ExecutionReportData): string => {
  const lines: string[] = [];

  addHeader(lines);
  addIdentification(lines, data);
  addScenarioExecution(lines, data);
  addSuite(lines, data);
  addMonitoredUrls(lines, data);
  addExecutionContext(lines, data);
  addParticipants(lines, data);
  addJiraTasks(lines, data);

  return lines.filter(Boolean).join('\n').trim();
};

const addHeader = (lines: string[]): void => {
  lines.push(`📊 *${t('environment.slack.summaryHeader')}*`);
  lines.push('');
};

const addIdentification = (lines: string[], data: ExecutionReportData): void => {
  const details: string[] = [];

  if (data.environment)
    details.push(`• *${t('environment.slack.labels.environment')}:* ${data.environment}`);
  if (data.testType)
    details.push(`• *${t('environment.slack.labels.testType')}:* ${data.testType}`);
  if (data.executionType)
    details.push(`• *${t('environment.slack.labels.executionType')}:* ${data.executionType}`);

  const shouldShowRelease = requiresReleaseField(data.environmentType ?? data.environment);
  if (shouldShowRelease && data.release) {
    details.push(`• *${t('environment.slack.labels.release')}:* ${data.release}`);
  }

  if (details.length === 0) return;

  lines.push(`🔖 *${t('environment.slack.sections.identification')}*`);
  lines.push(...details);
  lines.push('');
};

const addScenarioExecution = (lines: string[], data: ExecutionReportData): void => {
  const details: string[] = [];

  if (data.scenariosCount !== undefined)
    details.push(`• *${t('environment.slack.labels.totalScenarios')}:* ${data.scenariosCount}`);
  if (data.executedScenariosCount !== undefined)
    details.push(
      `• *${t('environment.slack.labels.executedScenarios')}:* ${data.executedScenariosCount}`,
    );
  if (data.executedScenariosMessage)
    details.push(`• *${t('environment.slack.labels.status')}:* ${data.executedScenariosMessage}`);

  const bugs = data.bugsRegistered ?? data.fix?.value ?? 0;
  details.push(`• *${t('environment.slack.labels.bugs')}:* ${bugs}`);

  lines.push(`🧪 *${t('environment.slack.sections.execution')}*`);
  lines.push(...details);
  lines.push('');
};

const addSuite = (lines: string[], data: ExecutionReportData): void => {
  const details: string[] = [];

  if (data.suiteName)
    details.push(`• *${t('environment.slack.labels.suiteName')}:* ${data.suiteName}`);
  if (data.suiteDetails)
    details.push(`• *${t('environment.slack.labels.suiteCoverage')}:* ${data.suiteDetails}`);

  if (details.length === 0) return;

  lines.push(`📦 *${t('environment.slack.sections.suite')}*`);
  lines.push(...details);
  lines.push('');
};

const addMonitoredUrls = (lines: string[], data: ExecutionReportData): void => {
  if (!data.monitoredUrls || data.monitoredUrls.length === 0) return;

  lines.push(`🌐 *${t('environment.slack.sections.monitoredUrls')}*`);
  data.monitoredUrls.forEach((url) => lines.push(`• ${url}`));
  lines.push('');
};

const addExecutionContext = (lines: string[], data: ExecutionReportData): void => {
  const details: string[] = [];

  if (data.executionContext)
    details.push(`• *${t('environment.slack.labels.executionContext')}:* ${data.executionContext}`);
  if (data.identifier)
    details.push(`• *${t('environment.slack.labels.executionId')}:* ${data.identifier}`);
  if (data.totalTime)
    details.push(`• *${t('environment.slack.labels.totalTime')}:* ${data.totalTime}`);

  if (details.length === 0) return;

  lines.push(`🎯 *${t('environment.slack.sections.executionContext')}*`);
  lines.push(...details);
  lines.push('');
};

const addParticipants = (lines: string[], data: ExecutionReportData): void => {
  if (data.participantsCount === undefined && !data.attendees?.length) return;

  lines.push(`👥 *${t('environment.slack.sections.participants')}*`);

  if (data.participantsCount !== undefined) {
    lines.push(`• *${t('environment.slack.labels.participantsCount')}:* ${data.participantsCount}`);
  }

  data.attendees?.forEach((attendee) => {
    if (typeof attendee === 'string') {
      lines.push(`• ${attendee}`);
      return;
    }

    lines.push(`• ${attendee.name} (${attendee.email})`);
  });

  lines.push('');
};

const addJiraTasks = (lines: string[], data: ExecutionReportData): void => {
  const tasks =
    data.jiraTasks && data.jiraTasks.length > 0 ? data.jiraTasks : data.jira ? [data.jira] : [];

  if (tasks.length === 0) return;

  lines.push(`🔗 *${t('environment.slack.sections.jira')}*`);
  tasks.forEach((task) => lines.push(`• ${task}`));
  lines.push('');
};
