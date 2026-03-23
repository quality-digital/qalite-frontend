import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface PasswordStrengthIndicatorProps {
  password: string;
  showLabel?: boolean;
}

interface StrengthResult {
  score: number;
  labelKey: string;
  color: string;
  percentage: number;
  requirements: {
    hasMinLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

const MIN_PASSWORD_LENGTH = 8;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+=[\]{};':"|,.<>?-]/;

export const usePasswordStrength = (password: string): StrengthResult => {
  return useMemo(() => {
    const requirements = {
      hasMinLength: password.length >= MIN_PASSWORD_LENGTH,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: SPECIAL_CHAR_REGEX.test(password),
    };

    const metRequirements = Object.values(requirements).filter(Boolean).length;
    const score = Math.min(metRequirements, 4);

    let labelKey = 'passwordStrength.veryWeak';
    let color = 'var(--color-danger)';

    if (score === 0) {
      labelKey = 'passwordStrength.veryWeak';
      color = 'var(--color-danger)';
    } else if (score === 1) {
      labelKey = 'passwordStrength.weak';
      color = 'var(--color-danger)';
    } else if (score === 2) {
      labelKey = 'passwordStrength.fair';
      color = 'var(--color-warning)';
    } else if (score === 3) {
      labelKey = 'passwordStrength.strong';
      color = 'var(--color-success)';
    } else if (score === 4) {
      labelKey = 'passwordStrength.veryStrong';
      color = 'var(--color-success)';
    }

    return {
      score,
      labelKey,
      color,
      percentage: (metRequirements / 5) * 100,
      requirements,
    };
  }, [password]);
};

export const PasswordStrengthIndicator = ({
  password,
  showLabel = true,
}: PasswordStrengthIndicatorProps) => {
  const strength = usePasswordStrength(password);
  const { t } = useTranslation();

  if (!password) {
    return null;
  }

  return (
    <div className="password-strength">
      <div className="password-strength__bar">
        <div
          className="password-strength__bar-fill"
          style={{
            width: `${strength.percentage}%`,
            backgroundColor: strength.color,
          }}
          aria-hidden
        />
      </div>

      {showLabel && (
        <div className="password-strength__info">
          <span className="password-strength__label" style={{ color: strength.color }}>
            {t(strength.labelKey)}
          </span>
        </div>
      )}

      <ul className="password-strength__requirements">
        <li
          className={`password-strength__requirement ${
            strength.requirements.hasMinLength ? 'password-strength__requirement--met' : ''
          }`}
        >
          <span className="requirement-check">
            {strength.requirements.hasMinLength ? '✓' : '○'}
          </span>
          {t('passwordStrength.requirements.minLength', { count: MIN_PASSWORD_LENGTH })}
        </li>
        <li
          className={`password-strength__requirement ${
            strength.requirements.hasUppercase ? 'password-strength__requirement--met' : ''
          }`}
        >
          <span className="requirement-check">
            {strength.requirements.hasUppercase ? '✓' : '○'}
          </span>
          {t('passwordStrength.requirements.uppercase')}
        </li>
        <li
          className={`password-strength__requirement ${
            strength.requirements.hasLowercase ? 'password-strength__requirement--met' : ''
          }`}
        >
          <span className="requirement-check">
            {strength.requirements.hasLowercase ? '✓' : '○'}
          </span>
          {t('passwordStrength.requirements.lowercase')}
        </li>
        <li
          className={`password-strength__requirement ${
            strength.requirements.hasNumber ? 'password-strength__requirement--met' : ''
          }`}
        >
          <span className="requirement-check">{strength.requirements.hasNumber ? '✓' : '○'}</span>
          {t('passwordStrength.requirements.number')}
        </li>
        <li
          className={`password-strength__requirement ${
            strength.requirements.hasSpecialChar ? 'password-strength__requirement--met' : ''
          }`}
        >
          <span className="requirement-check">
            {strength.requirements.hasSpecialChar ? '✓' : '○'}
          </span>
          {t('passwordStrength.requirements.special')}
        </li>
      </ul>
    </div>
  );
};
