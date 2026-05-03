const DEFAULT_TEST_TYPES = [
  'environmentOptions.smokeTest',
  'environmentOptions.seo',
  'environmentOptions.performance',
  'environmentOptions.regressive',
];

export const TEST_TYPES_BY_ENVIRONMENT: Record<string, string[]> = {
  WS: DEFAULT_TEST_TYPES,
  Preview: DEFAULT_TEST_TYPES,
  TM: ['environmentOptions.smoke', 'environmentOptions.seo', 'environmentOptions.performance'],
  PROD: ['environmentOptions.smokeTest', 'environmentOptions.regressive'],
};

export const MOMENT_OPTIONS_BY_ENVIRONMENT: Record<string, string[]> = {
  TM: ['environmentOptions.pre', 'environmentOptions.post'],
  PROD: ['environmentOptions.post', 'environmentOptions.prod'],
  RELEASE: ['environmentOptions.pre', 'environmentOptions.post'],
};

export {
  requiresReleaseField,
  translateEnvironmentOption,
} from '../../shared/utils/environmentOptions';
