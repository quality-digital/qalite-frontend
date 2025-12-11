import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Environment } from '../../../domain/entities/environment';
import type { EnvironmentBug, EnvironmentBugStatus } from '../../../domain/entities/environment';
import { environmentService } from '../../../application/use-cases/EnvironmentUseCase';
import { useToast } from '../../context/ToastContext';
import { Button } from '../Button';
import { Modal } from '../Modal';

interface EnvironmentBugModalProps {
  environment: Environment;
  isOpen: boolean;
  bug: EnvironmentBug | null;
  onClose: () => void;
  initialScenarioId?: string | null;
}

const STATUS_OPTIONS: { value: EnvironmentBugStatus; label: string }[] = [
  { value: 'aberto', label: 'environmentBugModal.open' },
  { value: 'em_andamento', label: 'environmentBugModal.progress' },
  { value: 'resolvido', label: 'environmentBugModal.resolved' },
];

export const EnvironmentBugModal = ({
  environment,
  isOpen,
  bug,
  onClose,
  initialScenarioId,
}: EnvironmentBugModalProps) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scenarioId, setScenarioId] = useState<string>('');
  const [status, setStatus] = useState<EnvironmentBugStatus>('aberto');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scenarioLabel = useMemo(() => {
    if (!scenarioId) {
      return t('environmentBugModal.noScenario');
    }

    return environment.scenarios?.[scenarioId]?.titulo ?? t('environmentBugModal.deletedScenario');
  }, [environment.scenarios, scenarioId]);

  useEffect(() => {
    if (bug) {
      setTitle(bug.title);
      setDescription(bug.description ?? '');
      setScenarioId(bug.scenarioId ?? '');
      setStatus(bug.status);
      return;
    }

    setTitle('');
    setDescription('');
    setScenarioId(initialScenarioId ?? '');
    setStatus('aberto');
  }, [bug, initialScenarioId, isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!environment.id) {
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      scenarioId: scenarioId || null,
      status,
    };

    try {
      if (bug) {
        await environmentService.updateBug(environment.id, bug.id, payload);
        showToast({ type: 'success', message: t('environmentBugModal.bugUpdated') });
      } else {
        await environmentService.createBug(environment.id, payload);
        showToast({ type: 'success', message: t('environmentBugModal.bugRegister') });
      }

      onClose();
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: t('environmentBugModal.bugUnsaved') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title={bug ? t('environmentBugModal.bugEdit') : t('environmentBugModal.bugCreate')} onClose={onClose}>
      <form className="environment-bug-form" onSubmit={handleSubmit}>
        <div className="environment-bug-form__grid">
          <label>
            <span>{t('environmentBugModal.related')}</span>
            <input type="text" value={scenarioLabel} readOnly disabled />
          </label>
          <label>
            <span>{t('environmentBugModal.status')}</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as EnvironmentBugStatus)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span>{t('environmentBugModal.title')}</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder={t('environmentBugModal.problem')}
          />
        </label>
        <label>
          <span>{t('environmentBugModal.description')}</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('environmentBugModal.bugDescription')}
          />
        </label>
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            loadingText={t('saving')}
          >
            {bug ? t('saveChanges') : t('environmentBugModal.bugCreate')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
