export const TEST_TYPES_BY_ENVIRONMENT: Record<string, string[]> = {
  WS: ['Smoke-test', 'SEO', 'Performance', 'Regressivo'],
  TM: ['Smoke', 'SEO', 'Performance'],
  PROD: ['Smoke-test', 'Regressivo'],
};

export const MOMENT_OPTIONS_BY_ENVIRONMENT: Record<string, string[]> = {
  TM: ['Pré-deploy', 'Pós-deploy'],
  PROD: ['Pós-deploy', 'Prod'],
};

export const requiresReleaseField = (tipoAmbiente: string): boolean => tipoAmbiente === 'TM';
