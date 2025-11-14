import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  loadingText?: string;
}

export const Button = ({
  variant = 'primary',
  children,
  isLoading = false,
  loadingText,
  disabled,
  ...props
}: ButtonProps) => {
  const classes: Record<typeof variant, string> = {
    primary: 'button button-primary',
    secondary: 'button button-secondary',
    ghost: 'button button-ghost'
  };

  return (
    <button className={`${classes[variant]}${isLoading ? ' button-loading' : ''}`} disabled={disabled || isLoading} {...props}>
      {isLoading && <span className="button-spinner" aria-hidden />}
      <span className="button-label">{isLoading ? loadingText ?? children : children}</span>
    </button>
  );
};
