import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Environment, EnvironmentScenario } from '../../../domain/entities/environment';
import type { Store, StoreScenario, StoreSuite } from '../../../domain/entities/store';
import { environmentService } from '../../../infrastructure/services/environmentService';
import { Button } from '../Button';
import { SelectInput } from '../SelectInput';
import { TextInput } from '../TextInput';
import { MOMENT_OPTIONS_BY_ENVIRONMENT, TEST_TYPES_BY_ENVIRONMENT } from '../../constants/environmentOptions';
import { useToast } from '../../context/ToastContext';

interface CreateEnvironmentCardProps {
  storeId: string;
  storeStage?: Store['stage'] | null;
  storeEnvironmentColumns?: string[] | null;
  suites: StoreSuite[];
  scenarios: StoreScenario[];
  onCreated?: (environment: Environment | null) => void;
}

const DEFAULT_ENVIRONMENT_COLUMNS = ['Desktop', 'Mobile'];

const getEnvironmentTypeByStoreStage = (storeStage?: Store['stage'] | null) =>
  storeStage === 'Preview' ? 'Preview' : 'WS';

const normalizeEnvironmentColumns = (columns?: string[] | null) => {
  const normalized = (columns ?? [])
    .map((column) => column.trim())
    .filter((column, index, array) => column.length > 0 && array.indexOf(column) === index);

  return normalized.length > 0 ? normalized : DEFAULT_ENVIRONMENT_COLUMNS;
};

const buildScenarioMap = (
  suite: StoreSuite | undefined,
  scenarioList: StoreScenario[],
  environmentColumns: string[],
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
      statusByEnvironment: environmentColumns.reduce<Record<string, EnvironmentScenario['status']>>(
        (acc, column) => {
          acc[column] = 'pendente';
          return acc;
        },
        {},
      ),
      statusMobile: 'pendente',
      statusDesktop: 'pendente',
      evidenciaArquivoUrl: null,
    };
  });

  return scenarioMap;
};

