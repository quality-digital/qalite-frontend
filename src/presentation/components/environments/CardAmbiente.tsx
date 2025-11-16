import type { DragEvent } from 'react';
import { Link } from 'react-router-dom';

import type { Environment } from '../../../domain/entities/Environment';
import { useTimeTracking } from '../../hooks/useTimeTracking';
import type { PresentUserProfile } from '../../hooks/usePresentUsers';

interface CardAmbienteProps {
  environment: Environment;
  presentUsers: PresentUserProfile[];
  onEdit: (environment: Environment) => void;
  onDelete: (environment: Environment) => void;
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
  onEdit,
  onDelete,
  draggable = false,
  onDragStart,
}: CardAmbienteProps) => {
  const { formattedTime } = useTimeTracking(
    environment.timeTracking,
    environment.status === 'in_progress',
  );
  const isLocked = environment.status === 'done';

  return (
    <div
      className={`environment-card ${isLocked ? 'is-locked' : ''}`}
      draggable={draggable && !isLocked}
      onDragStart={(event) => onDragStart?.(event, environment.id)}
      data-status={environment.status}
    >
      <div className="environment-card-header">
        <div>
          <span className="badge">{environment.identificador}</span>
          <h4>{environment.tipoAmbiente}</h4>
          <p className="environment-card-subtitle">{environment.tipoTeste}</p>
        </div>
        <div className="environment-card-actions">
          <button type="button" className="link-button" onClick={() => onEdit(environment)}>
            Editar
          </button>
          <button type="button" className="link-button" onClick={() => onDelete(environment)}>
            Excluir
          </button>
        </div>
      </div>

      <ul className="environment-card-info">
        <li>
          <strong>Loja:</strong> {environment.loja}
        </li>
        <li>
          <strong>Status:</strong> {STATUS_LABEL[environment.status]}
        </li>
        <li>
          <strong>Total de cenários:</strong> {environment.totalCenarios}
        </li>
        <li>
          <strong>Bugs:</strong> {environment.bugs}
        </li>
        <li>
          <strong>Tempo total:</strong> {formattedTime}
        </li>
      </ul>

      <div className="environment-card-users">
        <h5>Usuários presentes</h5>
        {presentUsers.length === 0 ? (
          <p className="section-subtitle">Ninguém no ambiente</p>
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

      <div className="environment-card-footer">
        <Link to={`/environments/${environment.id}`} className="button button--small">
          Gerenciar ambiente
        </Link>
      </div>
    </div>
  );
};
