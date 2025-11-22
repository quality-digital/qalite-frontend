import { ChangeEvent, useState } from 'react';

import { EyeIcon, EyeSlashIcon } from './icons';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  dataTestId?: string;
}

export const PasswordInput = ({
  id,
  label,
  value,
  onChange = () => {},
  required = false,
  placeholder,
  disabled = false,
  readOnly = false,
  autoComplete,
  dataTestId,
}: PasswordInputProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const toggleVisibility = () => setIsVisible((previous) => !previous);
  const fieldClassName = `password-field${disabled ? ' password-field--disabled' : ''}`;

  return (
    <label htmlFor={id} className="field">
      <span className="field-label">{label}</span>
      <div className={fieldClassName}>
        <input
          id={id}
          name={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
          className="password-field-input"
          data-testid={dataTestId}
        />
        <button
          type="button"
          className="password-field-toggle"
          onClick={toggleVisibility}
          aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={isVisible}
          disabled={disabled}
        >
          {isVisible ? (
            <EyeSlashIcon aria-hidden className="icon" />
          ) : (
            <EyeIcon aria-hidden className="icon" />
          )}
        </button>
      </div>
    </label>
  );
};
