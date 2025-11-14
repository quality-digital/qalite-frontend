import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../application/hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Informe e-mail e senha para continuar.');
      return;
    }

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthLayout
      title="Entre na sua conta"
      subtitle="Gerencie dashboards e mantenha seu time sincronizado com segurança."
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
        <TextInput
          id="password"
          label="Senha"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" isLoading={isLoading} loadingText="Autenticando...">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
};
