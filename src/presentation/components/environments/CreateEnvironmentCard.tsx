import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Environment, EnvironmentScenario } from '../../../domain/entities/environment';
import type { StoreScenario, StoreSuite, Store } from '../../../domain/entities/store';
import { environmentService } from '../../../infrastructure/services/environmentService';
import { Button } from '../Button';
import { SelectInput } from '../SelectInput';
import { TextInput } from '../TextInput';
import {
  requiresReleaseField,
  MOMENT_OPTIONS_BY_ENVIRONMENT,
} from '../../constants/environmentOptions';
import { useStoresRealtime } from '../../context/StoresRealtimeContext';
import { DEFAULT_ENVIRONMENT_COLUMNS } from '../../../infrastructure/external/environments';
import { useToast } from '../../context/ToastContext';

interface CreateEnvironmentCardProps {
  storeId: string;
  storeStage?: Store['stage'] | null;
  suites: StoreSuite[];
  scenarios: StoreScenario[];
  onCreated?: (environment: Environment | null) => void;
}

const getEnvironmentTypeByStoreStage = (storeStage?: Store['stage'] | null) =>
  storeStage === 'Preview' ? 'Preview' : 'WS';

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
  suites,
  scenarios,
  onCreated,
}: CreateEnvironmentCardProps) => {
  const [urlInput, setUrlInput] = useState('');
  const [jiraInput, setJiraInput] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  const [jiraLinks, setJiraLinks] = useState<string[]>([]);
  const [tipoAmbiente, setTipoAmbiente] = useState(() =>
    getEnvironmentTypeByStoreStage(storeStage),
  );

  const [suiteId, setSuiteId] = useState('');
  const [momento, setMomento] = useState<string | null>(null);
  const [releaseVersion, setReleaseVersion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const { t } = useTranslation();

  const { stores } = useStoresRealtime();
  const currentStore = useMemo(() => stores.find((s) => s.id === storeId), [stores, storeId]);
  const environmentColumns = useMemo(() => {
    if (currentStore?.environmentColumns && currentStore.environmentColumns.length > 0) {
      return currentStore.environmentColumns.map((c) => c.trim()).filter(Boolean);
    }
    return DEFAULT_ENVIRONMENT_COLUMNS;
  }, [currentStore]);
  const selectedSuite = useMemo(
    () => suites.find((suite) => suite.id === suiteId),
    [suiteId, suites],
  );
  const scenarioMap = useMemo(
    () => buildScenarioMap(selectedSuite, scenarios, environmentColumns),
    [environmentColumns, scenarios, selectedSuite],
  );
  const totalCenarios = Object.keys(scenarioMap).length;
  const shouldDisplayReleaseField = requiresReleaseField(tipoAmbiente);
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

  // momento removed: no-op effect removed

  const resetForm = () => {
    setUrlInput('');
    setJiraInput('');
    setUrls([]);
    setJiraLinks([]);
    setTipoAmbiente(getEnvironmentTypeByStoreStage(storeStage));
    setSuiteId('');
    setMomento(null);
    setReleaseVersion('');
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

    if (!suiteId) {
      showToast({ type: 'error', message: t('createEnvironment.suiteRequired') });
      return;
    }

    // environment columns now come from store configuration (fallback to Desktop/Mobile)

    const isReleaseType = tipoAmbiente === 'RELEASE' || shouldDisplayReleaseField;
    // no release version input (removed) — release not required from UI

    setIsSubmitting(true);
    try {
      const urlsList = Array.from(
        new Set([...urls, ...(urlInput.trim() ? [urlInput.trim()] : [])]),
      );
      const jiraList = Array.from(
        new Set([...jiraLinks, ...(jiraInput.trim() ? [jiraInput.trim()] : [])]),
      );

      const timeTracking = { start: null, end: null, totalMs: 0 };
      const dateToken = new Date().toISOString().slice(0, 10).replaceAll('-', '');

      if (isReleaseType) {
        const momentoToken = momento ? (momento === 'pre' ? 'PRE' : 'POS') : 'PRE';
        const releaseToken = releaseVersion?.trim() || 'RELEASE';
        const suiteToken = selectedSuite?.name
          ? selectedSuite.name.replaceAll(' ', '_')
          : 'NO_SUITE';
        const identifier = `[${momentoToken}][${releaseToken}][${suiteToken}][${dateToken}]`;

        const createdEnvironment = await environmentService.create({
          identificador: identifier,
          storeId,
          suiteId: selectedSuite?.id ?? null,
          suiteName: selectedSuite?.name ?? null,
          urls: urlsList,
          jiraTask: jiraList.join('\n').trim(),
          tipoAmbiente,
          tipoTeste: null,
          release: releaseVersion?.trim() || null,
          executionDate: null,
          momento: momento ?? null,
          status: 'backlog',
          timeTracking,
          presentUsersIds: [],
          concludedBy: null,
          scenarios: scenarioMap,
          bugs: 0,
          totalCenarios,
          participants: [],
          publicShareLanguage: null,
          environmentColumns,
        });

        onCreated?.(createdEnvironment);
        resetForm();
      } else {
        const typeTag =
          tipoAmbiente === 'PROD'
            ? 'PRODUCAO'
            : tipoAmbiente === 'WS' || tipoAmbiente === 'Preview'
              ? 'WS'
              : tipoAmbiente.toUpperCase();
        const suiteToken = selectedSuite?.name
          ? selectedSuite.name.replaceAll(' ', '_')
          : 'NO_SUITE';
        const identifier = `[${typeTag}][${suiteToken}][${dateToken}]`;

        const createdEnvironment = await environmentService.create({
          identificador: identifier,
          storeId,
          suiteId: selectedSuite?.id ?? null,
          suiteName: selectedSuite?.name ?? null,
          urls: urlsList,
          jiraTask: jiraList.join('\n').trim(),
          tipoAmbiente,
          tipoTeste: null,
          release: null,
          executionDate: null,
          status: 'backlog',
          timeTracking,
          presentUsersIds: [],
          concludedBy: null,
          scenarios: scenarioMap,
          bugs: 0,
          totalCenarios,
          participants: [],
          publicShareLanguage: null,
          environmentColumns,
        });

        onCreated?.(createdEnvironment);
        resetForm();
      }
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
        <div className="dynamic-links-row">
          <TextInput
            id="urls"
            label={t('createEnvironment.urls')}
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            placeholder="Insira o link da sua url"
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
        <div className="dynamic-links-row">
          <TextInput
            id="jiraTask"
            label={t('createEnvironment.jiraTask')}
            value={jiraInput}
            onChange={(event) => setJiraInput(event.target.value)}
            placeholder="Insira o link da sua tarefa do jira"
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
        <SelectInput
          id="tipoAmbiente"
          label={t('createEnvironment.environmentType')}
          value={tipoAmbiente}
          onChange={(event) => setTipoAmbiente(event.target.value)}
          options={[
            primaryEnvironmentOption,
            { value: 'RELEASE', label: t('environmentOptions.RELEASE') || 'Release' },
            { value: 'PROD', label: t('environmentOptions.PROD') },
          ]}
        />
        {(shouldDisplayReleaseField || tipoAmbiente === 'RELEASE') && (
          <>
            <SelectInput
              id="momento"
              label={t('editEnvironmentModal.moment')}
              value={momento ?? ''}
              onChange={(event) => setMomento(event.target.value || null)}
              options={[
                { value: '', label: t('createEnvironment.none') },
                ...(
                  MOMENT_OPTIONS_BY_ENVIRONMENT[tipoAmbiente] ?? [
                    'environmentOptions.pre',
                    'environmentOptions.post',
                  ]
                ).map((opt) => ({ value: opt.replace('environmentOptions.', ''), label: t(opt) })),
              ]}
            />
            <TextInput
              id="release"
              label={t('editEnvironmentModal.release')}
              value={releaseVersion}
              onChange={(event) => setReleaseVersion(event.target.value)}
              placeholder="Ex: 1.2.3"
            />
          </>
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
        <div className="field">
          <span className="field-label">{t('createEnvironment.environmentColumns')}</span>
          <div className="field-input" aria-hidden>
            {environmentColumns.join(', ')}
          </div>
        </div>
        {/* release version field removed — release not provided by UI */}
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
