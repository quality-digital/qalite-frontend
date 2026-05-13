import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { Organization, OrganizationAccessRequest } from '../../domain/entities/organization';
import type { Store } from '../../domain/entities/store';
import type { UserSummary } from '../../domain/entities/user';
import {
  listenToOrganizationDetail,
  listenToOrganizationsSummary,
  listenToPendingAccessRequestsForOrganization,
} from '../../infrastructure/external/organizations';
import { organizationService } from '../../infrastructure/services/organizationService';
import { storeService } from '../../infrastructure/services/storeService';
import { userService } from '../../infrastructure/services/userService';
import { useStoresRealtime } from '../context/StoresRealtimeContext';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Layout } from '../components/Layout';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { UserAvatar } from '../components/UserAvatar';
import { CachedImage } from '../components/CachedImage';
import { StoreFavicon } from '../components/StoreFavicon';
import { Modal } from '../components/Modal';
import { TextInput } from '../components/TextInput';
import { SelectInput } from '../components/SelectInput';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import {
  ActivityIcon,
  PieChartIcon,
  SettingsIcon,
  StorefrontIcon,
  UsersGroupIcon,
} from '../components/icons';

interface OrganizationFormState {
  name: string;
  slackWebhookUrl: string;
  emailDomain: string;
}

interface StoreFormState {
  name: string;
  site: string;
  environmentColumns: string;
  stage: 'WS' | 'Preview';
}

const createOrganizationFormState = (organization: Organization | null): OrganizationFormState => ({
  name: organization?.name ?? '',
  slackWebhookUrl: organization?.slackWebhookUrl ?? '',
  emailDomain: organization?.emailDomain ?? '',
});

const createEmptyStoreFormState = (): StoreFormState => ({
  name: '',
  site: '',
  environmentColumns: 'Desktop\nMobile',
  stage: 'WS',
});

