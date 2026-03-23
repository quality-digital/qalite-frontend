import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  label?: string;
}

export const LoadingSpinner = ({
  size = 'medium',
  fullScreen = false,
  label,
}: LoadingSpinnerProps) => {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('common.loading');
  const sizeClass = `loading-spinner--${size}`;
  const containerClass = fullScreen ? 'loading-spinner-container--fullscreen' : '';

  return (
    <div className={`loading-spinner-container ${containerClass}`} role="status" aria-live="polite">
      <div className={`loading-spinner ${sizeClass}`}>
        <div className="loading-spinner__ring"></div>
        <div className="loading-spinner__ring"></div>
        <div className="loading-spinner__ring"></div>
      </div>
      {resolvedLabel && <p className="loading-spinner__label">{resolvedLabel}</p>}
    </div>
  );
};
