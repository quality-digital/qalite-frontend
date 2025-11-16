import { doc, getDoc } from 'firebase/firestore';
import type { DragEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EnvironmentStatusError } from '../../../application/errors/EnvironmentStatusError';
import type { Environment, EnvironmentStatus } from '../../../domain/entities/Environment';
import type { StoreScenario, StoreSuite } from '../../../domain/entities/Store';
import { firebaseFirestore } from '../../../infra/firebase/firebaseConfig';
import { environmentService } from '../../../main/factories/environmentServiceFactory';
import { useToast } from '../../context/ToastContext';
import type { PresentUserProfile } from '../../hooks/usePresentUsers';
import { Button } from '../Button';
import { EnvironmentCard } from './EnvironmentCard';
import { CreateEnvironmentModal } from './CreateEnvironmentModal';

interface EnvironmentKanbanProps {
  storeId: string;
  suites: StoreSuite[];
  scenarios: StoreScenario[];
}

const COLUMNS: { status: EnvironmentStatus; title: string; description: string }[] = [
  { status: 'backlog', title: 'Backlog', description: 'Ambientes aguardando execução.' },
  { status: 'in_progress', title: 'Em andamento', description: 'Ambientes em execução.' },
  { status: 'done', title: 'Concluído', description: 'Ambientes finalizados.' },
];

export const EnvironmentKanban = ({ storeId, suites, scenarios }: EnvironmentKanbanProps) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [presentUsersMap, setPresentUsersMap] = useState<Record<string, PresentUserProfile>>({});

  useEffect(() => {
    const unsubscribe = environmentService.observeAll({ storeId }, (list) => {
      setEnvironments(list);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [storeId]);

  useEffect(() => {
    let isMounted = true;
    const ids = new Set<string>();
    environments.forEach((environment) => {
      environment.presentUsersIds.forEach((id) => ids.add(id));
    });

    if (ids.size === 0) {
      setPresentUsersMap({});
      return;
    }

    const fetchProfiles = async () => {
      const entries = await Promise.all(
        Array.from(ids).map(async (userId) => {
          const userRef = doc(firebaseFirestore, 'users', userId);
          const snapshot = await getDoc(userRef);
          const data = snapshot.data();
          return {
            id: userId,
            name: data?.displayName ?? data?.email ?? 'Usuário',
            photoURL: data?.photoURL ?? undefined,
          } as PresentUserProfile;
        }),
      );

      if (isMounted) {
        const nextMap: Record<string, PresentUserProfile> = {};
        entries.forEach((entry) => {
          nextMap[entry.id] = entry;
        });
        setPresentUsersMap(nextMap);
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

    try {
      await environmentService.transitionStatus({ environment, targetStatus: status });
      showToast({ type: 'success', message: 'Status atualizado com sucesso.' });
    } catch (error) {
      if (error instanceof EnvironmentStatusError && error.code === 'PENDING_SCENARIOS') {
        showToast({
          type: 'error',
          message: 'Existem cenários pendentes. Conclua-os antes de finalizar.',
        });
        return;
      }

      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível atualizar o status.' });
    }
  };

  const handleOpenEnvironment = (environment: Environment) => {
    navigate(`/environments/${environment.id}`);
  };

  return (
    <section className="environment-kanban">
      <header className="environment-kanban-header">
        <div>
          <h3 className="section-subtitle">Ambientes</h3>
          <p>Gerencie os ambientes de teste desta loja.</p>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          Criar ambiente
        </Button>
      </header>

      {isLoading ? (
        <p className="section-subtitle">Carregando ambientes...</p>
      ) : (
        <div className="environment-kanban-columns">
          {COLUMNS.map((column) => (
            <div
              key={column.status}
              className="environment-kanban-column"
              onDragOver={handleDragOver}
              onDrop={handleDrop(column.status)}
            >
              <div className="environment-kanban-column-header">
                <h4>{column.title}</h4>
                <p>{column.description}</p>
              </div>
              {grouped[column.status].length === 0 ? (
                <p className="section-subtitle">Nenhum ambiente nesta coluna.</p>
              ) : (
                grouped[column.status].map((environment) => (
                  <EnvironmentCard
                    key={environment.id}
                    environment={environment}
                    presentUsers={environment.presentUsersIds
                      .map((id) => presentUsersMap[id])
                      .filter((user): user is PresentUserProfile => Boolean(user))}
                    suiteName={suiteNameByEnvironment[environment.id]}
                    draggable
                    onDragStart={handleDragStart}
                    onOpen={handleOpenEnvironment}
                  />
                ))
              )}
            </div>
          ))}
        </div>
      )}

      <CreateEnvironmentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        storeId={storeId}
        suites={suites}
        scenarios={scenarios}
        onCreated={() => showToast({ type: 'success', message: 'Ambiente criado com sucesso.' })}
      />
    </section>
  );
};
