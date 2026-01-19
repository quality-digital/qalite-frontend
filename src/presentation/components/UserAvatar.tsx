import { useTranslation } from 'react-i18next';

interface UserAvatarProps {
  name: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

const getInitials = (name: string) => {
  if (!name) return '?';
  const [first, second] = name.split(' ');
  return ((first?.[0] ?? '') + (second?.[0] ?? '')).toUpperCase() || name[0].toUpperCase();
};

export const UserAvatar = ({ name, size = 'md', onClick }: UserAvatarProps) => {
  const { t } = useTranslation();
  const dimension = size === 'sm' ? '2.5rem' : '3rem';
  const renderContent = () => <span className="avatar-fallback">{getInitials(name)}</span>;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="avatar avatar-interactive"
        style={{ width: dimension, height: dimension }}
        aria-label={t('userAvatar.openProfile')}
      >
        {renderContent()}
      </button>
    );
  }

  return (
    <div
      className="avatar"
      style={{ width: dimension, height: dimension }}
      role="img"
      aria-label={t('userAvatar.avatarLabel', { name })}
    >
      {renderContent()}
    </div>
  );
};
