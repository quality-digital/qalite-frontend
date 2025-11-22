import type {
  BrowserstackBuild,
  BrowserstackCredentials,
} from '../../domain/entities/browserstack';

const getServiceBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_QALITE_SERVICE_URL as string | undefined)?.trim();
  return envUrl && envUrl.length > 0 ? envUrl.replace(/\/$/, '') : 'http://localhost:3000';
};

export const listBrowserstackBuilds = async (
  credentials: BrowserstackCredentials,
): Promise<BrowserstackBuild[]> => {
  const username = credentials.username?.trim();
  const password = credentials.password?.trim();

  if (!username || !password) {
    throw new Error('Informe usuário e senha do BrowserStack na organização para continuar.');
  }

  const baseUrl = getServiceBaseUrl();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}/browserstack/builds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
  } catch (error) {
    const hint =
      `Não foi possível conectar ao serviço QaLite em ${baseUrl}. ` +
      'Verifique se a API está em execução ou ajuste a variável VITE_QALITE_SERVICE_URL.';
    const message = error instanceof Error ? `${hint} Erro: ${error.message}` : hint;
    throw new Error(message);
  }

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message ?? 'Não foi possível carregar as execuções do BrowserStack.');
  }

  return parseBuildsResponse(await response.json().catch(() => null));
};

const parseBuildsResponse = (data: unknown): BrowserstackBuild[] => {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && Array.isArray((data as { builds?: unknown }).builds)) {
    return (data as { builds: BrowserstackBuild[] }).builds;
  }

  return [];
};

const extractErrorMessage = async (response: Response): Promise<string | null> => {
  try {
    const data = await response.json();
    if (typeof data?.message === 'string') {
      return data.message;
    }
  } catch (error) {
    console.warn('Não foi possível interpretar a resposta do BrowserStack:', error);
  }

  return null;
};
