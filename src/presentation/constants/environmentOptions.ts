export const TEST_TYPES_BY_ENVIRONMENT: Record<string, string[]> = {
  WS: ['Smoke-test', 'SEO', 'Performance', 'Regressivo', 'Progressivo'],
  TM: ['Smoke', 'SEO', 'Performance', 'Progressivo'],
  PROD: ['Smoke-test', 'Regressivo', 'Progressivo'],
};

export const MOMENT_OPTIONS_BY_ENVIRONMENT: Record<string, string[]> = {
  TM: ['Pré-deploy', 'Pós-deploy'],
  PROD: ['Pós-deploy', 'Prod'],
};

export const requiresReleaseField = (tipoAmbiente: string): boolean => tipoAmbiente === 'TM';
