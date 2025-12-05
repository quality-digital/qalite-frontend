import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Environment,
  EnvironmentScenario,
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
} from '../../../domain/entities/environment';
import { getScenarioPlatformStatuses } from '../../../infrastructure/external/environments';
import { useScenarioEvidence } from '../../hooks/useScenarioEvidence';
import {
  ScenarioColumnSortControl,
  createScenarioSortComparator,
  type ScenarioSortConfig,
} from '../ScenarioColumnSortControl';
import { ENVIRONMENT_PLATFORM_LABEL } from '../../../shared/config/environmentLabels';
import { isAutomatedScenario } from '../../../shared/utils/automation';
import { useToast } from '../../context/ToastContext';
import { scenarioExecutionService } from '../../../application/use-cases/ScenarioExecutionUseCase';
import { useAuth } from '../../hooks/useAuth';

interface EnvironmentEvidenceTableProps {
  environment: Environment;
  isLocked?: boolean;
  readOnly?: boolean;
  onRegisterBug?: (scenarioId: string) => void;
  bugCountByScenario?: Record<string, number>;
  organizationId?: string | null;
}

export const EnvironmentEvidenceTable = ({
  environment,
  isLocked,
  readOnly,
  onRegisterBug,
  bugCountByScenario,
  organizationId,
}: EnvironmentEvidenceTableProps) => {
  const { t: translation } = useTranslation();
  const { isUpdating, handleEvidenceUpload, changeScenarioStatus } = useScenarioEvidence(
    environment.id,
  );
  const { showToast } = useToast();
  const { user } = useAuth();
  const [scenarioSort, setScenarioSort] = useState<ScenarioSortConfig | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [scenarioStartTimes, setScenarioStartTimes] = useState<Record<string, number>>({});
  const [evidenceLinks, setEvidenceLinks] = useState<Record<string, string>>({});

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

  const environmentStartTimestamp = useMemo(() => {
    if (!environment?.timeTracking?.start) {
      return null;
    }

    return new Date(environment.timeTracking.start).getTime();
  }, [environment?.timeTracking?.start]);
  useEffect(() => {
    if (!environment?.scenarios || Object.keys(environment.scenarios).length === 0) {
      setScenarioStartTimes((previous) => {
        if (Object.keys(previous).length === 0) {
          return previous;
        }
        return {};
      });
      return;
    }

    setScenarioStartTimes((previous) => {
      let next = previous;
      let hasChanges = false;
      const activeScenarioIds = new Set<string>();

      Object.entries(environment.scenarios ?? {}).forEach(([scenarioId, data]) => {
        activeScenarioIds.add(scenarioId);
        const platformStatuses = getScenarioPlatformStatuses(data);
        const isRunning = Object.values(platformStatuses).some(
          (status) => status === 'em_andamento',
        );
        const hasStartTime = Boolean(previous[scenarioId]);

        if (isRunning && !hasStartTime) {
          if (!hasChanges) {
            next = { ...previous };
            hasChanges = true;
          }
          next[scenarioId] = environmentStartTimestamp ?? Date.now();
        }

        if (!isRunning && hasStartTime) {
          if (!hasChanges) {
            next = { ...previous };
            hasChanges = true;
          }
          delete next[scenarioId];
        }
      });

      Object.keys(previous).forEach((scenarioId) => {
        if (!activeScenarioIds.has(scenarioId)) {
          if (!hasChanges) {
            next = { ...previous };
            hasChanges = true;
          }
          delete next[scenarioId];
        }
      });

      return hasChanges ? next : previous;
    });
  }, [environment?.scenarios, environmentStartTimestamp]);

  useEffect(() => {
    const nextLinks: Record<string, string> = {};
    Object.entries(environment.scenarios ?? {}).forEach(([scenarioId, data]) => {
      nextLinks[scenarioId] = data.evidenciaArquivoUrl ?? '';
    });
    setEvidenceLinks(nextLinks);
  }, [environment.scenarios]);

  const handleEvidenceLinkChange = (scenarioId: string, link: string) => {
    setEvidenceLinks((previous) => ({ ...previous, [scenarioId]: link }));
  };
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
  const criticalityOptions = useMemo(() => {
    const criticalities = new Set<string>();
    scenarioEntries.forEach(([, data]) => {
      const normalized = data.criticidade?.trim();
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
          ? data.criticidade === criticalityFilter
          : true;
        return matchesCategory && matchesCriticality;
      }),
    [categoryFilter, criticalityFilter, scenarioEntries],
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
  const isReadOnly = Boolean(isLocked || readOnly);
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

    if (status === 'em_andamento') {
      setScenarioStartTimes((previous) => {
        if (previous[scenarioId]) {
          return previous;
        }
        return { ...previous, [scenarioId]: Date.now() };
      });
      return;
    }

    if (status === 'bloqueado' || status === 'nao_se_aplica' || status === 'pendente') {
      setScenarioStartTimes((previous) => {
        if (!previous[scenarioId]) {
          return previous;
        }
        const next = { ...previous };
        delete next[scenarioId];
        return next;
      });
      return;
    }

    if (status !== 'concluido' && status !== 'concluido_automatizado') {
      return;
    }

    const startedAt = scenarioStartTimes[scenarioId] ?? environmentStartTimestamp ?? Date.now();

    if (!organizationId) {
      showToast({ type: 'error', message: translation('environmentEvidenceTable.toast_sem_org') });
      return;
    }

    const scenarioCount = Math.max(scenarioEntries.length, 1);
    const payload = {
      organizationId,
      storeId: environment.storeId,
      environmentId: environment.id,
      scenarioId,
      scenarioTitle: scenario.titulo,
      qaId: user?.uid ?? null,
      qaName: user?.displayName || user?.email || null,
      totalMs: (Date.now() - startedAt) / scenarioCount,
      executedAt: new Date().toISOString(),
    };

    try {
      await scenarioExecutionService.logExecution(payload);
      setScenarioStartTimes((previous) => {
        const next = { ...previous };
        delete next[scenarioId];
        return next;
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: 'error',
        message: translation('environmentEvidenceTable.toast_exec_error'),
      });
    }
  };

  const handleEvidenceSave = async (scenarioId: string) => {
    const link = (evidenceLinks[scenarioId] ?? '').trim();

    if (!link) {
      showToast({
        type: 'error',
        message: translation('environmentEvidenceTable.toast_save_error'),
      });
      return;
    }

    try {
      await handleEvidenceUpload(scenarioId, link);
      showToast({
        type: 'success',
        message: translation('environmentEvidenceTable.toast_save_success'),
      });
    } catch {
      showToast({
        type: 'error',
        message: translation('environmentEvidenceTable.toast_save_error'),
      });
    }
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
          <span>{translation('environmentEvidenceTable.filters_categoria')}</span>
          <select
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
          <span>{translation('environmentEvidenceTable.filters_criticidade')}</span>
          <select
            value={criticalityFilter}
            onChange={(event) => setCriticalityFilter(event.target.value)}
            aria-label={translation('environmentEvidenceTable.filters_criticidade')}
          >
            <option value="">{translation('environmentEvidenceTable.filters_todas')}</option>
            {criticalityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>{translation('environmentEvidenceTable.table_titulo')}</th>
            <th>
              <ScenarioColumnSortControl
                label={translation('environmentEvidenceTable.table_categoria')}
                field="category"
                sort={scenarioSort}
                onChange={setScenarioSort}
              />
            </th>
            <th>
              <ScenarioColumnSortControl
                label={translation('environmentEvidenceTable.table_criticidade')}
                field="criticality"
                sort={scenarioSort}
                onChange={setScenarioSort}
              />
            </th>
            <th>{translation('environmentEvidenceTable.table_observacao')}</th>
            <th>{translation('environmentEvidenceTable.table_status_mobile')}</th>
            <th>{translation('environmentEvidenceTable.table_status_desktop')}</th>
            <th>{translation('environmentEvidenceTable.table_evidencia')}</th>
            <th>{translation('environmentEvidenceTable.table_bug')}</th>
          </tr>
        </thead>
        <tbody>
          {orderedScenarioEntries.map(([scenarioId, data]) => {
            const statusOptions = getScenarioStatusOptions(data);
            return (
              <tr key={scenarioId}>
                <td>{data.titulo}</td>
                <td>{data.categoria}</td>
                <td>{data.criticidade}</td>
                <td>
                  {data.observacao || translation('environmentEvidenceTable.observacao_none')}
                </td>

                {(['mobile', 'desktop'] as EnvironmentScenarioPlatform[]).map((platform) => {
                  const currentStatus =
                    platform === 'mobile'
                      ? (data.statusMobile ?? data.status)
                      : (data.statusDesktop ?? data.status);
                  const selectId = `${scenarioId}-${platform}-status`;
                  return (
                    <td key={selectId} className="scenario-status-column">
                      <div className="scenario-status-cell">
                        <label htmlFor={selectId}>{ENVIRONMENT_PLATFORM_LABEL[platform]}</label>
                        <select
                          id={selectId}
                          className={`scenario-status-select scenario-status-select--${currentStatus}`}
                          value={currentStatus}
                          disabled={isReadOnly}
                          aria-label={`Status ${ENVIRONMENT_PLATFORM_LABEL[platform]} do cenário ${data.titulo}`}
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
                <td>
                  <div className="scenario-evidence-cell">
                    {data.evidenciaArquivoUrl ? (
                      <a
                        href={data.evidenciaArquivoUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-link"
                      >
                        {translation('environmentEvidenceTable.evidencia_abrir')}
                      </a>
                    ) : (
                      <span className="section-subtitle">
                        {translation('environmentEvidenceTable.evidencia_sem')}
                      </span>
                    )}
                    {!isReadOnly && (
                      <div className="scenario-evidence-actions">
                        <input
                          type="url"
                          value={evidenceLinks[scenarioId] ?? ''}
                          onChange={(event) =>
                            handleEvidenceLinkChange(scenarioId, event.target.value)
                          }
                          placeholder={translation(
                            'environmentEvidenceTable.evidencia_placeholder',
                          )}
                          className="scenario-evidence-input"
                        />
                        <button
                          type="button"
                          className="scenario-evidence-save"
                          onClick={() => handleEvidenceSave(scenarioId)}
                          disabled={isUpdating}
                        >
                          {translation('environmentEvidenceTable.evidencia_salvar')}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="scenario-bug-cell">
                    <span className="scenario-bug-cell__label">
                      {(() => {
                        const count = bugCountByScenario?.[scenarioId] ?? 0;
                        if (count === 0) {
                          return translation('environmentEvidenceTable.bug_nenhum');
                        }
                        if (count === 1) {
                          return translation('environmentEvidenceTable.bug_um');
                        }
                        return translation('environmentEvidenceTable.bug_varios', { count });
                      })()}
                    </span>

                    {!isReadOnly && (
                      <button
                        type="button"
                        className="scenario-bug-cell__action"
                        onClick={() => onRegisterBug?.(scenarioId)}
                        disabled={isUpdating || !onRegisterBug}
                      >
                        {translation('environmentEvidenceTable.bug_registrar')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {isUpdating && (
        <p className="section-subtitle">{translation('environmentEvidenceTable.sincronizando')}</p>
      )}
    </div>
  );
};
