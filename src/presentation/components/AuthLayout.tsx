import { ReactNode } from 'react';
import qliteLogo from '../assets/logo.png';

const DEFAULT_LOGO_PATH = qliteLogo;

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  hideHeader?: boolean;
}

export const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  hideHeader = false,
}: AuthLayoutProps) => (
  <div className="auth-page">
    {!hideHeader && (
      <header className="auth-page__topbar">
        <div className="auth-page__brand">
          <img src={DEFAULT_LOGO_PATH} alt="Logo QaLite" className="auth-page__brand-logo" />
        </div>
      </header>
    )}
    <div className="auth-page__body">
      <section className="auth-page__panel">
        <div className="auth-page__panel-brand">
          <img src={DEFAULT_LOGO_PATH} alt="Logo QaLite" className="auth-page__panel-logo" />
        </div>
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
