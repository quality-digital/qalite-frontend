import { FormEvent, useMemo, useState } from 'react';

import type { EnvironmentScenario, EnvironmentStatus } from '../../../domain/entities/Environment';
import type { StoreScenario, StoreSuite } from '../../../domain/entities/Store';
import { environmentService } from '../../../main/factories/environmentServiceFactory';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { SelectInput } from '../SelectInput';
import { TextArea } from '../TextArea';
import { TextInput } from '../TextInput';

interface CreateEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  suites: StoreSuite[];
  scenarios: StoreScenario[];
  onCreated?: () => void;
}

const STATUS_OPTIONS: { value: EnvironmentStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'Em andamento' },
];

const TEST_TYPES_BY_ENVIRONMENT: Record<string, string[]> = {
  WS: ['Funcional', 'Regressão', 'Smoke'],
  TM: ['Funcional', 'Homologação'],
  PROD: ['Smoke', 'Regressão completa'],
};

const buildScenarioMap = (
  suite: StoreSuite | undefined,
  scenarioList: StoreScenario[],
): Record<string, EnvironmentScenario> => {
  if (!suite) {
    return {};
  }

  const scenarioMap: Record<string, EnvironmentScenario> = {};
  suite.scenarioIds.forEach((scenarioId) => {
    const match = scenarioList.find((scenario) => scenario.id === scenarioId);
    if (!match) {
      return;
    }

    scenarioMap[scenarioId] = {
      titulo: match.title,
      categoria: match.category,
      criticidade: match.criticality,
      status: 'pendente',
      evidenciaArquivoUrl: null,
    };
  });

  return scenarioMap;
};

export const CreateEnvironmentModal = ({
  isOpen,
  onClose,
  storeId,
  suites,
  scenarios,
  onCreated,
}: CreateEnvironmentModalProps) => {
  const [identificador, setIdentificador] = useState('');
  const [urls, setUrls] = useState('');
  const [jiraTask, setJiraTask] = useState('');
  const [tipoAmbiente, setTipoAmbiente] = useState('WS');
  const [tipoTeste, setTipoTeste] = useState('Funcional');
  const [suiteId, setSuiteId] = useState('');
  const [status, setStatus] = useState<EnvironmentStatus>('backlog');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSuite = useMemo(
    () => suites.find((suite) => suite.id === suiteId),
    [suiteId, suites],
  );
  const scenarioMap = useMemo(
    () => buildScenarioMap(selectedSuite, scenarios),
    [selectedSuite, scenarios],
  );
  const totalCenarios = Object.keys(scenarioMap).length;

  const tipoTesteOptions = useMemo(() => {
    const options = TEST_TYPES_BY_ENVIRONMENT[tipoAmbiente] ?? ['Funcional'];
    if (!options.includes(tipoTeste)) {
      setTipoTeste(options[0]);
    }
    return options;
  }, [tipoAmbiente, tipoTeste]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identificador.trim()) {
      setFormError('Informe um identificador para o ambiente.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const urlsList = urls
        .split('\n')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

      const timeTracking =
        status === 'in_progress'
          ? { start: new Date().toISOString(), end: null, totalMs: 0 }
          : { start: null, end: null, totalMs: 0 };

      await environmentService.create({
        identificador: identificador.trim(),
        storeId,
        suiteId: selectedSuite?.id ?? null,
        suiteName: selectedSuite?.name ?? null,
        urls: urlsList,
        jiraTask: jiraTask.trim(),
        tipoAmbiente,
        tipoTeste,
        status,
        timeTracking,
        presentUsersIds: [],
        concludedBy: null,
        scenarios: scenarioMap,
        bugs: 0,
        totalCenarios,
        participants: [],
      });

      onCreated?.();
      onClose();
    } catch (error) {
      console.error(error);
      setFormError('Não foi possível criar o ambiente. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Criar ambiente"
      description="Preencha os campos para iniciar um novo ambiente de teste."
    >
      <form className="environment-form" onSubmit={handleSubmit}>
        {formError && <p className="form-message form-message--error">{formError}</p>}
        <TextInput
          id="identificador"
          label="Identificador"
          value={identificador}
          onChange={(event) => setIdentificador(event.target.value)}
          required
        />
        <TextArea
          id="urls"
          label="URLs (uma por linha)"
          value={urls}
          onChange={(event) => setUrls(event.target.value)}
          placeholder="https://exemplo.com"
        />
        <TextInput
          id="jiraTask"
          label="Jira Task"
          value={jiraTask}
          onChange={(event) => setJiraTask(event.target.value)}
        />
        <SelectInput
          id="tipoAmbiente"
          label="Tipo de ambiente"
          value={tipoAmbiente}
          onChange={(event) => setTipoAmbiente(event.target.value)}
          options={[
            { value: 'WS', label: 'WS' },
            { value: 'TM', label: 'TM' },
            { value: 'PROD', label: 'PROD' },
          ]}
        />
        <SelectInput
          id="tipoTeste"
          label="Tipo de teste"
          value={tipoTeste}
          onChange={(event) => setTipoTeste(event.target.value)}
          options={tipoTesteOptions.map((option) => ({ value: option, label: option }))}
        />
        <SelectInput
          id="suiteId"
          label="Suite existente"
          value={suiteId}
          onChange={(event) => setSuiteId(event.target.value)}
          options={[
            { value: '', label: 'Nenhuma' },
            ...suites.map((suite) => ({ value: suite.id, label: suite.name })),
          ]}
        />
        <SelectInput
          id="status"
          label="Status inicial"
          value={status}
          onChange={(event) => setStatus(event.target.value as EnvironmentStatus)}
          options={STATUS_OPTIONS}
        />
        {selectedSuite && (
          <div className="environment-suite-preview">
            <p>
              Cenários carregados da suíte <strong>{selectedSuite.name}</strong>: {totalCenarios}
            </p>
          </div>
        )}

        <Button type="submit" isLoading={isSubmitting} loadingText="Salvando...">
          Criar ambiente
        </Button>
      </form>
    </Modal>
  );
};
