import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { EnvironmentScenario } from '../../../domain/entities/environment';
import type { StoreScenario, StoreSuite } from '../../../domain/entities/store';
import { environmentService } from '../../../application/use-cases/EnvironmentUseCase';
import { Button } from '../Button';
import { SelectInput } from '../SelectInput';
import { TextArea } from '../TextArea';
import { TextInput } from '../TextInput';
import {
  MOMENT_OPTIONS_BY_ENVIRONMENT,
  TEST_TYPES_BY_ENVIRONMENT,
  requiresReleaseField,
} from '../../constants/environmentOptions';
import { useToast } from '../../context/ToastContext';

interface CreateEnvironmentCardProps {
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
      observacao: match.observation,
      automatizado: match.automation,
      status: 'pendente',
      statusMobile: 'pendente',
      statusDesktop: 'pendente',
      evidenciaArquivoUrl: null,
    };
  });

  return scenarioMap;
};

export const CreateEnvironmentCard = ({
  storeId,
  suites,
  scenarios,
  onCreated,
}: CreateEnvironmentCardProps) => {
  const [identificador, setIdentificador] = useState('');
  const [urls, setUrls] = useState('');
  const [jiraTask, setJiraTask] = useState('');
  const [tipoAmbiente, setTipoAmbiente] = useState('WS');
  const [tipoTeste, setTipoTeste] = useState('Smoke-test');
  const [momento, setMomento] = useState('');
  const [release, setRelease] = useState('');
  const [suiteId, setSuiteId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const { t } = useTranslation();

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

  const resetForm = () => {
    setIdentificador('');
    setUrls('');
    setJiraTask('');
    setTipoAmbiente('WS');
    setTipoTeste('Smoke-test');
    setMomento('');
    setRelease('');
    setSuiteId('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identificador.trim()) {
      showToast({ type: 'error', message: t('createEnvironment.identifier') });
      return;
    }

    if (!suiteId) {
      showToast({ type: 'error', message: t('createEnvironment.suiteRequired') });
      return;
    }

    if (momentoOptions.length > 0 && !momento) {
      showToast({ type: 'error', message: t('createEnvironment.moment') });
      return;
    }

    if (shouldDisplayReleaseField && !release.trim()) {
      showToast({ type: 'error', message: t('createEnvironment.release') });
      return;
    }

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
        publicShareLanguage: null,
      });

      onCreated?.();
      resetForm();
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: t('createEnvironment.createError') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-card">
      <div className="create-card__header">
        <h3 className="form-title">{t('createEnvironment.create')}</h3>
        <p className="create-card__description">{t('createEnvironment.description')}</p>
      </div>
      <form className="environment-form" onSubmit={handleSubmit}>
        <TextInput
          id="identificador"
          label={t('createEnvironment.id')}
          value={identificador}
          onChange={(event) => setIdentificador(event.target.value)}
          required
        />
        <TextArea
          id="urls"
          label={t('createEnvironment.urls')}
          value={urls}
          onChange={(event) => setUrls(event.target.value)}
          placeholder={t('createEnvironment.example')}
        />
        <TextInput
          id="jiraTask"
          label={t('createEnvironment.jiraTask')}
          value={jiraTask}
          onChange={(event) => setJiraTask(event.target.value)}
        />
        <SelectInput
          id="tipoAmbiente"
          label={t('createEnvironment.environmentType')}
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
          label={t('createEnvironment.testType')}
          value={tipoTeste}
          onChange={(event) => setTipoTeste(event.target.value)}
          options={tipoTesteOptions.map((option) => ({ value: option, label: t(option) }))}
        />
        <SelectInput
          id="suiteId"
          label={t('createEnvironment.suiteId')}
          value={suiteId}
          onChange={(event) => setSuiteId(event.target.value)}
          options={[
            { value: '', label: t('createEnvironment.none') },
            ...suites.map((suite) => ({ value: suite.id, label: suite.name })),
          ]}
        />
        {momentoOptions.length > 0 && (
          <SelectInput
            id="momento"
            label={t('createEnvironment.setMoment')}
            value={momento}
            onChange={(event) => setMomento(event.target.value)}
            options={momentoOptions.map((option) => ({ value: option, label: t(option) }))}
          />
        )}
        {shouldDisplayReleaseField && (
          <TextInput
            id="release"
            label={t('createEnvironment.releaseLabel')}
            value={release}
            onChange={(event) => setRelease(event.target.value)}
          />
        )}
        {selectedSuite && (
          <div className="environment-suite-preview">
            <p>
              {t('createEnvironment.scenariosLoaded')} <strong>{selectedSuite.name}</strong>:{' '}
              {totalCenarios}
            </p>
          </div>
        )}

        <div className="environment-form-actions">
          <Button type="submit" isLoading={isSubmitting} loadingText={t('saving')}>
            {t('createEnvironment.create')}
          </Button>
        </div>
      </form>
    </div>
  );
};
