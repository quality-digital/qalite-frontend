import type { DragEvent } from 'react';

import type { Environment } from '../../../domain/entities/Environment';
import type { UserSummary } from '../../../domain/entities/UserSummary';

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

  const resolveDisplayName = (participant: UserSummary) =>
    participant.displayName || participant.email || 'Usuário';

  const resolveInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('') || 'U';

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
          <ul className="environment-card-participant-list">
            {participants.map((user) => {
              const readableName = resolveDisplayName(user);
              const initials = resolveInitials(readableName);
              return (
                <li key={user.id} className="environment-card-participant">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={readableName}
                      className="environment-card-avatar"
                    />
                  ) : (
                    <span
                      className="environment-card-avatar environment-card-avatar--initials"
                      aria-hidden="true"
                    >
                      {initials}
                    </span>
                  )}
                  <span className="environment-card-participant-name">{readableName}</span>
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
