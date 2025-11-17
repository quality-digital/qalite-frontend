import { useEffect, useState } from 'react';

interface UserAvatarProps {
  name: string;
  photoURL?: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

const getInitials = (name: string) => {
  if (!name) return '?';
  const [first, second] = name.split(' ');
  return ((first?.[0] ?? '') + (second?.[0] ?? '')).toUpperCase() || name[0].toUpperCase();
};

export const UserAvatar = ({ name, photoURL, size = 'md', onClick }: UserAvatarProps) => {
  const dimension = size === 'sm' ? '2.5rem' : '3rem';
  const [hasImageError, setHasImageError] = useState(false);
  const shouldShowImage = Boolean(photoURL) && !hasImageError;

  useEffect(() => {
    setHasImageError(false);
  }, [photoURL]);

  const renderContent = () =>
    shouldShowImage ? (
      <img
        src={photoURL}
        alt={name}
        className="avatar-image"
        loading="lazy"
        onError={() => setHasImageError(true)}
      />
    ) : (
      <span className="avatar-fallback">{getInitials(name)}</span>
    );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="avatar avatar-interactive"
        style={{ width: dimension, height: dimension }}
        aria-label="Abrir perfil"
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
      aria-label={`Avatar de ${name}`}
    >
      {renderContent()}
    </div>
  );
};
