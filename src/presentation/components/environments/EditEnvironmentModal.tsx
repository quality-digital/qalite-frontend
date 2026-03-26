import { FormEvent, useEffect, useMemo, useState } from 'react';

import type {
  Environment,
  EnvironmentScenario,
  UpdateEnvironmentInput,
} from '../../../domain/entities/environment';
import type { StoreScenario, StoreSuite } from '../../../domain/entities/store';
import { environmentService } from '../../../infrastructure/services/environmentService';
import { getScenarioPlatformStatuses } from '../../../infrastructure/external/environments';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { SelectInput } from '../SelectInput';
import { TextInput } from '../TextInput';
import { TrashIcon } from '../icons';
import {
  MOMENT_OPTIONS_BY_ENVIRONMENT,
  TEST_TYPES_BY_ENVIRONMENT,
  requiresReleaseField,
} from '../../constants/environmentOptions';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../context/ToastContext';

interface EditEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: Environment | null;
  suites: StoreSuite[];
  scenarios: StoreScenario[];
  onDeleteRequest?: () => void;
}

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

export const EditEnvironmentModal = ({
  isOpen,
  onClose,
  environment,
  suites,
  scenarios,
  onDeleteRequest,
}: EditEnvironmentModalProps) => {
  const { t: translation } = useTranslation();

  const [identificador, setIdentificador] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [jiraInput, setJiraInput] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  const [jiraLinks, setJiraLinks] = useState<string[]>([]);
  const [tipoAmbiente, setTipoAmbiente] = useState('WS');
  const [tipoTeste, setTipoTeste] = useState('Smoke-test');
  const [momento, setMomento] = useState('');
  const [release, setRelease] = useState('');
  const [suiteId, setSuiteId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<UpdateEnvironmentInput | null>(null);
  const [isSuiteConfirmOpen, setIsSuiteConfirmOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!environment) {
      return;
    }

    setIdentificador(environment.identificador);
    setUrls(environment.urls ?? []);
    setJiraLinks(
      environment.jiraTask
        .split('\n')
        .map((entry) => entry.trim())
        .filter(Boolean),
    );
    setUrlInput('');
    setJiraInput('');
    setTipoAmbiente(environment.tipoAmbiente);
    setTipoTeste(environment.tipoTeste);
    setMomento(environment.momento ?? '');
    setRelease(environment.release ?? '');
    setSuiteId(environment.suiteId ?? '');
  }, [environment]);
  const environmentColumns = useMemo(
    () => environment?.environmentColumns ?? ['Desktop', 'Mobile'],
    [environment?.environmentColumns],
  );

  const isLocked = environment?.status === 'done';
  const canDelete = Boolean(onDeleteRequest) && !isLocked;
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

  const shouldDisplayReleaseField = requiresReleaseField(tipoAmbiente);

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

  useEffect(() => {
    if (!shouldDisplayReleaseField && release) {
      setRelease('');
    }
  }, [release, shouldDisplayReleaseField]);

  const hasStartedScenarios = useMemo(() => {
    const scenarioEntries = Object.values(environment?.scenarios ?? {});
    return scenarioEntries.some((scenario) => {
      const statuses = getScenarioPlatformStatuses(scenario);
      return Object.values(statuses).some((status) => status !== 'pendente');
    });
  }, [environment?.scenarios]);

  const normalizedSuiteId = suiteId || null;
  const suiteHasChanged = normalizedSuiteId !== (environment?.suiteId ?? null);

  const submitUpdate = async (payload: UpdateEnvironmentInput) => {
    if (!environment) {
      return;
    }

    setIsSubmitting(true);

    try {
      await environmentService.update(environment.id, payload);
      onClose();
    } catch (error) {
      console.error(error);
      showToast({
        type: 'error',
        message: translation('editEnvironmentModal.updateEnvironmentError'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!environment) {
      return;
    }

    if (!suiteId) {
      showToast({
        type: 'error',
        message: translation('editEnvironmentModal.suiteRequired'),
      });
      return;
    }

    if (momentoOptions.length > 0 && !momento) {
      showToast({
        type: 'error',
        message: translation('editEnvironmentModal.selectMomentError'),
      });
      return;
    }

    if (shouldDisplayReleaseField && !release.trim()) {
      showToast({
        type: 'error',
        message: translation('editEnvironmentModal.missingReleaseError'),
      });
      return;
    }

    const urlsList = [...urls, ...(urlInput.trim() ? [urlInput.trim()] : [])];
    const jiraList = [...jiraLinks, ...(jiraInput.trim() ? [jiraInput.trim()] : [])];

    const payload: UpdateEnvironmentInput = {
      identificador: identificador.trim(),
      urls: urlsList,
      jiraTask: jiraList.join('\n').trim(),
      tipoAmbiente,
      tipoTeste,
      momento: momentoOptions.length > 0 ? momento : null,
      release: shouldDisplayReleaseField ? release.trim() : null,
    };

    if (suiteHasChanged) {
      payload.suiteId = normalizedSuiteId;
      payload.suiteName = selectedSuite?.name ?? null;
      payload.scenarios = scenarioMap;
      payload.totalCenarios = totalCenarios;
    }

    if (suiteHasChanged && hasStartedScenarios) {
      setPendingUpdate(payload);
      setIsSuiteConfirmOpen(true);
      return;
    }

    await submitUpdate(payload);
  };

  const handleCloseSuiteConfirm = () => {
    setIsSuiteConfirmOpen(false);
    setPendingUpdate(null);
  };

  const handleConfirmSuiteChange = async () => {
    if (!pendingUpdate) {
      setIsSuiteConfirmOpen(false);
      return;
    }

    setIsSuiteConfirmOpen(false);
    await submitUpdate(pendingUpdate);
    setPendingUpdate(null);
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={translation('editEnvironmentModal.editEnvironment')}
        description={translation('editEnvironmentModal.updateInfo')}
      >
        <form className="environment-form" onSubmit={handleSubmit}>
          <TextInput
            id="identificadorEditar"
            label={translation('editEnvironmentModal.identifier')}
            value={identificador}
            onChange={(event) => setIdentificador(event.target.value)}
            required
            disabled={isLocked}
          />
          <div className="dynamic-links-row">
            <TextInput
              id="urlsEditar"
              label={translation('editEnvironmentModal.urls')}
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              disabled={isLocked}
            />
          {!isLocked && (
            <Button
              type="button"
              variant="secondary"
              className="dynamic-links-add-button"
              onClick={() => {
                const wasAdded = addUniqueItem(
                  urlInput,
                  urls,
                  setUrls,
                  translation('createEnvironment.duplicateUrlError'),
                );
                if (wasAdded) {
                  setUrlInput('');
                }
              }}
            >
              +
            </Button>
          )}
          </div>
          {urls.length > 0 && (
            <div className="dynamic-links-list">
              {urls.map((url) => (
                <span key={url} className="dynamic-link-item">
                  <span>{url}</span>
                  {!isLocked && (
                    <button
                      type="button"
                      className="dynamic-link-remove"
                      onClick={() => setUrls((current) => current.filter((item) => item !== url))}
                      aria-label={translation('delete')}
                    >
                      <TrashIcon aria-hidden className="dynamic-link-remove-icon" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          <div className="dynamic-links-row">
            <TextInput
              id="jiraEditar"
              label={translation('editEnvironmentModal.jiraTask')}
              value={jiraInput}
              onChange={(event) => setJiraInput(event.target.value)}
              disabled={isLocked}
            />
          {!isLocked && (
            <Button
              type="button"
              variant="secondary"
              className="dynamic-links-add-button"
              onClick={() => {
                const wasAdded = addUniqueItem(
                  jiraInput,
                  jiraLinks,
                  setJiraLinks,
                  translation('createEnvironment.duplicateJiraError'),
                );
                if (wasAdded) {
                  setJiraInput('');
                }
              }}
            >
              +
            </Button>
          )}
          </div>
          {jiraLinks.length > 0 && (
            <div className="dynamic-links-list">
              {jiraLinks.map((link) => (
                <span key={link} className="dynamic-link-item">
                  <span>{link}</span>
                  {!isLocked && (
                    <button
                      type="button"
                      className="dynamic-link-remove"
                      onClick={() =>
                        setJiraLinks((current) => current.filter((item) => item !== link))
                      }
                      aria-label={translation('delete')}
                    >
                      <TrashIcon aria-hidden className="dynamic-link-remove-icon" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          <SelectInput
            id="tipoAmbienteEditar"
            label={translation('editEnvironmentModal.environmentType')}
            value={tipoAmbiente}
            onChange={(event) => setTipoAmbiente(event.target.value)}
            disabled={isLocked}
            options={[
              { value: 'WS', label: 'WS' },
              { value: 'TM', label: translation('environmentOptions.TM') },
              { value: 'PROD', label: translation('environmentOptions.PROD') },
            ]}
          />
          <SelectInput
            id="tipoTesteEditar"
            label={translation('editEnvironmentModal.testType')}
            value={tipoTeste}
            onChange={(event) => setTipoTeste(event.target.value)}
            disabled={isLocked}
            options={tipoTesteOptions.map((option) => ({
              value: option,
              label: translation(option),
            }))}
          />
          <SelectInput
            id="suiteIdEditar"
            label={translation('createEnvironment.suiteId')}
            value={suiteId}
            onChange={(event) => setSuiteId(event.target.value)}
            disabled={isLocked}
            options={[
              { value: '', label: translation('createEnvironment.none') },
              ...suites.map((suite) => ({ value: suite.id, label: suite.name })),
            ]}
          />
          {selectedSuite && (
            <div className="environment-suite-preview">
              <p>
                {translation('createEnvironment.scenariosLoaded')}{' '}
                <strong>{selectedSuite.name}</strong>: {totalCenarios}
              </p>
            </div>
          )}
          {momentoOptions.length > 0 && (
            <SelectInput
              id="momentoEditar"
              label={translation('editEnvironmentModal.moment')}
              value={momento}
              onChange={(event) => setMomento(event.target.value)}
              disabled={isLocked}
              options={momentoOptions.map((option) => ({
                value: option,
                label: translation(option),
              }))}
            />
          )}
          {shouldDisplayReleaseField && (
            <TextInput
              id="releaseEditar"
              label={translation('editEnvironmentModal.release')}
              value={release}
              onChange={(event) => setRelease(event.target.value)}
              disabled={isLocked}
            />
          )}

          <div className="environment-form-actions">
            <Button
              type="submit"
              disabled={isLocked}
              isLoading={isSubmitting}
              loadingText={translation('editEnvironmentModal.saving')}
            >
              {translation('editEnvironmentModal.saveChanges')}
            </Button>
          </div>
        </form>
        {canDelete && (
          <div className="modal-danger-zone">
            <div>
              <h4>{translation('editEnvironmentModal.dangerZoneTitle')}</h4>
              <p>{translation('editEnvironmentModal.dangerZoneDescription')}</p>
            </div>
            <button
              type="button"
              className="link-danger link-danger--with-icon"
              onClick={onDeleteRequest}
            >
              <TrashIcon aria-hidden className="icon" />
              {translation('deleteEnvironmentModal.deleteEnvironment')}
            </button>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={isSuiteConfirmOpen}
        onClose={handleCloseSuiteConfirm}
        title={translation('editEnvironmentModal.confirmSuiteChangeTitle')}
      >
        <p>{translation('editEnvironmentModal.confirmSuiteChangeMessage')}</p>
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={handleCloseSuiteConfirm}>
            {translation('editEnvironmentModal.confirmSuiteChangeCancel')}
          </Button>
          <Button
            type="button"
            onClick={handleConfirmSuiteChange}
            isLoading={isSubmitting}
            loadingText={translation('editEnvironmentModal.saving')}
          >
            {translation('editEnvironmentModal.confirmSuiteChangeConfirm')}
          </Button>
        </div>
      </Modal>
    </>
  );
};
