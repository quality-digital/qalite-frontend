import { FormEvent, useEffect, useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import { Alert } from '../components/Alert';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { TextInput } from '../components/TextInput';
import { UserAvatar } from '../components/UserAvatar';
import { UserPreferencesSection } from '../components/UserPreferencesSection';
import { useTranslation } from 'react-i18next';
import { useUserPreferences } from '../context/UserPreferencesContext';

export const ProfilePage = () => {
  const { user, updateProfile, isLoading } = useAuth();
  const { preferences, updatePreferences, isSaving } = useUserPreferences();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [draftPreferences, setDraftPreferences] = useState(preferences);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
  }, [user?.firstName, user?.lastName]);

  useEffect(() => {
    setDraftPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (!trimmedFirstName) {
      setLocalError(t('profilePage.name'));
      return;
    }

    if (!trimmedLastName) {
      setLocalError(t('profilePage.lastname'));
      return;
    }

    try {
      await updateProfile({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        ...(photoFile ? { photoFile } : {}),
      });

      if (
        draftPreferences.theme !== preferences.theme ||
        draftPreferences.language !== preferences.language
      ) {
        await updatePreferences(draftPreferences);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('profilePage.errorSize'));
    }
  };

  return (
    <Layout>
      <div className="profile-layout">
        <section className="card profile-card">
          <div className="profile-toolbar">
            <BackButton label={t('back')} />
          </div>

          <span className="badge">{t('profilePage.badge')}</span>
          <h1 className="section-title">{t('profilePage.title')}</h1>
          <p className="section-subtitle">{t('profilePage.subtitle')}</p>

          {localError && <Alert type="error" message={localError} />}

          <form className="profile-editor" onSubmit={handleSubmit}>
            <div className="profile-photo-field">
              <UserAvatar
                name={user?.displayName || user?.email || ''}
                photoUrl={photoPreview ?? user?.photoURL ?? null}
              />
              <div className="profile-photo-actions">
                <label htmlFor="profile-photo-upload" className="field-label">
                  {t('profilePage.photo')}
                </label>
                <input
                  id="profile-photo-upload"
                  type="file"
                  accept="image/*"
                  className="file-input"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      setLocalError(t('profilePage.errorSize'));
                      setPhotoFile(null);
                      return;
                    }
                    setLocalError(null);
                    setPhotoFile(file);
                  }}
                />
                <span className="form-hint">{t('profilePage.formats')}</span>
              </div>
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
              label={t('lastname')}
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
            />

            <TextInput
              id="email"
              label={t('profilePage.emailLabel')}
              type="email"
              value={user?.email ?? ''}
              onChange={() => {}}
              readOnly
              disabled
            />

            <Button
              type="submit"
              isLoading={isLoading || isSaving}
              loadingText={t('profilePage.loadingText')}
            >
              {t('profilePage.saveButton')}
            </Button>
          </form>
        </section>

        <UserPreferencesSection
          draft={draftPreferences}
          onDraftChange={setDraftPreferences}
          showActions={false}
        />
      </div>
    </Layout>
  );
};
