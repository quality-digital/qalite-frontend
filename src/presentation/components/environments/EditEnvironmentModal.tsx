import { FormEvent, useEffect, useMemo, useState } from 'react';

import type {
  Environment,
  EnvironmentScenario,
  UpdateEnvironmentInput,
} from '../../../domain/entities/environment';
import type { StoreScenario, StoreSuite } from '../../../domain/entities/store';
import { environmentService } from '../../../application/use-cases/EnvironmentUseCase';
import { getScenarioPlatformStatuses } from '../../../infrastructure/external/environments';
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
import { useTranslation } from 'react-i18next';
import { LogoutIcon } from '../icons';
import { useToast } from '../../context/ToastContext';

interface EditEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: Environment | null;
  suites: StoreSuite[];
  scenarios: StoreScenario[];
  onDeleteRequest?: () => void;
  onLeave?: () => void;
  canLeave?: boolean;
  isLeaving?: boolean;
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

export const EditEnvironmentModal = ({
  isOpen,
  onClose,
  environment,
  suites,
  scenarios,
  onDeleteRequest,
  onLeave,
  canLeave,
  isLeaving,
}: EditEnvironmentModalProps) => {
  const { t: translation } = useTranslation();

  const [identificador, setIdentificador] = useState('');
  const [urls, setUrls] = useState('');
  const [jiraTask, setJiraTask] = useState('');
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
    setUrls(environment.urls.join('\n'));
    setJiraTask(environment.jiraTask);
    setTipoAmbiente(environment.tipoAmbiente);
    setTipoTeste(environment.tipoTeste);
    setMomento(environment.momento ?? '');
    setRelease(environment.release ?? '');
    setSuiteId(environment.suiteId ?? '');
  }, [environment]);

  const isLocked = environment?.status === 'done';
  const canDelete = Boolean(onDeleteRequest) && !isLocked;
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
  }, [release, shouldDisplayReleaseField]);

  const hasStartedScenarios = useMemo(() => {
    const scenarioEntries = Object.values(environment?.scenarios ?? {});
    return scenarioEntries.some((scenario) => {
      const statuses = getScenarioPlatformStatuses(scenario);
      return statuses.mobile !== 'pendente' || statuses.desktop !== 'pendente';
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

    const urlsList = urls
      .split('\n')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    const payload: UpdateEnvironmentInput = {
      identificador: identificador.trim(),
      urls: urlsList,
      jiraTask: jiraTask.trim(),
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
          <TextArea
            id="urlsEditar"
            label={translation('editEnvironmentModal.urls')}
            value={urls}
            onChange={(event) => setUrls(event.target.value)}
            disabled={isLocked}
          />
          <TextInput
            id="jiraEditar"
            label={translation('editEnvironmentModal.jiraTask')}
            value={jiraTask}
            onChange={(event) => setJiraTask(event.target.value)}
            disabled={isLocked}
          />
          <SelectInput
            id="tipoAmbienteEditar"
            label={translation('editEnvironmentModal.environmentType')}
            value={tipoAmbiente}
            onChange={(event) => setTipoAmbiente(event.target.value)}
            disabled={isLocked}
            options={[
              { value: 'WS', label: 'WS' },
              { value: 'TM', label: 'TM' },
              { value: 'PROD', label: 'PROD' },
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
            {canLeave && onLeave && (
              <Button
                type="button"
                variant="ghost"
                onClick={onLeave}
                isLoading={isLeaving}
                loadingText={translation('environment.leaving')}
              >
                <LogoutIcon aria-hidden className="icon" />
                {translation('environment.leave')}
              </Button>
            )}
          </div>
        </form>
        {canDelete && (
          <div className="modal-danger-zone">
            <div>
              <h4>{translation('editEnvironmentModal.dangerZoneTitle')}</h4>
              <p>{translation('editEnvironmentModal.dangerZoneDescription')}</p>
            </div>
            <button type="button" className="link-danger" onClick={onDeleteRequest}>
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
