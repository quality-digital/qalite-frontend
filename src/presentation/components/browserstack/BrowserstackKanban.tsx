import type { BrowserstackBuild } from '../../../domain/entities/browserstack';
import { formatDurationFromMs } from '../../../shared/utils/time';
import { Button } from '../Button';

interface BrowserstackKanbanProps {
  builds: BrowserstackBuild[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

type NormalizedStatus = keyof typeof STATUS_META;
const STATUS_META = {
  em_espera: { label: 'Em espera', tone: 'info' as const },
  em_andamento: { label: 'Em andamento', tone: 'info' as const },
  concluido: { label: 'Concluído', tone: 'success' as const },
  falhou: { label: 'Falhou', tone: 'danger' as const },
};

const STATUS_ORDER: NormalizedStatus[] = ['em_espera', 'em_andamento', 'concluido', 'falhou'];

const normalizeStatus = (status?: string): NormalizedStatus => {
  const normalized = (status ?? '').trim().toLowerCase();

  if (['running', 'in progress', 'em andamento'].includes(normalized)) {
    return 'em_andamento';
  }

  if (['passed', 'success', 'done', 'concluido'].includes(normalized)) {
    return 'concluido';
  }

  if (['failed', 'error', 'stopped', 'interrupted', 'falhou'].includes(normalized)) {
    return 'falhou';
  }

  return 'em_espera';
};

export const BrowserstackKanban = ({ builds, isLoading, onRefresh }: BrowserstackKanbanProps) => {
  const groupedBuilds = builds.reduce<Partial<Record<NormalizedStatus, BrowserstackBuild[]>>>(
    (accumulator, build) => {
      const status = normalizeStatus(build.status);
      accumulator[status] = accumulator[status] ?? [];
      accumulator[status]?.push(build);
      return accumulator;
    },
    {},
  );

  const columns = getOrderedColumns();
  const totalBuilds = builds.length;
  const summary =
    totalBuilds === 0
      ? []
      : columns.map((status) => ({
          status,
          label: STATUS_META[status].label,
          tone: STATUS_META[status].tone,
          value: groupedBuilds[status]?.length ?? 0,
        }));

  return (
    <section className="browserstack-kanban">
      <header className="browserstack-kanban__header">
        <div>
          <span className="badge">Execuções</span>
          <div className="browserstack-kanban__title-row">
            <img
              className="browserstack-kanban__brand"
              src="https://img.icons8.com/color/48/browser-stack.png"
              alt="BrowserStack"
            />
            <h3 className="section-title">BrowserStack</h3>
          </div>
          <p className="browserstack-kanban__description">
            Visualize as execuções agrupadas por status e acesse o relatório público de cada build
            usando suas credenciais pessoais configuradas no perfil.
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
            Verifique suas credenciais do BrowserStack no perfil ou utilize o botão de atualizar.
          </p>
        </div>
      ) : (
        <div className="browserstack-kanban__columns">
          {columns.map((status) => {
            const entries = groupedBuilds[status] ?? [];
            const statusMeta = STATUS_META[status];

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
                            {build.name || build.buildTag || 'Build sem nome'}
                          </h5>
                          <div className="browserstack-build__meta-row">
                            <span
                              className={`browserstack-build__pill browserstack-build__pill--${statusMeta.tone}`}
                            >
                              {statusMeta.label}
                            </span>
                            {build.buildTag && (
                              <span className="browserstack-build__pill browserstack-build__pill--muted">
                                {build.buildTag}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="browserstack-build__duration">
                          {formatDurationFromMs(build.duration ?? 0)}
                        </span>
                      </header>

                      {build.status && (
                        <p className="browserstack-build__status-label">{build.status}</p>
                      )}

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

const getOrderedColumns = (): NormalizedStatus[] => {
  return [...STATUS_ORDER];
};
