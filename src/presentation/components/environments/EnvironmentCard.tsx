import type { DragEvent, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { Environment } from '../../../domain/entities/environment';
import type { UserSummary } from '../../../domain/entities/user';
import { getReadableUserName, getUserInitials } from '../../utils/userDisplay';
import { ENVIRONMENT_STATUS_LABEL } from '../../../shared/config/environmentLabels';
import { translateEnvironmentOption } from '../../constants/environmentOptions';
import { BugIcon, ClockIcon, CopyIcon, ListIcon, LayersIcon, UsersIcon } from '../icons';
import { CachedImage } from '../CachedImage';

interface EnvironmentCardProps {
  environment: Environment;
  participants: UserSummary[];
  suiteName?: string | null;
  bugCount?: number;
  onOpen: (environment: Environment) => void;
  onClone?: (environment: Environment) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>, environmentId: string) => void;
  pendingParticipantIds?: string[];
}

export const EnvironmentCard = ({
  environment,
  participants,
  suiteName,
  bugCount,
  onOpen,
  onClone,
  draggable = false,
  onDragStart,
  pendingParticipantIds = [],
}: EnvironmentCardProps) => {
  const { t } = useTranslation();
  const isLocked = environment.status === 'done';
  const displaySuiteName = suiteName ?? t('environmentCard.displaySuiteName');
  const hasParticipants = participants.length > 0;
  const visibleParticipants = participants.slice(0, 3);
  const hiddenParticipantsCount = Math.max(participants.length - visibleParticipants.length, 0);
  const normalizedEnvironmentType =
    typeof environment.tipoAmbiente === 'string'
      ? environment.tipoAmbiente.trim().toUpperCase()
      : '';
  const bugLabel =
    normalizedEnvironmentType === 'WS'
      ? t('environmentCard.bugStoryfix')
      : t('environmentCard.bugBugs');
  const totalScenariosWithPlatforms = environment.totalCenarios * 2;
  const momentLabel = translateEnvironmentOption(environment.momento, t);
  const displayBugCount = bugCount ?? environment.bugs ?? 0;

  const handleOpen = () => onOpen(environment);
  const handleClone = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClone?.(environment);
  };

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
      {/* Header: Main title and status */}
      <div className="environment-card__top-section">
        <div className="environment-card__title-group">
          <span className="environment-card__identifier">{environment.identificador}</span>
          <span className="environment-card__type">{t(environment.tipoTeste)}</span>
        </div>
        <span
          className={`environment-card__status-badge environment-card__status-badge--${environment.status}`}
        >
          {t(ENVIRONMENT_STATUS_LABEL[environment.status])}
        </span>
      </div>

      {/* Info row: Suite and Moment */}
      <div className="environment-card__info-row">
        <div className="environment-card__info-item">
          <LayersIcon aria-hidden className="environment-card__info-icon" />
          <div className="environment-card__info-content">
            <span className="environment-card__info-label">{t('environmentCard.suiteLabel')}</span>
            <span className="environment-card__info-value" title={displaySuiteName}>
              {displaySuiteName}
            </span>
          </div>
        </div>
        {environment.momento && (
          <div className="environment-card__info-item">
            <ClockIcon aria-hidden className="environment-card__info-icon" />
            <div className="environment-card__info-content">
              <span className="environment-card__info-label">
                {t('environmentCard.momentLabel')}
              </span>
              <span className="environment-card__info-value" title={momentLabel}>
                {momentLabel}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stats and Participants row */}
      <div className="environment-card__footer">
        <div className="environment-card__stats">
          <div className="environment-card__stat-item">
            <ListIcon aria-hidden className="environment-card__stat-icon" />
            <div className="environment-card__stat-content">
              <span className="environment-card__stat-value">{totalScenariosWithPlatforms}</span>
              <span className="environment-card__stat-label">{t('scenarios')}</span>
            </div>
          </div>
          <div className="environment-card__stat-item">
            <BugIcon aria-hidden className="environment-card__stat-icon" />
            <div className="environment-card__stat-content">
              <span className="environment-card__stat-value">{displayBugCount}</span>
              <span className="environment-card__stat-label">{bugLabel}</span>
            </div>
          </div>
        </div>

        {/* Participants and Clone action */}
        <div className="environment-card__side-actions">
          <div
            className="environment-card__participants-group"
            aria-label={t('environmentCard.participantsLabel')}
          >
            {hasParticipants ? (
              <ul
                className="environment-card__participant-avatars"
                aria-label={t('environmentCard.participantsListLabel')}
              >
                {visibleParticipants.map((user) => {
                  const readableName = getReadableUserName(user);
                  const initials = getUserInitials(readableName);
                  const isPending = pendingParticipantIds.includes(user.id);
                  return (
                    <li
                      key={user.id}
                      className={`environment-card__participant-avatar ${isPending ? 'environment-card__participant-avatar--pending' : ''}`}
                      title={readableName}
                    >
                      {user.photoURL ? (
                        <CachedImage
                          src={user.photoURL}
                          alt={readableName}
                          className="environment-card__avatar-image"
                        />
                      ) : (
                        <span
                          className="environment-card__avatar-image environment-card__avatar-image--initials"
                          aria-label={readableName}
                        >
                          {initials}
                        </span>
                      )}
                      {isPending && (
                        <ClockIcon aria-hidden className="environment-card__pending-icon" />
                      )}
                    </li>
                  );
                })}
                {hiddenParticipantsCount > 0 && (
                  <li className="environment-card__participant-avatar environment-card__participant-avatar--more">
                    <span className="environment-card__avatar-image">
                      +{hiddenParticipantsCount}
                    </span>
                  </li>
                )}
              </ul>
            ) : (
              <span className="environment-card__participants-empty">
                <UsersIcon aria-hidden className="environment-card__participants-icon" />
              </span>
            )}
          </div>

          {onClone && (
            <button
              type="button"
              className="environment-card__clone-button"
              onClick={handleClone}
              onMouseDown={(event) => event.stopPropagation()}
              aria-label={t('environmentCard.clone')}
              title={t('environmentCard.clone')}
            >
              <CopyIcon aria-hidden className="environment-card__clone-icon" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
