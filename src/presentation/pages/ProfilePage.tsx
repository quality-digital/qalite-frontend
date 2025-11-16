import { ChangeEvent, FormEvent, useEffect, useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import { Alert } from '../components/Alert';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { TextInput } from '../components/TextInput';
import { ThemeToggle } from '../components/ThemeToggle';
import { UserAvatar } from '../components/UserAvatar';
import { ThemeIcon } from '../components/icons';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

export const ProfilePage = () => {
  const { user, updateProfile, isLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setPhoneNumber(user?.phoneNumber ?? '');
  }, [user?.firstName, user?.lastName, user?.phoneNumber]);

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
    [photoPreview],
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

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedPhoneNumber = phoneNumber.trim();

    if (!trimmedFirstName) {
      setLocalError('Informe seu nome para continuar.');
      return;
    }

    if (!trimmedLastName) {
      setLocalError('Informe seu sobrenome para continuar.');
      return;
    }

    try {
      await updateProfile({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        phoneNumber: trimmedPhoneNumber,
        photoFile,
      });
      setPhotoFile(null);
    } catch (err) {
      console.error(err);
    }
  };

  const fullName = `${firstName} ${lastName}`.trim() || user?.displayName || user?.email || '';

  return (
    <Layout>
      <section className="card profile-card">
        <div className="profile-toolbar">
          <BackButton label="Voltar" />
          <div className="profile-theme">
            <ThemeIcon aria-hidden className="icon" />
            <span>Modo de exibição</span>
            <ThemeToggle />
          </div>
        </div>

        <span className="badge">Seu perfil</span>
        <h1 className="section-title">Atualize suas informações pessoais</h1>
        <p className="section-subtitle">
          Ajuste nome e foto de perfil e veja as mudanças refletidas imediatamente em todos os seus
          acessos.
        </p>

        {localError && <Alert type="error" message={localError} />}

        <form className="profile-editor" onSubmit={handleSubmit}>
          <div className="profile-header">
            <UserAvatar name={fullName} photoURL={photoPreview || undefined} />
            <label className="upload-label">
              <span>Foto de perfil</span>
              <span className="upload-trigger">Selecionar nova foto</span>
              <input
                className="upload-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
              <span className="upload-hint">Formatos suportados: JPG, PNG ou WEBP (até 5MB).</span>
            </label>
          </div>

          <TextInput
            id="firstName"
            label="Nome"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />

          <TextInput
            id="lastName"
            label="Sobrenome"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />

          <TextInput
            id="phoneNumber"
            label="Telefone"
            type="tel"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
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
