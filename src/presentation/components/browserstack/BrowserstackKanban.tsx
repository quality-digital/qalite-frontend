import type { BrowserstackBuild } from '../../../domain/entities/browserstack';
import { useTranslation } from 'react-i18next';
import { Button } from '../Button';

interface BrowserstackKanbanProps {
  builds: BrowserstackBuild[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

type NormalizedStatus = keyof typeof STATUS_META;
const STATUS_META = {
  em_espera: { labelKey: 'browserstackKanban.status.waiting', tone: 'info' as const },
  em_andamento: { labelKey: 'browserstackKanban.status.running', tone: 'info' as const },
  concluido: { labelKey: 'browserstackKanban.status.done', tone: 'success' as const },
  falhou: { labelKey: 'browserstackKanban.status.failed', tone: 'danger' as const },
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
  const { t } = useTranslation();
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

  return (
    <section className="browserstack-kanban">
      <header className="browserstack-kanban__header">
        <div>
          <div className="browserstack-kanban__title-row">
            <img
              className="browserstack-kanban__brand"
              src="https://img.icons8.com/color/48/browser-stack.png"
              alt={t('browserstackKanban.brandAlt')}
            />
            <h3 className="section-title">{t('browserstackKanban.title')}</h3>
          </div>
        </div>

        {onRefresh && (
          <Button type="button" variant="secondary" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? t('browserstackKanban.refreshing') : t('browserstackKanban.refresh')}
          </Button>
        )}
      </header>

      {isLoading ? (
        <p className="section-subtitle">{t('browserstackKanban.loading')}</p>
      ) : totalBuilds === 0 ? (
        <div className="browserstack-kanban__empty">
          <h4 className="section-title">{t('browserstackKanban.emptyTitle')}</h4>
          <p className="section-subtitle">{t('browserstackKanban.emptySubtitle')}</p>
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
                      <h4>{t(statusMeta.labelKey)}</h4>
                      <p className="browserstack-kanban__column-subtitle">
                        {entries.length > 0
                          ? t('browserstackKanban.columnSubtitleWithCards')
                          : t('browserstackKanban.columnSubtitleEmpty')}
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
                            {build.name || build.buildTag || t('browserstackKanban.unnamedBuild')}
                          </h5>
                          <div className="browserstack-build__meta-row">
                            <span
                              className={`browserstack-build__pill browserstack-build__pill--${statusMeta.tone}`}
                            >
                              {t(statusMeta.labelKey)}
                            </span>
                            {build.buildTag && (
                              <span className="browserstack-build__pill browserstack-build__pill--muted">
                                {build.buildTag}
                              </span>
                            )}
                          </div>
                        </div>
                      </header>

                      {build.publicUrl && (
                        <a
                          className="browserstack-build__link"
                          href={build.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('browserstackKanban.viewBuild')}
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
