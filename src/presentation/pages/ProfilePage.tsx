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
import { useTranslation } from 'react-i18next';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

export const ProfilePage = () => {
  const { user, updateProfile, isLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [browserstackUsername, setBrowserstackUsername] = useState('');
  const [browserstackAccessKey, setBrowserstackAccessKey] = useState('');
  const [isBrowserstackSectionOpen, setIsBrowserstackSectionOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    const username = user?.browserstackCredentials?.username ?? '';
    const accessKey = user?.browserstackCredentials?.accessKey ?? '';
    setBrowserstackUsername(username);
    setBrowserstackAccessKey(accessKey);
    setIsBrowserstackSectionOpen(Boolean(username.trim() || accessKey.trim()));
  }, [
    user?.browserstackCredentials?.accessKey,
    user?.browserstackCredentials?.username,
    user?.firstName,
    user?.lastName,
  ]);

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
      setLocalError(t("profilePage.errorSize"));
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
    if (!trimmedFirstName) {
      setLocalError(t("profilePage.name"));
      return;
    }

    if (!trimmedLastName) {
      setLocalError(t("profilePage.lastname"));
      return;
    }

    const trimmedBrowserstackUsername = browserstackUsername.trim();
    const trimmedBrowserstackAccessKey = browserstackAccessKey.trim();
    const browserstackCredentials = isBrowserstackSectionOpen
      ? {
          username: trimmedBrowserstackUsername || undefined,
          accessKey: trimmedBrowserstackAccessKey || undefined,
        }
      : null;

    try {
      await updateProfile({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        photoFile,
        browserstackCredentials,
      });
      setPhotoFile(null);
      if (!isBrowserstackSectionOpen) {
        setBrowserstackUsername('');
        setBrowserstackAccessKey('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fullName = `${firstName} ${lastName}`.trim() || user?.displayName || user?.email || '';

  return (
    <Layout>
      <section className="card profile-card">
        <div className="profile-toolbar">
          <BackButton label={t('back')} />
          <div className="profile-theme">
            <ThemeIcon aria-hidden className="icon" />
            <span>{t('profilePage.displayMode')}</span>
            <ThemeToggle />
          </div>
        </div>

        <span className="badge">{t('profilePage.badge')}</span>
        <h1 className="section-title">{t('profilePage.title')}</h1>
        <p className="section-subtitle">
          {t('profilePage.subtitle')}
        </p>

        {localError && <Alert type="error" message={localError} />}

        <form className="profile-editor" onSubmit={handleSubmit}>
          <div className="profile-header">
            <UserAvatar name={fullName} photoURL={photoPreview || undefined} />
            <label className="upload-label">
              <span>{t('profilePage.photo')}</span>
              <span className="upload-trigger">{t('profilePage.newPhoto')}</span>
              <input
                className="upload-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
              <span className="upload-hint">{t('profilePage.formats')}</span>
            </label>
          </div>

          <TextInput
            id="firstName"
            label={t('name')}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />

          <TextInput
            id="lastName"
            label={t('lastName')}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
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

          <div className="collapsible-section">
            <div className="collapsible-section__header">
              <div className="collapsible-section__titles">
                <img
                  className="collapsible-section__icon"
                  src="https://img.icons8.com/color/48/browser-stack.png"
                  alt="BrowserStack"
                />
                <p className="collapsible-section__title">{t('profilePage.browserstackTitle')}</p>
                <p className="collapsible-section__description">
                  {t('profilePage.browserstackDescription')}
                </p>
              </div>
              <label className="collapsible-section__toggle">
                <input
                  type="checkbox"
                  checked={isBrowserstackSectionOpen}
                  onChange={() => {
                    setIsBrowserstackSectionOpen((previous) => {
                      const nextValue = !previous;
                      if (!nextValue) {
                        setBrowserstackUsername('');
                        setBrowserstackAccessKey('');
                      }
                      return nextValue;
                    });
                  }}
                  aria-expanded={isBrowserstackSectionOpen}
                  aria-controls="profile-browserstack-section"
                />
                <span>{isBrowserstackSectionOpen ? t('profilePage.enabled') : t('profilePage.disabled')}</span>
              </label>
            </div>
            {isBrowserstackSectionOpen && (
              <div className="collapsible-section__body" id="profile-browserstack-section">
                <TextInput
                  id="browserstack-username"
                  label={t('profilePage.browserstackUser')}
                  value={browserstackUsername}
                  onChange={(event) => setBrowserstackUsername(event.target.value)}
                  placeholder="username"
                />
                <TextInput
                  id="browserstack-access-key"
                  label={t('profilePage.browserstackPassword')}
                  type="password"
                  value={browserstackAccessKey}
                  onChange={(event) => setBrowserstackAccessKey(event.target.value)}
                  placeholder="access key"
                />
                <p className="form-hint">
                  {t('profilePage.browserstackText')}
                </p>
              </div>
            )}
          </div>

          <Button type="submit" isLoading={isLoading} loadingText={t('profilePage.loadingText')}>
            {t('profilePage.saveButton')}
          </Button>
        </form>
      </section>
    </Layout>
  );
};
