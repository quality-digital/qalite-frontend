import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type {
  Environment,
  EnvironmentScenario,
  EnvironmentStatus,
} from '../../../domain/entities/environment';
import type { Store, StoreScenario, StoreSuite } from '../../../domain/entities/store';
import type { UserSummary } from '../../../domain/entities/user';
import { environmentService } from '../../../infrastructure/services/environmentService';
import { userService } from '../../../infrastructure/services/userService';
import { useToast } from '../../context/ToastContext';
import { PaginationControls } from '../PaginationControls';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { TextInput } from '../TextInput';
import { SelectInput } from '../SelectInput';
import { EnvironmentCard } from './EnvironmentCard';
import {
  MOMENT_OPTIONS_BY_ENVIRONMENT,
  TEST_TYPES_BY_ENVIRONMENT,
} from '../../constants/environmentOptions';
import { CreateEnvironmentCard } from './CreateEnvironmentCard';
import { ArchiveIcon, CheckCircleIcon, InboxIcon, ProgressIcon, SaveIcon } from '../icons';

interface EnvironmentKanbanProps {
  storeId: string;
  storeStage?: Store['stage'] | null;
  storeEnvironmentColumns?: string[] | null;
  suites: StoreSuite[];
  scenarios: StoreScenario[];
  environments: Environment[];
  isLoading: boolean;
  onEnvironmentCreated: (environment: Environment) => void;
}

const COLUMNS: { status: EnvironmentStatus; title: string; Icon: typeof InboxIcon }[] = [
  { status: 'backlog', title: 'environmentKanban.backlog', Icon: InboxIcon },
  { status: 'in_progress', title: 'environmentKanban.progress', Icon: ProgressIcon },
  { status: 'done', title: 'environmentKanban.done', Icon: CheckCircleIcon },
];

const cloneScenarioMap = (
  scenarios: Record<string, EnvironmentScenario>,
  environmentColumns: string[],
): Record<string, EnvironmentScenario> =>
  Object.fromEntries(
    Object.entries(scenarios).map(([id, scenario]) => [
      id,
      {
        ...scenario,
        status: 'pendente',
        statusMobile: 'pendente',
        statusDesktop: 'pendente',
        statusByEnvironment: environmentColumns.reduce<
          Record<string, EnvironmentScenario['status']>
        >((acc, column) => {
          acc[column] = 'pendente';
          return acc;
        }, {}),
        evidenciaArquivoUrl: null,
      },
    ]),
  );

