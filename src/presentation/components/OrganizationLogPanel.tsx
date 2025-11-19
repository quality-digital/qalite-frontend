import { useEffect, useState } from 'react';

import type { ActivityLog } from '../../lib/types';
import { logService } from '../../services';
import { useToast } from '../context/ToastContext';

interface OrganizationLogPanelProps {
  organizationId: string;
}

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

  return (
    <div className="card organization-log-panel">
      <div className="organization-log-panel__header">
        <div>
          <span className="badge">Auditoria</span>
          <h2 className="text-xl font-semibold text-primary">Logs da organização</h2>
          <p className="section-subtitle">
            Registro das ações realizadas em ambientes, lojas, cenários e suítes.
          </p>
        </div>
        <span className="badge">
          {logs.length} registro{logs.length === 1 ? '' : 's'}
        </span>
      </div>

      {isLoading && <p className="section-subtitle">Sincronizando atividades...</p>}

      {!isLoading && logs.length === 0 && (
        <p className="section-subtitle">Nenhum log foi registrado nos últimos 30 dias.</p>
      )}

      {!isLoading && logs.length > 0 && (
        <ul className="activity-log-list">
          {logs.map((log) => (
            <li key={log.id} className="activity-log-item">
              <div>
                <p className="activity-log-message">{log.message}</p>
                <p className="activity-log-meta">
                  <span className="activity-log-user">{log.actorName}</span>
                  <span aria-hidden>•</span>
                  <span>{log.action}</span>
                </p>
              </div>
              <span className="activity-log-date">{formatLogDate(log.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
