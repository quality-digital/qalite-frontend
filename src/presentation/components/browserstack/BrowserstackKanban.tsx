import type { BrowserstackBuild } from '../../../domain/entities/browserstack';
import { formatDateTime, formatDurationFromMs } from '../../../shared/utils/time';
import { Button } from '../Button';

interface BrowserstackKanbanProps {
  builds: BrowserstackBuild[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const STATUS_ORDER = ['queued', 'running', 'passed', 'failed', 'error', 'stopped'];
const STATUS_META: Record<
  string,
  { label: string; tone: 'info' | 'success' | 'danger' | 'muted' }
> = {
  queued: { label: 'Na fila', tone: 'info' },
  running: { label: 'Em execução', tone: 'info' },
  passed: { label: 'Concluído', tone: 'success' },
  failed: { label: 'Falhou', tone: 'danger' },
  error: { label: 'Erro', tone: 'danger' },
  stopped: { label: 'Interrompido', tone: 'muted' },
  unknown: { label: 'Desconhecido', tone: 'muted' },
};

export const BrowserstackKanban = ({ builds, isLoading, onRefresh }: BrowserstackKanbanProps) => {
  const groupedBuilds = builds.reduce<Record<string, BrowserstackBuild[]>>((accumulator, build) => {
    const normalizedStatus = (build.status ?? 'unknown').toLowerCase();
    const status = normalizedStatus.trim() || 'unknown';
    accumulator[status] = accumulator[status] ?? [];
    accumulator[status].push(build);
    return accumulator;
  }, {});

  const columns = getOrderedColumns(groupedBuilds);
  const totalBuilds = builds.length;
  const summary =
    totalBuilds === 0
      ? []
      : columns.map((status) => ({
          status,
          label: STATUS_META[status]?.label ?? status,
          tone: STATUS_META[status]?.tone ?? 'muted',
          value: groupedBuilds[status]?.length ?? 0,
        }));

  return (
    <section className="browserstack-kanban">
      <header className="browserstack-kanban__header">
        <div>
          <span className="badge">Execuções</span>
          <h3 className="section-title">BrowserStack</h3>
          <p className="browserstack-kanban__description">
            Visualize as execuções agrupadas por status e acesse o relatório público de cada build.
          </p>
        </div>

        {onRefresh && (
          <Button type="button" variant="secondary" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? 'Atualizando...' : 'Atualizar lista'}
          </Button>
        )}
      </header>

      <div className="browserstack-kanban__summary" aria-live="polite">
        <div className="browserstack-kanban__summary-total">
          <span className="browserstack-kanban__summary-value">{totalBuilds}</span>
          <span className="browserstack-kanban__summary-label">Execuções encontradas</span>
        </div>
        <div className="browserstack-kanban__summary-grid">
          {summary.map((item) => (
            <div
              key={item.status}
              className={`browserstack-kanban__summary-chip browserstack-kanban__summary-chip--${item.tone}`}
            >
              <span className="browserstack-kanban__summary-value">{item.value}</span>
              <span className="browserstack-kanban__summary-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="section-subtitle">Buscando execuções no BrowserStack...</p>
      ) : totalBuilds === 0 ? (
        <div className="browserstack-kanban__empty">
          <h4 className="section-title">Nenhuma execução encontrada</h4>
          <p className="section-subtitle">
            Verifique as credenciais do BrowserStack na organização ou utilize o botão de atualizar.
          </p>
        </div>
      ) : (
        <div className="browserstack-kanban__columns">
          {columns.map((status) => {
            const entries = groupedBuilds[status] ?? [];
            const statusMeta = STATUS_META[status] ?? { label: status, tone: 'muted' };

            return (
              <div key={status} className="browserstack-kanban__column">
                <div className="browserstack-kanban__column-header">
                  <div className="browserstack-kanban__column-title">
                    <span
                      className={`browserstack-kanban__status-dot browserstack-kanban__status-dot--${statusMeta.tone}`}
                      aria-hidden
                    />
                    <div>
                      <h4>{statusMeta.label}</h4>
                      <p className="browserstack-kanban__column-subtitle">
                        {entries.length > 0
                          ? 'Cards ordenados pela criação mais recente'
                          : 'Sem execuções neste status'}
                      </p>
                    </div>
                  </div>
                  <span className="browserstack-kanban__column-count">{entries.length}</span>
                </div>

                <div className="browserstack-kanban__column-cards">
                  {entries.map((build) => (
                    <article key={build.id} className="browserstack-build">
                      <header className="browserstack-build__header">
                        <div>
                          <h5 className="browserstack-build__title">
                            {build.name ?? build.buildTag ?? build.id}
                          </h5>
                          {build.buildTag && (
                            <span className="badge badge--muted">{build.buildTag}</span>
                          )}
                        </div>
                        <p className="browserstack-build__meta">
                          {statusMeta.label ?? build.status ?? 'Status'}
                        </p>
                      </header>

                      <dl className="browserstack-build__details">
                        <div>
                          <dt>Duração</dt>
                          <dd>{formatDurationFromMs(build.duration ?? 0)}</dd>
                        </div>
                        <div>
                          <dt>Iniciado</dt>
                          <dd>{formatDateTime(build.startedAt)}</dd>
                        </div>
                        <div>
                          <dt>Criado</dt>
                          <dd>{formatDateTime(build.createdAt)}</dd>
                        </div>
                        <div>
                          <dt>Dispositivos</dt>
                          <dd>{Array.isArray(build.devices) ? build.devices.length : 0}</dd>
                        </div>
                      </dl>

                      {build.publicUrl && (
                        <a
                          className="browserstack-build__link"
                          href={build.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver build no BrowserStack
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

const getOrderedColumns = (groupedBuilds: Record<string, BrowserstackBuild[]>): string[] => {
  const existingStatuses = new Set(Object.keys(groupedBuilds));
  const columns: string[] = [];

  STATUS_ORDER.forEach((status) => {
    if (existingStatuses.has(status)) {
      columns.push(status);
      existingStatuses.delete(status);
    }
  });

  const remaining = Array.from(existingStatuses).sort((a, b) => a.localeCompare(b));
  if (remaining.length > 0) {
    columns.push(...remaining);
  }

  return columns.length > 0 ? columns : ['unknown'];
};
