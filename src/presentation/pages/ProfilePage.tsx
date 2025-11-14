import { ChangeEvent, FormEvent, useEffect, useState } from 'react';

import { useAuth } from '../../application/hooks/useAuth';
import { Alert } from '../components/Alert';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { TextInput } from '../components/TextInput';
import { ThemeToggle } from '../components/ThemeToggle';
import { UserAvatar } from '../components/UserAvatar';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

export const ProfilePage = () => {
  const { user, updateProfile, isLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(user?.photoURL ?? null);
    }
  }, [user?.photoURL, photoFile]);

  useEffect(
    () => () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    },
    [photoPreview]
  );

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(user?.photoURL ?? null);
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setLocalError('Selecione uma imagem de até 5MB.');
      return;
    }

    setLocalError(null);
    setPhotoFile(file);
    setPhotoPreview((previous) => {
      if (previous && previous.startsWith('blob:')) {
        URL.revokeObjectURL(previous);
      }
      return URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!displayName.trim()) {
      setLocalError('Informe um nome para continuar.');
      return;
    }

    try {
      await updateProfile({ displayName: displayName.trim(), photoFile });
      setPhotoFile(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout>
      <section className="card profile-card">
        <div className="profile-toolbar">
          <BackButton label="Voltar" />
          <div className="profile-theme">
            <span>Modo de exibição</span>
            <ThemeToggle />
          </div>
        </div>

        <span className="badge">Seu perfil</span>
        <h1 className="section-title">Atualize suas informações pessoais</h1>
        <p className="section-subtitle">
          Ajuste nome e foto de perfil e veja as mudanças refletidas imediatamente em todos os seus acessos.
        </p>

        {localError && <Alert type="error" message={localError} />}

        <form className="profile-editor" onSubmit={handleSubmit}>
          <div className="profile-header">
            <UserAvatar name={displayName || user?.email || ''} photoURL={photoPreview || undefined} />
            <label className="upload-label">
              <span>Foto de perfil</span>
              <span className="upload-trigger">Selecionar nova foto</span>
              <input className="upload-input" type="file" accept="image/*" onChange={handlePhotoChange} />
              <span className="upload-hint">Formatos suportados: JPG, PNG ou WEBP (até 5MB).</span>
            </label>
          </div>

          <TextInput
            id="displayName"
            label="Nome"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />

          <TextInput
            id="email"
            label="E-mail"
            type="email"
            value={user?.email ?? ''}
            onChange={() => {}}
            readOnly
            disabled
          />

          <Button type="submit" isLoading={isLoading} loadingText="Salvando...">
            Salvar alterações
          </Button>
        </form>
      </section>
    </Layout>
  );
};
