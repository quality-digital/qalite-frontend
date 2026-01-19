import { normalizeAutomationEnum } from './scenarioEnums';

export const isAutomatedScenario = (value: string | null | undefined) =>
  normalizeAutomationEnum(value) === 'AUTOMATED';
