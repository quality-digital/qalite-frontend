import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../application/hooks/useAuth';
import { Button } from './Button';
import { UserAvatar } from './UserAvatar';
import { LogoutIcon, UserIcon } from './icons';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.displayName || user?.email || '';

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand">
          <span className="app-logo">QaLite</span>
          <span className="app-brand-subtitle">Auth Experience</span>
        </Link>
        <nav className="header-actions">
          {user ? (
            <div className="header-user">
              <div className="header-user-info">
                <UserAvatar name={displayName} photoURL={user.photoURL} size="sm" />
                <div className="user-context">
                  <span className="user-greeting">Olá,</span>
                  <span className="user-name">{displayName}</span>
                  <span className="user-role">{user.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                </div>
              </div>
              <div className="header-user-actions">
                <button type="button" className="header-profile" onClick={() => navigate('/profile')}>
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
