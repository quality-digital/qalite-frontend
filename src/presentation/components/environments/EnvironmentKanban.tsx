import type { DragEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { EnvironmentStatusError } from '../../../shared/errors/firebaseErrors';
import type { Environment, EnvironmentStatus } from '../../../domain/entities/environment';
import type { StoreScenario, StoreSuite } from '../../../domain/entities/store';
import type { UserSummary } from '../../../domain/entities/user';
import { environmentService } from '../../../application/use-cases/EnvironmentUseCase';
import { userService } from '../../../application/use-cases/UserUseCase';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { PaginationControls } from '../PaginationControls';
import { EnvironmentCard } from './EnvironmentCard';
import { CreateEnvironmentCard } from './CreateEnvironmentCard';
import { ArchiveIcon } from '../icons';

interface EnvironmentKanbanProps {
  storeId: string;
  suites: StoreSuite[];
  scenarios: StoreScenario[];
  environments: Environment[];
  isLoading: boolean;
}

const COLUMNS: { status: EnvironmentStatus; title: string }[] = [
  { status: 'backlog', title: 'Backlog' },
  { status: 'in_progress', title: 'environmentKanban.progress' },
  { status: 'done', title: 'environmentKanban.done' },
];

export const EnvironmentKanban = ({
  storeId,
  suites,
  scenarios,
  environments,
  isLoading,
}: EnvironmentKanbanProps) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [userProfilesMap, setUserProfilesMap] = useState<Record<string, UserSummary>>({});
  const [isArchiveMinimized, setIsArchiveMinimized] = useState(true);
  const [archivedVisibleCount, setArchivedVisibleCount] = useState(5);
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    let isMounted = true;
    const participantIds = new Set<string>();
    environments.forEach((environment) => {
      (environment.participants ?? [])
        .filter((id) => Boolean(id))
        .forEach((id) => participantIds.add(id));
    });

    if (participantIds.size === 0) {
      setUserProfilesMap({});
      return;
    }

    const fetchProfiles = async () => {
      try {
        const profiles = await userService.getSummariesByIds(Array.from(participantIds));
        if (isMounted) {
          const nextMap: Record<string, UserSummary> = {};
          profiles.forEach((profile) => {
            nextMap[profile.id] = profile;
          });
          setUserProfilesMap(nextMap);
        }
      } catch (error) {
        console.error('Failed to fetch user summaries', error);
      }
    };

    void fetchProfiles();
    return () => {
      isMounted = false;
    };
  }, [environments]);

  const grouped = useMemo(() => {
    const columns: Record<EnvironmentStatus, Environment[]> = {
      backlog: [],
      in_progress: [],
      done: [],
    };

    environments.forEach((environment) => {
      columns[environment.status].push(environment);
    });

    return columns;
  }, [environments]);

  const suiteNameByEnvironment = useMemo(() => {
    if (environments.length === 0) {
      return {} as Record<string, string | null>;
    }

    const suiteLookup = suites.reduce<Record<string, StoreSuite>>((acc, suite) => {
      acc[suite.id] = suite;
      return acc;
    }, {});

    return environments.reduce<Record<string, string | null>>(
      (acc, environment) => {
        if (environment.suiteName) {
          acc[environment.id] = environment.suiteName;
          return acc;
        }

        if (environment.suiteId && suiteLookup[environment.suiteId]) {
          acc[environment.id] = suiteLookup[environment.suiteId].name;
          return acc;
        }

        const scenarioIds = Object.keys(environment.scenarios ?? {});
        if (scenarioIds.length === 0) {
          acc[environment.id] = null;
          return acc;
        }

        const matchingSuite = suites.find((suite) => {
          if (suite.scenarioIds.length === 0) {
            return false;
          }

          if (suite.scenarioIds.length !== scenarioIds.length) {
            return false;
          }

          return suite.scenarioIds.every((scenarioId) => scenarioIds.includes(scenarioId));
        });

        acc[environment.id] = matchingSuite?.name ?? null;
        return acc;
      },
      {} as Record<string, string | null>,
    );
  }, [environments, suites]);

  const handleDragStart = (event: DragEvent<HTMLDivElement>, environmentId: string) => {
    event.dataTransfer.setData('text/environment-id', environmentId);
  };

  const handleDrop = (status: EnvironmentStatus) => async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const environmentId = event.dataTransfer.getData('text/environment-id');
    const environment = environments.find((item) => item.id === environmentId);

    if (!environment) {
      return;
    }

    await moveEnvironment(environment, status);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const moveEnvironment = async (environment: Environment, status: EnvironmentStatus) => {
    if (environment.status === status) {
      return;
    }

    if (status === 'backlog' && environment.status !== 'backlog') {
      showToast({ type: 'info', message: t('environmentKanban.done') });
      return;
    }

    try {
      await environmentService.transitionStatus({
        environment,
        targetStatus: status,
        currentUserId: user?.uid ?? null,
      });
      showToast({ type: 'success', message: t('environmentKanban.statusUpdate') });
    } catch (error) {
      if (error instanceof EnvironmentStatusError && error.code === 'PENDING_SCENARIOS') {
        showToast({
          type: 'error',
          message: t('environmentKanban.statusError'),
        });
        return;
      }

      console.error(error);
      showToast({ type: 'error', message: t('environmentKanban.updateError') });
    }
  };

  const handleOpenEnvironment = (environment: Environment) => {
    navigate(`/environments/${environment.id}`);
  };

  const PAGE_SIZE = 5;
  const doneEnvironments = grouped.done;
  const activeDoneEnvironments = doneEnvironments.slice(0, PAGE_SIZE);
  const archivedEnvironments = doneEnvironments.slice(PAGE_SIZE);
  const hasArchivedEnvironments = archivedEnvironments.length > 0;
  const paginatedArchivedEnvironments = archivedEnvironments.slice(0, archivedVisibleCount);

  useEffect(() => {
    setArchivedVisibleCount(PAGE_SIZE);
  }, [archivedEnvironments.length]);

  return (
    <section className="environment-kanban">
      <header className="environment-kanban-header">
        <CreateEnvironmentCard
          storeId={storeId}
          suites={suites}
          scenarios={scenarios}
          onCreated={() =>
            showToast({ type: 'success', message: t('environmentKanban.environmentCreated') })
          }
        />
      </header>

      {hasArchivedEnvironments && (
        <p className="environment-kanban-archive-hint">
          {archivedEnvironments.length} {t('environmentKanban.environment')}
          {archivedEnvironments.length === 1 ? '' : 's'}{' '}
          {t('environmentKanban.archivedEnvironments')}
          {archivedEnvironments.length === 1 ? '' : 's'} {t('environmentKanban.consulted')}
          {archivedEnvironments.length === 1 ? '' : 's'} {t('environmentKanban.below')}
        </p>
      )}

      {isLoading ? (
        <p className="section-subtitle">{t('environmentKanban.loading')}</p>
      ) : (
        <div className="environment-kanban-columns">
          {COLUMNS.map((column) => {
            const environmentsToRender =
              column.status === 'done' ? activeDoneEnvironments : grouped[column.status];

            return (
              <div
                key={column.status}
                className="environment-kanban-column"
                onDragOver={handleDragOver}
                onDrop={handleDrop(column.status)}
              >
                <div className="environment-kanban-column-header">
                  <h4>{t(column.title)}</h4>
                  <span className="environment-kanban-column-count">
                    {environmentsToRender.length}
                  </span>
                </div>
                {environmentsToRender.length === 0 ? (
                  <p className="section-subtitle">{t('environmentKanban.noEnvironment')}</p>
                ) : (
                  environmentsToRender.map((environment) => (
                    <EnvironmentCard
                      key={environment.id}
                      environment={environment}
                      participants={(environment.participants ?? [])
                        .map((id) => userProfilesMap[id])
                        .filter((user): user is UserSummary => Boolean(user))}
                      suiteName={suiteNameByEnvironment[environment.id]}
                      draggable
                      onDragStart={handleDragStart}
                      onOpen={handleOpenEnvironment}
                    />
                  ))
                )}
              </div>
            );
          })}

          {archivedEnvironments.length > 0 && (
            <div
              className={[
                'environment-kanban-column environment-kanban-column--archived',
                isArchiveMinimized ? 'environment-kanban-column--collapsed' : null,
              ]
                .filter(Boolean)
                .join(' ')}
              onDragOver={handleDragOver}
              onDrop={handleDrop('done')}
            >
              <div className="environment-kanban-column-header">
                <div className="environment-kanban-column-title">
                  <h4 className="environment-kanban-archived-title">
                    <ArchiveIcon aria-hidden className="icon" />
                    {t('environmentKanban.archived')}
                  </h4>
                  <button
                    type="button"
                    className="environment-kanban-archive-toggle"
                    onClick={() => setIsArchiveMinimized((previous) => !previous)}
                    aria-expanded={!isArchiveMinimized}
                    aria-controls="environment-kanban-archived-list"
                  >
                    {isArchiveMinimized ? t('environmentKanban.max') : t('environmentKanban.min')}
                  </button>
                </div>
                <span className="environment-kanban-column-count">
                  {archivedEnvironments.length}
                </span>
              </div>

              {isArchiveMinimized ? (
                <p className="environment-kanban-archive-placeholder">
                  {t('environmentKanban.maxEnvironment')}
                </p>
              ) : (
                <div
                  id="environment-kanban-archived-list"
                  className="environment-kanban-archived-list"
                >
                  {paginatedArchivedEnvironments.map((environment) => (
                    <EnvironmentCard
                      key={environment.id}
                      environment={environment}
                      participants={(environment.participants ?? [])
                        .map((id) => userProfilesMap[id])
                        .filter((user): user is UserSummary => Boolean(user))}
                      suiteName={suiteNameByEnvironment[environment.id]}
                      draggable
                      onDragStart={handleDragStart}
                      onOpen={handleOpenEnvironment}
                    />
                  ))}
                </div>
              )}
              {!isArchiveMinimized && (
                <PaginationControls
                  total={archivedEnvironments.length}
                  visible={paginatedArchivedEnvironments.length}
                  step={PAGE_SIZE}
                  onShowLess={() => setArchivedVisibleCount(PAGE_SIZE)}
                  onShowMore={() =>
                    setArchivedVisibleCount((previous) =>
                      Math.min(previous + PAGE_SIZE, archivedEnvironments.length),
                    )
                  }
                />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
