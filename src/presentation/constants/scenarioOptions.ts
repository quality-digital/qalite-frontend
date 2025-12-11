export const AUTOMATION_OPTIONS = [
  { value: 'Automatizado', label: 'scenarioOptions.automated' },
  { value: 'Não automatizado', label: 'scenarioOptions.notAutomated' },
];

export const CRITICALITY_OPTIONS = [
  { value: 'Baixa', label: 'scenarioOptions.low' },
  { value: 'Média', label: 'scenarioOptions.medium' },
  { value: 'Alta', label: 'scenarioOptions.high' },
  { value: 'Crítica', label: 'scenarioOptions.critical' },
];

const CRITICALITY_CLASS_MAP: Record<string, string> = {
  baixa: 'criticality-badge--low',
  media: 'criticality-badge--medium',
  média: 'criticality-badge--medium',
  alta: 'criticality-badge--high',
  critica: 'criticality-badge--critical',
  crítica: 'criticality-badge--critical',
};

const normalizeValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '')
    .toLowerCase();

export const getCriticalityClassName = (value: string) => {
  const normalized = normalizeValue(value);
  return CRITICALITY_CLASS_MAP[normalized] ?? 'criticality-badge--low';
};
