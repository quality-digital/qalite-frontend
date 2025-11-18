import { FormEvent, useEffect, useMemo, useState } from 'react';

import type { Environment } from '../../../domain/entities/Environment';
import { environmentService } from '../../../services';
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

interface EditEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: Environment | null;
}

export const EditEnvironmentModal = ({
  isOpen,
  onClose,
  environment,
}: EditEnvironmentModalProps) => {
  const [identificador, setIdentificador] = useState('');
  const [urls, setUrls] = useState('');
  const [jiraTask, setJiraTask] = useState('');
  const [tipoAmbiente, setTipoAmbiente] = useState('WS');
  const [tipoTeste, setTipoTeste] = useState('Smoke-test');
  const [momento, setMomento] = useState('');
  const [release, setRelease] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  }, [environment]);

  const isLocked = environment?.status === 'done';
  const suiteSummary = useMemo(
    () => Object.keys(environment?.scenarios ?? {}).length,
    [environment?.scenarios],
  );

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!environment) {
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

      await environmentService.update(environment.id, {
        identificador: identificador.trim(),
        urls: urlsList,
        jiraTask: jiraTask.trim(),
        tipoAmbiente,
        tipoTeste,
        momento: momentoOptions.length > 0 ? momento : null,
        release: shouldDisplayReleaseField ? release.trim() : null,
      });

      onClose();
    } catch (error) {
      console.error(error);
      setFormError('Não foi possível atualizar o ambiente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar ambiente"
      description="Atualize as informações necessárias."
    >
      <form className="environment-form" onSubmit={handleSubmit}>
        {formError && <p className="form-message form-message--error">{formError}</p>}
        <TextInput
          id="identificadorEditar"
          label="Identificador"
          value={identificador}
          onChange={(event) => setIdentificador(event.target.value)}
          required
          disabled={isLocked}
        />
        <TextArea
          id="urlsEditar"
          label="URLs"
          value={urls}
          onChange={(event) => setUrls(event.target.value)}
          disabled={isLocked}
        />
        <TextInput
          id="jiraEditar"
          label="Jira Task"
          value={jiraTask}
          onChange={(event) => setJiraTask(event.target.value)}
          disabled={isLocked}
        />
        <SelectInput
          id="tipoAmbienteEditar"
          label="Tipo de ambiente"
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
          label="Tipo de teste"
          value={tipoTeste}
          onChange={(event) => setTipoTeste(event.target.value)}
          disabled={isLocked}
          options={tipoTesteOptions.map((option) => ({ value: option, label: option }))}
        />
        {momentoOptions.length > 0 && (
          <SelectInput
            id="momentoEditar"
            label="Momento/Quando"
            value={momento}
            onChange={(event) => setMomento(event.target.value)}
            disabled={isLocked}
            options={momentoOptions.map((option) => ({ value: option, label: option }))}
          />
        )}
        {shouldDisplayReleaseField && (
          <TextInput
            id="releaseEditar"
            label="Release"
            value={release}
            onChange={(event) => setRelease(event.target.value)}
            disabled={isLocked}
          />
        )}
        <p className="environment-suite-preview">Cenários associados: {suiteSummary}</p>
        <Button
          type="submit"
          disabled={isLocked}
          isLoading={isSubmitting}
          loadingText="Salvando..."
        >
          Salvar alterações
        </Button>
      </form>
    </Modal>
  );
};
