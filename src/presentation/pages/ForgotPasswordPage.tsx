import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';

interface FeedbackState {
  message: string;
  isSuccess: boolean;
}

export const ForgotPasswordPage = () => {
  const { resetPassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!email) {
      setFeedback({ message: 'Informe o e-mail cadastrado.', isSuccess: false });
      return;
    }

    try {
      await resetPassword(email);
      setFeedback({
        message: 'Verifique seu e-mail para redefinir a senha.',
        isSuccess: true,
      });
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : 'Não foi possível enviar o link de recuperação. Tente novamente.';
      setFeedback({ message, isSuccess: false });
    }
  };

  return (
    <AuthLayout
      title="Recupere seu acesso"
      hideHeader
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
          className={`form-message ${feedback.isSuccess ? 'form-message--success' : 'form-message--error'}`}
        >
          {feedback.message}
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
