import { type ChangeEvent, useMemo, useState } from 'react';

import type { Environment, EnvironmentScenarioStatus } from '../../../domain/entities/Environment';
import { useScenarioEvidence } from '../../hooks/useScenarioEvidence';
import { ScenarioColumnSortControl } from '../ScenarioColumnSortControl';
import { createScenarioSortComparator, type ScenarioSortConfig } from '../../utils/scenarioSorting';

interface EnvironmentEvidenceTableProps {
  environment: Environment;
  isLocked?: boolean;
  readOnly?: boolean;
}

const STATUS_OPTIONS: { value: EnvironmentScenarioStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'concluido_automatizado', label: 'Concluído automatizado' },
  { value: 'nao_se_aplica', label: 'Não se aplica' },
];

export const EnvironmentEvidenceTable = ({
  environment,
  isLocked,
  readOnly,
}: EnvironmentEvidenceTableProps) => {
  const { isUpdating, handleEvidenceUpload, changeScenarioStatus } = useScenarioEvidence(
    environment.id,
  );
  const [scenarioSort, setScenarioSort] = useState<ScenarioSortConfig | null>(null);
  const scenarioEntries = useMemo(
    () => Object.entries(environment.scenarios ?? {}),
    [environment.scenarios],
  );
  const orderedScenarioEntries = useMemo(() => {
    if (!scenarioSort) {
      return scenarioEntries;
    }

    const comparator = createScenarioSortComparator(scenarioSort);

    return scenarioEntries.slice().sort(([, first], [, second]) =>
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
  }, [scenarioEntries, scenarioSort]);
  const isReadOnly = Boolean(isLocked || readOnly);

  const handleStatusChange = async (scenarioId: string, status: EnvironmentScenarioStatus) => {
    if (isReadOnly) {
      return;
    }

    await changeScenarioStatus(scenarioId, status);
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

  return (
    <div className="environment-table">
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
            <th>Status</th>
            <th>Evidência</th>
          </tr>
        </thead>
        <tbody>
          {orderedScenarioEntries.map(([scenarioId, data]) => (
            <tr key={scenarioId}>
              <td>{data.titulo}</td>
              <td>{data.categoria}</td>
              <td>{data.criticidade}</td>
              <td>
                <div className="scenario-status-cell">
                  <select
                    className={`scenario-status-select scenario-status-select--${data.status}`}
                    value={data.status}
                    disabled={isReadOnly}
                    aria-label={`Status do cenário ${data.titulo}`}
                    onChange={(event) =>
                      handleStatusChange(
                        scenarioId,
                        event.target.value as EnvironmentScenarioStatus,
                      )
                    }
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
              <td>
                <div className="scenario-evidence-cell">
                  {data.evidenciaArquivoUrl ? (
                    <a href={data.evidenciaArquivoUrl} target="_blank" rel="noreferrer">
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
            </tr>
          ))}
        </tbody>
      </table>
      {isUpdating && <p className="section-subtitle">Sincronizando evidências...</p>}
    </div>
  );
};
