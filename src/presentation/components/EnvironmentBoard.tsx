import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

import type { StoreSuite } from '../../domain/entities/Store';
import { Button } from './Button';
import { Modal } from './Modal';
import { SelectInput } from './SelectInput';
import { TextArea } from './TextArea';
import { TextInput } from './TextInput';
import { UserAvatar } from './UserAvatar';
import { useToast } from '../context/ToastContext';

const environmentStatusLabels = {
  backlog: 'Backlog',
  'in-progress': 'Em andamento',
  done: 'Concluído',
};

type EnvironmentStatus = keyof typeof environmentStatusLabels;
type EnvironmentType = 'WS' | 'TM' | 'PROD';

type ManualScenarioStatus = 'pending' | 'inProgress' | 'done' | 'notApplicable';
type AutomatedScenarioStatus = 'inProgress' | 'pending' | 'notApplicable' | 'automatedDone';

const manualScenarioStatusLabels: Record<ManualScenarioStatus, string> = {
  pending: 'Pendente',
  inProgress: 'Em andamento',
  done: 'Concluído',
  notApplicable: 'Não se aplica',
};

const automatedScenarioStatusLabels: Record<AutomatedScenarioStatus, string> = {
  inProgress: 'Em andamento',
  pending: 'Pendente',
  notApplicable: 'Não se aplica',
  automatedDone: 'Concluído automatizado',
};

interface EnvironmentScenarioSummary {
  manual: Record<ManualScenarioStatus, number>;
  automated: Record<AutomatedScenarioStatus, number>;
}

interface EnvironmentUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Environment {
  id: string;
  identifier: string;
  storeName: string;
  environmentType: EnvironmentType;
  testType: string;
  status: EnvironmentStatus;
  bugs: number;
  suiteId: string;
  urls: string[];
  jiraUrl: string;
  scenarioSummary: EnvironmentScenarioSummary;
  users: EnvironmentUser[];
  accessLink: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

interface EnvironmentFormState {
  identifier: string;
  environmentType: EnvironmentType;
  testType: string;
  suiteId: string;
  status: EnvironmentStatus;
  urls: string;
  jiraUrl: string;
  bugs: string;
  scenarioSummary: EnvironmentScenarioSummary;
  users: EnvironmentUser[];
}

interface EnvironmentBoardProps {
  storeName?: string;
  suites: StoreSuite[];
}

const environmentTypeOptions: EnvironmentType[] = ['WS', 'TM', 'PROD'];

const testTypeByEnvironment: Record<EnvironmentType, string[]> = {
  WS: ['smoke-test', 'SEO', 'Performance', 'Progressivo', 'Regressivo'],
  TM: ['Pre Deploy', 'Pós Deploy', 'Regressivo'],
  PROD: ['Progressivo', 'Regressivo', 'Smoke', 'Performance'],
};

const environmentColumns: { key: EnvironmentStatus; description: string }[] = [
  { key: 'backlog', description: 'Planejamento de execução' },
  { key: 'in-progress', description: 'Ambientes com testes em andamento' },
  { key: 'done', description: 'Execuções finalizadas e bloqueadas' },
];

const defaultScenarioSummary = (): EnvironmentScenarioSummary => ({
  manual: {
    pending: 0,
    inProgress: 0,
    done: 0,
    notApplicable: 0,
  },
  automated: {
    inProgress: 0,
    pending: 0,
    notApplicable: 0,
    automatedDone: 0,
  },
});

const createEmptyFormState = (): EnvironmentFormState => ({
  identifier: '',
  environmentType: 'WS',
  testType: '',
  suiteId: '',
  status: 'backlog',
  urls: '',
  jiraUrl: '',
  bugs: '0',
  scenarioSummary: defaultScenarioSummary(),
  users: [{ id: generateId(), name: '', avatarUrl: '' }],
});

const generateId = () => Math.random().toString(36).slice(2, 11);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const getScenarioCount = (summary: EnvironmentScenarioSummary) =>
  Object.values(summary.manual).reduce((total, current) => total + current, 0) +
  Object.values(summary.automated).reduce((total, current) => total + current, 0);

const hasPendingScenarios = (summary: EnvironmentScenarioSummary) =>
  summary.manual.pending > 0 || summary.automated.pending > 0;

const formatDuration = (durationMs: number | null) => {
  if (!durationMs || Number.isNaN(durationMs) || durationMs <= 0) {
    return 'Nenhuma execução registrada';
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [
    hours > 0 ? `${hours}h` : null,
    minutes > 0 ? `${minutes}m` : null,
    seconds > 0 ? `${seconds}s` : null,
  ].filter(Boolean);

  return parts.join(' ') || 'Menos de 1s';
};

const calculateEnvironmentDuration = (environment: Environment, referenceDate: number) => {
  if (!environment.startedAt) {
    return null;
  }

  if (environment.finishedAt) {
    return new Date(environment.finishedAt).getTime() - new Date(environment.startedAt).getTime();
  }

  return referenceDate - new Date(environment.startedAt).getTime();
};

export const EnvironmentBoard = ({ storeName = 'Loja', suites }: EnvironmentBoardProps) => {
  const { showToast } = useToast();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [formState, setFormState] = useState<EnvironmentFormState>(createEmptyFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null);
  const [detailsEnvironment, setDetailsEnvironment] = useState<Environment | null>(null);
  const [environmentToDelete, setEnvironmentToDelete] = useState<Environment | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const hasRunningTimer = environments.some(
      (environment) => environment.status === 'in-progress',
    );
    if (!hasRunningTimer) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [environments]);

  const suiteOptions = useMemo(
    () => [
      { value: '', label: 'Nenhuma suíte aplicada' },
      ...suites.map((suite) => ({ value: suite.id, label: suite.name })),
    ],
    [suites],
  );

  const testTypeOptions = useMemo(
    () => [
      { value: '', label: 'Selecione o tipo de teste' },
      ...testTypeByEnvironment[formState.environmentType].map((type) => ({
        value: type,
        label: type,
      })),
    ],
    [formState.environmentType],
  );

  const statusOptions = useMemo(
    () => Object.entries(environmentStatusLabels).map(([value, label]) => ({ value, label })),
    [],
  );

  const handleOpenCreateModal = () => {
    setFormState(createEmptyFormState());
    setFormError(null);
    setEditingEnvironmentId(null);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setFormError(null);
    setEditingEnvironmentId(null);
  };

  const handleFormChange =
    (key: keyof EnvironmentFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormState((previous) => ({ ...previous, [key]: value }));
    };

  const handleEnvironmentTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const type = event.target.value as EnvironmentType;
    setFormState((previous) => {
      const availableTests = testTypeByEnvironment[type];
      const testType = availableTests.includes(previous.testType) ? previous.testType : '';
      return {
        ...previous,
        environmentType: type,
        testType,
      };
    });
  };