export const CreateEnvironmentCard = ({
  storeId,
  storeStage,
  storeEnvironmentColumns,
  suites,
  scenarios,
  onCreated,
}: CreateEnvironmentCardProps) => {
  const [identificador, setIdentificador] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [jiraInput, setJiraInput] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  const [jiraLinks, setJiraLinks] = useState<string[]>([]);
  const [tipoAmbiente, setTipoAmbiente] = useState(() =>
    getEnvironmentTypeByStoreStage(storeStage),
  );
  const [tipoTeste, setTipoTeste] = useState('Smoke-test');
  const [momento, setMomento] = useState('');
  const [suiteId, setSuiteId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const { t } = useTranslation();

  const environmentColumns = useMemo(
    () => normalizeEnvironmentColumns(storeEnvironmentColumns),
    [storeEnvironmentColumns],
  );
  const selectedSuite = useMemo(
    () => suites.find((suite) => suite.id === suiteId),
    [suiteId, suites],
  );
  const scenarioMap = useMemo(
    () => buildScenarioMap(selectedSuite, scenarios, environmentColumns),
    [environmentColumns, scenarios, selectedSuite],
  );
  const totalCenarios = Object.keys(scenarioMap).length;

  const tipoTesteOptions = useMemo(
    () => TEST_TYPES_BY_ENVIRONMENT[tipoAmbiente] ?? ['Smoke-test'],
    [tipoAmbiente],
  );

  const momentoOptions = useMemo(
    () => MOMENT_OPTIONS_BY_ENVIRONMENT[tipoAmbiente] ?? [],
    [tipoAmbiente],
  );

  const primaryEnvironmentOption = useMemo(
    () => ({
      value: getEnvironmentTypeByStoreStage(storeStage),
      label:
        storeStage === 'Preview'
          ? t('storeSummary.storePlatformFaststore')
          : t('storeSummary.storePlatformVtexio'),
    }),
    [storeStage, t],
  );

  useEffect(() => {
    setTipoAmbiente(getEnvironmentTypeByStoreStage(storeStage));
  }, [storeStage]);

  useEffect(() => {
    if (!tipoTesteOptions.includes(tipoTeste)) {
      setTipoTeste(tipoTesteOptions[0]);
    }
  }, [tipoTeste, tipoTesteOptions]);

  useEffect(() => {
    if (momentoOptions.length === 0 && momento) {
      setMomento('');
      return;
    }

    if (momentoOptions.length > 0 && !momentoOptions.includes(momento)) {
      setMomento(momentoOptions[0]);
    }
  }, [momento, momentoOptions]);

  const resetForm = () => {
    setIdentificador('');
    setUrlInput('');
    setJiraInput('');
    setUrls([]);
    setJiraLinks([]);
    setTipoAmbiente(getEnvironmentTypeByStoreStage(storeStage));
    setTipoTeste('Smoke-test');
    setMomento('');
    setSuiteId('');
  };

  const addUniqueItem = (
    currentValue: string,
    items: string[],
    setItems: (value: string[] | ((current: string[]) => string[])) => void,
    duplicatedMessage: string,
  ) => {
    const value = currentValue.trim();
    if (!value) {
      return false;
    }
    if (items.includes(value)) {
      showToast({ type: 'error', message: duplicatedMessage });
      return false;
    }
    setItems((current) => [...current, value]);
    return true;
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

    setIsSubmitting(true);
    try {
      const urlsList = Array.from(new Set([...urls, ...(urlInput.trim() ? [urlInput.trim()] : [])]));
      const jiraList = Array.from(
        new Set([...jiraLinks, ...(jiraInput.trim() ? [jiraInput.trim()] : [])]),
      );

      const timeTracking = { start: null, end: null, totalMs: 0 };

      const createdEnvironment = await environmentService.create({
        identificador: identificador.trim(),
        storeId,
        suiteId: selectedSuite?.id ?? null,
        suiteName: selectedSuite?.name ?? null,
        urls: urlsList,
        jiraTask: jiraList.join('\n').trim(),
        tipoAmbiente,
        tipoTeste,
        momento: momentoOptions.length > 0 ? momento : null,
        release: null,
        status: 'backlog',
        timeTracking,
        presentUsersIds: [],
        concludedBy: null,
        scenarios: scenarioMap,
        totalCenarios,
        participants: [],
        publicShareLanguage: null,
        environmentColumns,
      });

      onCreated?.(createdEnvironment);
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
        <SelectInput
          id="tipoAmbiente"
          label={t('createEnvironment.environmentType')}
          value={tipoAmbiente}
          onChange={(event) => setTipoAmbiente(event.target.value)}
          options={[
            primaryEnvironmentOption,
            { value: 'TM', label: t('environmentOptions.TM') },
            { value: 'PROD', label: t('environmentOptions.PROD') },
          ]}
        />
        <div className="dynamic-links-row">
          <TextInput
            id="urls"
            label={t('createEnvironment.urls')}
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            placeholder={t('createEnvironment.example')}
          />
          <Button
            type="button"
            variant="secondary"
            className="dynamic-links-add-button"
            onClick={() => {
              const wasAdded = addUniqueItem(
                urlInput,
                urls,
                setUrls,
                t('createEnvironment.duplicateUrlError'),
              );
              if (wasAdded) {
                setUrlInput('');
              }
            }}
          >
            +
          </Button>
        </div>
        {urls.length > 0 && (
          <div className="dynamic-links-list">
            {urls.map((url) => (
              <span key={url} className="dynamic-link-item">
                <span>{url}</span>
              </span>
            ))}
          </div>
        )}
        <SelectInput
          id="tipoTeste"
          label={t('createEnvironment.testType')}
          value={tipoTeste}
          onChange={(event) => setTipoTeste(event.target.value)}
          options={tipoTesteOptions.map((option) => ({ value: option, label: t(option) }))}
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
        {selectedSuite && (
          <div className="environment-suite-preview">
            <p>
              {t('createEnvironment.scenariosLoaded')} <strong>{selectedSuite.name}</strong>:{' '}
              {totalCenarios}
            </p>
          </div>
        )}
        <div className="dynamic-links-row">
          <TextInput
            id="jiraTask"
            label={t('createEnvironment.jiraTask')}
            value={jiraInput}
            onChange={(event) => setJiraInput(event.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            className="dynamic-links-add-button"
            onClick={() => {
              const wasAdded = addUniqueItem(
                jiraInput,
                jiraLinks,
                setJiraLinks,
                t('createEnvironment.duplicateJiraError'),
              );
              if (wasAdded) {
                setJiraInput('');
              }
            }}
          >
            +
          </Button>
        </div>
        {jiraLinks.length > 0 && (
          <div className="dynamic-links-list">
            {jiraLinks.map((link) => (
              <span key={link} className="dynamic-link-item">
                <span>{link}</span>
              </span>
            ))}
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
