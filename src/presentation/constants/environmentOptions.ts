export const TEST_TYPES_BY_ENVIRONMENT: Record<string, string[]> = {
  WS: [
    'environmentOptions.smokeTest',
    'environmentOptions.seo',
    'environmentOptions.performance',
    'environmentOptions.regressive',
  ],
  Preview: [
    'environmentOptions.smokeTest',
    'environmentOptions.seo',
    'environmentOptions.performance',
    'environmentOptions.regressive',
  ],
  TM: ['environmentOptions.smoke', 'environmentOptions.seo', 'environmentOptions.performance'],
  PROD: ['environmentOptions.smokeTest', 'environmentOptions.regressive'],
};

export const MOMENT_OPTIONS_BY_ENVIRONMENT: Record<string, string[]> = {
  TM: ['environmentOptions.pre', 'environmentOptions.post'],
  PROD: ['environmentOptions.post', 'environmentOptions.prod'],
};

export const requiresReleaseField = (tipoAmbiente: string): boolean => tipoAmbiente === 'TM';

export const getEnvironmentTypeOptions = (primaryOption: {
  value: string;
  label: string;
}): { value: string; label: string }[] => {
  const defaults = [
    { value: 'TM', label: 'environmentOptions.TM' },
    { value: 'PROD', label: 'environmentOptions.PROD' },
  ];

  return [primaryOption, ...defaults].filter(
    (option, index, options) =>
      options.findIndex((entry) => entry.value === option.value) === index,
  );
};

export { translateEnvironmentOption } from '../../shared/utils/environmentOptions';
