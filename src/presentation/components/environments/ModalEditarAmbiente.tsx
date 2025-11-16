import { FormEvent, useEffect, useMemo, useState } from 'react';

import type { Environment, EnvironmentStatus } from '../../../domain/entities/Environment';
import { updateEnvironment } from '../../../infra/firebase/environmentService';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { SelectInput } from '../SelectInput';
import { TextArea } from '../TextArea';
import { TextInput } from '../TextInput';

interface ModalEditarAmbienteProps {
  isOpen: boolean;
  onClose: () => void;
  environment: Environment | null;
}

const STATUS_OPTIONS: { value: EnvironmentStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'done', label: 'Concluído' },
];

export const ModalEditarAmbiente = ({ isOpen, onClose, environment }: ModalEditarAmbienteProps) => {
  const [identificador, setIdentificador] = useState('');
  const [urls, setUrls] = useState('');
  const [jiraTask, setJiraTask] = useState('');
  const [tipoAmbiente, setTipoAmbiente] = useState('WS');
  const [tipoTeste, setTipoTeste] = useState('Funcional');
  const [status, setStatus] = useState<EnvironmentStatus>('backlog');
  const [bugs, setBugs] = useState(0);
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
    setStatus(environment.status);
    setBugs(environment.bugs);
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

      let timeTracking = environment.timeTracking;
      const now = new Date().toISOString();

      if (environment.status !== status) {
        if (status === 'backlog') {
          timeTracking = { start: null, end: null, totalMs: 0 };
        } else if (status === 'in_progress') {
          timeTracking = {
            start: timeTracking.start ?? now,
            end: null,
            totalMs: timeTracking.totalMs,
          };
        } else if (status === 'done') {
          const startDate = timeTracking.start
            ? new Date(timeTracking.start).getTime()
            : Date.now();
          const totalMs = timeTracking.totalMs + Math.max(0, Date.now() - startDate);
          timeTracking = { start: timeTracking.start ?? now, end: now, totalMs };
        }
      }

      await updateEnvironment(environment.id, {
        identificador: identificador.trim(),
        urls: urlsList,
        jiraTask: jiraTask.trim(),
        tipoAmbiente,
        tipoTeste,
        status,
        bugs,
        timeTracking,
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
        <TextInput
          id="bugsEditar"
          label="Bugs"
          type="number"
          min={0}
          value={String(bugs)}
          onChange={(event) => setBugs(Number(event.target.value))}
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
