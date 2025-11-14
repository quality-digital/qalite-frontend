import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../application/hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';

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

    if (!displayName || !email || !password || !confirmPassword) {
      setFormError('Todos os campos são obrigatórios.');
      return;
    }

    const emailRegex = /[^@\s]+@[^@\s]+\.[^@\s]+/;
    if (!emailRegex.test(email)) {
      setFormError('Informe um e-mail válido.');
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
      await register({ email, password, displayName });
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Escolha um nome, defina uma senha forte e personalize sua experiência."
      footer={
        <div className="auth-links">
          <span>
            Já tem conta? <Link to="/login">Entre com suas credenciais</Link>
          </span>
        </div>
      }
    >
      {formError && <p className="form-message form-message--error">{formError}</p>}
      <form className="form-grid" onSubmit={handleSubmit}>
        <TextInput
          id="displayName"
          label="Nome completo"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
        <TextInput
          id="email"
          label="E-mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <TextInput
          id="password"
          label="Senha"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <TextInput
          id="confirmPassword"
          label="Confirme a senha"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
        <p className={`form-hint ${isPasswordStrong ? 'form-hint--success' : 'form-hint--danger'}`}>
          Senha com no mínimo {MIN_PASSWORD_LENGTH} caracteres.
        </p>
        <Button type="submit" isLoading={isLoading} loadingText="Criando conta...">
          Cadastrar
        </Button>
      </form>
    </AuthLayout>
  );
};
