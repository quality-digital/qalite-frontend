import { ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { Organization } from '../../domain/entities/Organization';
import { organizationService } from '../../services';
import { useAuth } from '../hooks/useAuth';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Button } from './Button';
import { UserAvatar } from './UserAvatar';
import { LogoutIcon, UserIcon } from './icons';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const { activeOrganization } = useOrganizationBranding();
  const navigate = useNavigate();
  const displayName = user?.displayName || user?.email || '';
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchOrganization = async () => {
      if (!user?.organizationId) {
        setOrganization(null);
        return;
      }

      setIsLoadingOrganization(true);
      try {
        const data = await organizationService.getById(user.organizationId);
        if (isMounted) {
          setOrganization(data);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setOrganization(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingOrganization(false);
        }
      }
    };

    void fetchOrganization();

    return () => {
      isMounted = false;
    };
  }, [user?.organizationId]);

  const brandSource = activeOrganization ?? organization;
  const brandName = brandSource?.name || 'QaLite';
  const brandLogo = brandSource?.logoUrl || null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand" aria-label={`Página inicial da ${brandName}`}>
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={`Logo da ${brandName}`}
              className="app-brand-logo"
              aria-hidden={isLoadingOrganization}
            />
          ) : (
            <span className="app-logo">{brandName}</span>
          )}
          {brandSource?.name && <span className="app-brand-name">{brandSource.name}</span>}
        </Link>
        <nav className="header-actions">
          {user ? (
            <div className="header-user">
              <div className="header-user-info">
                <UserAvatar name={displayName} photoURL={user.photoURL} size="sm" />
                <div className="user-context">
                  <span className="user-greeting">Olá,</span>
                  <span className="user-name">{displayName}</span>
                  <span className="user-role">
                    {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                  </span>
                </div>
              </div>
              <div className="header-user-actions">
                <button
                  type="button"
                  className="header-profile"
                  onClick={() => navigate('/profile')}
                >
                  <UserIcon aria-hidden className="icon" />
                  <span>Perfil</span>
                </button>
                <Button type="button" variant="ghost" onClick={() => void logout()}>
                  <LogoutIcon aria-hidden className="icon" />
                  Sair
                </Button>
              </div>
            </div>
          ) : (
            <div className="header-auth">
              <Link to="/login" className="text-link">
                Entrar
              </Link>
              <Button type="button" onClick={() => navigate('/register')}>
                Criar conta
              </Button>
            </div>
          )}
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
};
