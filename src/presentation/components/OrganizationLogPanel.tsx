import { useEffect, useMemo, useState } from 'react';

import type { ActivityLog } from '../../lib/types';
import { logService } from '../../services';
import { useToast } from '../context/ToastContext';
import { ActivityIcon, ChevronDownIcon, FilterIcon } from './icons';

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

const formatLogDate = (value: Date | null): string => {
  if (!value) {
    return 'Data indisponível';
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
          showToast({ type: 'error', message: 'Não foi possível carregar os logs de atividade.' });
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

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  const renderActionLabel = (action: ActivityLog['action']) => {
    switch (action) {
      case 'create':
        return 'Criação';
      case 'update':
        return 'Atualização';
      case 'delete':
        return 'Exclusão';
      case 'status_change':
        return 'Status';
      case 'attachment':
        return 'Anexo';
      case 'participation':
        return 'Participação';
      default:
        return action;
    }
  };

  const renderEntityLabel = (entity: ActivityLog['entityType']) => {
    const option = ENTITY_FILTERS.find((filter) => filter.value === entity);
    return option?.label ?? entity;
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
              <span className="badge">Auditoria</span>
              <span className="badge badge--muted">
                {logs.length} registro{logs.length === 1 ? '' : 's'}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-primary">Logs da organização</h2>
            <p className="section-subtitle">
              Registro das ações realizadas em ambientes, lojas, cenários e suítes.
            </p>
          </div>
        </div>

        <button
          className="button button-secondary button-ghost"
          type="button"
          onClick={toggleCollapse}
        >
          {isCollapsed ? 'Mostrar' : 'Ocultar'}
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
              <span>Filtros</span>
            </div>

            <label className="form-field">
              <span className="form-label">Entidade</span>
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
              <span className="form-label">Ação</span>
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

          {isLoading && <p className="section-subtitle">Sincronizando atividades...</p>}

          {!isLoading && filteredLogs.length === 0 && (
            <p className="section-subtitle">Nenhum log encontrado para os filtros selecionados.</p>
          )}

          {!isLoading && filteredLogs.length > 0 && (
            <ul className="activity-log-list">
              {filteredLogs.map((log) => (
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
        </>
      )}
    </div>
  );
};
