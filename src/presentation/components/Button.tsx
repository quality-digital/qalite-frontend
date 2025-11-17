import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  loadingText?: string;
}

const BUTTON_VARIANT_CLASS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'button button-primary',
  secondary: 'button button-secondary',
  ghost: 'button button-ghost',
};

export const Button = ({
  variant = 'primary',
  children,
  isLoading = false,
  loadingText,
  disabled,
  className: customClassName,
  ...props
}: ButtonProps) => {
  const buttonClassName = [
    BUTTON_VARIANT_CLASS[variant],
    customClassName,
    isLoading ? 'button-loading' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={buttonClassName} disabled={disabled || isLoading} {...props}>
      {isLoading && <span className="button-spinner" aria-hidden />}
      <span className="button-label">{isLoading ? (loadingText ?? children) : children}</span>
    </button>
  );
};
