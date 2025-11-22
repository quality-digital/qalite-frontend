import { ChangeEvent } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  required?: boolean;
  dataTestId?: string;
}

export const SelectInput = ({
  id,
  label,
  value,
  options,
  onChange = () => {},
  disabled = false,
  required = false,
  dataTestId,
}: SelectInputProps) => (
  <label htmlFor={id} className="field">
    <span className="field-label">{label}</span>
    <select
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className="field-input"
      data-testid={dataTestId}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);
