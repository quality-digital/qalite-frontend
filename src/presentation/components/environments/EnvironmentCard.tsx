import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Environment } from '../../../domain/entities/environment';
import type { UserSummary } from '../../../domain/entities/user';
import { getReadableUserName, getUserInitials } from '../../utils/userDisplay';
import { formatDateTime } from '../../../shared/utils/time';
import { translateEnvironmentOption } from '../../constants/environmentOptions';
import { ENVIRONMENT_STATUS_LABEL } from '../../../shared/config/environmentLabels';
import { BugIcon, ClockIcon, ListIcon, UsersIcon } from '../icons';
import { CachedImage } from '../CachedImage';

interface EnvironmentCardProps {
  environment: Environment;
  participants: UserSummary[];
  suiteName?: string | null;
  bugCount?: number;
  onOpen: (environment: Environment) => void;
  onClone?: (environment: Environment) => void;
  pendingParticipantIds?: string[];
}

export const EnvironmentCard = ({
  environment,
  participants,
  suiteName,
  bugCount,
  onOpen,
  pendingParticipantIds = [],
}: EnvironmentCardProps) => {
  const { t } = useTranslation();

  const isLocked = environment.status === 'done';
  const displaySuite = suiteName ?? t('environmentCard.displaySuiteName');
  const executionDateLabel = formatDateTime(
    environment.executionDate ?? environment.createdAt ?? null,
  );

  const normalizedEnvironmentType =
    typeof environment.tipoAmbiente === 'string'
      ? environment.tipoAmbiente.trim().toUpperCase()
      : '';
  const isRelease = normalizedEnvironmentType === 'RELEASE';
  const momentValue =
    translateEnvironmentOption(environment.momento, t) || t('environmentCard.momentLabel');
  const releaseValue = environment.release?.trim() || null;
  const titlePrefix = isRelease
    ? releaseValue
      ? `RELEASE ${releaseValue}`
      : 'RELEASE'
    : normalizedEnvironmentType === 'PROD'
      ? 'PROD'
      : normalizedEnvironmentType === 'WS' || normalizedEnvironmentType === 'PREVIEW'
        ? normalizedEnvironmentType === 'WS'
          ? 'WS'
          : 'PREVIEW'
        : normalizedEnvironmentType || 'AMBIENTE';
  const title = `[${titlePrefix}][${displaySuite}]`;
  const momentDisplay = momentValue;
  const bugLabel =
    normalizedEnvironmentType === 'RELEASE'
      ? t('environmentCard.bugHotfix')
      : normalizedEnvironmentType === 'PROD'
        ? t('environmentCard.bugBugs')
        : normalizedEnvironmentType === 'WS' || normalizedEnvironmentType === 'PREVIEW'
          ? t('environmentCard.bugStoryfix')
          : t('environmentCard.bugBugs');

  const scenarioEntries = Object.values(environment.scenarios ?? {});
  const completedStatuses = new Set(['concluido', 'concluido_automatizado', 'nao_se_aplica']);
  const completedScenariosCount = scenarioEntries.filter((scenario) => {
    const perColumnStatuses = Object.values(scenario.statusByEnvironment ?? {});
    if (perColumnStatuses.length > 0) {
      return perColumnStatuses.every((status) => completedStatuses.has(status));
    }
    return completedStatuses.has(scenario.status);
  }).length;

  const progressPercentage =
    scenarioEntries.length > 0
      ? Math.round((completedScenariosCount / scenarioEntries.length) * 100)
      : 0;
  const displayBugCount = bugCount ?? environment.bugs ?? 0;

  const hasParticipants = participants.length > 0;
  const visibleParticipants = participants.slice(0, 3);
  const hiddenParticipantsCount = Math.max(participants.length - visibleParticipants.length, 0);

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
      data-status={environment.status}
    >
      <div className="environment-card__header">
        <div className="environment-card__header-left">
          <h3 className="environment-card__title">{title}</h3>

          <div className="environment-card__meta-row" aria-hidden>
            {isRelease && (
              <span className="environment-card__meta-item" title={momentDisplay}>
                <ClockIcon aria-hidden className="environment-card__meta-icon" />
                <span className="environment-card__meta-text">{momentDisplay}</span>
              </span>
            )}

            <span className="environment-card__meta-item" title={executionDateLabel}>
              <ClockIcon aria-hidden className="environment-card__meta-icon" />
              <span className="environment-card__meta-text">{executionDateLabel}</span>
            </span>
          </div>
        </div>

        <div className="environment-card__header-right">
          <span
            className={`environment-card__status-badge environment-card__status-badge--${environment.status}`}
          >
            {t(ENVIRONMENT_STATUS_LABEL[environment.status])}
          </span>
        </div>
      </div>

      <div className="environment-card__body">
        <div className="environment-card__stats">
          <div className="environment-card__stat-item">
            <ListIcon aria-hidden className="environment-card__stat-icon" />
            <div className="environment-card__stat-content">
              <span className="environment-card__stat-value">{environment.totalCenarios}</span>
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

        <div className="environment-card__participants">
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
                  +{hiddenParticipantsCount}
                </li>
              )}
            </ul>
          ) : (
            <UsersIcon aria-hidden className="environment-card__participants-icon" />
          )}
        </div>
      </div>

      <div
        className="environment-card__progress"
        role="progressbar"
        aria-label={t('environmentCard.progressLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercentage}
      >
        <div
          className="environment-card__progress-bar"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};
