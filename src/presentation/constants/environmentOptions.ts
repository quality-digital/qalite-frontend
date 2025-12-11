export const TEST_TYPES_BY_ENVIRONMENT: Record<string, string[]> = {
  WS: ['environmentOptions.smokeTest', 'environmentOptions.seo', 'environmentOptions.performance', 'environmentOptions.regressive'],
  TM: ['environmentOptions.smoke', 'environmentOptions.seo', 'environmentOptions.performance'],
  PROD: ['environmentOptions.smokeTest', 'environmentOptions.regressive'],
};

export const MOMENT_OPTIONS_BY_ENVIRONMENT: Record<string, string[]> = {
  TM: ['environmentOptions.pre', 'environmentOptions.post'],
  PROD: ['environmentOptions.post', 'environmentOptions.prod'],
};

export const requiresReleaseField = (tipoAmbiente: string): boolean => tipoAmbiente === 'TM';
