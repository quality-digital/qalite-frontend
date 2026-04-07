import type { EnvironmentSummaryPayload } from '../../domain/entities/slack';

export interface ExecutionReportData extends EnvironmentSummaryPayload {
  environment?: string;
  testType?: string;
  executionType?: string;
  release?: string;
  bugsRegistered?: number;
  executionContext?: string;
  jiraTasks?: string[];
  participantEmails?: string[];
}

/**
 * Formata um relatório de execução em texto estruturado para envio ao Slack
 * com emojis e separações visuais
 */
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

  return lines.join('\n');
};

const addHeader = (lines: string[]): void => {
  lines.push('📊 QALITE | Relatório de Execução\n');
};

const addIdentification = (lines: string[], data: ExecutionReportData): void => {
  lines.push('🔖 Identificação');
  if (data.environment) lines.push(`• Ambiente: ${data.environment}`);
  if (data.testType) lines.push(`• Tipo de teste: ${data.testType}`);
  if (data.executionType) lines.push(`• Execução: ${data.executionType}`);
  if (data.release) lines.push(`• Release: ${data.release}`);
  lines.push('');
};

const addScenarioExecution = (lines: string[], data: ExecutionReportData): void => {
  lines.push('🧪 Execução de Cenários');
  if (data.scenariosCount !== undefined) lines.push(`• Total de cenários: ${data.scenariosCount}`);
  if (data.executedScenariosCount !== undefined)
    lines.push(`• Cenários executados: ${data.executedScenariosCount}`);
  if (data.executedScenariosMessage) lines.push(`• Status: ${data.executedScenariosMessage}`);
  const bugs = data.bugsRegistered ?? data.fix?.value ?? 0;
  lines.push(`• Bugs registrados: ${bugs}`);
  lines.push('');
};

const addSuite = (lines: string[], data: ExecutionReportData): void => {
  lines.push('📦 Suíte');
  if (data.suiteName) lines.push(`• Nome: ${data.suiteName}`);
  if (data.suiteDetails) lines.push(`• Detalhes: ${data.suiteDetails}`);
  if (data.scenariosCount !== undefined)
    lines.push(`• Total vinculado: ${data.scenariosCount} cenários`);
  lines.push('');
};

const addMonitoredUrls = (lines: string[], data: ExecutionReportData): void => {
  if (!data.monitoredUrls || data.monitoredUrls.length === 0) return;

  lines.push('🌐 URLs Monitoradas');
  data.monitoredUrls.forEach((url) => {
    lines.push(`• ${url}`);
  });
  lines.push('');
};

const addExecutionContext = (lines: string[], data: ExecutionReportData): void => {
  if (!data.executionContext && !data.identifier) return;

  lines.push('🎯 Contexto da Execução');
  if (data.executionContext) lines.push(`• ${data.executionContext}`);
  if (data.identifier) lines.push(`• ID da Execução: ${data.identifier}`);
  if (data.totalTime) lines.push(`• Tempo Total: ${data.totalTime}`);
  lines.push('');
};

const addParticipants = (lines: string[], data: ExecutionReportData): void => {
  if (data.participantsCount === undefined && !data.attendees) return;

  lines.push('👥 Participantes');
  if (data.participantsCount !== undefined)
    lines.push(`• ${data.participantsCount} participante(s) ativo(s)`);
  if (data.attendees && data.attendees.length > 0) {
    data.attendees.forEach((attendee) => {
      if (typeof attendee === 'string') {
        lines.push(`• ${attendee}`);
      } else {
        lines.push(`• ${attendee.name} (${attendee.email})`);
      }
    });
  }
  lines.push('');
};

const addJiraTasks = (lines: string[], data: ExecutionReportData): void => {
  if (data.jiraTasks && data.jiraTasks.length > 0) {
    lines.push('🔗 Jira (Tasks relacionadas)');
    data.jiraTasks.forEach((task) => {
      lines.push(`• ${task}`);
    });
    lines.push('');
  } else if (data.jira) {
    lines.push('🔗 Jira (Tasks relacionadas)');
    lines.push(`• ${data.jira}`);
    lines.push('');
  }
};
