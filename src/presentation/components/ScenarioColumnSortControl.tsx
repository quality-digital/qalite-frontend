import type {
  ScenarioSortConfig,
  ScenarioSortDirection,
  ScenarioSortField,
} from '../utils/scenarioSorting';

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
