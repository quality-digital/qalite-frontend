import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import appLogo from '../assets/logo.png';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  heroLogo?: string;
  pageLabel?: string;
}

export const AuthLayout = ({ title, subtitle, children, footer, pageLabel }: AuthLayoutProps) => {
  const { t } = useTranslation();
  const resolvedPageLabel = pageLabel ?? t('authPageLabels.login');

  return (
    <div className="auth-page">
      <div className="auth-page__hero">
        <div className="auth-page__hero-content">
          <div className="auth-page__hero-brand-card">
            <div className="auth-page__hero-logo auth-page__hero-logo--brand">
              <img src={appLogo} alt="qalite" className="auth-page__hero-logo-image" />
            </div>
            <span className="auth-page__hero-page-label">{resolvedPageLabel}</span>
          </div>
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
