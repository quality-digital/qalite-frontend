import { ButtonHTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export const BackButton = ({ label = 'Voltar', onClick, ...props }: BackButtonProps) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="back-button"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          navigate(-1);
        }
      }}
      {...props}
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  );
};
