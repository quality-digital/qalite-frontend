import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Organization } from '../../domain/entities/organization';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { Modal } from '../components/Modal';
import { useTranslation } from 'react-i18next';

interface OrganizationFormState {
  name: string;
  slackWebhookUrl: string;
  emailDomain: string;
  browserstackUsername: string;
  browserstackAccessKey: string;
}

const initialOrganizationForm: OrganizationFormState = {
  name: '',
  slackWebhookUrl: '',
  emailDomain: '',
  browserstackUsername: '',
  browserstackAccessKey: '',
};

export const AdminOrganizationsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t: translation } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [organizationForm, setOrganizationForm] =
    useState<OrganizationFormState>(initialOrganizationForm);
  const [isSlackSectionOpen, setIsSlackSectionOpen] = useState(false);
  const [isBrowserstackSectionOpen, setIsBrowserstackSectionOpen] = useState(false);
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoading(true);
        const data = await organizationService.list();
        setOrganizations(data);
      } catch (error) {
        console.error(error);
        showToast({
          type: 'error',
          message: translation('adminOrganizationsPage.errors.loadOrganizations'),
        });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchOrganizations();
  }, [showToast, translation]);

  useEffect(() => {
    if (organizations.length === 0) {
      setStoreCounts({});
      return;
    }

    let isMounted = true;

    const fetchStoreCounts = async () => {
      try {
        const counts = await Promise.all(
          organizations.map(async (organization) => {
            const stores = await storeService.listByOrganization(organization.id);
            return [organization.id, stores.length] as const;
          }),
        );

        if (isMounted) {
          setStoreCounts(Object.fromEntries(counts));
        }
      } catch (error) {
        console.error(error);
      }
    };

    void fetchStoreCounts();

    return () => {
      isMounted = false;
    };
  }, [organizations]);

  const openCreateModal = () => {
    setOrganizationForm(initialOrganizationForm);
    setFormError(null);
    setIsSlackSectionOpen(false);
    setIsBrowserstackSectionOpen(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    setIsSlackSectionOpen(false);
    setIsBrowserstackSectionOpen(false);
    setOrganizationForm(initialOrganizationForm);
  };

  const toggleSlackSection = () => {
    setIsSlackSectionOpen((previous) => {
      const nextValue = !previous;

      if (!nextValue) {
        setOrganizationForm((form) => ({ ...form, slackWebhookUrl: '' }));
      }

      return nextValue;
    });
  };

  const toggleBrowserstackSection = () => {
    setIsBrowserstackSectionOpen((previous) => {
      const nextValue = !previous;

      if (!nextValue) {
        setOrganizationForm((form) => ({
          ...form,
          browserstackUsername: '',
          browserstackAccessKey: '',
        }));
      }

      return nextValue;
    });
  };

  const handleOrganizationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedName = organizationForm.name.trim();

    if (!trimmedName) {
      const message = translation('adminOrganizationsPage.errors.nameRequired');
      setFormError(message);
      return;
    }

    try {
      setIsSavingOrganization(true);

      const slackWebhookUrl = isSlackSectionOpen ? organizationForm.slackWebhookUrl.trim() : '';
      const emailDomain = organizationForm.emailDomain.trim();
      const browserstackUsername = isBrowserstackSectionOpen
        ? organizationForm.browserstackUsername.trim()
        : '';
      const browserstackAccessKey = isBrowserstackSectionOpen
        ? organizationForm.browserstackAccessKey.trim()
        : '';

      const created = await organizationService.create({
        name: trimmedName,
        description: '',
        slackWebhookUrl,
        emailDomain,
        browserstackCredentials:
          browserstackUsername || browserstackAccessKey
            ? {
                username: browserstackUsername,
                accessKey: browserstackAccessKey,
              }
            : null,
      });
      setOrganizations((previous) => [...previous, created]);
      showToast({
        type: 'success',
        message: translation('adminOrganizationsPage.success.created'),
      });
      closeModal();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : translation('adminOrganizationsPage.errors.generic');

      setFormError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  return (
    <Layout>
      <section className="page-container" data-testid="organizations-page">
        <div className="page-header">
          <div>
            <h1 className="section-title">{translation('adminOrganizationsPage.title')}</h1>
            <p className="section-subtitle">{translation('adminOrganizationsPage.subtitle')}</p>
          </div>

          <div className="page-actions">
            <Button type="button" onClick={openCreateModal} data-testid="new-organization-button">
              {translation('adminOrganizationsPage.actions.newOrganization')}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="section-subtitle">{translation('adminOrganizationsPage.loading')}</p>
        ) : organizations.length === 0 ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">
              {translation('adminOrganizationsPage.empty.title')}
            </h2>

            <p className="section-subtitle">
              {translation('adminOrganizationsPage.empty.description')}
            </p>

            <Button type="button" onClick={openCreateModal}>
              {translation('adminOrganizationsPage.actions.newOrganization')}
            </Button>
          </div>
        ) : (
          <div className="dashboard-grid">
            {organizations.map((organization) => {
              const membersCount = organization.members.length;
              const membersLabel =
                membersCount === 1
                  ? translation('adminOrganizationsPage.members.one')
                  : translation('adminOrganizationsPage.members.other');

              return (
              <div
                key={organization.id}
                className="card card-clickable"
                data-testid={`organization-card-${organization.id}`}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/organizations?organizationId=${organization.id}`)}
                onKeyDown={(event) =>
                  handleCardKeyDown(event, () =>
                    navigate(`/admin/organizations?organizationId=${organization.id}`),
                  )
                }
              >
                <div className="organization-card-header">
                  <h2 className="card-title">{organization.name}</h2>
                </div>

                <div className="organization-card-footer">
                  <span className="badge">
                    {translation('adminOrganizationsPage.storeCount', {
                      count: storeCounts[organization.id] ?? 0,
                    })}
                  </span>
                  <span className="badge">
                    {membersCount} {membersLabel}
                  </span>

                  <div className="card-link-hint">
                    <span>{translation('adminOrganizationsPage.viewStores')}</span>
                    <span aria-hidden>&rarr;</span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={translation('adminOrganizationsPage.modal.title')}
      >
        {formError && <p className="form-message form-message--error">{formError}</p>}

        <form
          className="form-grid"
          onSubmit={handleOrganizationSubmit}
          data-testid="organization-form"
        >
          <TextInput
            id="organization-name"
            label={translation('adminOrganizationsPage.form.name.label')}
            value={organizationForm.name}
            onChange={(event) => setOrganizationForm((p) => ({ ...p, name: event.target.value }))}
            placeholder={translation('adminOrganizationsPage.form.name.placeholder')}
            required
            dataTestId="organization-name-input"
          />
          <TextInput
            id="organization-email-domain"
            label={translation('adminOrganizationsPage.form.emailDomain.label')}
            value={organizationForm.emailDomain}
            onChange={(event) =>
              setOrganizationForm((previous) => ({
                ...previous,
                emailDomain: event.target.value,
              }))
            }
            placeholder={translation('adminOrganizationsPage.form.emailDomain.placeholder')}
            dataTestId="organization-email-domain-input"
          />

          <p className="form-hint">{translation('adminOrganizationsPage.form.emailDomain.hint')}</p>

          <div className="collapsible-section">
            <div className="collapsible-section__header">
              <div className="collapsible-section__titles">
                <img
                  className="collapsible-section__icon"
                  src="https://img.icons8.com/color/48/browser-stack.png"
                  alt={translation('adminOrganizationsPage.form.browserstack.iconAlt')}
                  width={48}
                  height={48}
                />
                <p className="collapsible-section__title">
                  {translation('adminOrganizationsPage.form.browserstack.title')}
                </p>
                <p className="collapsible-section__description">
                  {translation('adminOrganizationsPage.form.browserstack.description')}
                </p>
              </div>
              <label className="collapsible-section__toggle">
                <input
                  type="checkbox"
                  checked={isBrowserstackSectionOpen}
                  onChange={toggleBrowserstackSection}
                  aria-expanded={isBrowserstackSectionOpen}
                  aria-controls="organization-browserstack-section"
                />
                <span>
                  {isBrowserstackSectionOpen
                    ? translation('adminOrganizationsPage.form.browserstack.enabled')
                    : translation('adminOrganizationsPage.form.browserstack.disabled')}
                </span>
              </label>
            </div>

            {isBrowserstackSectionOpen && (
              <div
                className="collapsible-section__body"
                id="organization-browserstack-section"
                data-testid="browserstack-credentials-section"
              >
                <div className="form-grid">
                  <TextInput
                    id="organization-browserstack-username"
                    label={translation('adminOrganizationsPage.form.browserstack.usernameLabel')}
                    value={organizationForm.browserstackUsername}
                    onChange={(event) =>
                      setOrganizationForm((previous) => ({
                        ...previous,
                        browserstackUsername: event.target.value,
                      }))
                    }
                    placeholder={translation(
                      'adminOrganizationsPage.form.browserstack.usernamePlaceholder',
                    )}
                    dataTestId="organization-browserstack-username-input"
                  />
                  <TextInput
                    id="organization-browserstack-access-key"
                    label={translation('adminOrganizationsPage.form.browserstack.accessKeyLabel')}
                    value={organizationForm.browserstackAccessKey}
                    onChange={(event) =>
                      setOrganizationForm((previous) => ({
                        ...previous,
                        browserstackAccessKey: event.target.value,
                      }))
                    }
                    placeholder={translation(
                      'adminOrganizationsPage.form.browserstack.accessKeyPlaceholder',
                    )}
                    type="password"
                    dataTestId="organization-browserstack-access-key-input"
                  />
                </div>
                <p className="form-hint">
                  {translation('adminOrganizationsPage.form.browserstack.hint')}
                </p>
              </div>
            )}
          </div>
          <div className="collapsible-section">
            <div className="collapsible-section__header">
              <div className="collapsible-section__titles">
                <img
                  className="collapsible-section__icon"
                  src="https://img.icons8.com/external-tal-revivo-color-tal-revivo/24/external-slack-replace-email-text-messaging-and-instant-messaging-for-your-team-logo-color-tal-revivo.png"
                  alt={translation('adminOrganizationsPage.form.slack.iconAlt')}
                  width={24}
                  height={24}
                />

                <p className="collapsible-section__title">
                  {translation('adminOrganizationsPage.form.slack.title')}
                </p>

                <p className="collapsible-section__description">
                  {translation('adminOrganizationsPage.form.slack.description')}
                </p>
              </div>

              <label className="collapsible-section__toggle">
                <input
                  type="checkbox"
                  checked={isSlackSectionOpen}
                  onChange={toggleSlackSection}
                  aria-expanded={isSlackSectionOpen}
                  aria-controls="organization-slack-section"
                />
                <span>
                  {isSlackSectionOpen
                    ? translation('adminOrganizationsPage.form.slack.enabled')
                    : translation('adminOrganizationsPage.form.slack.disabled')}
                </span>
              </label>
            </div>

            {isSlackSectionOpen && (
              <div
                className="collapsible-section__body"
                id="organization-slack-section"
                data-testid="slack-webhook-section"
              >
                <TextInput
                  id="organization-slack-webhook"
                  label={translation('adminOrganizationsPage.form.slack.webhookLabel')}
                  value={organizationForm.slackWebhookUrl}
                  onChange={(event) =>
                    setOrganizationForm((previous) => ({
                      ...previous,
                      slackWebhookUrl: event.target.value,
                    }))
                  }
                  placeholder={translation('adminOrganizationsPage.form.slack.webhookPlaceholder')}
                  dataTestId="organization-slack-webhook-input"
                />

                <p className="form-hint">{translation('adminOrganizationsPage.form.slack.hint')}</p>
              </div>
            )}
          </div>

          <div className="form-actions">
            <Button
              type="submit"
              isLoading={isSavingOrganization}
              loadingText={translation('adminOrganizationsPage.actions.saving')}
              data-testid="save-organization-button"
            >
              {translation('adminOrganizationsPage.actions.create')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeModal}
              disabled={isSavingOrganization}
              data-testid="cancel-organization-button"
            >
              {translation('adminOrganizationsPage.actions.cancel')}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
