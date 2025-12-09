import { Modal } from './Modal';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

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

const { t } = useTranslation();

export const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  message = t('confirmDeleteModal.message'),
  description,
  confirmText = t('confirmDeleteModal.confirmText'),
  cancelText = t('confirmDeleteModal.cancelText'),
  isConfirming = false,
}: ConfirmDeleteModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} title={t('confirmDeleteModal.confirmText')} description={description}>
    <p>{message}</p>
    <div className="modal-actions">
      <Button
        type="button"
        variant="ghost"
        onClick={onClose}
        disabled={isConfirming}
        data-testid="cancel-delete-button"
      >
        {cancelText}
      </Button>
      <Button
        type="button"
        onClick={onConfirm}
        isLoading={isConfirming}
        loadingText={t('confirmDeleteModal.loadingText')}
        data-testid="confirm-delete-button"
      >
        {confirmText}
      </Button>
    </div>
  </Modal>
);
