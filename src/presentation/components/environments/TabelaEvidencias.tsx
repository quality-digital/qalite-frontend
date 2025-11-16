import { ChangeEvent, useEffect, useMemo, useState } from 'react';

import type { Environment, EnvironmentScenarioStatus } from '../../../domain/entities/Environment';
import { useScenarioEvidence } from '../../hooks/useScenarioEvidence';

interface TabelaEvidenciasProps {
  environment: Environment;
  isLocked: boolean;
}

const STATUS_OPTIONS: { value: EnvironmentScenarioStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluído' },
];

export const TabelaEvidencias = ({ environment, isLocked }: TabelaEvidenciasProps) => {
  const { isUpdating, persistScenario, handleEvidenceUpload } = useScenarioEvidence(environment.id);
  const [evidenceDraft, setEvidenceDraft] = useState<Record<string, string>>({});

  const scenarioEntries = useMemo(
    () => Object.entries(environment.scenarios ?? {}),
    [environment.scenarios],
  );

  useEffect(() => {
    const initial: Record<string, string> = {};
    scenarioEntries.forEach(([scenarioId, data]) => {
      initial[scenarioId] = data.evidenciaTexto ?? '';
    });
    setEvidenceDraft(initial);
  }, [scenarioEntries]);

  const handleStatusChange = async (scenarioId: string, status: EnvironmentScenarioStatus) => {
    await persistScenario(scenarioId, { status });
  };

  const handleEvidenceChange =
    (scenarioId: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;
      setEvidenceDraft((previous) => ({ ...previous, [scenarioId]: value }));
    };

  const handleEvidenceBlur = async (scenarioId: string) => {
    await persistScenario(scenarioId, { evidenciaTexto: evidenceDraft[scenarioId] ?? '' });
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
            <th>Arquivo</th>
          </tr>
        </thead>
        <tbody>
          {scenarioEntries.map(([scenarioId, data]) => (
            <tr key={scenarioId}>
              <td>{data.titulo}</td>
              <td>{data.categoria}</td>
              <td>{data.criticidade}</td>
              <td>
                <select
                  value={data.status}
                  onChange={(event) =>
                    handleStatusChange(scenarioId, event.target.value as EnvironmentScenarioStatus)
                  }
                  disabled={isLocked}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <textarea
                  value={evidenceDraft[scenarioId] ?? ''}
                  onChange={handleEvidenceChange(scenarioId)}
                  onBlur={() => handleEvidenceBlur(scenarioId)}
                  disabled={isLocked}
                />
              </td>
              <td>
                {data.evidenciaArquivoUrl ? (
                  <a href={data.evidenciaArquivoUrl} target="_blank" rel="noreferrer">
                    Abrir evidência
                  </a>
                ) : (
                  <span className="section-subtitle">Sem arquivo</span>
                )}
                {!isLocked && (
                  <label className="environment-upload">
                    <input type="file" onChange={(event) => handleFileChange(scenarioId, event)} />
                    <span>Enviar</span>
                  </label>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isUpdating && <p className="section-subtitle">Sincronizando evidências...</p>}
    </div>
  );
};
