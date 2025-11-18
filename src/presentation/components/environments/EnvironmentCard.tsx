import type { DragEvent } from 'react';

import type { Environment } from '../../../domain/entities/Environment';
import type { UserSummary } from '../../../domain/entities/UserSummary';
import { getReadableUserName, getUserInitials } from '../../utils/userDisplay';
import { ENVIRONMENT_STATUS_LABEL } from '../../../shared/constants/environmentLabels';

interface EnvironmentCardProps {
  environment: Environment;
  participants: UserSummary[];
  suiteName?: string | null;
  onOpen: (environment: Environment) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>, environmentId: string) => void;
}

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
  const visibleParticipants = participants.slice(0, 3);
  const hiddenParticipantsCount = Math.max(participants.length - visibleParticipants.length, 0);
  const bugLabel = environment.tipoAmbiente?.toUpperCase() === 'WS' ? 'Storyfix' : 'Bugs';

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
        <div className="environment-card-title">
          <span className="environment-card-identifier">{environment.identificador}</span>
          <span className="environment-card-type">{environment.tipoTeste}</span>
        </div>
        <span
          className={`environment-card-status-dot environment-card-status-dot--${environment.status}`}
        >
          {ENVIRONMENT_STATUS_LABEL[environment.status]}
        </span>
      </div>

      <div className="environment-card-suite-row">
        <span className="environment-card-suite-label">Suíte</span>
        <span className="environment-card-suite-name">{displaySuiteName}</span>
      </div>

      <div className="environment-card-stats">
        <div className="environment-card-stat">
          <span className="environment-card-stat-label">Cenários</span>
          <strong className="environment-card-stat-value">{environment.totalCenarios}</strong>
        </div>
        <div className="environment-card-stat">
          <span className="environment-card-stat-label">{bugLabel}</span>
          <strong className="environment-card-stat-value">{environment.bugs}</strong>
        </div>
      </div>

      <div className="environment-card-participants" aria-label="Participantes">
        {hasParticipants ? (
          <>
            <ul
              className="environment-card-participant-list"
              aria-label="Participantes cadastrados"
            >
              {visibleParticipants.map((user) => {
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
              {hiddenParticipantsCount > 0 && (
                <li className="environment-card-participant environment-card-participant--more">
                  +{hiddenParticipantsCount}
                </li>
              )}
            </ul>
            <span className="environment-card-participants-label">
              {participants.length} participante{participants.length > 1 ? 's' : ''}
            </span>
          </>
        ) : (
          <span className="environment-card-avatars__placeholder">Sem participantes</span>
        )}
      </div>
    </div>
  );
};