export const EnvironmentKanban = ({
  storeId,
  storeStage,
  storeEnvironmentColumns,
  suites,
  scenarios,
  environments,
  isLoading,
  onEnvironmentCreated,
}: EnvironmentKanbanProps) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [userProfilesMap, setUserProfilesMap] = useState<Record<string, UserSummary>>({});
  const [isArchiveMinimized, setIsArchiveMinimized] = useState(true);
  const [archivedVisibleCount, setArchivedVisibleCount] = useState(5);
  const [environmentToClone, setEnvironmentToClone] = useState<Environment | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneIdentifier, setCloneIdentifier] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneTipoAmbiente, setCloneTipoAmbiente] = useState('WS');
  const [cloneTipoTeste, setCloneTipoTeste] = useState('Smoke-test');
  const [cloneMomento, setCloneMomento] = useState('');
  const [cloneSuiteId, setCloneSuiteId] = useState('');
  const { t } = useTranslation();
  const cloneTipoTesteOptions = useMemo(
    () => TEST_TYPES_BY_ENVIRONMENT[cloneTipoAmbiente] ?? ['Smoke-test'],
    [cloneTipoAmbiente],
  );
  const cloneMomentoOptions = useMemo(
    () => MOMENT_OPTIONS_BY_ENVIRONMENT[cloneTipoAmbiente] ?? [],
    [cloneTipoAmbiente],
  );
  const selectedCloneSuite = useMemo(
    () => suites.find((suite) => suite.id === cloneSuiteId),
    [cloneSuiteId, suites],
  );

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

  const requestCloneEnvironment = (environment: Environment) => {
    const suffix = t('environmentKanban.cloneIdentifierSuffix').trim().replace(/\s+/g, '-');
    const stamp = Date.now().toString(36).slice(-4);
    setCloneIdentifier(`${environment.identificador}-${suffix}-${stamp}`);
    setCloneUrl((environment.urls ?? [])[0] ?? '');
    setCloneTipoAmbiente(environment.tipoAmbiente);
    setCloneTipoTeste(environment.tipoTeste);
    setCloneMomento(environment.momento ?? '');
    setCloneSuiteId(environment.suiteId ?? '');
    setEnvironmentToClone(environment);
  };

  const handleCloseCloneModal = () => {
    if (isCloning) {
      return;
    }
    setEnvironmentToClone(null);
  };

  const handleConfirmClone = async () => {
    if (!environmentToClone) {
      return;
    }

    const environment = environmentToClone;
    setIsCloning(true);
    try {
      const identifier = cloneIdentifier.trim() || environment.identificador;
      const urls = cloneUrl.trim() ? [cloneUrl.trim()] : [];
      const environmentColumns =
        environment.environmentColumns && environment.environmentColumns.length > 0
          ? environment.environmentColumns
          : ['Desktop', 'Mobile'];
      const sourceScenarios = selectedCloneSuite
        ? Object.fromEntries(
            selectedCloneSuite.scenarioIds
              .map((scenarioId) => [scenarioId, environment.scenarios?.[scenarioId]] as const)
              .filter((entry): entry is readonly [string, EnvironmentScenario] =>
                Boolean(entry[1]),
              ),
          )
        : (environment.scenarios ?? {});
      const clonedScenarios = cloneScenarioMap(sourceScenarios, environmentColumns);
      const createdEnvironment = await environmentService.create({
        identificador: identifier,
        storeId: environment.storeId,
        suiteId: selectedCloneSuite?.id ?? environment.suiteId,
        suiteName: selectedCloneSuite?.name ?? environment.suiteName,
        urls,
        jiraTask: environment.jiraTask ?? '',
        tipoAmbiente: cloneTipoAmbiente,
        tipoTeste: cloneTipoTeste,
        momento: cloneMomentoOptions.length > 0 ? cloneMomento : null,
        release: null,
        status: 'backlog',
        timeTracking: { start: null, end: null, totalMs: 0 },
        presentUsersIds: [],
        concludedBy: null,
        scenarios: clonedScenarios,
        totalCenarios: Object.keys(clonedScenarios).length,
        participants: [],
        publicShareLanguage: environment.publicShareLanguage ?? null,
        environmentColumns,
      });
      showToast({ type: 'success', message: t('environmentKanban.cloneSuccess') });
      onEnvironmentCreated(createdEnvironment);
      setEnvironmentToClone(null);
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: t('environmentKanban.cloneError') });
    } finally {
      setIsCloning(false);
    }
  };

  const handleEnvironmentCreated = (environment: Environment | null) => {
    showToast({ type: 'success', message: t('environmentKanban.environmentCreated') });
    if (environment) {
      onEnvironmentCreated(environment);
    }
  };

  const handleOpenEnvironment = (environment: Environment) => {
    navigate(`/environments?id=${environment.id}`);
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
          storeStage={storeStage}
          storeEnvironmentColumns={storeEnvironmentColumns}
          suites={suites}
          scenarios={scenarios}
          onCreated={handleEnvironmentCreated}
        />
      </header>

      {hasArchivedEnvironments && (
        <p className="environment-kanban-archive-hint">
          {t('environmentKanban.archivedSummary', { count: archivedEnvironments.length })}
        </p>
      )}

      {isLoading ? (
        <p className="section-subtitle">{t('environmentKanban.loading')}</p>
      ) : (
        <>
          <div className="environment-kanban-columns">
            {COLUMNS.map((column) => {
              const environmentsToRender =
                column.status === 'done' ? activeDoneEnvironments : grouped[column.status];

              return (
                <div key={column.status} className="environment-kanban-column">
                  <div className="environment-kanban-column-header">
                    <h4 className="environment-kanban-column-title">
                      <column.Icon aria-hidden className="icon" />
                      {t(column.title)}
                    </h4>
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
                        onOpen={handleOpenEnvironment}
                        onClone={requestCloneEnvironment}
                        pendingParticipantIds={(environment.participants ?? []).filter(
                          (id) => !(environment.presentUsersIds ?? []).includes(id),
                        )}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>

          {archivedEnvironments.length > 0 && (
            <div className="environment-kanban-archived-row">
              <div
                className={[
                  'environment-kanban-column environment-kanban-column--archived',
                  isArchiveMinimized ? 'environment-kanban-column--collapsed' : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
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
                        onOpen={handleOpenEnvironment}
                        onClone={requestCloneEnvironment}
                        pendingParticipantIds={(environment.participants ?? []).filter(
                          (id) => !(environment.presentUsersIds ?? []).includes(id),
                        )}
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
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={Boolean(environmentToClone)}
        onClose={handleCloseCloneModal}
        title={t('environmentKanban.cloneConfirmTitle')}
        description={t('environmentKanban.cloneConfirmDescription')}
      >
        <div className="form-grid">
          <p className="form-hint">
            {t('environmentKanban.cloneConfirmMessage', {
              identifier: environmentToClone?.identificador ?? '',
            })}
          </p>
          <TextInput
            id="clone-environment-identifier"
            label={t('editEnvironmentModal.identifier')}
            value={cloneIdentifier}
            onChange={(event) => setCloneIdentifier(event.target.value)}
            required
          />
          <TextInput
            id="clone-environment-url"
            label={t('editEnvironmentModal.urls')}
            value={cloneUrl}
            onChange={(event) => setCloneUrl(event.target.value)}
          />
          <SelectInput
            id="clone-environment-type"
            label={t('editEnvironmentModal.environmentType')}
            value={cloneTipoAmbiente}
            onChange={(event) => setCloneTipoAmbiente(event.target.value)}
            options={[
              {
                value: storeStage === 'Preview' ? 'Preview' : 'WS',
                label:
                  storeStage === 'Preview'
                    ? t('storeSummary.storePlatformFaststore')
                    : t('storeSummary.storePlatformVtexio'),
              },
              { value: 'TM', label: t('environmentOptions.TM') },
              { value: 'PROD', label: t('environmentOptions.PROD') },
            ]}
          />
          <SelectInput
            id="clone-environment-test-type"
            label={t('editEnvironmentModal.testType')}
            value={cloneTipoTeste}
            onChange={(event) => setCloneTipoTeste(event.target.value)}
            options={cloneTipoTesteOptions.map((option) => ({ value: option, label: t(option) }))}
          />
          {cloneMomentoOptions.length > 0 && (
            <SelectInput
              id="clone-environment-moment"
              label={t('editEnvironmentModal.moment')}
              value={cloneMomento}
              onChange={(event) => setCloneMomento(event.target.value)}
              options={cloneMomentoOptions.map((option) => ({ value: option, label: t(option) }))}
            />
          )}
          <SelectInput
            id="clone-environment-suite"
            label={t('createEnvironment.suiteId')}
            value={cloneSuiteId}
            onChange={(event) => setCloneSuiteId(event.target.value)}
            options={[
              { value: '', label: t('createEnvironment.none') },
              ...suites.map((suite) => ({ value: suite.id, label: suite.name })),
            ]}
          />
        </div>
        <div className="modal-actions">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCloseCloneModal}
            disabled={isCloning}
          >
            {t('environmentKanban.cloneCancel')}
          </Button>
          <Button
            type="button"
            onClick={handleConfirmClone}
            isLoading={isCloning}
            loadingText={t('environmentKanban.cloneLoading')}
          >
            <SaveIcon aria-hidden className="icon" />
            {t('environmentKanban.cloneConfirmAction')}
          </Button>
        </div>
      </Modal>
    </section>
  );
};
