import { doc, getDoc } from 'firebase/firestore';
import type { DragEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Environment, EnvironmentStatus } from '../../../domain/entities/Environment';
import type { StoreScenario, StoreSuite } from '../../../domain/entities/Store';
import { firebaseFirestore } from '../../../infra/firebase/firebaseConfig';
import {
  getAllEnvironmentsRealtime,
  updateEnvironment,
} from '../../../infra/firebase/environmentService';
import { useToast } from '../../context/ToastContext';
import type { PresentUserProfile } from '../../hooks/usePresentUsers';
import { Button } from '../Button';
import { CardAmbiente } from './CardAmbiente';
import { ModalCriarAmbiente } from './ModalCriarAmbiente';

interface KanbanAmbientesProps {
  storeId: string;
  suites: StoreSuite[];
  scenarios: StoreScenario[];
}

const COLUMNS: { status: EnvironmentStatus; title: string; description: string }[] = [
  { status: 'backlog', title: 'Backlog', description: 'Ambientes aguardando execução.' },
  { status: 'in_progress', title: 'Em andamento', description: 'Ambientes em execução.' },
  { status: 'done', title: 'Concluído', description: 'Ambientes finalizados.' },
];

export const KanbanAmbientes = ({ storeId, suites, scenarios }: KanbanAmbientesProps) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [presentUsersMap, setPresentUsersMap] = useState<Record<string, PresentUserProfile>>({});

  useEffect(() => {
    const unsubscribe = getAllEnvironmentsRealtime({ storeId }, (list) => {
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

    if (status === 'done') {
      const hasPending = Object.values(environment.scenarios ?? {}).some(
        (scenario) => scenario.status === 'pendente',
      );

      if (hasPending) {
        showToast({
          type: 'error',
          message: 'Existem cenários pendentes. Conclua-os antes de finalizar.',
        });
        return;
      }
    }

    const now = new Date().toISOString();
    let timeTracking = environment.timeTracking;

    if (status === 'backlog') {
      timeTracking = { start: null, end: null, totalMs: 0 };
    } else if (status === 'in_progress') {
      timeTracking = { start: timeTracking.start ?? now, end: null, totalMs: timeTracking.totalMs };
    } else if (status === 'done') {
      const startTimestamp = timeTracking.start
        ? new Date(timeTracking.start).getTime()
        : Date.now();
      const totalMs = timeTracking.totalMs + Math.max(0, Date.now() - startTimestamp);
      timeTracking = { start: timeTracking.start ?? now, end: now, totalMs };
    }

    try {
      await updateEnvironment(environment.id, { status, timeTracking });
      showToast({ type: 'success', message: 'Status atualizado com sucesso.' });
    } catch (error) {
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
                  <CardAmbiente
                    key={environment.id}
                    environment={environment}
                    presentUsers={environment.presentUsersIds
                      .map((id) => presentUsersMap[id])
                      .filter((user): user is PresentUserProfile => Boolean(user))}
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

      <ModalCriarAmbiente
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
