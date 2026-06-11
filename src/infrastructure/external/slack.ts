import type {
  EnvironmentSummaryAttendee,
  EnvironmentSummaryPayload,
  SlackTaskSummaryPayload,
} from '../../domain/entities/slack';
import { formatExecutionReportToSlack } from './slackMessageFormatter';
import type { ExecutionReportData } from './slackMessageFormatter';

export type {
  EnvironmentSummaryAttendee,
  EnvironmentSummaryPayload,
  SlackTaskSummaryPayload,
  ExecutionReportData,
};

const buildSlackWebhookBody = (payload: SlackTaskSummaryPayload): { text: string } => {
  const message =
    payload.message?.trim() || formatExecutionReportToSlack(payload.environmentSummary);

  return { text: message };
};

const getSlackWebhookUrl = (webhookUrl?: string | null): string => {
  const normalizedWebhookUrl = webhookUrl?.trim();

  if (!normalizedWebhookUrl) {
    throw new Error('Webhook do Slack não configurado.');
  }

  return normalizedWebhookUrl;
};

const extractSlackErrorMessage = async (response: Response): Promise<string | null> => {
  const message = (await response.text()).trim();
  return message || null;
};

export const sendEnvironmentSummaryToSlack = async (
  payload: SlackTaskSummaryPayload,
): Promise<void> => {
  const webhookUrl = getSlackWebhookUrl(payload.webhookUrl);
  let response: Response;

  try {
    response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildSlackWebhookBody(payload)),
    });
  } catch (error) {
    const message = error instanceof Error ? ` Erro: ${error.message}` : '';
    throw new Error(`Não foi possível enviar o resumo diretamente para o Slack.${message}`);
  }

  if (!response.ok) {
    const message = await extractSlackErrorMessage(response);
    throw new Error(message ?? 'Falha ao enviar resumo para o Slack.');
  }
};

export const sendExecutionReportToSlack = async (
  reportData: ExecutionReportData,
  webhookUrl?: string | null,
): Promise<void> => {
  await sendEnvironmentSummaryToSlack({
    environmentSummary: reportData,
    message: formatExecutionReportToSlack(reportData),
    webhookUrl: webhookUrl ?? null,
  });
};
