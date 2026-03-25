import { useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

const GoogleBrandIcon = () => (
  <svg viewBox="0 0 24 24" className="icon" aria-hidden="true" focusable="false">
    <path
      fill="#EA4335"
      d="M12 10.2v3.95h5.49c-.24 1.27-.96 2.35-2.05 3.08l3.31 2.56c1.93-1.78 3.04-4.39 3.04-7.49 0-.73-.07-1.43-.2-2.1H12z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 4.97-.9 6.63-2.44l-3.31-2.56c-.92.62-2.09.99-3.32.99-2.55 0-4.72-1.72-5.49-4.03l-3.42 2.64A10 10 0 0012 22z"
    />
    <path
      fill="#FBBC05"
      d="M6.51 13.96A6.02 6.02 0 016.2 12c0-.68.12-1.35.31-1.96L3.09 7.4A10 10 0 002 12c0 1.61.39 3.13 1.09 4.6l3.42-2.64z"
    />
    <path
      fill="#4285F4"
      d="M12 5.98c1.47 0 2.79.51 3.83 1.51l2.88-2.88C16.96 2.98 14.7 2 12 2A10 10 0 003.09 7.4l3.42 2.64C7.28 7.7 9.45 5.98 12 5.98z"
    />
  </svg>
);

export const SocialAuthButtons = () => {
  const navigate = useNavigate();
  const { isLoading, loginWithGithub, loginWithGoogle } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<'github' | 'google' | null>(null);

  const redirectAfterAuth = (role?: string, organizationId?: string | null) => {
    if (role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    if (organizationId) {
      navigate('/dashboard', { replace: true });
      return;
    }

    navigate('/no-organization', { replace: true });
  };

  const handleGithubLogin = async () => {
    setLoadingProvider('github');
    try {
      const user = await loginWithGithub();
      redirectAfterAuth(user.role, user.organizationId);
    } catch (error) {
      console.error('GitHub login error:', error);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingProvider('google');
    try {
      const user = await loginWithGoogle();
      redirectAfterAuth(user.role, user.organizationId);
    } catch (error) {
      console.error('Google login error:', error);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="social-auth">
      <div className="social-auth-label">Ou continuar com</div>
      <div className="social-auth-buttons">
        <button
          type="button"
          className={`social-btn social-btn--github ${
            loadingProvider === 'github' ? 'is-loading' : ''
          }`}
          onClick={handleGithubLogin}
          disabled={isLoading || loadingProvider !== null}
          aria-label="Login com GitHub"
        >
          <FaGithub className="icon" />
          <span>GitHub</span>
        </button>
        <button
          type="button"
          className={`social-btn social-btn--google ${
            loadingProvider === 'google' ? 'is-loading' : ''
          }`}
          onClick={handleGoogleLogin}
          disabled={isLoading || loadingProvider !== null}
          aria-label="Login com Google"
        >
          <GoogleBrandIcon />
          <span>Google</span>
        </button>
      </div>
    </div>
  );
};
