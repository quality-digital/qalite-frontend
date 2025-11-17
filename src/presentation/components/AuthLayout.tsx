import { ReactNode } from 'react';

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
        <span className="auth-page__brand">QaLite</span>
      </header>
    )}
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