export const AdminStoresPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setActiveOrganization } = useOrganizationBranding();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const { organizationId: activeOrganizationId, stores, isLoading, error } = useStoresRealtime();
  const storesForOrganization = useMemo(
    () => (activeOrganizationId && activeOrganizationId === selectedOrganizationId ? stores : []),
    [activeOrganizationId, selectedOrganizationId, stores],
  );
  const isLoadingStores = Boolean(
    activeOrganizationId && activeOrganizationId === selectedOrganizationId && isLoading,
  );
  const [isOrganizationLocked, setIsOrganizationLocked] = useState(false);
  const [isOrganizationModalOpen, setIsOrganizationModalOpen] = useState(false);
  const [organizationForm, setOrganizationForm] = useState<OrganizationFormState>(
    createOrganizationFormState(null),
  );
  const [organizationLogoFile, setOrganizationLogoFile] = useState<File | null>(null);
  const [organizationLogoPreview, setOrganizationLogoPreview] = useState<string | null>(null);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [isOrganizationSlackSectionOpen, setIsOrganizationSlackSectionOpen] = useState(false);
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<UserSummary[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [pendingAccessRequests, setPendingAccessRequests] = useState<OrganizationAccessRequest[]>(
    [],
  );
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [organizationDeleteModalOpen, setOrganizationDeleteModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeForm, setStoreForm] = useState<StoreFormState>(createEmptyStoreFormState());
  const [storeError, setStoreError] = useState<string | null>(null);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [storeDeleteModalOpen, setStoreDeleteModalOpen] = useState(false);
  const { t: translation } = useTranslation();

  const totalScenarios = useMemo(
    () => storesForOrganization.reduce((sum, store) => sum + (store.scenarioCount ?? 0), 0),
    [storesForOrganization],
  );
  const totalAutomated = useMemo(
    () =>
      storesForOrganization.reduce((sum, store) => sum + (store.automatedScenarioCount ?? 0), 0),
    [storesForOrganization],
  );
  const totalManual = Math.max(totalScenarios - totalAutomated, 0);
  const automationRate =
    totalScenarios > 0 ? Math.round((totalAutomated / totalScenarios) * 100) : 0;

  useEffect(() => {
    const organizationFromParam = searchParams.get('id') ?? searchParams.get('Id');
    const unsubscribe = listenToOrganizationsSummary(
      (data) => {
        const hasValidOrganizationParam = Boolean(
          organizationFromParam && data.some((item) => item.id === organizationFromParam),
        );

        if (hasValidOrganizationParam && organizationFromParam) {
          setSelectedOrganizationId(organizationFromParam);
          setIsOrganizationLocked(true);
          return;
        }

        setIsOrganizationLocked(false);
        setSelectedOrganizationId((currentValue) => {
          if (currentValue && data.some((item) => item.id === currentValue)) {
            return currentValue;
          }

          return data[0]?.id ?? '';
        });
      },
      () => {
        showToast({ type: 'error', message: translation('AdminStoresPage.toast-error-load-orgs') });
      },
    );

    return () => {
      unsubscribe();
    };
  }, [searchParams, showToast, translation]);

  useEffect(() => {
    if (!selectedOrganizationId) {
      return;
    }

    setSearchParams({ Id: selectedOrganizationId });
  }, [selectedOrganizationId, setSearchParams]);

  useEffect(() => {
    if (!error) {
      return;
    }

    showToast({
      type: 'error',
      message: translation('AdminStoresPage.toast-error-load-stores'),
    });
  }, [error, showToast, translation]);

  useEffect(() => {
    if (!selectedOrganizationId) {
      setPendingAccessRequests([]);
      return;
    }

    return listenToPendingAccessRequestsForOrganization(
      selectedOrganizationId,
      setPendingAccessRequests,
      () => {
        setPendingAccessRequests([]);
      },
    );
  }, [selectedOrganizationId, translation]);

  useEffect(() => {
    if (!selectedOrganizationId) {
      setSelectedOrganization(null);
      return;
    }

    return listenToOrganizationDetail(
      selectedOrganizationId,
      (detail) => setSelectedOrganization(detail),
      () => {
        setOrganizationError(translation('AdminStoresPage.toast-error-save-org'));
      },
    );
  }, [selectedOrganizationId, translation]);

  useEffect(() => {
    setActiveOrganization(selectedOrganization ?? null);
  }, [selectedOrganization, setActiveOrganization]);

  useEffect(() => () => setActiveOrganization(null), [setActiveOrganization]);

  useEffect(() => {
    if (!selectedOrganization) {
      return;
    }

    setOrganizationForm(createOrganizationFormState(selectedOrganization));
    setIsOrganizationSlackSectionOpen(Boolean(selectedOrganization.slackWebhookUrl?.trim()));
  }, [selectedOrganization]);

  useEffect(() => {
    if (!organizationLogoFile) {
      setOrganizationLogoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(organizationLogoFile);
    setOrganizationLogoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [organizationLogoFile]);

  useEffect(() => {
    const searchTerm = newMemberEmail.trim();

    if (!searchTerm || !isOrganizationModalOpen) {
      setUserSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const fetchSuggestions = async () => {
        try {
          setIsSearchingUsers(true);
          const results = await userService.searchByTerm(searchTerm);
          const filteredResults = selectedOrganization
            ? results.filter((user) => !selectedOrganization.memberIds.includes(user.id))
            : results;

          setUserSuggestions(filteredResults);
        } catch {
          setUserSuggestions([]);
        } finally {
          setIsSearchingUsers(false);
        }
      };

      void fetchSuggestions();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [isOrganizationModalOpen, newMemberEmail, selectedOrganization]);

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  const openOrganizationModal = () => {
    setOrganizationError(null);
    setOrganizationLogoFile(null);
    setNewMemberEmail('');
    setUserSuggestions([]);
    setOrganizationForm(createOrganizationFormState(selectedOrganization));
    setIsOrganizationModalOpen(true);
  };

  const closeOrganizationModal = () => {
    setIsOrganizationModalOpen(false);
    setOrganizationError(null);
    setOrganizationLogoFile(null);
    setOrganizationLogoPreview(null);
    setNewMemberEmail('');
    setUserSuggestions([]);
  };

  const openCreateStoreModal = () => {
    setEditingStore(null);
    setStoreForm(createEmptyStoreFormState());
    setStoreError(null);
    setIsStoreModalOpen(true);
  };

  const closeStoreModal = () => {
    setIsStoreModalOpen(false);
    setEditingStore(null);
    setStoreForm(createEmptyStoreFormState());
    setStoreError(null);
  };

  const handleOrganizationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOrganizationError(null);

    if (!selectedOrganization) {
      return;
    }

    const trimmedName = organizationForm.name.trim();
    if (!trimmedName) {
      setOrganizationError(translation('AdminStoresPage.form-error-no-org-name'));
      return;
    }

    try {
      setIsSavingOrganization(true);
      const slackWebhookUrl = isOrganizationSlackSectionOpen
        ? organizationForm.slackWebhookUrl.trim()
        : '';
      const emailDomain = organizationForm.emailDomain.trim();
      const logoUrl = organizationLogoFile
        ? await organizationService.uploadLogo(selectedOrganization.id, organizationLogoFile)
        : undefined;

      await organizationService.update(selectedOrganization.id, {
        name: trimmedName,
        description: (selectedOrganization.description ?? '').trim(),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        slackWebhookUrl,
        emailDomain,
      });

      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-org-updated'),
      });
      closeOrganizationModal();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : translation('AdminStoresPage.toast-error-save-org');
      setOrganizationError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedOrganization) {
      setOrganizationError(translation('AdminStoresPage.member-add-no-organization'));
      return;
    }

    const trimmedEmail = newMemberEmail.trim();
    if (!trimmedEmail) {
      setOrganizationError(translation('AdminStoresPage.member-add-email-required'));
      return;
    }

    const normalizedEmail = trimmedEmail.toLowerCase();
    if (
      selectedOrganization.members.some((member) => member.email.toLowerCase() === normalizedEmail)
    ) {
      setOrganizationError(translation('AdminStoresPage.member-add-already-linked'));
      return;
    }

    try {
      setIsManagingMembers(true);
      await organizationService.addUser({
        organizationId: selectedOrganization.id,
        userEmail: trimmedEmail,
      });
      setNewMemberEmail('');
      setUserSuggestions([]);
      setOrganizationError(null);
      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-member-added'),
      });
    } catch (memberError) {
      const message =
        memberError instanceof Error
          ? memberError.message
          : translation('AdminStoresPage.toast-error-save-org');
      setOrganizationError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsManagingMembers(false);
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!selectedOrganization) {
      return;
    }

    try {
      setIsManagingMembers(true);
      await organizationService.removeUser({
        organizationId: selectedOrganization.id,
        userId: memberUid,
      });
      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-member-removed'),
      });
    } catch (memberError) {
      const message =
        memberError instanceof Error
          ? memberError.message
          : translation('AdminStoresPage.toast-error-save-org');
      setOrganizationError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsManagingMembers(false);
    }
  };

  const handleApproveAccessRequest = async (requestId: string) => {
    if (!selectedOrganization) {
      return;
    }

    try {
      setApprovingRequestId(requestId);
      await organizationService.approveAccessRequest({
        organizationId: selectedOrganization.id,
        requestId,
      });
      setOrganizationError(null);
      showToast({
        type: 'success',
        message: translation('AdminStoresPage.pending-request-approved'),
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : translation('AdminStoresPage.pending-request-error');
      setOrganizationError(message);
      showToast({ type: 'error', message });
    } finally {
      setApprovingRequestId(null);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!selectedOrganization) {
      return;
    }

    try {
      setIsSavingOrganization(true);
      await organizationService.delete(selectedOrganization.id);
      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-org-removed'),
      });
      setOrganizationDeleteModalOpen(false);
      closeOrganizationModal();
      navigate('/admin');
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : translation('AdminStoresPage.toast-error-save-org');
      setOrganizationError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleStoreSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStoreError(null);

    const organizationId = selectedOrganization?.id ?? selectedOrganizationId;
    const trimmedName = storeForm.name.trim();
    const trimmedSite = storeForm.site.trim();
    const environmentColumns = storeForm.environmentColumns
      .split('\n')
      .map((column) => column.trim())
      .filter((column, index, array) => column.length > 0 && array.indexOf(column) === index);

    if (!organizationId) {
      setStoreError(translation('AdminStoresPage.form-error-no-org-selected'));
      return;
    }

    if (!trimmedName) {
      setStoreError(translation('AdminStoresPage.form-error-no-store-name'));
      return;
    }

    if (!trimmedSite) {
      setStoreError(translation('AdminStoresPage.form-error-no-store-site'));
      return;
    }

    try {
      setIsSavingStore(true);

      if (editingStore) {
        await storeService.update(editingStore.id, {
          name: trimmedName,
          site: trimmedSite,
          stage: storeForm.stage,
          environmentColumns,
        });

        showToast({
          type: 'success',
          message: translation('storeSummary.storeUpdateSuccess'),
        });
      } else {
        await storeService.create({
          organizationId,
          name: trimmedName,
          site: trimmedSite,
          stage: storeForm.stage,
          environmentColumns,
          logoUrl: null,
        });

        showToast({
          type: 'success',
          message: translation('AdminStoresPage.toast-success-store-created'),
        });
      }

      closeStoreModal();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : translation('AdminStoresPage.toast-error-save-store');
      setStoreError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!editingStore) {
      return;
    }

    try {
      setIsSavingStore(true);
      await storeService.delete(editingStore.id);
      showToast({ type: 'success', message: translation('storeSummary.storeRemoveSuccess') });
      setStoreDeleteModalOpen(false);
      closeStoreModal();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : translation('storeSummary.storeRemoveError');
      setStoreError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingStore(false);
    }
  };

  const organizationLogoSource = organizationLogoPreview ?? selectedOrganization?.logoUrl ?? null;

  return (
    <Layout>
      <section className="page-container" data-testid="stores-page">
        <div className="page-header">
          <div>
            <BackButton
              label={translation('back')}
              onClick={(event) => {
                event.preventDefault();
                navigate('/admin');
              }}
              data-testid="stores-back-button"
            />
            <h1 className="section-title">
              {selectedOrganization
                ? translation('AdminStoresPage.stores-title-org-selected', {
                    organizationName: selectedOrganization.name,
                  })
                : translation('AdminStoresPage.stores-title-no-org-selected')}
            </h1>
            <p className="section-subtitle">
              {isOrganizationLocked
                ? translation('AdminStoresPage.stores-subtitle-locked')
                : translation('AdminStoresPage.stores-subtitle-unlocked')}
            </p>
          </div>
          <div className="page-actions">
            {selectedOrganization && selectedOrganization.members.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={openOrganizationModal}
                data-testid="manage-organization-button"
              >
                <SettingsIcon aria-hidden className="icon" />
                {translation('AdminStoresPage.manage-organization-button')}
              </Button>
            )}
            <Button
              type="button"
              onClick={openCreateStoreModal}
              disabled={!selectedOrganizationId}
              data-testid="new-store-button"
            >
              {translation('AdminStoresPage.new-store-button')}
            </Button>
          </div>
        </div>

        <section className="dashboard-kpi-grid">
          <article className="dashboard-kpi-card">
            <span className="dashboard-kpi-card__icon">
              <StorefrontIcon className="icon icon--lg" />
            </span>
            <strong>{storesForOrganization.length}</strong>
            <span>{translation('AdminStoresPage.kpis.activeStores')}</span>
          </article>
          <article className="dashboard-kpi-card">
            <span className="dashboard-kpi-card__icon">
              <ActivityIcon className="icon icon--lg" />
            </span>
            <strong>{totalScenarios}</strong>
            <span>{translation('AdminStoresPage.kpis.totalScenarios')}</span>
          </article>
          <article className="dashboard-kpi-card">
            <span className="dashboard-kpi-card__icon">
              <PieChartIcon className="icon icon--lg" />
            </span>
            <strong>{automationRate}%</strong>
            <span>{translation('AdminStoresPage.kpis.averageAutomation')}</span>
          </article>
          <article className="dashboard-kpi-card">
            <span className="dashboard-kpi-card__icon">
              <ActivityIcon className="icon icon--lg" />
            </span>
            <strong>{totalManual}</strong>
            <span>{translation('AdminStoresPage.kpis.manualCases')}</span>
          </article>
        </section>

        {isLoadingStores ? (
          <p className="section-subtitle">
            {translation('AdminStoresPage.loading-stores-message')}
          </p>
        ) : storesForOrganization.length === 0 ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">
              {translation('AdminStoresPage.no-stores-title')}
            </h2>
            <p className="section-subtitle">{translation('AdminStoresPage.no-stores-subtitle')}</p>
            <Button type="button" onClick={openCreateStoreModal} disabled={!selectedOrganizationId}>
              {translation('AdminStoresPage.new-store-button')}
            </Button>
          </div>
        ) : (
          <>
            <div className="dashboard-grid">
              {storesForOrganization.map((store) => (
                <div key={store.id} className="card store-card-shell">
                  <div
                    className="store-card-shell__content"
                    data-testid={`store-card-${store.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/stores?id=${store.id}`)}
                    onKeyDown={(event) =>
                      handleCardKeyDown(event, () => navigate(`/stores?id=${store.id}`))
                    }
                  >
                    <div className="card-header">
                      <div className="card-title-group">
                        <span className="card-title-icon" aria-hidden>
                          <StoreFavicon site={store.site} alt="" className="store-card-logo" />
                        </span>
                        <div>
                          <h2 className="card-title">{store.name}</h2>
                          <span className="badge store-card-scenarios">
                            {translation('AdminStoresPage.store-card-scenarios-badge', {
                              scenarioCount: store.scenarioCount,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="card-link-hint">
                      <span>{translation('storesPage.openStore')}</span>
                      <span aria-hidden>&rarr;</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="organization-extra">
              {selectedOrganization && selectedOrganization.members.length > 0 && (
                <section className="organization-collaborators-card">
                  <div className="organization-collaborators-card__header">
                    <div className="section-heading">
                      <span className="section-heading__icon" aria-hidden>
                        <UsersGroupIcon className="icon icon--lg" />
                      </span>
                      <div>
                        <h3>{translation('AdminStoresPage.collaborators-card-title')}</h3>
                        <p className="section-subtitle">
                          {translation('AdminStoresPage.collaborators-card-subtitle')}
                        </p>
                      </div>
                    </div>
                    <span className="badge">
                      {selectedOrganization.members.length === 1
                        ? translation('AdminStoresPage.collaborators-count-singular')
                        : translation('AdminStoresPage.collaborators-count-plural', {
                            count: selectedOrganization.members.length,
                          })}
                    </span>
                  </div>
                  {selectedOrganization.members.length === 0 ? (
                    <p className="section-subtitle">
                      {translation('AdminStoresPage.no-collaborators-message')}
                    </p>
                  ) : (
                    <ul className="collaborator-list">
                      {selectedOrganization.members.map((member) => (
                        <li key={member.uid} className="collaborator-card">
                          <UserAvatar
                            name={member.displayName || member.email}
                            size="sm"
                            photoUrl={member.photoURL ?? null}
                          />
                          <div className="collaborator-card__details">
                            <strong>{member.displayName || member.email}</strong>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          </>
        )}
      </section>

      <Modal
        isOpen={isOrganizationModalOpen}
        onClose={closeOrganizationModal}
        title={translation('AdminStoresPage.manage-organization-button')}
        description={
          selectedOrganization?.name ?? translation('AdminStoresPage.stores-title-no-org-selected')
        }
      >
        {organizationError && (
          <p className="form-message form-message--error">{organizationError}</p>
        )}
        <form className="form-grid" onSubmit={handleOrganizationSubmit}>
          <TextInput
            id="organization-name"
            label={translation('adminOrganizationsPage.form.name.label')}
            value={organizationForm.name}
            onChange={(event) =>
              setOrganizationForm((previous) => ({ ...previous, name: event.target.value }))
            }
            required
          />
          <TextInput
            id="organization-email-domain"
            label={translation('adminOrganizationsPage.form.emailDomain.label')}
            value={organizationForm.emailDomain}
            onChange={(event) =>
              setOrganizationForm((previous) => ({ ...previous, emailDomain: event.target.value }))
            }
          />

          <div className="organization-logo-field">
            <div className="organization-logo-preview">
              {organizationLogoSource ? (
                <CachedImage
                  src={organizationLogoSource}
                  alt={selectedOrganization?.name ?? 'Logo'}
                />
              ) : (
                <span className="organization-logo-fallback">Logo</span>
              )}
            </div>
            <div className="organization-logo-actions">
              <label htmlFor="organization-logo-upload" className="field-label">
                {translation('AdminStoresPage.organization-logo-label')}
              </label>
              <input
                id="organization-logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setOrganizationLogoFile(event.target.files?.[0] ?? null)
                }
              />
            </div>
          </div>

          <div className="collapsible-section">
            <div className="collapsible-section__header">
              <div className="collapsible-section__titles">
                <CachedImage
                  className="collapsible-section__icon"
                  src="https://img.icons8.com/external-tal-revivo-color-tal-revivo/24/external-slack-replace-email-text-messaging-and-instant-messaging-for-your-team-logo-color-tal-revivo.png"
                  alt={translation('adminOrganizationsPage.form.slack.iconAlt')}
                  width={24}
                  height={24}
                />
                <p className="collapsible-section__title">
                  {translation('adminOrganizationsPage.form.slack.title')}
                </p>
              </div>
              <label className="collapsible-section__toggle">
                <input
                  type="checkbox"
                  checked={isOrganizationSlackSectionOpen}
                  onChange={() => {
                    setIsOrganizationSlackSectionOpen((previous) => {
                      const nextValue = !previous;
                      if (!nextValue) {
                        setOrganizationForm((form) => ({ ...form, slackWebhookUrl: '' }));
                      }
                      return nextValue;
                    });
                  }}
                />
                <span>
                  {isOrganizationSlackSectionOpen
                    ? translation('adminOrganizationsPage.form.slack.enabled')
                    : translation('adminOrganizationsPage.form.slack.disabled')}
                </span>
              </label>
            </div>
            {isOrganizationSlackSectionOpen && (
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
              />
            )}
          </div>

          <div className="card">
            <strong>{translation('AdminStoresPage.collaborators-card-title')}</strong>
            <div className="form-grid organization-member-form-row">
              <TextInput
                id="organization-member-email"
                label={translation('AdminStoresPage.member-email-label')}
                value={newMemberEmail}
                onChange={(event) => setNewMemberEmail(event.target.value)}
                placeholder={translation('AdminStoresPage.member-email-placeholder')}
              />
              <div className="form-actions organization-member-actions">
                <Button
                  type="button"
                  onClick={() => void handleAddMember()}
                  isLoading={isManagingMembers}
                >
                  {translation('AdminStoresPage.member-add-button')}
                </Button>
              </div>
            </div>
            {isSearchingUsers ? <p className="form-hint">{translation('loadingAccess')}</p> : null}
            {userSuggestions.length > 0 ? (
              <div className="suggestions-list">
                {userSuggestions.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="suggestions-list__item"
                    onClick={() => setNewMemberEmail(user.email)}
                  >
                    {user.displayName || user.email}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="organization-pending-requests">
              <div className="organization-pending-requests__header">
                <strong>{translation('AdminStoresPage.pending-requests-title')}</strong>
                <span className="form-hint">
                  {translation('AdminStoresPage.pending-requests-count', {
                    count: pendingAccessRequests.length,
                  })}
                </span>
              </div>

              {pendingAccessRequests.length === 0 ? (
                <p className="form-hint">{translation('AdminStoresPage.pending-requests-empty')}</p>
              ) : (
                <ul className="collaborator-list organization-members-list">
                  {pendingAccessRequests.map((request) => (
                    <li key={request.id} className="collaborator-card">
                      <UserAvatar
                        name={request.displayName || request.email}
                        size="sm"
                        photoUrl={request.photoURL ?? null}
                      />
                      <div className="collaborator-card__details">
                        <strong>{request.displayName || request.email}</strong>
                        <span className="collaborator-card__email">{request.email}</span>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void handleApproveAccessRequest(request.id)}
                        isLoading={approvingRequestId === request.id}
                      >
                        {translation('AdminStoresPage.pending-request-approve')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <ul className="collaborator-list organization-members-list">
              {selectedOrganization?.members.map((member) => (
                <li key={member.uid} className="collaborator-card">
                  <UserAvatar
                    name={member.displayName || member.email}
                    size="sm"
                    photoUrl={member.photoURL ?? null}
                  />
                  <div className="collaborator-card__details">
                    <strong>{member.displayName || member.email}</strong>
                    <span className="collaborator-card__email">{member.email}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="organization-member-remove-button"
                    onClick={() => void handleRemoveMember(member.uid)}
                    disabled={isManagingMembers}
                  >
                    {translation('AdminStoresPage.member-remove-button')}
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="form-actions">
            <Button type="submit" isLoading={isSavingOrganization}>
              {translation('storeSummary.saveChanges')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeOrganizationModal}
              disabled={isSavingOrganization}
            >
              {translation('cancel')}
            </Button>
          </div>
        </form>

        <div className="modal-danger-zone">
          <div>
            <h4>{translation('AdminStoresPage.manage-organization-button')}</h4>
            <p>{translation('storeSummary.removeStoreWarning')}</p>
          </div>
          <button
            type="button"
            className="link-danger"
            onClick={() => setOrganizationDeleteModalOpen(true)}
          >
            {translation('delete')}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isStoreModalOpen}
        onClose={closeStoreModal}
        title={
          editingStore
            ? translation('storeSummary.storeSettings')
            : translation('AdminStoresPage.new-store-button')
        }
        description={
          selectedOrganization?.name ?? translation('AdminStoresPage.stores-title-no-org-selected')
        }
      >
        {storeError && <p className="form-message form-message--error">{storeError}</p>}
        <form className="form-grid" onSubmit={handleStoreSubmit} data-testid="store-form">
          <TextInput
            id="store-name"
            label={translation('storeManagement.storeNameLabel')}
            value={storeForm.name}
            onChange={(event) =>
              setStoreForm((previous) => ({ ...previous, name: event.target.value }))
            }
            required
          />
          <TextInput
            id="store-site"
            label={translation('storeManagement.storeSiteLabel')}
            value={storeForm.site}
            onChange={(event) =>
              setStoreForm((previous) => ({ ...previous, site: event.target.value }))
            }
            required
          />
          <SelectInput
            id="store-stage"
            label={translation('storeManagement.storeEnvironmentLabel')}
            value={storeForm.stage}
            onChange={(event) =>
              setStoreForm((previous) => ({
                ...previous,
                stage: event.target.value as 'WS' | 'Preview',
              }))
            }
            options={[
              { value: 'WS', label: translation('storeManagement.storePlatformVtexio') },
              { value: 'Preview', label: translation('storeManagement.storePlatformFaststore') },
            ]}
          />

          <TextInput
            id="store-environment-columns"
            label={translation('createEnvironment.environmentColumns')}
            value={storeForm.environmentColumns}
            onChange={(event) =>
              setStoreForm((previous) => ({ ...previous, environmentColumns: event.target.value }))
            }
          />
          <div className="form-actions">
            <Button type="submit" isLoading={isSavingStore}>
              {editingStore
                ? translation('storeSummary.saveChanges')
                : translation('AdminStoresPage.new-store-button')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeStoreModal}
              disabled={isSavingStore}
            >
              {translation('cancel')}
            </Button>
          </div>
        </form>
        {editingStore ? (
          <div className="modal-danger-zone">
            <div>
              <h4>{translation('storeSummary.removeStore')}</h4>
              <p>{translation('storeSummary.removeStoreWarning')}</p>
            </div>
            <button
              type="button"
              className="link-danger"
              onClick={() => setStoreDeleteModalOpen(true)}
            >
              {translation('delete')}
            </button>
          </div>
        ) : null}
      </Modal>

      <ConfirmDeleteModal
        isOpen={organizationDeleteModalOpen}
        message={translation('AdminStoresPage.manage-organization-button')}
        description={selectedOrganization?.name ?? ''}
        confirmText={translation('delete')}
        cancelText={translation('cancel')}
        isConfirming={isSavingOrganization}
        onClose={() => setOrganizationDeleteModalOpen(false)}
        onConfirm={() => void handleDeleteOrganization()}
      />

      <ConfirmDeleteModal
        isOpen={storeDeleteModalOpen}
        message={translation('storeSummary.removeStore')}
        description={editingStore?.name ?? ''}
        confirmText={translation('delete')}
        cancelText={translation('cancel')}
        isConfirming={isSavingStore}
        onClose={() => setStoreDeleteModalOpen(false)}
        onConfirm={() => void handleDeleteStore()}
      />
    </Layout>
  );
};
