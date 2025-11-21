import { type ChangeEvent, useEffect, useMemo, useState } from 'react';

import {
  Environment,
  EnvironmentScenario,
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
} from '../../../domain/entities/types';
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
import { scenarioExecutionService } from '../../../application/use-cases/scenarioExecution';
import { useAuth } from '../../hooks/useAuth';

interface EnvironmentEvidenceTableProps {
  environment: Environment;
  isLocked?: boolean;
  readOnly?: boolean;
  onRegisterBug?: (scenarioId: string) => void;
  bugCountByScenario?: Record<string, number>;
  organizationId?: string | null;
}

const BASE_STATUS_OPTIONS: { value: EnvironmentScenarioStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'bloqueado', label: 'Bloqueado' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'nao_se_aplica', label: 'Não se aplica' },
];

const AUTOMATED_STATUS_OPTION: { value: EnvironmentScenarioStatus; label: string } = {
  value: 'concluido_automatizado',
  label: 'Concluído automatizado',
};

const getScenarioStatusOptions = (scenario: EnvironmentScenario) =>
  isAutomatedScenario(scenario.automatizado)
    ? [...BASE_STATUS_OPTIONS.slice(0, 3), AUTOMATED_STATUS_OPTION, ...BASE_STATUS_OPTIONS.slice(3)]
    : BASE_STATUS_OPTIONS;

export const EnvironmentEvidenceTable = ({
  environment,
  isLocked,
  readOnly,
  onRegisterBug,
  bugCountByScenario,
  organizationId,
}: EnvironmentEvidenceTableProps) => {
  const { isUpdating, handleEvidenceUpload, changeScenarioStatus } = useScenarioEvidence(
    environment.id,
  );
  const { showToast } = useToast();
  const { user } = useAuth();
  const [scenarioSort, setScenarioSort] = useState<ScenarioSortConfig | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [scenarioStartTimes, setScenarioStartTimes] = useState<Record<string, number>>({});
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
        const matchesCriticality = criticalityFilter ? data.criticidade === criticalityFilter : true;
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
      showToast({ type: 'error', message: 'Cenário não encontrado para registrar o tempo.' });
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
      showToast({
        type: 'error',
        message: 'Associe a loja a uma organização para registrar o tempo do cenário.',
      });
      return;
    }

    const payload = {
      organizationId,
      storeId: environment.storeId,
      environmentId: environment.id,
      scenarioId,
      scenarioTitle: scenario.titulo,
      qaId: user?.uid ?? null,
      qaName: user?.displayName || user?.email || null,
      totalMs: Date.now() - startedAt,
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
      showToast({ type: 'error', message: 'Não foi possível registrar o tempo do cenário.' });
    }
  };

  const handleFileChange = async (scenarioId: string, event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    await handleEvidenceUpload(scenarioId, file);
    event.target.value = '';
  };

  if (scenarioEntries.length === 0) {
    return <p className="section-subtitle">Nenhum cenário associado a este ambiente.</p>;
  }

  if (filteredScenarioEntries.length === 0) {
    return <p className="section-subtitle">Nenhum cenário corresponde aos filtros selecionados.</p>;
  }

  return (
    <div className="environment-table">
      <div className="environment-table__filters">
        <label className="environment-table__filter">
          <span>Categoria</span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filtrar cenários por categoria"
          >
            <option value="">Todas</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="environment-table__filter">
          <span>Criticidade</span>
          <select
            value={criticalityFilter}
            onChange={(event) => setCriticalityFilter(event.target.value)}
            aria-label="Filtrar cenários por criticidade"
          >
            <option value="">Todas</option>
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
            <th>Título</th>
            <th>
              <ScenarioColumnSortControl
                label="Categoria"
                field="category"
                sort={scenarioSort}
                onChange={setScenarioSort}
              />
            </th>
            <th>
              <ScenarioColumnSortControl
                label="Criticidade"
                field="criticality"
                sort={scenarioSort}
                onChange={setScenarioSort}
              />
            </th>
            <th>Observação</th>
            <th>Status Mobile</th>
            <th>Status Desktop</th>
            <th>Evidência</th>
            <th>Bug</th>
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
                <td>{data.observacao || '—'}</td>
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
                        Abrir evidência
                      </a>
                    ) : (
                      <span className="section-subtitle">Sem arquivo</span>
                    )}
                    {!isReadOnly && (
                      <label className="environment-upload">
                        <input
                          type="file"
                          accept="image/*,application/pdf,video/mp4,video/quicktime,application/zip,application/x-zip-compressed"
                          onChange={(event) => handleFileChange(scenarioId, event)}
                        />
                        <span>Enviar arquivo</span>
                      </label>
                    )}
                  </div>
                </td>
                <td>
                  <div className="scenario-bug-cell">
                    <span className="scenario-bug-cell__label">
                      {(() => {
                        const count = bugCountByScenario?.[scenarioId] ?? 0;
                        if (count === 0) {
                          return 'Nenhum bug registrado';
                        }
                        if (count === 1) {
                          return '1 bug registrado';
                        }
                        return `${count} bugs registrados`;
                      })()}
                    </span>
                    {!isReadOnly && (
                      <button
                        type="button"
                        className="scenario-bug-cell__action"
                        onClick={() => onRegisterBug?.(scenarioId)}
                        disabled={isUpdating || !onRegisterBug}
                      >
                        Registrar bug
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {isUpdating && <p className="section-subtitle">Sincronizando evidências...</p>}
    </div>
  );
};
