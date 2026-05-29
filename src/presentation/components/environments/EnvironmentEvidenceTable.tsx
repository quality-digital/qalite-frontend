import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Environment,
  EnvironmentScenario,
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
} from '../../../domain/entities/environment';
import { useScenarioEvidence } from '../../hooks/useScenarioEvidence';
import {
  ScenarioColumnSortControl,
  createScenarioSortComparator,
  type ScenarioSortConfig,
} from '../ScenarioColumnSortControl';
import { isAutomatedScenario } from '../../../shared/utils/automation';
import { getEnvironmentColumns } from '../../../infrastructure/external/environments';
import {
  getAutomationLabelKey,
  getCriticalityClassName,
  getCriticalityLabelKey,
} from '../../constants/scenarioOptions';
import {
  normalizeAutomationEnum,
  normalizeCriticalityEnum,
} from '../../../shared/utils/scenarioEnums';
import { useToast } from '../../context/ToastContext';
import { PaginationControls } from '../PaginationControls';
import { EyeIcon } from '../icons';

interface EnvironmentEvidenceTableProps {
  environment: Environment;
  isLocked?: boolean;
  readOnly?: boolean;
  onViewDetails?: (scenarioId: string) => void;
}

export const EnvironmentEvidenceTable = ({
  environment,
  isLocked,
  readOnly,
  onViewDetails,
}: EnvironmentEvidenceTableProps) => {
  const { t: translation } = useTranslation();
  const { isUpdating, changeScenarioStatus } = useScenarioEvidence(environment.id);
  const { showToast } = useToast();
  const [scenarioSort, setScenarioSort] = useState<ScenarioSortConfig | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [automationFilter, setAutomationFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const canViewDetails = Boolean(onViewDetails);
  const environmentColumns = useMemo(() => getEnvironmentColumns(environment), [environment]);

  const BASE_STATUS_OPTIONS = [
    { value: 'pendente', label: translation('environmentEvidenceTable.status_pendente') },
    { value: 'em_andamento', label: translation('environmentEvidenceTable.status_em_andamento') },
    { value: 'bloqueado', label: translation('environmentEvidenceTable.status_bloqueado') },
    { value: 'concluido', label: translation('environmentEvidenceTable.status_concluido') },
    { value: 'nao_se_aplica', label: translation('environmentEvidenceTable.status_nao_se_aplica') },
  ];

  const AUTOMATED_STATUS_OPTION = {
    value: 'concluido_automatizado',
    label: translation('environmentEvidenceTable.status_concluido_automatizado'),
  };

  const getScenarioStatusOptions = (scenario: EnvironmentScenario) =>
    isAutomatedScenario(scenario.automatizado)
      ? [
          ...BASE_STATUS_OPTIONS.slice(0, 3),
          AUTOMATED_STATUS_OPTION,
          ...BASE_STATUS_OPTIONS.slice(3),
        ]
      : BASE_STATUS_OPTIONS;

  const scenarioEntries = useMemo(() => {
    const entries = Object.entries(environment.scenarios ?? {});
    return entries.sort(([firstId, first], [secondId, second]) => {
      const firstTitle = first.titulo?.trim() ?? '';
      const secondTitle = second.titulo?.trim() ?? '';
      const diff = firstTitle.localeCompare(secondTitle, 'pt-BR', { sensitivity: 'base' });

      if (diff !== 0) {
        return diff;
      }

      return firstId.localeCompare(secondId, 'pt-BR', { sensitivity: 'base' });
    });
  }, [environment.scenarios]);
  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    scenarioEntries.forEach(([, data]) => {
      const normalized = data.categoria?.trim();
      if (normalized) {
        categories.add(normalized);
      }
    });
    return Array.from(categories).sort((first, second) =>
      first.localeCompare(second, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [scenarioEntries]);
  const automationOptions = useMemo(() => {
    const automations = new Set<string>();
    scenarioEntries.forEach(([, data]) => {
      const normalized = normalizeAutomationEnum(data.automatizado);
      if (normalized) {
        automations.add(normalized);
      }
    });
    return Array.from(automations).sort((first, second) =>
      first.localeCompare(second, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [scenarioEntries]);
  const criticalityOptions = useMemo(() => {
    const criticalities = new Set<string>();
    scenarioEntries.forEach(([, data]) => {
      const normalized = normalizeCriticalityEnum(data.criticidade);
      if (normalized) {
        criticalities.add(normalized);
      }
    });
    return Array.from(criticalities).sort((first, second) =>
      first.localeCompare(second, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [scenarioEntries]);
  const filteredScenarioEntries = useMemo(
    () =>
      scenarioEntries.filter(([, data]) => {
        const matchesCategory = categoryFilter ? data.categoria === categoryFilter : true;
        const matchesCriticality = criticalityFilter
          ? normalizeCriticalityEnum(data.criticidade) === criticalityFilter
          : true;
        const matchesAutomation = automationFilter
          ? normalizeAutomationEnum(data.automatizado) === automationFilter
          : true;
        return matchesCategory && matchesAutomation && matchesCriticality;
      }),
    [automationFilter, categoryFilter, criticalityFilter, scenarioEntries],
  );
  const orderedScenarioEntries = useMemo(() => {
    if (!scenarioSort) {
      return filteredScenarioEntries;
    }

    const comparator = createScenarioSortComparator(scenarioSort);
    return filteredScenarioEntries.slice().sort(([, first], [, second]) =>
      comparator(
        {
          criticality: first.criticidade,
          category: first.categoria,
          automation: first.automatizado ?? '',
          title: first.titulo,
        },
        {
          criticality: second.criticidade,
          category: second.categoria,
          automation: second.automatizado ?? '',
          title: second.titulo,
        },
      ),
    );
  }, [filteredScenarioEntries, scenarioSort]);
  const paginatedScenarioEntries = useMemo(
    () => orderedScenarioEntries.slice(0, visibleCount),
    [orderedScenarioEntries, visibleCount],
  );
  const isReadOnly = Boolean(isLocked || readOnly);
  useEffect(() => {
    setVisibleCount(20);
  }, [automationFilter, categoryFilter, criticalityFilter, scenarioSort, scenarioEntries.length]);

  const formatCriticalityLabel = (value?: string | null) => {
    const labelKey = getCriticalityLabelKey(value);
    if (labelKey) {
      return translation(labelKey);
    }
    return value?.trim() || translation('storeSummary.emptyValue');
  };
  const formatAutomationLabel = (value?: string | null) => {
    const labelKey = getAutomationLabelKey(value);
    if (labelKey) {
      return translation(labelKey);
    }
    return value?.trim() || translation('storeSummary.emptyValue');
  };

  const getAutomationClassName = (value?: string | null) =>
    isAutomatedScenario(value) ? 'automation-badge--automated' : 'automation-badge--not-automated';

  const handleStatusChange = async (
    scenarioId: string,
    platform: EnvironmentScenarioPlatform,
    status: EnvironmentScenarioStatus,
  ) => {
    if (isReadOnly) {
      return;
    }

    const scenario = environment.scenarios?.[scenarioId];
    if (!scenario) {
      showToast({
        type: 'error',
        message: translation('environmentEvidenceTable.toast_not_found'),
      });
      return;
    }

    await changeScenarioStatus(scenarioId, status, platform);
  };

  if (scenarioEntries.length === 0) {
    return (
      <p className="section-subtitle">{translation('environmentEvidenceTable.cenarios_vazio')}</p>
    );
  }

  if (filteredScenarioEntries.length === 0) {
    return (
      <p className="section-subtitle">
        {translation('environmentEvidenceTable.cenarios_sem_filtro')}
      </p>
    );
  }

  return (
    <div className="environment-table">
      <div className="environment-table__filters">
        <label className="environment-table__filter">
          <span className="environment-table__filter-label">
            {translation('environmentEvidenceTable.filters_categoria')}
          </span>
          <select
            className="environment-table__filter-select"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label={translation('environmentEvidenceTable.filters_categoria')}
          >
            <option value="">{translation('environmentEvidenceTable.filters_todas')}</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="environment-table__filter">
          <span className="environment-table__filter-label">
            {translation('storeSummary.automation')}
          </span>
          <select
            className="environment-table__filter-select"
            value={automationFilter}
            onChange={(event) => setAutomationFilter(event.target.value)}
            aria-label={translation('storeSummary.automation')}
          >
            <option value="">{translation('environmentEvidenceTable.filters_todas')}</option>
            {automationOptions.map((option) => {
              const labelKey = getAutomationLabelKey(option);
              const label = labelKey ? translation(labelKey) : option;
              return (
                <option key={option} value={option}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>
        <label className="environment-table__filter">
          <span className="environment-table__filter-label">
            {translation('environmentEvidenceTable.filters_criticidade')}
          </span>
          <select
            className="environment-table__filter-select"
            value={criticalityFilter}
            onChange={(event) => setCriticalityFilter(event.target.value)}
            aria-label={translation('environmentEvidenceTable.filters_criticidade')}
          >
            <option value="">{translation('environmentEvidenceTable.filters_todas')}</option>
            {criticalityOptions.map((option) => {
              const labelKey = getCriticalityLabelKey(option);
              const label = labelKey ? translation(labelKey) : option;
              return (
                <option key={option} value={option}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      <div className="table-scroll-area">
        <table className="data-table">
          <thead>
            <tr>
              <th className="scenario-title-column">
                {translation('environmentEvidenceTable.table_titulo')}
              </th>
              <th className="environment-table__cell-nowrap">
                <ScenarioColumnSortControl
                  label={translation('environmentEvidenceTable.table_categoria')}
                  field="category"
                  sort={scenarioSort}
                  onChange={setScenarioSort}
                />
              </th>
              <th className="environment-table__cell-nowrap">
                <ScenarioColumnSortControl
                  label={translation('storeSummary.automation')}
                  field="automation"
                  sort={scenarioSort}
                  onChange={setScenarioSort}
                />
              </th>
              <th className="environment-table__cell-nowrap">
                <ScenarioColumnSortControl
                  label={translation('environmentEvidenceTable.table_criticidade')}
                  field="criticality"
                  sort={scenarioSort}
                  onChange={setScenarioSort}
                />
              </th>
              {environmentColumns.map((column) => (
                <th key={column}>{column}</th>
              ))}
              {canViewDetails && (
                <th className="scenario-actions-header">
                  {translation('storeSummary.viewDetails')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedScenarioEntries.map(([scenarioId, data]) => {
              const statusOptions = getScenarioStatusOptions(data);
              return (
                <tr key={scenarioId}>
                  <td
                    className="scenario-title-cell"
                    title={data.titulo || translation('storeSummary.emptyValue')}
                  >
                    <span className="scenario-title-text">
                      {data.titulo || translation('storeSummary.emptyValue')}
                    </span>
                  </td>
                  <td className="environment-table__cell-nowrap">{data.categoria}</td>
                  <td className="environment-table__cell-nowrap">
                    <span
                      className={`automation-badge ${getAutomationClassName(data.automatizado)}`}
                    >
                      {formatAutomationLabel(data.automatizado)}
                    </span>
                  </td>
                  <td className="environment-table__cell-nowrap">
                    <span
                      className={`criticality-badge ${getCriticalityClassName(data.criticidade)}`}
                    >
                      {formatCriticalityLabel(data.criticidade)}
                    </span>
                  </td>

                  {environmentColumns.map((platform) => {
                    const currentStatus = (data.statusByEnvironment ?? {})[platform] ?? data.status;
                    const selectId = `${scenarioId}-${platform}-status`;
                    return (
                      <td key={selectId} className="scenario-status-column">
                        <div className="scenario-status-cell">
                          <select
                            id={selectId}
                            className={`scenario-status-select scenario-status-select--${currentStatus}`}
                            value={currentStatus}
                            disabled={isReadOnly}
                            aria-label={translation('environmentEvidenceTable.statusAriaLabel', {
                              platform,
                              scenario: data.titulo || translation('storeSummary.emptyValue'),
                            })}
                            onChange={(event) =>
                              handleStatusChange(
                                scenarioId,
                                platform,
                                event.target.value as EnvironmentScenarioStatus,
                              )
                            }
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    );
                  })}
                  {canViewDetails && (
                    <td className="scenario-actions">
                      <div className="scenario-actions__content">
                        <button
                          type="button"
                          onClick={() => onViewDetails?.(scenarioId)}
                          className="action-button action-button--primary"
                        >
                          <EyeIcon aria-hidden className="action-button__icon" />
                          {translation('storeSummary.viewDetails')}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationControls
        total={orderedScenarioEntries.length}
        visible={paginatedScenarioEntries.length}
        step={20}
        onShowLess={() => setVisibleCount(20)}
        onShowMore={() =>
          setVisibleCount((previous) => Math.min(previous + 20, orderedScenarioEntries.length))
        }
      />
      {isUpdating && (
        <p className="section-subtitle">{translation('environmentEvidenceTable.sincronizando')}</p>
      )}
    </div>
  );
};
