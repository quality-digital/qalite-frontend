import type { Environment } from '../../../domain/entities/environment';
import type { UserSummary } from '../../../domain/entities/user';
import { ENVIRONMENT_STATUS_LABEL } from '../../../shared/config/environmentLabels';
import { getReadableUserName, getUserInitials } from '../../utils/userDisplay';

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
  suiteDescription: string;
  scenarioCount: number;
  formattedTime: string;
  urls: string[];
  participants: UserSummary[];
  bugsCount: number;
}

export const EnvironmentSummaryCard = ({
  environment,
  progressPercentage,
  progressLabel,
  suiteDescription,
  scenarioCount,
  formattedTime,
  urls,
  participants,
  bugsCount,
}: EnvironmentSummaryCardProps) => {
  const visibleParticipants = participants.slice(0, 4);
  const remainingParticipants = participants.length - visibleParticipants.length;
  const visibleUrls = urls.slice(0, 3);
  const remainingUrls = urls.length - visibleUrls.length;
  const isWsEnvironment = environment.tipoAmbiente?.toUpperCase() === 'WS';
  const bugLabel = isWsEnvironment ? 'Storyfix registrados' : 'Bugs registrados';
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
          <span className="summary-card__meta-label">Tempo total</span>
          <strong>{formattedTime}</strong>
        </div>
        <div className="summary-card__meta-item">
          <span className="summary-card__meta-label">Cenários</span>
          <strong>{scenarioCount}</strong>
          <span className="summary-card__meta-hint">
            {scenarioCount === 0
              ? 'Nenhum cenário executado'
              : scenarioCount === 1
                ? '1 cenário executado'
                : `${scenarioCount} cenários executados`}
          </span>
        </div>
        <div className="summary-card__meta-item">
          <span className="summary-card__meta-label">{bugLabel}</span>
          <strong>{bugsCount}</strong>
        </div>
        <div className="summary-card__meta-item">
          <span className="summary-card__meta-label">Jira</span>
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
            <strong>{jiraTask || 'Não informado'}</strong>
          )}
        </div>
      </div>

      <div className="summary-card__meta-grid summary-card__meta-grid--columns">
        {environment.momento && (
          <div className="summary-card__meta-item">
            <span className="summary-card__meta-label">Momento</span>
            <strong>{environment.momento}</strong>
          </div>
        )}
        {environment.release && (
          <div className="summary-card__meta-item">
            <span className="summary-card__meta-label">Release</span>
            <strong>{environment.release}</strong>
          </div>
        )}
        <div className="summary-card__meta-item summary-card__meta-item--full">
          <span className="summary-card__meta-label">Suíte</span>
          <strong>
            {suiteDescription}
            {scenarioCount > 0 && (
              <span className="summary-card__meta-hint">
                {scenarioCount} cenário{scenarioCount > 1 ? 's' : ''} vinculados
              </span>
            )}
          </strong>
        </div>
      </div>

      <div className="summary-card__meta-grid summary-card__meta-grid--columns">
        <div className="summary-card__meta-item">
          <span className="summary-card__meta-label">Participantes</span>
          <strong>{participants.length}</strong>
          <span className="summary-card__meta-hint">
            {participants.length === 0
              ? 'Nenhum participante'
              : participants.length === 1
                ? '1 participante ativo'
                : `${participants.length} participantes ativos`}
          </span>
        </div>
      </div>

      <div className="summary-card__chips-group">
        <span className="summary-card__meta-label">URLs monitoradas</span>
        {visibleUrls.length === 0 ? (
          <p className="summary-card__empty">Nenhuma URL adicionada.</p>
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
        <span className="summary-card__meta-label">Quem está participando</span>
        {visibleParticipants.length === 0 ? (
          <p className="summary-card__empty">Nenhum participante registrado.</p>
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
