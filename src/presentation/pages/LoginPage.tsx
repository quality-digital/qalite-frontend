import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { ALLOWED_EMAIL_DOMAINS_LABEL } from '../../shared/constants/auth';
import { isAllowedEmailDomain } from '../../shared/utils/email';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setFormError('Informe e-mail e senha para continuar.');
      return;
    }

    if (!isAllowedEmailDomain(normalizedEmail)) {
      setFormError(`Utilize um e-mail corporativo (${ALLOWED_EMAIL_DOMAINS_LABEL}).`);
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
      const message =
        err instanceof Error ? err.message : 'Não foi possível autenticar. Tente novamente.';
      setFormError(message);
    }
  };

  return (
    <AuthLayout
      title="Entre na sua conta"
      hideHeader
      footer={
        <div className="auth-links">
          <Link to="/forgot-password">Esqueci minha senha</Link>
          <span>
            Ainda não tem conta? <Link to="/register">Crie agora</Link>
          </span>
        </div>
      }
    >
      {formError && <p className="form-message form-message--error">{formError}</p>}
      <form className="form-grid" onSubmit={handleSubmit}>
        <TextInput
          id="email"
          label="E-mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <p className="form-hint">Use um e-mail corporativo ({ALLOWED_EMAIL_DOMAINS_LABEL}).</p>
        <label htmlFor="password" className="field">
          <span className="field-label">Senha</span>
          <div className="field-input-wrapper">
            <input
              id="password"
              name="password"
              type={isPasswordVisible ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="field-input field-input--with-action"
            />
            <button
              type="button"
              className="field-input-action"
              onClick={() => setIsPasswordVisible((previous) => !previous)}
              aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {isPasswordVisible ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </label>
        <Button type="submit" isLoading={isLoading} loadingText="Autenticando...">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
};
