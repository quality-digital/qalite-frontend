import type { AutomationValue, CriticalityValue } from '../../shared/utils/scenarioEnums';
import {
  normalizeAutomationEnum,
  normalizeCriticalityEnum,
} from '../../shared/utils/scenarioEnums';

export const AUTOMATION_OPTIONS = [
  { value: 'AUTOMATED', label: 'scenarioOptions.automated' },
  { value: 'NOT_AUTOMATED', label: 'scenarioOptions.notAutomated' },
] as const;

export const CRITICALITY_OPTIONS = [
  { value: 'LOW', label: 'scenarioOptions.low' },
  { value: 'MEDIUM', label: 'scenarioOptions.medium' },
  { value: 'HIGH', label: 'scenarioOptions.high' },
  { value: 'CRITICAL', label: 'scenarioOptions.critical' },
] as const;

const CRITICALITY_CLASS_MAP: Record<CriticalityValue, string> = {
  LOW: 'criticality-badge--low',
  MEDIUM: 'criticality-badge--medium',
  HIGH: 'criticality-badge--high',
  CRITICAL: 'criticality-badge--critical',
};

const AUTOMATION_LABEL_MAP: Record<AutomationValue, string> = {
  AUTOMATED: 'scenarioOptions.automated',
  NOT_AUTOMATED: 'scenarioOptions.notAutomated',
};

const CRITICALITY_LABEL_MAP: Record<CriticalityValue, string> = {
  LOW: 'scenarioOptions.low',
  MEDIUM: 'scenarioOptions.medium',
  HIGH: 'scenarioOptions.high',
  CRITICAL: 'scenarioOptions.critical',
};

export const getAutomationLabelKey = (value: string | null | undefined) => {
  const normalized = normalizeAutomationEnum(value);
  return normalized ? AUTOMATION_LABEL_MAP[normalized] : null;
};

export const getCriticalityLabelKey = (value: string | null | undefined) => {
  const normalized = normalizeCriticalityEnum(value);
  return normalized ? CRITICALITY_LABEL_MAP[normalized] : null;
};

export const getCriticalityClassName = (value: string) => {
  const normalized = normalizeCriticalityEnum(value);
  return normalized ? CRITICALITY_CLASS_MAP[normalized] : 'criticality-badge--low';
};
