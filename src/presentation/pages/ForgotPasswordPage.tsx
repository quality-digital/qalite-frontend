import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';

export const ForgotPasswordPage = () => {
  const { resetPassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!email) {
      setFeedback('Informe o e-mail cadastrado.');
      return;
    }

    try {
      await resetPassword(email);
      setFeedback('Verifique seu e-mail para redefinir a senha.');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthLayout
      title="Recupere seu acesso"
      subtitle="Informe o e-mail cadastrado para receber um link seguro de redefinição."
      footer={
        <div className="auth-links">
          <span>
            Lembrou a senha? <Link to="/login">Voltar para login</Link>
          </span>
        </div>
      }
    >
      {feedback && (
        <p
          className={`form-message ${feedback.startsWith('Verifique') ? 'form-message--success' : 'form-message--error'}`}
        >
          {feedback}
        </p>
      )}
      <form className="form-grid" onSubmit={handleSubmit}>
        <TextInput
          id="email"
          label="E-mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Button type="submit" isLoading={isLoading} loadingText="Enviando...">
          Enviar link de recuperação
        </Button>
      </form>
    </AuthLayout>
  );
};
