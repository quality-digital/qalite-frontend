import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  heroLogo?: string;
  pageLabel?: string;
}

export const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  heroLogo = 'QAlite',
  pageLabel,
}: AuthLayoutProps) => {
  const { t } = useTranslation();
  const resolvedPageLabel = pageLabel ?? t('authPageLabels.login');

  return (
    <div className="auth-page">
      <div className="auth-page__hero">
        <div className="auth-page__hero-content">
          <div className="auth-page__hero-label">{resolvedPageLabel}</div>
          <div className="auth-page__hero-logo">{heroLogo}</div>
        </div>
      </div>

      <div className="auth-page__body">
        <section className="auth-page__panel">
          <div className="auth-page__panel-header">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="auth-page__panel-content">{children}</div>
          {footer && <div className="auth-page__panel-footer">{footer}</div>}
        </section>
      </div>
    </div>
  );
};
