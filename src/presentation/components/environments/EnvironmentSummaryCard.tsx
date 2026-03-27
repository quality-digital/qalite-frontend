import type { Environment } from '../../../domain/entities/environment';
import type { UserSummary } from '../../../domain/entities/user';
import { ENVIRONMENT_STATUS_LABEL } from '../../../shared/config/environmentLabels';
import { getReadableUserName, getUserInitials } from '../../utils/userDisplay';
import { CachedImage } from '../CachedImage';
import { translateEnvironmentOption } from '../../constants/environmentOptions';
import { requiresReleaseField } from '../../constants/environmentOptions';
import { useTranslation } from 'react-i18next';
import { buildExternalLink } from '../../utils/externalLink';
import { ClockIcon } from '../icons';

const buildJiraLink = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.includes('.')) {
    return `https://${trimmed}`;
  }

  return null;
};

interface EnvironmentSummaryCardProps {
  environment: Environment;
  scenarioCount: number;
  urls: string[];
  participants: UserSummary[];
  bugsCount: number;
  storeName?: string;
  storeLogoUrl?: string | null;
  showStoreBranding?: boolean;
}

export const EnvironmentSummaryCard = ({
  environment,
  scenarioCount,
  urls,
  participants,
  bugsCount,
  storeName,
  storeLogoUrl,
  showStoreBranding = false,
}: EnvironmentSummaryCardProps) => {
  const { t: translation } = useTranslation();

  const visibleParticipants = participants.slice(0, 4);
  const remainingParticipants = participants.length - visibleParticipants.length;

  const visibleUrls = urls.slice(0, 3);
  const remainingUrls = urls.length - visibleUrls.length;

  const normalizedEnvironmentType =
    typeof environment.tipoAmbiente === 'string'
      ? environment.tipoAmbiente.trim().toUpperCase()
      : '';
  const isWsEnvironment = normalizedEnvironmentType === 'WS';
  const isHomologationEnvironment = requiresReleaseField(environment.tipoAmbiente);

  const bugLabel = isWsEnvironment
    ? translation('environmentSummary.storyfix')
    : translation('environmentSummary.bugs');

  const jiraLinks = (environment.jiraTask ?? '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const resolvedStoreName = storeName?.trim() || translation('storeSummary.emptyValue');
  const resolvedStoreLogo = storeLogoUrl?.trim() || null;

  return (
    <div className="summary-card summary-card--environment summary-card--compact">
      <div className="summary-card__minimal-header">
        <div>
          <span className="summary-card__meta-label">
            {translation('editEnvironmentModal.identifier')}
          </span>
          <h3 className="section-title">{environment.identificador}</h3>
        </div>
        <span className={`status-pill status-pill--${environment.status}`}>
          {translation(ENVIRONMENT_STATUS_LABEL[environment.status])}
        </span>
      </div>

      <div className="summary-card__meta-grid summary-card__meta-grid--columns">
        {showStoreBranding && (
          <div className="summary-card__meta-item">
            <span className="summary-card__meta-label">{translation('storeSummary.storeName')}</span>
            <div className="summary-card__store-meta">
              {resolvedStoreLogo ? (
                <CachedImage src={resolvedStoreLogo} alt={resolvedStoreName} />
              ) : (
                <span className="summary-card__store-logo-fallback">
                  {resolvedStoreName.charAt(0).toUpperCase() || 'S'}
                </span>
              )}
              <strong>{resolvedStoreName}</strong>
            </div>
          </div>
        )}

        <div className="summary-card__meta-item">
          <span className="summary-card__meta-label">
            {translation('createEnvironment.suiteId')}
          </span>
          <strong>{environment.suiteName || translation('storeSummary.emptyValue')}</strong>
        </div>

        <div className="summary-card__meta-item">
          <span className="summary-card__meta-label">
            {translation('editEnvironmentModal.environmentType')}
          </span>
          <strong>{translateEnvironmentOption(environment.tipoAmbiente, translation)}</strong>
        </div>

        <div className="summary-card__meta-item">
          <span className="summary-card__meta-label">
            {translation('editEnvironmentModal.testType')}
          </span>
          <strong>{translateEnvironmentOption(environment.tipoTeste, translation)}</strong>
        </div>
      </div>

      {isHomologationEnvironment && (
        <div className="summary-card__meta-grid summary-card__meta-grid--columns">
          <div className="summary-card__meta-item">
            <span className="summary-card__meta-label">
              {translation('environmentSummary.moment')}
            </span>
            <strong>
              {environment.momento
                ? translateEnvironmentOption(environment.momento, translation)
                : translation('environmentSummary.notRecorded')}
            </strong>
          </div>
          <div className="summary-card__meta-item">
            <span className="summary-card__meta-label">
              {translation('environmentSummary.release')}
            </span>
            <strong>{environment.release || translation('environmentSummary.notRecorded')}</strong>
          </div>
        </div>
      )}

      <div className="summary-card__meta-grid summary-card__meta-grid--stats">
        <div className="summary-card__meta-item">
          <span className="summary-card__meta-label">
            {translation('environmentSummary.scenarios')}
          </span>

          <strong>{scenarioCount}</strong>

          <span className="summary-card__meta-hint">
            {scenarioCount === 0
              ? translation('environmentSummary.noScenarios')
              : scenarioCount === 1
                ? translation('environmentSummary.oneScenario')
                : translation('environmentSummary.multipleScenarios', {
                    count: scenarioCount,
                  })}
          </span>
        </div>

        <div className="summary-card__meta-item">
          <span className="summary-card__meta-label">{bugLabel}</span>
          <strong>{bugsCount}</strong>
        </div>
        <div className="summary-card__meta-item">
          <span className="summary-card__meta-label">
            {translation('environmentSummary.participants')}
          </span>

          <strong>{participants.length}</strong>

          <span className="summary-card__meta-hint">
            {participants.length === 0 && translation('environmentSummary.noParticipants')}
            {participants.length === 1 && translation('environmentSummary.oneParticipant')}
            {participants.length > 1 &&
              translation('environmentSummary.multipleParticipants', {
                count: participants.length,
              })}
          </span>
        </div>
      </div>

      <div className="summary-card__chips-group">
        <span className="summary-card__meta-label">{translation('environmentSummary.jira')}</span>
        {jiraLinks.length === 0 ? (
          <p className="summary-card__empty">{translation('environmentSummary.notInformed')}</p>
        ) : (
          <div className="summary-card__chip-row">
            {jiraLinks.map((jira) => {
              const href = buildJiraLink(jira);
              return href ? (
                <a
                  key={jira}
                  href={href}
                  className="summary-card__chip"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {jira}
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
        <span className="summary-card__meta-label">{translation('environmentSummary.urls')}</span>

        {visibleUrls.length === 0 ? (
          <p className="summary-card__empty">{translation('environmentSummary.noUrls')}</p>
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
          {translation('environmentSummary.whoIsParticipating')}
        </span>

        {visibleParticipants.length === 0 ? (
          <p className="summary-card__empty">{translation('environmentSummary.noParticipants')}</p>
        ) : (
          <ul className="summary-card__avatar-list">
            {visibleParticipants.map((participant) => {
              const readableName = getReadableUserName(participant);
              const initials = getUserInitials(readableName);
              const participantPhotoUrl = participant.photoURL?.trim() || null;
              const isPending = !environment.presentUsersIds.includes(participant.id);
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
                  <span>{readableName}</span>
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
