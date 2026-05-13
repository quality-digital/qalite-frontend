const ALLOWED_TEST_TYPES = ['environmentOptions.smokeTest', 'environmentOptions.regressive'];

export const TEST_TYPES_BY_ENVIRONMENT: Record<string, string[]> = {
  WS: ALLOWED_TEST_TYPES,
  Preview: ALLOWED_TEST_TYPES,
  TM: ALLOWED_TEST_TYPES,
  PROD: ALLOWED_TEST_TYPES,
};

export const MOMENT_OPTIONS_BY_ENVIRONMENT: Record<string, string[]> = {
  TM: ['environmentOptions.pre', 'environmentOptions.post'],
};

export {
  requiresReleaseField,
  translateEnvironmentOption,
} from '../../shared/utils/environmentOptions';
