import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { UserPreferences } from '../../domain/entities/auth';
import { Button } from './Button';
import { SelectInput } from './SelectInput';
import { SettingsIcon } from './icons';
import { useUserPreferences } from '../context/UserPreferencesContext';

interface UserPreferencesSectionProps {
  draft?: UserPreferences;
  onDraftChange?: (next: UserPreferences) => void;
  showActions?: boolean;
  isSaving?: boolean;
}

export const UserPreferencesSection = ({
  draft: controlledDraft,
  onDraftChange,
  showActions = true,
  isSaving,
}: UserPreferencesSectionProps) => {
  const { t } = useTranslation();
  const { preferences, updatePreferences, isSaving: isSavingContext } = useUserPreferences();
  const [draft, setDraft] = useState<UserPreferences>(preferences);
  const resolvedDraft = controlledDraft ?? draft;
  const resolvedIsSaving = isSaving ?? isSavingContext;

  useEffect(() => {
    if (!controlledDraft) {
      setDraft(preferences);
    }
  }, [controlledDraft, preferences]);

  const themeOptions = [
    { value: 'system', label: t('preferences.themeSystem') },
    { value: 'light', label: t('preferences.themeLight') },
    { value: 'dark', label: t('preferences.themeDark') },
  ];

  const languageOptions = [
    { value: 'pt', label: t('language.optionLongPt') },
    { value: 'en', label: t('language.optionLongEn') },
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resolvedDraft.theme === preferences.theme && resolvedDraft.language === preferences.language) {
      return;
    }

    await updatePreferences(resolvedDraft);
  };

  const hasChanges =
    resolvedDraft.theme !== preferences.theme || resolvedDraft.language !== preferences.language;
  const handleDraftChange = (next: UserPreferences) => {
    if (onDraftChange) {
      onDraftChange(next);
      return;
    }
    setDraft(next);
  };

  return (
    <section className="card settings-card">
      <div className="settings-card__header">
        <span className="card-title-icon">
          <SettingsIcon aria-hidden className="icon icon--lg" />
        </span>
        <div>
          <h2 className="section-title">{t('preferences.title')}</h2>
          <p className="section-subtitle">{t('preferences.subtitle')}</p>
        </div>
      </div>
      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-form__grid">
          <SelectInput
            id="preferences-theme"
            label={t('preferences.themeLabel')}
            value={resolvedDraft.theme}
            options={themeOptions}
            onChange={(event) => {
              const next = {
                ...resolvedDraft,
                theme: event.target.value as UserPreferences['theme'],
              };
              handleDraftChange(next);
            }}
          />
          <SelectInput
            id="preferences-language"
            label={t('preferences.languageLabel')}
            value={resolvedDraft.language}
            options={languageOptions}
            onChange={(event) => {
              const next = {
                ...resolvedDraft,
                language: event.target.value as UserPreferences['language'],
              };
              handleDraftChange(next);
            }}
          />
        </div>
        {showActions && (
          <div className="settings-form__actions">
            <Button
              type="submit"
              isLoading={resolvedIsSaving}
              loadingText={t('saving')}
              disabled={!hasChanges}
            >
              {t('preferences.save')}
            </Button>
            {!hasChanges && <span className="settings-form__hint">{t('preferences.upToDate')}</span>}
          </div>
        )}
      </form>
    </section>
  );
};
