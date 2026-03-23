import { useTranslation } from 'react-i18next';

interface PageLoaderProps {
  message?: string;
}

export const PageLoader = ({ message }: PageLoaderProps) => {
  const { t } = useTranslation();
  const resolvedMessage = message ?? t('common.loading');

  return (
    <div className="page-loading" role="status" aria-live="polite">
      <div className="page-loading__card">
        <span className="page-loading__spinner" aria-hidden="true" />
        <p className="page-loading__message">{resolvedMessage}</p>
      </div>
    </div>
  );
};
