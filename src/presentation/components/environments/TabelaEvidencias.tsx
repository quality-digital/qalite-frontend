import type { ChangeEvent } from 'react';

import type { Environment, EnvironmentScenarioStatus } from '../../../domain/entities/Environment';
import { useScenarioEvidence } from '../../hooks/useScenarioEvidence';

interface TabelaEvidenciasProps {
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

const STATUS_LABEL: Record<EnvironmentScenarioStatus, string> = STATUS_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {} as Record<EnvironmentScenarioStatus, string>,
);

export const TabelaEvidencias = ({ environment, isLocked, readOnly }: TabelaEvidenciasProps) => {
  const { isUpdating, handleEvidenceUpload, changeScenarioStatus } = useScenarioEvidence(
    environment.id,
  );
  const scenarioEntries = Object.entries(environment.scenarios ?? {});
  const isReadOnly = Boolean(isLocked || readOnly);

  const handleStatusChange = async (scenarioId: string, status: EnvironmentScenarioStatus) => {
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
      <table>
        <thead>
          <tr>
            <th>Título</th>
            <th>Categoria</th>
            <th>Criticidade</th>
            <th>Status</th>
            <th>Evidência</th>
          </tr>
        </thead>
        <tbody>
          {scenarioEntries.map(([scenarioId, data]) => (
            <tr key={scenarioId}>
              <td>{data.titulo}</td>
              <td>{data.categoria}</td>
              <td>{data.criticidade}</td>
              <td>
                <div className="scenario-status-cell">
                  <span className={`scenario-status scenario-status--${data.status}`}>
                    {STATUS_LABEL[data.status]}
                  </span>
                  {!isReadOnly && (
                    <select
                      value={data.status}
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
                  )}
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
