import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { Organization } from '../../domain/entities/organization';
import { listenToOrganizationsSummary } from '../../infrastructure/external/organizations';
import { organizationService } from '../../infrastructure/services/organizationService';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { TextInput } from '../components/TextInput';
import { CachedImage } from '../components/CachedImage';
import { useToast } from '../context/ToastContext';
import { ActivityIcon, PieChartIcon, StorefrontIcon, UsersGroupIcon } from '../components/icons';

export const AdminOrganizationsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormState, setCreateFormState] = useState({
    name: '',
    description: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalOrganizations = organizations.length;
  const totalMembers = useMemo(
    () => organizations.reduce((sum, item) => sum + (item.memberIds?.length ?? 0), 0),
    [organizations],
  );
  const organizationsWithDomain = useMemo(
    () => organizations.filter((item) => Boolean(item.emailDomain?.trim())).length,
    [organizations],
  );
  const averageMembers = totalOrganizations > 0 ? Math.round(totalMembers / totalOrganizations) : 0;

  useEffect(() => {
    const unsubscribe = listenToOrganizationsSummary(
      (items) => {
        setOrganizations(items);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
        showToast({
          type: 'error',
          message: t('adminOrganizationsPage.errors.loadOrganizations'),
        });
      },
    );

    return () => unsubscribe();
  }, [showToast, t]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  const openCreateModal = () => {
    setCreateError(null);
    setLogoFile(null);
    setLogoPreview(null);
    setCreateFormState({ name: '', description: '' });
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateError(null);
    setLogoFile(null);
    setLogoPreview(null);
    setCreateFormState({ name: '', description: '' });
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    const trimmedName = createFormState.name.trim();
    if (!trimmedName) {
      setCreateError(t('adminOrganizationsPage.form.error.nameRequired'));
      return;
    }

    try {
      setIsSaving(true);
      const newOrganization = await organizationService.create({
        name: trimmedName,
        description: createFormState.description.trim(),
      });

      if (logoFile) {
        const logoUrl = await organizationService.uploadLogo(newOrganization.id, logoFile);
        await organizationService.update(newOrganization.id, {
          name: trimmedName,
          description: createFormState.description.trim(),
          logoUrl,
        });
      }

      showToast({
        type: 'success',
        message: t('adminOrganizationsPage.toast.organizationCreated'),
      });
      closeCreateModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('adminOrganizationsPage.errors.createFailed');
      setCreateError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSaving(false);
    }
  };

  const logoSource = logoPreview ?? null;

  return (
    <Layout>
      <section className="page-container" data-testid="admin-organizations-page">
        <div className="page-header">
          <div>
            <h1 className="section-title">{t('adminOrganizationsPage.title')}</h1>
            <p className="section-subtitle">{t('adminOrganizationsPage.subtitle')}</p>
          </div>
          <div className="page-actions">
            <Button
              type="button"
              onClick={openCreateModal}
              data-testid="create-organization-button"
            >
              {t('adminOrganizationsPage.createButton')}
            </Button>
          </div>
        </div>

        {!isLoading ? (
          <section className="dashboard-kpi-grid">
            <article className="dashboard-kpi-card">
              <span className="dashboard-kpi-card__icon">
                <StorefrontIcon className="icon icon--lg" />
              </span>
              <strong>{totalOrganizations}</strong>
              <span>{t('adminOrganizationsPage.kpis.organizations')}</span>
            </article>
            <article className="dashboard-kpi-card">
              <span className="dashboard-kpi-card__icon">
                <UsersGroupIcon className="icon icon--lg" />
              </span>
              <strong>{totalMembers}</strong>
              <span>{t('adminOrganizationsPage.kpis.members')}</span>
            </article>
            <article className="dashboard-kpi-card">
              <span className="dashboard-kpi-card__icon">
                <ActivityIcon className="icon icon--lg" />
              </span>
              <strong>{averageMembers}</strong>
              <span>{t('adminOrganizationsPage.kpis.averagePerOrganization')}</span>
            </article>
            <article className="dashboard-kpi-card">
              <span className="dashboard-kpi-card__icon">
                <PieChartIcon className="icon icon--lg" />
              </span>
              <strong>{organizationsWithDomain}</strong>
              <span>{t('adminOrganizationsPage.kpis.withDomain')}</span>
            </article>
          </section>
        ) : null}

        {isLoading ? (
          <p className="section-subtitle">{t('adminOrganizationsPage.loading')}</p>
        ) : null}

        {!isLoading && organizations.length === 0 ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">
              {t('adminOrganizationsPage.empty.title')}
            </h2>
            <p className="section-subtitle">{t('adminOrganizationsPage.empty.description')}</p>
          </div>
        ) : null}

        {!isLoading && organizations.length > 0 ? (
          <div className="dashboard-grid">
            {organizations.map((organization) => (
              <article key={organization.id} className="card card-interactive">
                <div className="card-title-group">
                  {organization.logoUrl ? (
                    <CachedImage
                      src={organization.logoUrl}
                      alt={organization.name}
                      style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8 }}
                    />
                  ) : (
                    <span className="card-title-icon" aria-hidden>
                      <StorefrontIcon className="icon icon--lg" />
                    </span>
                  )}
                  <div>
                    <h3 className="card-title">{organization.name}</h3>
                    <p className="section-subtitle">
                      {organization.memberIds.length}{' '}
                      {organization.memberIds.length === 1
                        ? t('adminOrganizationsPage.members.one')
                        : t('adminOrganizationsPage.members.other')}
                    </p>
                  </div>
                </div>

                {organization.description ? (
                  <p className="section-subtitle" style={{ marginTop: 0 }}>
                    {organization.description}
                  </p>
                ) : null}

                <Button
                  type="button"
                  onClick={() => navigate(`/admin/organizations?Id=${organization.id}`)}
                >
                  {t('adminOrganizationsPage.viewStores')}
                </Button>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title={t('adminOrganizationsPage.createButton')}
        description={t('adminOrganizationsPage.createModal.description')}
      >
        {createError && <p className="form-message form-message--error">{createError}</p>}
        <form className="form-grid" onSubmit={handleCreateSubmit}>
          <TextInput
            id="organization-name"
            label={t('adminOrganizationsPage.form.name.label')}
            value={createFormState.name}
            onChange={(event) =>
              setCreateFormState((previous) => ({ ...previous, name: event.target.value }))
            }
            required
          />
          <TextInput
            id="organization-description"
            label={t('adminOrganizationsPage.form.description.label')}
            value={createFormState.description}
            onChange={(event) =>
              setCreateFormState((previous) => ({ ...previous, description: event.target.value }))
            }
          />

          <div className="organization-logo-field">
            <div className="organization-logo-preview">
              {logoSource ? (
                <CachedImage src={logoSource} alt="Logo" />
              ) : (
                <span className="organization-logo-fallback">Logo</span>
              )}
            </div>
            <div className="organization-logo-actions">
              <label htmlFor="organization-logo-upload" className="field-label">
                {t('adminOrganizationsPage.form.logo.label')}
              </label>
              <input
                id="organization-logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setLogoFile(event.target.files?.[0] ?? null)
                }
              />
            </div>
          </div>

          <div className="form-actions">
            <Button type="submit" isLoading={isSaving}>
              {t('adminOrganizationsPage.form.submitButton')}
            </Button>
            <Button type="button" variant="ghost" onClick={closeCreateModal} disabled={isSaving}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
