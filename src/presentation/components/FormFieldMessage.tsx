import { ReactNode } from 'react';
import { XCircleIcon } from './icons';

interface FormFieldErrorProps {
  message: string | null | undefined;
  testId?: string;
}

export const FormFieldError = ({ message, testId }: FormFieldErrorProps) => {
  if (!message) return null;

  return (
    <div className="form-field-error" role="alert" aria-live="polite" data-testid={testId}>
      <XCircleIcon className="icon" aria-hidden />
      <span>{message}</span>
    </div>
  );
};

interface FormFieldSuccessProps {
  message: string | ReactNode;
  testId?: string;
}

export const FormFieldSuccess = ({ message, testId }: FormFieldSuccessProps) => {
  return (
    <div className="form-field-success" role="status" aria-live="polite" data-testid={testId}>
      <span className="success-icon">✓</span>
      <span>{message}</span>
    </div>
  );
};

interface FormMessageProps {
  type: 'error' | 'success' | 'info' | 'warning';
  message: ReactNode;
  testId?: string;
}

export const FormMessage = ({ type, message, testId }: FormMessageProps) => {
  const roleMap = {
    error: 'alert',
    success: 'status',
    info: 'status',
    warning: 'alert',
  };

  return (
    <div
      className={`form-message form-message--${type}`}
      role={roleMap[type]}
      aria-live="polite"
      data-testid={testId}
    >
      {message}
    </div>
  );
};
