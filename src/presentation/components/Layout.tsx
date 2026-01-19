import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Button } from './Button';
import { UserAvatar } from './UserAvatar';
import { LogoutIcon } from './icons';
import qliteLogo from '../assets/logo.png';
import { useTranslation } from 'react-i18next';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const { activeOrganization } = useOrganizationBranding();
  const navigate = useNavigate();
  const displayName = user?.displayName || user?.email || '';
  const brandSource = activeOrganization;
  const { t } = useTranslation();
  const brandName = brandSource?.name || t('app.brandName');
  const brandLogo = qliteLogo;

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand" aria-label={t('layout.homeAriaLabel', { brandName })}>
          <img
            src={brandLogo}
            alt={t('layout.brandLogoAlt', { brandName })}
            className="app-brand-logo"
          />
          <span className="app-brand-name">{brandSource?.name || brandName}</span>
        </Link>
        <nav className="header-actions">
          {user ? (
            <div className="header-user">
              <div className="header-user-actions">
                <button
                  type="button"
                  className="header-profile"
                  onClick={() => navigate('/profile')}
                >
                  <UserAvatar name={displayName} size="sm" />
                  <span>{t('profile')}</span>
                </button>
                <Button type="button" variant="ghost" onClick={() => void logout()}>
                  <LogoutIcon aria-hidden className="icon" />
                  {t('logout')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="header-auth">
              <Link to="/login" className="text-link">
                {t('login')}
              </Link>
              <Button type="button" onClick={() => navigate('/register')}>
                {t('register')}
              </Button>
            </div>
          )}
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
};
