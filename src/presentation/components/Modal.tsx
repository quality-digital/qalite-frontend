import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  bodyClassName?: string;
}

export const Modal = ({
  isOpen,
  title,
  description,
  onClose,
  children,
  bodyClassName,
}: ModalProps) => {
  const { t } = useTranslation();
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal" role="document">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            {description && <p className="modal-description">{description}</p>}
          </div>
          <button
            type="button"
            className="modal-close"
            aria-label={t('modal.close')}
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className={['modal-body', bodyClassName].filter(Boolean).join(' ')}>{children}</div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
};
