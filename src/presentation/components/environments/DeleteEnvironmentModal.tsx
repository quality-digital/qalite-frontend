import { useState } from 'react';

import type { Environment } from '../../../domain/entities/Environment';
import { environmentService } from '../../../services';
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
      setError('Não foi possível excluir este ambiente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excluir ambiente">
      {error && <p className="form-message form-message--error">{error}</p>}
      <p>
        Esta ação é permanente. Deseja excluir o ambiente{' '}
        <strong>{environment?.identificador ?? 'sem identificador'}</strong>?
      </p>
      <div className="modal-actions">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isDeleting}>
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleDelete}
          isLoading={isDeleting}
          loadingText="Excluindo..."
        >
          Confirmar exclusão
        </Button>
      </div>
    </Modal>
  );
};
