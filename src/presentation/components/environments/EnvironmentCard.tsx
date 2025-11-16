import type { DragEvent } from 'react';

import type { Environment } from '../../../domain/entities/Environment';
import type { PresentUserProfile } from '../../hooks/usePresentUsers';

interface EnvironmentCardProps {
  environment: Environment;
  participants: PresentUserProfile[];
  suiteName?: string | null;
  onOpen: (environment: Environment) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>, environmentId: string) => void;
}

const STATUS_LABEL: Record<Environment['status'], string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

export const EnvironmentCard = ({
  environment,
  participants,
  suiteName,
  onOpen,
  draggable = false,
  onDragStart,
}: EnvironmentCardProps) => {
  const isLocked = environment.status === 'done';
  const displaySuiteName = suiteName ?? 'Suíte não informada';
  const hasParticipants = participants.length > 0;

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
      <div className="environment-card-minimal-header">
        <span
          className={`environment-card-status-dot environment-card-status-dot--${environment.status}`}
          aria-label={STATUS_LABEL[environment.status]}
          title={STATUS_LABEL[environment.status]}
        />
        <div className="environment-card-minimal-info">
          <span className="environment-card-identifier">{environment.identificador}</span>
          <span className="environment-card-type">{environment.tipoTeste}</span>
          <span className="environment-card-suite">{displaySuiteName}</span>
        </div>
      </div>

      <div className="environment-card-avatars" aria-label="Participantes">
        {hasParticipants ? (
          <ul className="environment-card-avatar-list">
            {participants.map((user) => (
              <li key={user.id} title={user.name}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="environment-card-avatar" />
                ) : (
                  <span
                    className="environment-card-avatar environment-card-avatar--initials"
                    aria-hidden="true"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <span className="environment-card-avatars__placeholder">Sem participantes</span>
        )}
      </div>
    </div>
  );
};
