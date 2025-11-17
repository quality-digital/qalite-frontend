interface PageLoaderProps {
  message?: string;
}

export const PageLoader = ({ message = 'Carregando...' }: PageLoaderProps) => (
  <div className="page-loading" role="status" aria-live="polite">
    <div className="page-loading__card">
      <span className="page-loading__spinner" aria-hidden="true" />
      <p className="page-loading__message">{message}</p>
    </div>
  </div>
);
