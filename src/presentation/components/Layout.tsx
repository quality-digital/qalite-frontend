import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Button } from './Button';
import { UserAvatar } from './UserAvatar';
import { LogoutIcon, UserIcon } from './icons';
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
  const brandName = brandSource?.name || 'QaLite';
  const brandLogo = qliteLogo;

  const { t } = useTranslation();
  const { i18n } = useTranslation();

  function changeLang(lang) {
    i18n.changeLanguage(lang);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand" aria-label={`Página inicial da ${brandName}`}>
          <img src={brandLogo} alt="Logo da QaLite" className="app-brand-logo" />
          <span className="app-brand-name">{brandSource?.name || brandName}</span>
        </Link>
        <nav className="header-actions">
          {user ? (
            <div className="header-user">
              <div className="header-user-info">
                <UserAvatar name={displayName} photoURL={user.photoURL} size="sm" />
                <div className="user-context">
                  <span className="user-greeting">{t('greeting')},</span>
                  <span className="user-name">{displayName}</span>
                  <span className="user-role">
                  {user.role === "admin" ? t("roleAdmin") : t("roleUser")}
                  </span>
                </div>
              </div>
              <select className="language-switch" onChange={(e) => changeLang(e.target.value)} value={i18n.language}>
                <option value="pt">Pt 🇧🇷</option>
                <option value="en">En 🇺🇸 </option>
              </select>
              <div className="header-user-actions">
                <button
                  type="button"
                  className="header-profile"
                  onClick={() => navigate('/profile')}
                >
                  <UserIcon aria-hidden className="icon" />
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
                {t("login")}
              </Link>
              <Button type="button" onClick={() => navigate('/register')}>
                {t("register")}
              </Button>
            </div>
          )}
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
};

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  function changeLang(lang) {
    i18n.changeLanguage(lang);
  }

  return (
    <select onChange={(e) => changeLang(e.target.value)} value={i18n.language}>
      <option value="pt">🇧🇷 Português</option>
      <option value="en">🇺🇸 English</option>
    </select>
  );
}
