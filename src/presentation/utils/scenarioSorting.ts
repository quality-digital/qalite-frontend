const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '')
    .toLowerCase();

const CRITICALITY_PRIORITY: Record<string, number> = {
  critica: 0,
  crítica: 0,
  alta: 1,
  media: 2,
  média: 2,
  baixa: 3,
};

const AUTOMATION_PRIORITY: Record<string, number> = {
  automatizado: 0,
  naoautomatizado: 1,
  nãoautomatizado: 1,
};

export interface ScenarioSortableShape {
  criticality?: string | null;
  category?: string | null;
  automation?: string | null;
  title?: string | null;
}

export type ScenarioSortField = 'criticality' | 'automation' | 'category';
export type ScenarioSortDirection = 'asc' | 'desc';

export interface ScenarioSortConfig {
  field: ScenarioSortField;
  direction: ScenarioSortDirection;
}

const compareText = (a?: string | null, b?: string | null) => {
  const first = (a ?? '').trim();
  const second = (b ?? '').trim();
  if (!first && !second) {
    return 0;
  }

  return first.localeCompare(second, 'pt-BR', { sensitivity: 'base' });
};

const getCriticalityRank = (value?: string | null) => {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  return CRITICALITY_PRIORITY[normalize(value)] ?? Number.MAX_SAFE_INTEGER;
};

const getAutomationRank = (value?: string | null) => {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  return AUTOMATION_PRIORITY[normalize(value)] ?? Number.MAX_SAFE_INTEGER;
};

export const compareScenarioPriority = <T extends ScenarioSortableShape>(a: T, b: T) => {
  const criticalityDiff = getCriticalityRank(a.criticality) - getCriticalityRank(b.criticality);
  if (criticalityDiff !== 0) {
    return criticalityDiff;
  }

  const categoryDiff = compareText(a.category, b.category);
  if (categoryDiff !== 0) {
    return categoryDiff;
  }

  const automationDiff = getAutomationRank(a.automation) - getAutomationRank(b.automation);
  if (automationDiff !== 0) {
    return automationDiff;
  }

  return compareText(a.title, b.title);
};

const compareScenarioField = <T extends ScenarioSortableShape>(
  a: T,
  b: T,
  field: ScenarioSortField,
) => {
  switch (field) {
    case 'criticality':
      return getCriticalityRank(a.criticality) - getCriticalityRank(b.criticality);
    case 'automation':
      return getAutomationRank(a.automation) - getAutomationRank(b.automation);
    case 'category':
    default:
      return compareText(a.category, b.category);
  }
};

export const createScenarioSortComparator = <T extends ScenarioSortableShape>(
  sort: ScenarioSortConfig,
) => {
  const multiplier = sort.direction === 'asc' ? 1 : -1;

  return (a: T, b: T) => {
    const fieldDiff = compareScenarioField(a, b, sort.field);
    if (fieldDiff !== 0) {
      return fieldDiff * multiplier;
    }

    return compareText(a.title, b.title) * multiplier;
  };
};

export const sortScenarioList = <T extends ScenarioSortableShape>(
  list: T[],
  sort?: ScenarioSortConfig | null,
) => {
  if (!sort) {
    return list;
  }

  const comparator = createScenarioSortComparator(sort);
  return list.slice().sort(comparator);
};
