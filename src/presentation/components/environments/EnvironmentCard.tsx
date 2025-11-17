import type { DragEvent } from 'react';

import type { Environment } from '../../../domain/entities/Environment';
import type { UserSummary } from '../../../domain/entities/UserSummary';
import { getReadableUserName, getUserInitials } from '../../utils/userDisplay';

interface EnvironmentCardProps {
  environment: Environment;
  participants: UserSummary[];
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
        >
          {STATUS_LABEL[environment.status]}
        </span>
        <div className="environment-card-minimal-info">
          <span className="environment-card-identifier">{environment.identificador}</span>
          <span className="environment-card-type">{environment.tipoTeste}</span>
          <span className="environment-card-suite">{displaySuiteName}</span>
        </div>
      </div>

      <div className="environment-card-avatars" aria-label="Participantes">
        {hasParticipants ? (
          <ul className="environment-card-participant-list" aria-label="Participantes cadastrados">
            {participants.map((user) => {
              const readableName = getReadableUserName(user);
              const initials = getUserInitials(readableName);
              return (
                <li key={user.id} className="environment-card-participant" title={readableName}>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={readableName}
                      className="environment-card-avatar"
                    />
                  ) : (
                    <span
                      className="environment-card-avatar environment-card-avatar--initials"
                      aria-label={readableName}
                    >
                      {initials}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <span className="environment-card-avatars__placeholder">Sem participantes</span>
        )}
      </div>
    </div>
  );
};
