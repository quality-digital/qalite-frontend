import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
}

export const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  message = 'Você deseja mesmo excluir?',
  description,
  confirmText = 'Confirmar exclusão',
  cancelText = 'Cancelar',
  isConfirming = false,
}: ConfirmDeleteModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Confirmar exclusão" description={description}>
    <p>{message}</p>
    <div className="modal-actions">
      <Button type="button" variant="ghost" onClick={onClose} disabled={isConfirming}>
        {cancelText}
      </Button>
      <Button type="button" onClick={onConfirm} isLoading={isConfirming} loadingText="Excluindo...">
        {confirmText}
      </Button>
    </div>
  </Modal>
);
