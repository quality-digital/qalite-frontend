import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Environment } from '../../../domain/entities/environment';
import type { UserSummary } from '../../../domain/entities/user';
import { buildExternalLink } from '../../utils/externalLink';
import { getReadableUserName, getUserInitials } from '../../utils/userDisplay';
import { CachedImage } from '../CachedImage';
import { ClockIcon } from '../icons';

interface EnvironmentSummaryCardProps {
  environment: Environment;
  scenarioCount?: number;
  urls?: string[];
  participants: UserSummary[];
  bugsCount?: number;
  storeName?: string;
  storeLogoUrl?: string | null;
}

export const EnvironmentSummaryCard = ({
  environment,
  urls = [],
  participants = [],
}: EnvironmentSummaryCardProps) => {
  const { t } = useTranslation();

  const jiraLinks = (environment.jiraTask ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const visibleUrls = (urls ?? []).filter(Boolean).slice(0, 3);
  const remainingUrls = Math.max((urls ?? []).length - visibleUrls.length, 0);

  const visibleParticipants = participants.slice(0, 4);
  const remainingParticipants = Math.max(participants.length - visibleParticipants.length, 0);

  return (
    <div className="summary-card summary-card--environment summary-card--compact">
      <div className="summary-card__minimal-header">
        <div>
          <span className="summary-card__meta-label">{t('editEnvironmentModal.identifier')}</span>
          <h3 className="section-title">{environment.identificador}</h3>
        </div>
        <span className={`status-pill status-pill--${environment.status}`}>
          {t(`environmentStatus.${environment.status}`)}
        </span>
      </div>

      <div className="summary-card__chips-group">
        <span className="summary-card__meta-label">{t('environmentSummary.jira')}</span>
        {jiraLinks.length === 0 ? (
          <p className="summary-card__empty">{t('environmentSummary.notInformed')}</p>
        ) : (
          <div className="summary-card__chip-row">
            {jiraLinks.map((jira) => {
              const { href, label } = buildExternalLink(jira);
              return href ? (
                <a
                  key={jira}
                  href={href}
                  className="summary-card__chip"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {label}
                </a>
              ) : (
                <span key={jira} className="summary-card__chip">
                  {jira}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="summary-card__chips-group">
        <span className="summary-card__meta-label">{t('environmentSummary.urls')}</span>
        {visibleUrls.length === 0 ? (
          <p className="summary-card__empty">{t('environmentSummary.noUrls')}</p>
        ) : (
          <div className="summary-card__chip-row">
            {visibleUrls.map((url) => {
              const { href, label } = buildExternalLink(url);
              return href ? (
                <a
                  key={url}
                  href={href}
                  className="summary-card__chip"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {label}
                </a>
              ) : (
                <span key={url} className="summary-card__chip">
                  {label}
                </span>
              );
            })}
            {remainingUrls > 0 && (
              <span className="summary-card__chip summary-card__chip--muted">+{remainingUrls}</span>
            )}
          </div>
        )}
      </div>

      <div className="summary-card__participants">
        <span className="summary-card__meta-label">
          {t('environmentSummary.whoIsParticipating')}
        </span>

        {visibleParticipants.length === 0 ? (
          <p className="summary-card__empty">{t('environmentSummary.noParticipants')}</p>
        ) : (
          <ul className="summary-card__avatar-list">
            {visibleParticipants.map((participant) => {
              const readableName = getReadableUserName(participant);
              const initials = getUserInitials(readableName);
              const participantPhotoUrl = participant.photoURL?.trim() || null;
              const isPending = !environment.presentUsersIds?.includes(participant.id);
              return (
                <li key={participant.id} className="summary-card__avatar-item">
                  {participantPhotoUrl ? (
                    <CachedImage
                      src={participantPhotoUrl}
                      alt={readableName}
                      className={isPending ? 'summary-card__avatar-image--pending' : undefined}
                    />
                  ) : (
                    <span className="summary-card__avatar-fallback">{initials}</span>
                  )}
                  {isPending && (
                    <ClockIcon aria-hidden className="summary-card__avatar-pending-icon" />
                  )}
                  <span className="summary-card__participant-name">{readableName}</span>
                </li>
              );
            })}
            {remainingParticipants > 0 && (
              <li className="summary-card__avatar-item summary-card__avatar-item--muted">
                +{remainingParticipants}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};
