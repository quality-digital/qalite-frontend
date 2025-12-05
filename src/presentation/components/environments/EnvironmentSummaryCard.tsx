import type { Environment } from '../../../domain/entities/environment';
import type { UserSummary } from '../../../domain/entities/user';
import { ENVIRONMENT_STATUS_LABEL } from '../../../shared/config/environmentLabels';
import { getReadableUserName, getUserInitials } from '../../utils/userDisplay';
import { useTranslation } from 'react-i18next';

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
  progressPercentage: number;
  progressLabel: string;
  scenarioCount: number;
  formattedTime: string;
  formattedStart: string;
  formattedEnd: string;
  urls: string[];
  participants: UserSummary[];
  bugsCount: number;
}

export const EnvironmentSummaryCard = ({
  environment,
  progressPercentage,
  progressLabel,
  scenarioCount,
  formattedTime,
  formattedStart,
  formattedEnd,
  urls,
  participants,
  bugsCount,
}: EnvironmentSummaryCardProps) => {
  const { t: translation } = useTranslation();

  const visibleParticipants = participants.slice(0, 4);
  const remainingParticipants = participants.length - visibleParticipants.length;

  const visibleUrls = urls.slice(0, 3);
  const remainingUrls = urls.length - visibleUrls.length;

  const isWsEnvironment = environment.tipoAmbiente?.toUpperCase() === 'WS';

  const bugLabel = isWsEnvironment
    ? translation('environmentSummary.storyfix')
    : translation('environmentSummary.bugs');

  const jiraTask = environment.jiraTask?.trim() ?? '';
  const jiraUrl = buildJiraLink(jiraTask);

  return (
    <div className="summary-card summary-card--environment summary-card--compact">
      <div className="summary-card__minimal-header">
        <span className={`status-pill status-pill--${environment.status}`}>
          {ENVIRONMENT_STATUS_LABEL[environment.status]}
        </span>
        <div className="summary-card__progress-inline" aria-live="polite">
          <span className="summary-card__progress-value">{progressPercentage}%</span>
          <span className="summary-card__progress-caption">{progressLabel}</span>
        </div>
      </div>

      <div className="summary-card__meta-grid">
        <div className="summary-card__meta-item">
          <span className="summary-card__meta-label">
            {translation('environmentSummary.start')}
          </span>
          <strong>{formattedStart}</strong>
        </div>

        <div className="summary-card__meta-item">
          <span className="summary-card__meta-label">{translation('environmentSummary.end')}</span>
          <strong>{formattedEnd}</strong>
        </div>

        <div className="summary-card__meta-item">
          <span className="summary-card__meta-label">
            {translation('environmentSummary.totalTime')}
          </span>
          <strong>{formattedTime}</strong>
        </div>

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
          <span className="summary-card__meta-label">{translation('environmentSummary.jira')}</span>

          {jiraUrl ? (
            <a
              href={jiraUrl}
              className="summary-card__meta-link"
              target="_blank"
              rel="noreferrer noopener"
            >
              {jiraTask}
            </a>
          ) : (
            <strong>{jiraTask || translation('environmentSummary.notInformed')}</strong>
          )}
        </div>
      </div>

      <div className="summary-card__meta-grid summary-card__meta-grid--columns">
        {environment.momento && (
          <div className="summary-card__meta-item">
            <span className="summary-card__meta-label">
              {translation('environmentSummary.moment')}
            </span>
            <strong>{environment.momento}</strong>
          </div>
        )}

        {environment.release && (
          <div className="summary-card__meta-item">
            <span className="summary-card__meta-label">
              {translation('environmentSummary.release')}
            </span>
            <strong>{environment.release}</strong>
          </div>
        )}
      </div>

      <div className="summary-card__meta-grid summary-card__meta-grid--columns">
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
        <span className="summary-card__meta-label">{translation('environmentSummary.urls')}</span>

        {visibleUrls.length === 0 ? (
          <p className="summary-card__empty">{translation('environmentSummary.noUrls')}</p>
        ) : (
          <div className="summary-card__chip-row">
            {visibleUrls.map((url) => (
              <a
                key={url}
                href={url}
                className="summary-card__chip"
                target="_blank"
                rel="noreferrer noopener"
              >
                {url}
              </a>
            ))}
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
              return (
                <li key={participant.id} className="summary-card__avatar-item">
                  {participant.photoURL ? (
                    <img src={participant.photoURL} alt={readableName} />
                  ) : (
                    <span className="summary-card__avatar-fallback">{initials}</span>
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
