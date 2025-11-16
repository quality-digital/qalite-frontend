import { FormEvent, useEffect, useMemo, useState } from 'react';

import type { Environment, EnvironmentStatus } from '../../../domain/entities/Environment';
import { environmentService } from '../../../main/factories/environmentServiceFactory';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { SelectInput } from '../SelectInput';
import { TextArea } from '../TextArea';
import { TextInput } from '../TextInput';

interface EditEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: Environment | null;
}

const STATUS_OPTIONS: { value: EnvironmentStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'done', label: 'Concluído' },
];

export const EditEnvironmentModal = ({
  isOpen,
  onClose,
  environment,
}: EditEnvironmentModalProps) => {
  const [identificador, setIdentificador] = useState('');
  const [urls, setUrls] = useState('');
  const [jiraTask, setJiraTask] = useState('');
  const [tipoAmbiente, setTipoAmbiente] = useState('WS');
  const [tipoTeste, setTipoTeste] = useState('Funcional');
  const [status, setStatus] = useState<EnvironmentStatus>('backlog');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!environment) {
      return;
    }

    setIdentificador(environment.identificador);
    setUrls(environment.urls.join('\n'));
    setJiraTask(environment.jiraTask);
    setTipoAmbiente(environment.tipoAmbiente);
    setTipoTeste(environment.tipoTeste);
    setStatus(environment.status);
  }, [environment]);

  const isLocked = environment?.status === 'done';
  const suiteSummary = useMemo(
    () => Object.keys(environment?.scenarios ?? {}).length,
    [environment?.scenarios],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!environment) {
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
      });

      if (environment.status !== status) {
        await environmentService.transitionStatus({
          environment,
          targetStatus: status,
          currentUserId: user?.uid ?? null,
        });
      }

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
        <TextInput
          id="tipoTesteEditar"
          label="Tipo de teste"
          value={tipoTeste}
          onChange={(event) => setTipoTeste(event.target.value)}
          disabled={isLocked}
        />
        <SelectInput
          id="statusEditar"
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as EnvironmentStatus)}
          options={STATUS_OPTIONS}
          disabled={isLocked}
        />
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
