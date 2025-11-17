import { FormEvent, useEffect, useMemo, useState } from 'react';

import type { EnvironmentScenario } from '../../../domain/entities/Environment';
import type { StoreScenario, StoreSuite } from '../../../domain/entities/Store';
import { environmentService } from '../../../main/factories/environmentServiceFactory';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { SelectInput } from '../SelectInput';
import { TextArea } from '../TextArea';
import { TextInput } from '../TextInput';
import {
  MOMENT_OPTIONS_BY_ENVIRONMENT,
  TEST_TYPES_BY_ENVIRONMENT,
  requiresReleaseField,
} from '../../constants/environmentOptions';

interface CreateEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  suites: StoreSuite[];
  scenarios: StoreScenario[];
  onCreated?: () => void;
}

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
      automatizado: match.automation,
      status: 'pendente',
      statusMobile: 'pendente',
      statusDesktop: 'pendente',
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
  const [tipoTeste, setTipoTeste] = useState('Smoke-test');
  const [momento, setMomento] = useState('');
  const [release, setRelease] = useState('');
  const [suiteId, setSuiteId] = useState('');
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
    const options = TEST_TYPES_BY_ENVIRONMENT[tipoAmbiente] ?? ['Smoke-test'];
    if (!options.includes(tipoTeste)) {
      setTipoTeste(options[0]);
    }
    return options;
  }, [tipoAmbiente, tipoTeste]);

  const momentoOptions = useMemo(() => {
    const options = MOMENT_OPTIONS_BY_ENVIRONMENT[tipoAmbiente] ?? [];
    if (options.length === 0 && momento) {
      setMomento('');
    }
    if (options.length > 0 && !options.includes(momento)) {
      setMomento(options[0]);
    }
    return options;
  }, [momento, tipoAmbiente]);

  const shouldDisplayReleaseField = requiresReleaseField(tipoAmbiente);

  useEffect(() => {
    if (!shouldDisplayReleaseField && release) {
      setRelease('');
    }
  }, [shouldDisplayReleaseField, release]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identificador.trim()) {
      setFormError('Informe um identificador para o ambiente.');
      return;
    }

    if (momentoOptions.length > 0 && !momento) {
      setFormError('Selecione o momento do ambiente.');
      return;
    }

    if (shouldDisplayReleaseField && !release.trim()) {
      setFormError('Informe a release para este ambiente.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const urlsList = urls
        .split('\n')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

      const timeTracking = { start: null, end: null, totalMs: 0 };

      await environmentService.create({
        identificador: identificador.trim(),
        storeId,
        suiteId: selectedSuite?.id ?? null,
        suiteName: selectedSuite?.name ?? null,
        urls: urlsList,
        jiraTask: jiraTask.trim(),
        tipoAmbiente,
        tipoTeste,
        momento: momentoOptions.length > 0 ? momento : null,
        release: shouldDisplayReleaseField ? release.trim() : null,
        status: 'backlog',
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
        {momentoOptions.length > 0 && (
          <SelectInput
            id="momento"
            label="Momento/Quando"
            value={momento}
            onChange={(event) => setMomento(event.target.value)}
            options={momentoOptions.map((option) => ({ value: option, label: option }))}
          />
        )}
        {shouldDisplayReleaseField && (
          <TextInput
            id="release"
            label="Release"
            value={release}
            onChange={(event) => setRelease(event.target.value)}
          />
        )}
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
