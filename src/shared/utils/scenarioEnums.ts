export type AutomationValue = 'AUTOMATED' | 'NOT_AUTOMATED';
export type CriticalityValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const normalizeValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '')
    .toLowerCase();

const AUTOMATION_VALUE_MAP: Record<string, AutomationValue> = {
  automated: 'AUTOMATED',
  automatizado: 'AUTOMATED',
  sim: 'AUTOMATED',
  notautomated: 'NOT_AUTOMATED',
  naoautomatizado: 'NOT_AUTOMATED',
  nao: 'NOT_AUTOMATED',
};

const CRITICALITY_VALUE_MAP: Record<string, CriticalityValue> = {
  low: 'LOW',
  baixa: 'LOW',
  medium: 'MEDIUM',
  media: 'MEDIUM',
  high: 'HIGH',
  alta: 'HIGH',
  critical: 'CRITICAL',
  critica: 'CRITICAL',
};

export const normalizeAutomationEnum = (value: string | null | undefined): AutomationValue | '' => {
  const normalized = normalizeValue(value ?? '');
  return AUTOMATION_VALUE_MAP[normalized] ?? '';
};

export const normalizeCriticalityEnum = (
  value: string | null | undefined,
): CriticalityValue | '' => {
  const normalized = normalizeValue(value ?? '');
  return CRITICALITY_VALUE_MAP[normalized] ?? '';
};
