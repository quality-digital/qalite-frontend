import { useEffect, useMemo, useState } from 'react';

import type { ActivityLog } from '../../domain/entities/activityLog';
import { logService } from '../../application/use-cases/LogUseCase';
import { useToast } from '../context/ToastContext';
import { ActivityIcon, ChevronDownIcon, FilterIcon } from './icons';
import { useTranslation } from 'react-i18next';

interface OrganizationLogPanelProps {
  organizationId: string;
}

const ENTITY_FILTERS = [
  { value: 'all', label: 'Todas as entidades' },
  { value: 'organization', label: 'Organização' },
  { value: 'store', label: 'Loja' },
  { value: 'scenario', label: 'Cenário' },
  { value: 'suite', label: 'Suíte' },
  { value: 'environment', label: 'Ambiente' },
  { value: 'environment_bug', label: 'Bug de ambiente' },
  { value: 'environment_participant', label: 'Participante' },
];

const ACTION_FILTERS: { value: ActivityLog['action'] | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas as ações' },
  { value: 'create', label: 'Criação' },
  { value: 'update', label: 'Atualização' },
  { value: 'delete', label: 'Exclusão' },
  { value: 'status_change', label: 'Status' },
  { value: 'attachment', label: 'Anexo' },
  { value: 'participation', label: 'Participação' },
];

const INITIAL_LOG_PAGE_SIZE = 5;

const formatLogDate = (value: Date | null): string => {
  if (!value) {
    return t('logPanel.dateUnavailable');
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value);
};

export const OrganizationLogPanel = ({ organizationId }: OrganizationLogPanelProps) => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [actionFilter, setActionFilter] = useState<ActivityLog['action'] | 'all'>('all');
  const [entityFilter, setEntityFilter] = useState<ActivityLog['entityType'] | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOG_PAGE_SIZE);
  const { t } = useTranslation();

  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const entries = await logService.listByOrganization(organizationId);
        if (isMounted) {
          setLogs(entries);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          showToast({ type: 'error', message: t('logPanel.errorLoading') });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchLogs();

    return () => {
      isMounted = false;
    };
  }, [organizationId, showToast]);

  const filteredLogs = useMemo(
    () =>
      logs.filter(
        (log) =>
          (actionFilter === 'all' || log.action === actionFilter) &&
          (entityFilter === 'all' || log.entityType === entityFilter),
      ),
    [actionFilter, entityFilter, logs],
  );

  useEffect(() => {
    setVisibleCount(INITIAL_LOG_PAGE_SIZE);
  }, [actionFilter, entityFilter, logs]);

  const displayedLogs = useMemo(
    () => filteredLogs.slice(0, visibleCount),
    [filteredLogs, visibleCount],
  );

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  const renderActionLabel = (action: ActivityLog['action']) => {
    switch (action) {
      case 'create':
        return t('logPanel.actionCreate');
      case 'update':
        return t('logPanel.actionUpdate');
      case 'delete':
        return t('logPanel.actionDelete');
      case 'status_change':
        return t('logPanel.actionStatusChange');
      case 'attachment':
        return t('logPanel.actionAttachment');
      case 'participation':
        return t('logPanel.actionParticipation');
      default:
        return action;
    }
  };

  const renderEntityLabel = (entity: ActivityLog['entityType']) => {
    const option = ENTITY_FILTERS.find((filter) => filter.value === entity);
    if (!option) return entity;

    switch (option.value) {
      case 'all':
        return t('logPanel.entityAll');
      case 'organization':
        return t('logPanel.entityOrganization');
      case 'store':
        return t('logPanel.entityStore');
      case 'scenario':
        return t('logPanel.entityScenario');
      case 'suite':
        return t('logPanel.entitySuite');
      case 'environment':
        return t('logPanel.entityEnvironment');
      case 'environment_bug':
        return t('logPanel.entityEnvironmentBug');
      case 'environment_participant':
        return t('logPanel.entityEnvironmentParticipant');
      default:
        return entity;
    }
  };

  return (
    <div
      className={`card organization-log-panel${isCollapsed ? ' organization-log-panel--collapsed' : ''}`}
    >
      <div className="organization-log-panel__header">
        <div className="organization-log-panel__heading">
          <span className="icon-pill" aria-hidden>
            <ActivityIcon className="icon" />
          </span>
          <div>
            <div className="organization-log-panel__title-row">
              <span className="badge">{t('logPanel.headerAudit')}</span>
              <span className="badge badge--muted">
                {logs.length} t('logPanel.headerRecords')
              </span>
            </div>
            <h2 className="text-xl font-semibold text-primary">{t('logPanel.titleMain')}</h2>
            <p className="section-subtitle">
              {t('logPanel.titleSubtitle')}
            </p>
          </div>
        </div>

        <button
          className="button button-secondary button-ghost"
          type="button"
          onClick={toggleCollapse}
        >
          {isCollapsed ? t('logPanel.buttonShow') : t('logPanel.buttonHide')}
          <ChevronDownIcon
            className={`icon icon--rotate ${isCollapsed ? '' : 'icon--rotate-180'}`}
            aria-hidden
          />
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="organization-log-panel__filters">
            <div className="filter-chip" aria-hidden>
              <FilterIcon className="icon" />
              <span>{t('logPanel.filterLabel')}</span>
            </div>

            <label className="form-field">
              <span className="form-label">{t('logPanel.filterEntity')}</span>
              <select
                className="organization-log-panel__select"
                value={entityFilter}
                onChange={(event) => setEntityFilter(event.target.value as typeof entityFilter)}
              >
                {ENTITY_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">{t('logPanel.filterAction')}</span>
              <select
                className="organization-log-panel__select"
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value as typeof actionFilter)}
              >
                {ACTION_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoading && <p className="section-subtitle">{t('logPanel.stateLoading')}</p>}

          {!isLoading && filteredLogs.length === 0 && (
            <p className="section-subtitle">{t('logPanel.stateEmpty')}</p>
          )}

          {!isLoading && filteredLogs.length > 0 && (
            <ul className="activity-log-list">
              {displayedLogs.map((log) => (
                <li key={log.id} className="activity-log-item">
                  <div className="activity-log-item__timeline" aria-hidden>
                    <span className={`activity-log-dot activity-log-dot--${log.action}`} />
                    <span className="activity-log-line" />
                  </div>

                  <div className="activity-log-item__content">
                    <div className="activity-log-tags">
                      <span className={`chip chip--${log.action}`}>
                        {renderActionLabel(log.action)}
                      </span>
                      <span className="chip chip--entity">{renderEntityLabel(log.entityType)}</span>
                    </div>
                    <p className="activity-log-message">{log.message}</p>
                    <p className="activity-log-meta">
                      <span className="activity-log-user">{log.actorName}</span>
                      <span aria-hidden>•</span>
                      <span>{formatLogDate(log.createdAt)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && filteredLogs.length > displayedLogs.length && (
            <div className="organization-log-panel__actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setVisibleCount((previous) => previous + INITIAL_LOG_PAGE_SIZE)}
              >
                {t('logPanel.listMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
