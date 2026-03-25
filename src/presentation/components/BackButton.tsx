import { ButtonHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ArrowLeftIcon } from './icons';

interface BackButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export const BackButton = ({ label, onClick, ...props }: BackButtonProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const resolvedLabel = label ?? t('back');

  return (
    <button
      type="button"
      className="button button-secondary back-button"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          navigate(-1);
        }
      }}
      {...props}
    >
      <ArrowLeftIcon aria-hidden className="icon" />
      {resolvedLabel}
    </button>
  );
};
