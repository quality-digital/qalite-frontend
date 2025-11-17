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

interface ScenarioColumnSortControlProps {
  label: string;
  field: ScenarioSortField;
  sort: ScenarioSortConfig | null;
  onChange: (sort: ScenarioSortConfig | null) => void;
}

const nextSortState = (
  field: ScenarioSortField,
  direction: ScenarioSortDirection,
  currentSort: ScenarioSortConfig | null,
): ScenarioSortConfig | null => {
  if (currentSort?.field === field && currentSort.direction === direction) {
    return null;
  }

  return { field, direction };
};

export const ScenarioColumnSortControl = ({
  label,
  field,
  sort,
  onChange,
}: ScenarioColumnSortControlProps) => {
  const activeDirection = sort?.field === field ? sort.direction : null;

  const handleToggle = (direction: ScenarioSortDirection) => {
    onChange(nextSortState(field, direction, sort));
  };

  return (
    <div className="scenario-column-sort">
      <span className="scenario-column-sort-label">{label}</span>
      <div className="scenario-column-sort-buttons" role="group" aria-label={`Ordenar ${label}`}>
        <button
          type="button"
          className="scenario-column-sort-button"
          aria-pressed={activeDirection === 'asc'}
          onClick={() => handleToggle('asc')}
          aria-label={`Ordenar ${label} em ordem crescente`}
        >
          ↑
        </button>
        <button
          type="button"
          className="scenario-column-sort-button"
          aria-pressed={activeDirection === 'desc'}
          onClick={() => handleToggle('desc')}
          aria-label={`Ordenar ${label} em ordem decrescente`}
        >
          ↓
        </button>
      </div>
    </div>
  );
};
