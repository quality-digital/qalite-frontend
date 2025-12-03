import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { PasswordInput } from '../components/PasswordInput';

const MIN_PASSWORD_LENGTH = 8;

export const RegisterPage = () => {
  const { t: translation } = useTranslation();
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isPasswordStrong = useMemo(() => password.length >= MIN_PASSWORD_LENGTH, [password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const normalizedDisplayName = displayName.trim();
    const normalizedEmail = email.trim();

    if (!normalizedDisplayName || !normalizedEmail || !password || !confirmPassword) {
      setFormError(translation('registerPage.allFieldsRequired'));
      return;
    }

    const emailRegex = /[^@\s]+@[^@\s]+\.[^@\s]+/;
    if (!emailRegex.test(normalizedEmail)) {
      setFormError(translation('registerPage.invalidEmail'));
      return;
    }

    if (!isPasswordStrong) {
      setFormError(translation('registerPage.passwordTooShort', { min: MIN_PASSWORD_LENGTH }));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(translation('registerPage.passwordMismatch'));
      return;
    }

    try {
      await register({
        email: normalizedEmail,
        password,
        displayName: normalizedDisplayName,
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : translation('registerPage.genericError');
      setFormError(message);
    }
  };
  console.log(translation('registerPage.nameLabel'));
  return (
    <AuthLayout
      title={translation('registerPage.title')}
      footer={
        <div className="auth-links">
          <span>
            {translation('registerPage.haveAccount')}{' '}
            <Link to="/login">{translation('registerPage.loginHere')}</Link>
          </span>
        </div>
      }
    >
      {formError && <p className="form-message form-message--error">{formError}</p>}

      <form className="form-grid" onSubmit={handleSubmit} data-testid="register-form">
        <TextInput
          id="displayName"
          label={translation('registerPage.nameLabel')}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
          dataTestId="register-name"
        />

        <TextInput
          id="email"
          label={translation('registerPage.emailLabel')}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          dataTestId="register-email"
        />

        <p className="form-hint">{translation('registerPage.emailHint')}</p>

        <PasswordInput
          id="password"
          label={translation('registerPage.passwordLabel')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="new-password"
          dataTestId="register-password"
        />

        <PasswordInput
          id="confirmPassword"
          label={translation('registerPage.confirmPasswordLabel')}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          autoComplete="new-password"
          dataTestId="register-confirm-password"
        />

        <p className={`form-hint ${isPasswordStrong ? 'form-hint--success' : 'form-hint--danger'}`}>
          {translation('registerPage.passwordRule', { min: MIN_PASSWORD_LENGTH })}
        </p>

        <Button
          type="submit"
          isLoading={isLoading}
          loadingText={translation('registerPage.loading')}
          data-testid="register-submit"
        >
          {translation('registerPage.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
};