  const handleScenarioSummaryChange =
    (group: 'manual' | 'automated', key: ManualScenarioStatus | AutomatedScenarioStatus) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(0, Number(event.target.value) || 0);
      setFormState((previous) => ({
        ...previous,
        scenarioSummary: {
          ...previous.scenarioSummary,
          [group]: {
            ...previous.scenarioSummary[group],
            [key]: value,
          },
        },
      }));
    };

  const handleUserChange =
    (index: number, field: keyof EnvironmentUser) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormState((previous) => {
        const users = previous.users.slice();
        users[index] = { ...users[index], [field]: value };
        return { ...previous, users };
      });
    };

  const handleAddUser = () => {
    setFormState((previous) => ({
      ...previous,
      users: [...previous.users, { id: generateId(), name: '', avatarUrl: '' }],
    }));
  };

  const handleRemoveUser = (index: number) => () => {
    setFormState((previous) => ({
      ...previous,
      users: previous.users.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleEditEnvironment = (environment: Environment) => {
    setEditingEnvironmentId(environment.id);
    setFormState({
      identifier: environment.identifier,
      environmentType: environment.environmentType,
      testType: environment.testType,
      suiteId: environment.suiteId,
      status: environment.status,
      urls: environment.urls.join('\n'),
      jiraUrl: environment.jiraUrl,
      bugs: String(environment.bugs),
      scenarioSummary: JSON.parse(JSON.stringify(environment.scenarioSummary)),
      users: environment.users.map((user) => ({ ...user })),
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const resetDetailsModal = () => {
    setDetailsEnvironment(null);
  };

  const handleSubmitEnvironment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!formState.identifier.trim()) {
      setFormError('Informe o identificador do ambiente.');
      return;
    }

    if (!formState.testType) {
      setFormError('Selecione o tipo de teste.');
      return;
    }

    if (formState.users.length === 0 || formState.users.some((user) => !user.name.trim())) {
      setFormError('Adicione pelo menos um usuário com nome visível.');
      return;
    }

    if (formState.status === 'done' && hasPendingScenarios(formState.scenarioSummary)) {
      setFormError('Finalize ou remova os cenários pendentes antes de concluir o ambiente.');
      return;
    }

    const nowIso = new Date().toISOString();
    const urls = formState.urls
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    const accessLink = `https://qalite.app/ambientes/${slugify(formState.identifier) || generateId()}`;

    const payload: Omit<
      Environment,
      'id' | 'createdAt' | 'updatedAt' | 'startedAt' | 'finishedAt'
    > & {
      startedAt: string | null;
      finishedAt: string | null;
    } = {
      identifier: formState.identifier.trim(),
      storeName,
      environmentType: formState.environmentType,
      testType: formState.testType,
      status: formState.status,
      suiteId: formState.suiteId,
      bugs: Number(formState.bugs) || 0,
      urls,
      jiraUrl: formState.jiraUrl.trim(),
      scenarioSummary: formState.scenarioSummary,
      users: formState.users.map((user) => ({
        id: user.id || generateId(),
        name: user.name.trim(),
        avatarUrl: user.avatarUrl?.trim() || undefined,
      })),
      accessLink,
      startedAt: null,
      finishedAt: null,
    };

    if (payload.status === 'in-progress') {
      payload.startedAt = nowIso;
    }

    if (payload.status === 'done') {
      payload.startedAt = payload.startedAt ?? nowIso;
      payload.finishedAt = nowIso;
    }

    if (editingEnvironmentId) {
      setEnvironments((previous) =>
        previous.map((environment) => {
          if (environment.id !== editingEnvironmentId) {
            return environment;
          }

          return {
            ...environment,
            ...payload,
            updatedAt: nowIso,
            startedAt:
              payload.status === 'backlog'
                ? null
                : payload.status === 'in-progress'
                  ? (environment.startedAt ?? payload.startedAt)
                  : (payload.startedAt ?? environment.startedAt),
            finishedAt: payload.status === 'done' ? nowIso : null,
          };
        }),
      );
      showToast({ type: 'success', message: 'Ambiente atualizado com sucesso.' });
    } else {
      const newEnvironment: Environment = {
        id: generateId(),
        ...payload,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setEnvironments((previous) => [...previous, newEnvironment]);
      showToast({ type: 'success', message: 'Ambiente criado com sucesso.' });
    }

    setIsFormModalOpen(false);
    setEditingEnvironmentId(null);
  };

  const handleStatusChange = (environmentId: string, status: EnvironmentStatus) => {
    const environment = environments.find((item) => item.id === environmentId);
    if (!environment) {
      return;
    }

    if (environment.status === 'done') {
      showToast({ type: 'info', message: 'Ambientes concluídos não podem ser reabertos.' });
      return;
    }

    if (status === 'done' && hasPendingScenarios(environment.scenarioSummary)) {
      showToast({
        type: 'error',
        message: 'Finalize os cenários pendentes antes de concluir o ambiente.',
      });
      return;
    }

    const nowIso = new Date().toISOString();

    setEnvironments((previous) =>
      previous.map((item) => {
        if (item.id !== environmentId) {
          return item;
        }

        let startedAt = item.startedAt;
        let finishedAt = item.finishedAt;

        if (status === 'backlog') {
          startedAt = null;
          finishedAt = null;
        }

        if (status === 'in-progress') {
          startedAt = startedAt ?? nowIso;
          finishedAt = null;
        }

        if (status === 'done') {
          startedAt = startedAt ?? nowIso;
          finishedAt = nowIso;
        }

        return {
          ...item,
          status,
          startedAt,
          finishedAt,
          updatedAt: nowIso,
        };
      }),
    );
  };

  const handleConfirmDelete = () => {
    if (!environmentToDelete) {
      return;
    }

    setEnvironments((previous) =>
      previous.filter((environment) => environment.id !== environmentToDelete.id),
    );
    showToast({ type: 'success', message: 'Ambiente removido.' });
    setEnvironmentToDelete(null);
    if (detailsEnvironment?.id === environmentToDelete.id) {
      setDetailsEnvironment(null);
    }
  };

  const groupedEnvironments = useMemo(
    () =>
      environmentColumns.map(({ key, description }) => ({
        key,
        description,
        items: environments.filter((environment) => environment.status === key),
      })),
    [environments],
  );

  const activeEnvironmentSuiteName = (environment: Environment) =>
    suites.find((suite) => suite.id === environment.suiteId)?.name ?? 'Nenhuma';

  const renderScenarioSummary = (summary: EnvironmentScenarioSummary) => (
    <div className="environment-scenario-summary">
      <div>
        <span className="environment-summary-label">Cenários não automatizados</span>
        <ul>
          {(Object.keys(manualScenarioStatusLabels) as ManualScenarioStatus[]).map((statusKey) => (
            <li key={statusKey}>
              <strong>{manualScenarioStatusLabels[statusKey]}:</strong> {summary.manual[statusKey]}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <span className="environment-summary-label">Cenários automatizados</span>
        <ul>
          {(Object.keys(automatedScenarioStatusLabels) as AutomatedScenarioStatus[]).map(
            (statusKey) => (
              <li key={statusKey}>
                <strong>{automatedScenarioStatusLabels[statusKey]}:</strong>{' '}
                {summary.automated[statusKey]}
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );

  return (
    <section className="environment-board" aria-label="Ambientes de execução">
      <div className="environment-board-header">
        <div>
          <span className="badge">Ambientes</span>
          <h3 className="section-title">Controle de ambientes de testes</h3>
          <p className="section-subtitle">
            Organize execuções, acompanhe usuários conectados e respeite as regras de conclusão.
          </p>
        </div>
        <Button type="button" onClick={handleOpenCreateModal}>
          Criar ambiente
        </Button>
      </div>

      <div className="environment-columns" role="list">
        {groupedEnvironments.map(({ key, description, items }) => (
          <article key={key} className="environment-column" role="listitem">
            <header className="environment-column-header">
              <div>
                <h4>{environmentStatusLabels[key]}</h4>
                <p>{description}</p>
              </div>
              <span className="badge">{items.length}</span>
            </header>
            <div className="environment-column-body">
              {items.length === 0 ? (
                <p className="environment-column-empty">Nenhum ambiente neste estágio.</p>
              ) : (
                items.map((environment) => {
                  const totalScenarios = getScenarioCount(environment.scenarioSummary);
                  const duration = calculateEnvironmentDuration(environment, now);
                  const isLinkActive = environment.status !== 'done';
                  return (
                    <div key={environment.id} className="environment-card">
                      <div className="environment-card-header">
                        <div>
                          <span className="environment-card-identifier">
                            {environment.identifier}
                          </span>
                          <p className="environment-card-store">{environment.storeName}</p>
                        </div>
                        <span
                          className={`environment-status-badge environment-status-${environment.status}`}
                        >
                          {environmentStatusLabels[environment.status]}
                        </span>
                      </div>

                      <div className="environment-card-details">
                        <div>
                          <strong>Tipo de ambiente:</strong> {environment.environmentType}
                        </div>
                        <div>
                          <strong>Tipo de teste:</strong> {environment.testType}
                        </div>
                        <div>
                          <strong>Suíte aplicada:</strong> {activeEnvironmentSuiteName(environment)}
                        </div>
                        <div>
                          <strong>Quantidade de cenários:</strong> {totalScenarios}
                        </div>
                        <div>
                          <strong>Bugs registrados:</strong> {environment.bugs}
                        </div>
                        <div>
                          <strong>Tempo total:</strong> {formatDuration(duration)}
                        </div>
                        <div>
                          <strong>Status do link:</strong>{' '}
                          {isLinkActive ? 'Compartilhável' : 'Encerrado'}
                        </div>
                      </div>

                      <div className="environment-card-users">
                        <span className="environment-summary-label">Usuários presentes</span>
                        {environment.users.length === 0 ? (
                          <p className="environment-column-empty">Nenhum usuário conectado.</p>
                        ) : (
                          <ul className="environment-user-list">
                            {environment.users.map((user) => (
                              <li key={user.id}>
                                <UserAvatar size="sm" name={user.name} photoURL={user.avatarUrl} />
                                <span>{user.name}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {hasPendingScenarios(environment.scenarioSummary) && (
                        <p className="environment-warning">
                          Há cenários pendentes. Conclusão bloqueada.
                        </p>
                      )}

                      {environment.status === 'done' && (
                        <p className="environment-locked">
                          Ambiente fechado para novas interações.
                        </p>
                      )}

                      <div className="environment-card-actions">
                        <label className="environment-status-select">
                          <span>Atualizar status</span>
                          <select
                            value={environment.status}
                            onChange={(event) =>
                              handleStatusChange(
                                environment.id,
                                event.target.value as EnvironmentStatus,
                              )
                            }
                            disabled={environment.status === 'done'}
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setDetailsEnvironment(environment)}
                        >
                          Abrir resumo
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        ))}
      </div>

      <Modal
        isOpen={isFormModalOpen}
        title={editingEnvironmentId ? 'Editar ambiente' : 'Criar ambiente'}
        description="Configure as regras de acesso, usuários e cenários."
        onClose={handleCloseFormModal}
      >
        <form className="form-grid" onSubmit={handleSubmitEnvironment}>
          <TextInput
            id="environment-identifier"
            label="Identificador"
            value={formState.identifier}
            onChange={handleFormChange('identifier')}
            required
          />

          <TextArea
            id="environment-urls"
            label="URLs do ambiente"
            value={formState.urls}
            onChange={handleFormChange('urls')}
            placeholder="Informe uma URL por linha"
          />

          <TextInput
            id="environment-jira-url"
            label="Tarefa no Jira"
            type="url"
            value={formState.jiraUrl}
            onChange={handleFormChange('jiraUrl')}
            placeholder="https://suaempresa.atlassian.net/browse/PROJ-1"
          />

          <SelectInput
            id="environment-type"
            label="Tipo de ambiente"
            value={formState.environmentType}
            options={environmentTypeOptions.map((type) => ({ value: type, label: type }))}
            onChange={handleEnvironmentTypeChange}
          />

          <SelectInput
            id="environment-test-type"
            label="Tipo de teste"
            value={formState.testType}
            options={testTypeOptions}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, testType: event.target.value }))
            }
            required
          />

          <SelectInput
            id="environment-suite"
            label="Aplicar suíte existente"
            value={formState.suiteId}
            options={suiteOptions}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, suiteId: event.target.value }))
            }
          />

          <SelectInput
            id="environment-status"
            label="Status inicial"
            value={formState.status}
            options={statusOptions}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                status: event.target.value as EnvironmentStatus,
              }))
            }
          />

          <TextInput
            id="environment-bugs"
            label="Bugs registrados"
            type="number"
            value={formState.bugs}
            onChange={handleFormChange('bugs')}
          />

          <div className="environment-form-summary">
            <div>
              <span className="environment-summary-label">Cenários não automatizados</span>
              {(Object.keys(manualScenarioStatusLabels) as ManualScenarioStatus[]).map(
                (statusKey) => (
                  <TextInput
                    key={statusKey}
                    id={`manual-${statusKey}`}
                    label={manualScenarioStatusLabels[statusKey]}
                    type="number"
                    value={String(formState.scenarioSummary.manual[statusKey])}
                    onChange={handleScenarioSummaryChange('manual', statusKey)}
                  />
                ),
              )}
            </div>
            <div>
              <span className="environment-summary-label">Cenários automatizados</span>
              {(Object.keys(automatedScenarioStatusLabels) as AutomatedScenarioStatus[]).map(
                (statusKey) => (
                  <TextInput
                    key={statusKey}
                    id={`automated-${statusKey}`}
                    label={automatedScenarioStatusLabels[statusKey]}
                    type="number"
                    value={String(formState.scenarioSummary.automated[statusKey])}
                    onChange={handleScenarioSummaryChange('automated', statusKey)}
                  />
                ),
              )}
            </div>
          </div>
          <p className="form-hint">
            Quantidade total de cenários: {getScenarioCount(formState.scenarioSummary)}
          </p>

          <div className="environment-form-users">
            <div className="environment-form-users-header">
              <span className="environment-summary-label">Usuários presentes</span>
              <Button type="button" variant="secondary" onClick={handleAddUser}>
                Adicionar usuário
              </Button>
            </div>
            {formState.users.length === 0 && (
              <p className="environment-column-empty">Nenhum usuário adicionado.</p>
            )}
            {formState.users.map((user, index) => (
              <div key={user.id} className="environment-user-form-row">
                <TextInput
                  id={`user-name-${user.id}`}
                  label="Nome"
                  value={user.name}
                  onChange={handleUserChange(index, 'name')}
                  required
                />
                <TextInput
                  id={`user-avatar-${user.id}`}
                  label="Foto (URL opcional)"
                  value={user.avatarUrl ?? ''}
                  onChange={handleUserChange(index, 'avatarUrl')}
                />
                <button
                  type="button"
                  className="environment-remove-user"
                  aria-label="Remover usuário"
                  onClick={handleRemoveUser(index)}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          {formError && <p className="form-message form-message--error">{formError}</p>}

          <Button type="submit">
            {editingEnvironmentId ? 'Salvar alterações' : 'Criar ambiente'}
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(detailsEnvironment)}
        title={
          detailsEnvironment
            ? `Resumo do ambiente ${detailsEnvironment.identifier}`
            : 'Resumo do ambiente'
        }
        description="Detalhes completos do ambiente, regras de acesso e usuários conectados."
        onClose={resetDetailsModal}
      >
        {detailsEnvironment && (
          <div className="environment-summary">
            <div className="environment-summary-grid">
              <div>
                <strong>Loja:</strong> {detailsEnvironment.storeName}
              </div>
              <div>
                <strong>Status:</strong> {environmentStatusLabels[detailsEnvironment.status]}
              </div>
              <div>
                <strong>Tipo de ambiente:</strong> {detailsEnvironment.environmentType}
              </div>
              <div>
                <strong>Tipo de teste:</strong> {detailsEnvironment.testType}
              </div>
              <div>
                <strong>Suíte aplicada:</strong> {activeEnvironmentSuiteName(detailsEnvironment)}
              </div>
              <div>
                <strong>Bugs:</strong> {detailsEnvironment.bugs}
              </div>
              <div>
                <strong>URLs:</strong>
                <ul>
                  {detailsEnvironment.urls.length === 0 ? (
                    <li>Nenhuma URL cadastrada.</li>
                  ) : (
                    detailsEnvironment.urls.map((url) => (
                      <li key={url}>
                        <a href={url} className="text-link" target="_blank" rel="noreferrer">
                          {url}
                        </a>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <strong>Tarefa no Jira:</strong>
                {detailsEnvironment.jiraUrl ? (
                  <a
                    href={detailsEnvironment.jiraUrl}
                    className="text-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {detailsEnvironment.jiraUrl}
                  </a>
                ) : (
                  <span>Não informado</span>
                )}
              </div>
              <div>
                <strong>Link de acesso:</strong>
                {detailsEnvironment.status === 'done' ? (
                  <span>Link bloqueado após conclusão.</span>
                ) : (
                  <a
                    href={detailsEnvironment.accessLink}
                    className="text-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {detailsEnvironment.accessLink}
                  </a>
                )}
              </div>
              <div>
                <strong>Tempo total:</strong>{' '}
                {formatDuration(calculateEnvironmentDuration(detailsEnvironment, now))}
              </div>
              <div>
                <strong>Quantidade de cenários:</strong>{' '}
                {getScenarioCount(detailsEnvironment.scenarioSummary)}
              </div>
            </div>

            <section>
              <h4 className="environment-summary-heading">Status dos cenários</h4>
              {renderScenarioSummary(detailsEnvironment.scenarioSummary)}
            </section>

            <section>
              <h4 className="environment-summary-heading">Usuários dentro do ambiente</h4>
              {detailsEnvironment.users.length === 0 ? (
                <p className="environment-column-empty">Nenhum usuário conectado.</p>
              ) : (
                <ul className="environment-summary-user-list">
                  {detailsEnvironment.users.map((user) => (
                    <li key={user.id}>
                      <UserAvatar size="sm" name={user.name} photoURL={user.avatarUrl} />
                      <div>
                        <strong>{user.name}</strong>
                        <span>Presença liberada enquanto o ambiente estiver ativo.</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h4 className="environment-summary-heading">Acesso e interação</h4>
              <ul className="environment-access-list">
                <li>Não existe responsável fixo. Qualquer usuário pode interagir.</li>
                <li>O acesso é permitido por link enquanto o ambiente não estiver concluído.</li>
                <li>
                  Após marcar como concluído o ambiente se torna fechado e não aceita novos testes.
                </li>
                <li>Usuários não podem sair ou compartilhar o link após o encerramento.</li>
              </ul>
            </section>

            <div className="environment-summary-actions">
              <Button type="button" onClick={() => handleEditEnvironment(detailsEnvironment)}>
                Editar ambiente
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEnvironmentToDelete(detailsEnvironment)}
              >
                Excluir ambiente
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(environmentToDelete)}
        title="Excluir ambiente"
        description="Esta ação não pode ser desfeita."
        onClose={() => setEnvironmentToDelete(null)}
      >
        {environmentToDelete && (
          <div className="environment-delete-modal">
            <p>
              Deseja remover o ambiente <strong>{environmentToDelete.identifier}</strong>? Todos os
              registros locais serão descartados.
            </p>
            <div className="environment-summary-actions">
              <Button type="button" variant="ghost" onClick={() => setEnvironmentToDelete(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="secondary" onClick={handleConfirmDelete}>
                Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};
