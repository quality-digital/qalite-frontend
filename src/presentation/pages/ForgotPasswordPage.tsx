import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';

interface FeedbackState {
  message: string;
  isSuccess: boolean;
}

export const ForgotPasswordPage = () => {
  const { t: translation } = useTranslation();
  const { resetPassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!email) {
      setFeedback({
        message: translation('forgotPassword.emptyEmail'),
        isSuccess: false,
      });
      return;
    }

    try {
      await resetPassword(email);
      setFeedback({
        message: translation('forgotPassword.success'),
        isSuccess: true,
      });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : translation('forgotPassword.error');

      setFeedback({ message, isSuccess: false });
    }
  };

  return (
    <AuthLayout
      title={translation('forgotPassword.title')}
      footer={
        <div className="auth-links">
          <span>
            {translation('forgotPassword.backToLogin')}{' '}
            <Link to="/login">{translation('forgotPassword.backToLoginLink')}</Link>
          </span>
        </div>
      }
    >
      {feedback && (
        <p
          className={`form-message ${
            feedback.isSuccess ? 'form-message--success' : 'form-message--error'
          }`}
        >
          {feedback.message}
        </p>
      )}

      <form className="form-grid" onSubmit={handleSubmit}>
        <TextInput
          id="email"
          label={translation('forgotPassword.emailLabel')}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <Button
          type="submit"
          isLoading={isLoading}
          loadingText={translation('forgotPassword.loading')}
        >
          {translation('forgotPassword.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
};
