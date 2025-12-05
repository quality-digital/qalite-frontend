import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Environment } from '../../../domain/entities/environment';
import { environmentService } from '../../../application/use-cases/EnvironmentUseCase';
import { Button } from '../Button';
import { Modal } from '../Modal';

interface DeleteEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: Environment | null;
  onDeleted?: () => void;
}

export const DeleteEnvironmentModal = ({
  isOpen,
  onClose,
  environment,
  onDeleted,
}: DeleteEnvironmentModalProps) => {
  const { t: translation } = useTranslation();

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!environment) {
      return;
    }

    setError(null);
    setIsDeleting(true);
    try {
      await environmentService.delete(environment.id);
      onDeleted?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError(translation('deleteEnvironmentModal.deleteEnvironmentError'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={translation('deleteEnvironmentModal.deleteEnvironment')}
    >
      {error && <p className="form-message form-message--error">{error}</p>}

      <p>
        {translation('deleteEnvironmentModal.deleteEnvironmentWarning')}{' '}
        <strong>
          {environment?.identificador ?? translation('deleteEnvironmentModal.noIdentifier')}
        </strong>
        ?
      </p>
      <div className="modal-actions">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={isDeleting}
          data-testid="cancel-delete-environment"
        >
          {translation('deleteEnvironmentModal.cancel')}
        </Button>

        <Button
          type="button"
          onClick={handleDelete}
          isLoading={isDeleting}
          loadingText={translation('deleteEnvironmentModal.deleting')}
          data-testid="confirm-delete-environment"
        >
          {translation('deleteEnvironmentModal.confirmDelete')}
        </Button>
      </div>
    </Modal>
  );
};
