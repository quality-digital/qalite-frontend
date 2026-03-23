import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../hooks/useAuth';
import { useSequencedAnimation } from '../hooks/useMotion';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { PasswordInput } from '../components/PasswordInput';
import {
  PasswordStrengthIndicator,
  usePasswordStrength,
} from '../components/PasswordStrengthIndicator';
import { FormFieldError, FormFieldSuccess, FormMessage } from '../components/FormFieldMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LockIcon } from '../components/icons';

export const ResetPasswordPage = () => {
  const { t: translation } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyPasswordResetCode, confirmPasswordReset, isLoading } = useAuth();

  const code = searchParams.get('code');

  const { pageTransitionClass, showContent } = useSequencedAnimation({
    pageTransitionDuration: 250,
    contentDelay: 100,
  });

  const [stage, setStage] = useState<'verifying' | 'resetting' | 'success' | 'error'>('verifying');
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordStrength = usePasswordStrength(password);
  const isPasswordValid = passwordStrength.score >= 3 && passwordStrength.requirements.hasMinLength;
  const isPasswordsMatch = password === confirmPassword && password.length > 0;
  const isFormValid = isPasswordValid && isPasswordsMatch;

  useEffect(() => {
    if (!code) {
      setStage('error');
      setFormError(translation('resetPasswordPage.invalidCode'));
      return;
    }

    const verifyCode = async () => {
      try {
        setStage('verifying');
        const verifiedEmail = await verifyPasswordResetCode(code);
        setEmail(verifiedEmail);
        setStage('resetting');
      } catch (err) {
        console.error(err);
        setStage('error');
        const message =
          err instanceof Error ? err.message : translation('resetPasswordPage.verificationFailed');
        setFormError(message);
      }
    };

    verifyCode();
  }, [code, verifyPasswordResetCode, translation]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!isFormValid) {
      setFormError(translation('resetPasswordPage.invalidForm'));
      return;
    }

    if (!code) {
      setFormError(translation('resetPasswordPage.invalidCode'));
      return;
    }

    try {
      await confirmPasswordReset(code, password);
      setSuccessMessage(translation('resetPasswordPage.resetSuccess'));
      setStage('success');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : translation('resetPasswordPage.resetFailed');
      setFormError(message);
    }
  };

  if (stage === 'verifying' || isLoading) {
    return (
      <AuthLayout
        title={translation('resetPasswordPage.title')}
        heroLogo="QALite"
        pageLabel={translation('authPageLabels.login')}
      >
        <LoadingSpinner label={translation('resetPasswordPage.verifying')} />
      </AuthLayout>
    );
  }

  if (stage === 'error') {
    return (
      <div className={pageTransitionClass}>
        <AuthLayout
          title={translation('resetPasswordPage.title')}
          heroLogo="QALite"
          pageLabel={translation('authPageLabels.forgotPassword')}
        >
          <FormMessage
            type="error"
            message={
              <>
                {formError}
                <br />
                <Button
                  variant="ghost"
                  className="button--small"
                  onClick={() => navigate('/forgot-password')}
                  style={{ marginTop: '1rem' }}
                >
                  {translation('resetPasswordPage.backToForgot')}
                </Button>
              </>
            }
          />
        </AuthLayout>
      </div>
    );
  }

  if (stage === 'success') {
    return (
      <div className={`${pageTransitionClass} auth-page-transition--success`}>
        <AuthLayout
          title={translation('resetPasswordPage.title')}
          heroLogo="QALite"
          pageLabel={translation('authPageLabels.login')}
        >
          {showContent && (
            <>
              <FormFieldSuccess message={successMessage} />
              <p
                style={{
                  textAlign: 'center',
                  marginTop: '1rem',
                  fontSize: '0.9rem',
                  color: 'var(--color-text-muted)',
                  animation: 'fadeIn 350ms ease-out 500ms forwards',
                  opacity: 0,
                }}
              >
                {translation('resetPasswordPage.redirecting')}
              </p>
            </>
          )}
        </AuthLayout>
      </div>
    );
  }

  return (
    <div className={pageTransitionClass}>
      <AuthLayout
        title={translation('resetPasswordPage.title')}
        subtitle={email || undefined}
        heroLogo="QALite"
      >
        {showContent && (
          <>
            {formError && <FormFieldError message={formError} testId="reset-password-error" />}

            {successMessage && <FormFieldSuccess message={successMessage} />}

            <form className="form-grid" onSubmit={handleSubmit} data-testid="reset-password-form">
              <div className="auth-input-tip">
                <LockIcon className="icon" />
                {translation('resetPasswordPage.passwordTip', { min: 8 })}
              </div>

              <PasswordInput
                id="new-password"
                label={translation('resetPasswordPage.newPasswordLabel')}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFormError(null);
                }}
                required
                autoComplete="new-password"
                dataTestId="reset-password-new"
                disabled={isLoading}
              />

              {password && <PasswordStrengthIndicator password={password} showLabel={true} />}

              <PasswordInput
                id="confirm-password"
                label={translation('resetPasswordPage.confirmPasswordLabel')}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setFormError(null);
                }}
                required
                autoComplete="new-password"
                dataTestId="reset-password-confirm"
                disabled={isLoading}
              />

              {confirmPassword && !isPasswordsMatch && (
                <FormFieldError message={translation('resetPasswordPage.passwordMismatch')} />
              )}

              {confirmPassword && isPasswordsMatch && (
                <FormFieldSuccess message={translation('resetPasswordPage.passwordsMatch')} />
              )}

              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                isLoading={isLoading}
                data-testid="reset-password-submit"
                className="button--fullwidth"
              >
                {translation('resetPasswordPage.resetButton')}
              </Button>
            </form>
          </>
        )}
      </AuthLayout>
    </div>
  );
};
