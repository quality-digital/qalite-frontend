import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { PasswordInput } from '../components/PasswordInput';
import { ALLOWED_EMAIL_DOMAINS_LABEL } from '../../shared/config/auth';
import { isAllowedEmailDomain } from '../../shared/utils/email';

const MIN_PASSWORD_LENGTH = 8;

export const RegisterPage = () => {
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
      setFormError('Todos os campos são obrigatórios.');
      return;
    }

    const emailRegex = /[^@\s]+@[^@\s]+\.[^@\s]+/;
    if (!emailRegex.test(normalizedEmail)) {
      setFormError('Informe um e-mail válido.');
      return;
    }

    if (!isAllowedEmailDomain(normalizedEmail)) {
      setFormError(`Utilize um e-mail corporativo (${ALLOWED_EMAIL_DOMAINS_LABEL}).`);
      return;
    }

    if (!isPasswordStrong) {
      setFormError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    if (password !== confirmPassword) {
      setFormError('As senhas não conferem.');
      return;
    }

    try {
      await register({ email: normalizedEmail, password, displayName: normalizedDisplayName });
      navigate('/');
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Não foi possível criar sua conta. Tente novamente.';
      setFormError(message);
    }
  };

  return (
    <AuthLayout
      title="Crie sua conta"
      hideHeader
      footer={
        <div className="auth-links">
          <span>
            Já tem conta? <Link to="/login">Entre com suas credenciais</Link>
          </span>
        </div>
      }
    >
      {formError && <p className="form-message form-message--error">{formError}</p>}
      <form className="form-grid" onSubmit={handleSubmit} data-testid="register-form">
        <TextInput
          id="displayName"
          label="Nome completo"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
          dataTestId="register-name"
        />
        <TextInput
          id="email"
          label="E-mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          dataTestId="register-email"
        />
        <p className="form-hint">Use um e-mail corporativo ({ALLOWED_EMAIL_DOMAINS_LABEL}).</p>
        <PasswordInput
          id="password"
          label="Senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="new-password"
          dataTestId="register-password"
        />
        <PasswordInput
          id="confirmPassword"
          label="Confirme a senha"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          autoComplete="new-password"
          dataTestId="register-confirm-password"
        />
        <p className={`form-hint ${isPasswordStrong ? 'form-hint--success' : 'form-hint--danger'}`}>
          Senha com no mínimo {MIN_PASSWORD_LENGTH} caracteres.
        </p>
        <Button
          type="submit"
          isLoading={isLoading}
          loadingText="Criando conta..."
          data-testid="register-submit"
        >
          Cadastrar
        </Button>
      </form>
    </AuthLayout>
  );
};
