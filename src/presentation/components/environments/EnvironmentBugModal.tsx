import { type FormEvent, useEffect, useMemo, useState } from 'react';

import type { Environment } from '../../../domain/entities/Environment';
import type { EnvironmentBug, EnvironmentBugStatus } from '../../../domain/entities/EnvironmentBug';
import { environmentService } from '../../../main/factories/environmentServiceFactory';
import { useToast } from '../../context/ToastContext';
import { Button } from '../Button';
import { Modal } from '../Modal';

interface EnvironmentBugModalProps {
  environment: Environment;
  isOpen: boolean;
  bug: EnvironmentBug | null;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: EnvironmentBugStatus; label: string }[] = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'resolvido', label: 'Resolvido' },
];

export const EnvironmentBugModal = ({
  environment,
  isOpen,
  bug,
  onClose,
}: EnvironmentBugModalProps) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [scenarioId, setScenarioId] = useState<string>('');
  const [status, setStatus] = useState<EnvironmentBugStatus>('aberto');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scenarioEntries = useMemo(
    () => Object.entries(environment.scenarios ?? {}),
    [environment.scenarios],
  );

  useEffect(() => {
    if (!bug) {
      setTitle('');
      setDescription('');
      setLink('');
      setScenarioId('');
      setStatus('aberto');
      return;
    }

    setTitle(bug.title);
    setDescription(bug.description ?? '');
    setLink(bug.link ?? '');
    setScenarioId(bug.scenarioId ?? '');
    setStatus(bug.status);
  }, [bug]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!environment.id) {
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      link: link.trim() || null,
      scenarioId: scenarioId || null,
      status,
    };

    try {
      if (bug) {
        await environmentService.updateBug(environment.id, bug.id, payload);
        showToast({ type: 'success', message: 'Bug atualizado com sucesso.' });
      } else {
        await environmentService.createBug(environment.id, payload);
        showToast({ type: 'success', message: 'Bug registrado com sucesso.' });
      }

      if (payload.scenarioId) {
        await environmentService.updateScenarioBug(
          environment.id,
          payload.scenarioId,
          payload.link,
        );
      } else if (bug?.scenarioId) {
        await environmentService.updateScenarioBug(environment.id, bug.scenarioId, null);
      }

      onClose();
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível salvar o bug.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title={bug ? 'Editar bug' : 'Novo bug'} onClose={onClose} size="md">
      <form className="modal-form" onSubmit={handleSubmit}>
        <label>
          <span>Título</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder="Ex.: Checkout falhando"
          />
        </label>
        <label>
          <span>Descrição</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Detalhes adicionais sobre o bug"
          />
        </label>
        <label>
          <span>Link do bug</span>
          <input
            type="url"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://jira/browse/BUG-123"
          />
        </label>
        <label>
          <span>Cenário relacionado</span>
          <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)}>
            <option value="">Sem vínculo</option>
            {scenarioEntries.map(([id, scenario]) => (
              <option key={id} value={id}>
                {scenario.titulo}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Status do bug</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as EnvironmentBugStatus)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {bug ? 'Salvar alterações' : 'Registrar bug'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
