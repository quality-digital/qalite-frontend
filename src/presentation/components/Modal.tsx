import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export const Modal = ({ isOpen, title, description, onClose, children }: ModalProps) => {
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

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal" role="document">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            {description && <p className="modal-description">{description}</p>}
          </div>
          <button type="button" className="modal-close" aria-label="Fechar" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};
