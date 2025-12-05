import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { PasswordInput } from '../components/PasswordInput';

export const LoginPage = () => {
  const { t: translation } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setFormError(translation('loginPage.fieldRequired'));
      return;
    }

    try {
      const authenticatedUser = await login(normalizedEmail, password);

      if (authenticatedUser.role === 'admin') {
        navigate('/admin', { replace: true });
        return;
      }

      if (authenticatedUser.organizationId) {
        navigate('/dashboard', { replace: true });
        return;
      }

      navigate('/no-organization', { replace: true });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : translation('loginPage.genericError');
      setFormError(message);
    }
  };

  return (
    <AuthLayout
      title={translation('loginPage.title')}
      footer={
        <div className="auth-links">
          <Link to="/forgot-password">{translation('loginPage.forgotPassword')}</Link>
          <span>
            {translation('loginPage.noAccount')}{' '}
            <Link to="/register">{translation('loginPage.createNow')}</Link>
          </span>
        </div>
      }
    >
      {formError && <p className="form-message form-message--error">{formError}</p>}

      <form className="form-grid" onSubmit={handleSubmit} data-testid="login-form">
        <TextInput
          id="email"
          label={translation('loginPage.emailLabel')}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          dataTestId="login-email"
        />

        <p className="form-hint">{translation('loginPage.emailHint')}</p>

        <PasswordInput
          id="password"
          label={translation('loginPage.passwordLabel')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
          dataTestId="login-password"
        />

        <Button
          type="submit"
          isLoading={isLoading}
          loadingText={translation('loginPage.loading')}
          data-testid="login-submit"
        >
          {translation('loginPage.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
};
