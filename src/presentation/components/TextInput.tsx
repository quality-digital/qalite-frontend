import { ChangeEvent } from 'react';

interface TextInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  min?: number;
  max?: number;
  step?: number;
  dataTestId?: string;
}

export const TextInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange = () => {},
  required = false,
  placeholder,
  disabled = false,
  readOnly = false,
  autoComplete,
  min,
  max,
  step,
  dataTestId,
}: TextInputProps) => (
  <label htmlFor={id} className="field">
    <span className="field-label">{label}</span>
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      autoComplete={autoComplete}
      min={min}
      max={max}
      step={step}
      className="field-input"
      data-testid={dataTestId}
    />
  </label>
);
