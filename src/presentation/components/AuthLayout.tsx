import { ReactNode } from 'react';

import { ThemeToggle } from './ThemeToggle';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  accentTitle?: string;
  accentDescription?: string;
  accentItems?: string[];
}

export const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  accentTitle = 'Tudo o que você precisa para começar',
  accentDescription = 'Fluxos rápidos, autenticação segura e uma interface feita para ser intuitiva em qualquer dispositivo.',
  accentItems
}: AuthLayoutProps) => (
  <div className="auth-page">
    <header className="auth-page__topbar">
      <span className="auth-page__brand">QaLite</span>
      <ThemeToggle />
    </header>
    <div className="auth-page__body">
      <section className="auth-page__accent">
        <h1>{accentTitle}</h1>
        <p>{accentDescription}</p>
        {accentItems && accentItems.length > 0 && (
          <ul>
            {accentItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="auth-page__panel">
        <div className="auth-page__panel-header">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="auth-page__panel-content">{children}</div>
        {footer && <div className="auth-page__panel-footer">{footer}</div>}
      </section>
    </div>
  </div>
);
