import type { DragEvent } from 'react';

import type { Environment } from '../../../domain/entities/Environment';
import { useTimeTracking } from '../../hooks/useTimeTracking';
import type { PresentUserProfile } from '../../hooks/usePresentUsers';

interface CardAmbienteProps {
  environment: Environment;
  presentUsers: PresentUserProfile[];
  onOpen: (environment: Environment) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>, environmentId: string) => void;
}

const STATUS_LABEL: Record<Environment['status'], string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

export const CardAmbiente = ({
  environment,
  presentUsers,
  onOpen,
  draggable = false,
  onDragStart,
}: CardAmbienteProps) => {
  const { formattedTime } = useTimeTracking(
    environment.timeTracking,
    environment.status === 'in_progress',
  );
  const isLocked = environment.status === 'done';
  const scenarioList = Object.values(environment.scenarios ?? {});
  const concludedScenarios = scenarioList.filter((scenario) =>
    ['concluido', 'concluido_automatizado', 'nao_se_aplica'].includes(scenario.status),
  ).length;
  const pendingScenarios = scenarioList.filter((scenario) => scenario.status === 'pendente').length;
  const progress = environment.totalCenarios
    ? Math.round((concludedScenarios / environment.totalCenarios) * 100)
    : 0;

  const handleOpen = () => onOpen(environment);

  return (
    <div
      className={`environment-card ${isLocked ? 'is-locked' : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
      draggable={draggable && !isLocked}
      onDragStart={(event) => onDragStart?.(event, environment.id)}
      data-status={environment.status}
    >
      <div className="environment-card-header">
        <div className={`status-pill status-pill--${environment.status}`}>
          {STATUS_LABEL[environment.status]}
        </div>
        <div>
          <span className="badge">{environment.identificador}</span>
          <h4>{environment.tipoAmbiente}</h4>
          <p className="environment-card-subtitle">{environment.tipoTeste}</p>
        </div>
      </div>

      <div className="environment-card-body">
        <div className="environment-card-metrics">
          <div>
            <span className="metric-label">Cenários</span>
            <strong>{environment.totalCenarios}</strong>
          </div>
          <div>
            <span className="metric-label">Concluídos</span>
            <strong>{concludedScenarios}</strong>
          </div>
          <div>
            <span className="metric-label">Pendentes</span>
            <strong>{pendingScenarios}</strong>
          </div>
          <div>
            <span className="metric-label">Bugs</span>
            <strong>{environment.bugs}</strong>
          </div>
        </div>

        <div className="environment-card-progress" aria-label="Progresso dos cenários">
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{progress}%</span>
        </div>

        <div className="environment-card-meta">
          <div>
            <span className="metric-label">Jira</span>
            <p>{environment.jiraTask || 'Sem tarefa vinculada'}</p>
          </div>
          <div>
            <span className="metric-label">Tempo</span>
            <p>{formattedTime}</p>
          </div>
          <div>
            <span className="metric-label">Última atualização</span>
            <p>{environment.updatedAt ? new Date(environment.updatedAt).toLocaleString() : '--'}</p>
          </div>
        </div>
      </div>

      <div className="environment-card-users">
        {presentUsers.length === 0 ? (
          <p className="section-subtitle">Nenhum usuário presente</p>
        ) : (
          <ul>
            {presentUsers.map((user) => (
              <li key={user.id}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="environment-card-avatar" />
                ) : (
                  <span className="environment-card-avatar environment-card-avatar--initials">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span>{user.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
