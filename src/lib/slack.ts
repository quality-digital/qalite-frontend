const getServiceBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_QALITE_SERVICE_URL as string | undefined)?.trim();
  return envUrl && envUrl.length > 0 ? envUrl.replace(/\/$/, '') : 'http://localhost:3000';
};

export interface EnvironmentSummaryAttendee {
  name: string;
  email: string;
}

export interface EnvironmentSummaryPayload {
  identifier?: string;
  totalTime?: string;
  totalTimeMs?: number;
  scenariosCount?: number;
  executedScenariosCount?: number;
  executedScenariosMessage?: string;
  fix?: {
    type?: 'bug' | 'storyfixes';
    value?: number;
  };
  jira?: string;
  suiteName?: string;
  suiteDetails?: string;
  participantsCount?: number;
  monitoredUrls?: string[];
  attendees?: Array<EnvironmentSummaryAttendee | string>;
}

export interface SlackTaskSummaryPayload {
  environmentSummary: EnvironmentSummaryPayload;
  message?: string;
}

export const sendEnvironmentSummaryToSlack = async (
  payload: SlackTaskSummaryPayload,
): Promise<void> => {
  const response = await fetch(`${getServiceBaseUrl()}/slack/task-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message ?? 'Falha ao enviar resumo para o Slack.');
  }
};

const extractErrorMessage = async (response: Response): Promise<string | null> => {
  try {
    const data = await response.json();
    if (typeof data?.message === 'string') {
      return data.message;
    }
  } catch (error) {
    console.warn('Não foi possível interpretar a resposta do Slack:', error);
  }

  return null;
};
