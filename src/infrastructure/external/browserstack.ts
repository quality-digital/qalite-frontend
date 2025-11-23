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
  const accessKey = credentials.accessKey?.trim();

  if (!username || !accessKey) {
    throw new Error('Informe usuário e access key do BrowserStack na organização para continuar.');
  }

  const baseUrl = getServiceBaseUrl();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}/browserstack/builds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, accessKey }),
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
    throw new Error(
      message ??
        `Não foi possível carregar as execuções do BrowserStack. (${response.status} ${response.statusText})`,
    );
  }

  return parseBuildsResponse(await response.json().catch(() => null));
};

const parseBuildsResponse = (data: unknown): BrowserstackBuild[] => {
  const builds: unknown[] | undefined = Array.isArray(data)
    ? data
    : Array.isArray((data as { builds?: unknown })?.builds)
      ? (data as { builds: unknown[] }).builds
      : undefined;

  if (!builds) {
    return [];
  }

  return builds
    .map((build) => sanitizeBuild(build))
    .filter((build): build is BrowserstackBuild => Boolean(build?.id));
};

const sanitizeBuild = (build: unknown): BrowserstackBuild | null => {
  if (!build || typeof build !== 'object') {
    return null;
  }

  const { id, name, status, duration, buildTag, publicUrl } = build as Record<string, unknown>;

  if (typeof id !== 'string' || id.trim().length === 0) {
    return null;
  }

  return {
    id,
    name: typeof name === 'string' ? name : '',
    status: typeof status === 'string' ? status : 'unknown',
    duration: typeof duration === 'number' && Number.isFinite(duration) ? duration : 0,
    buildTag: typeof buildTag === 'string' ? buildTag : '',
    publicUrl: typeof publicUrl === 'string' ? publicUrl : '',
  };
};

const extractErrorMessage = async (response: Response): Promise<string | null> => {
  try {
    const data = await response.clone().json();
    if (typeof data?.message === 'string') {
      return data.message;
    }
    if (typeof data?.error === 'string') {
      return data.error;
    }
  } catch (error) {
    console.warn('Não foi possível interpretar a resposta JSON do BrowserStack:', error);
  }

  try {
    const text = (await response.text()).trim();
    if (text.length > 0) {
      return text;
    }
  } catch (error) {
    console.warn('Não foi possível interpretar a resposta em texto do BrowserStack:', error);
  }

  return null;
};
