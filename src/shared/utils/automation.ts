export const normalizeAutomationValue = (value: string | null | undefined) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .toLowerCase();

export const isAutomatedScenario = (value: string | null | undefined) => {
  const normalized = normalizeAutomationValue(value);
  return normalized.startsWith('automatizado') || normalized === 'sim';
};
