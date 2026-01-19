import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Organization, OrganizationMember } from '../../domain/entities/organization';
import type { Store } from '../../domain/entities/store';
import type { BrowserstackBuild } from '../../domain/entities/browserstack';
import type { UserSummary } from '../../domain/entities/user';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { browserstackService } from '../../application/use-cases/BrowserstackUseCase';
import { userService } from '../../application/use-cases/UserUseCase';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Layout } from '../components/Layout';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { TextInput } from '../components/TextInput';
import { Modal } from '../components/Modal';
import { UserAvatar } from '../components/UserAvatar';
import { SimpleBarChart } from '../components/SimpleBarChart';
import { BrowserstackKanban } from '../components/browserstack/BrowserstackKanban';
import {
  BarChartIcon,
  SettingsIcon,
  SparklesIcon,
  StorefrontIcon,
  UsersGroupIcon,
} from '../components/icons';
import { OrganizationLogPanel } from '../components/OrganizationLogPanel';
import { isAutomatedScenario } from '../../shared/utils/automation';
import { useTranslation } from 'react-i18next';

interface StoreForm {
  name: string;
  site: string;
}

interface OrganizationFormState {
  name: string;
  slackWebhookUrl: string;
  emailDomain: string;
  browserstackUsername: string;
  browserstackAccessKey: string;
}

const initialStoreForm: StoreForm = {
  name: '',
  site: '',
};

const initialOrganizationForm: OrganizationFormState = {
  name: '',
  slackWebhookUrl: '',
  emailDomain: '',
  browserstackUsername: '',
  browserstackAccessKey: '',
};

export const AdminStoresPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setActiveOrganization } = useOrganizationBranding();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isOrganizationLocked, setIsOrganizationLocked] = useState(false);
  const [storeForm, setStoreForm] = useState<StoreForm>(initialStoreForm);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [isOrganizationModalOpen, setIsOrganizationModalOpen] = useState(false);
  const [organizationForm, setOrganizationForm] =
    useState<OrganizationFormState>(initialOrganizationForm);
  const [isOrganizationSlackSectionOpen, setIsOrganizationSlackSectionOpen] = useState(false);
  const [isOrganizationBrowserstackSectionOpen, setIsOrganizationBrowserstackSectionOpen] =
    useState(false);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<UserSummary[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    message: string;
    description?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [storeAutomationCounts, setStoreAutomationCounts] = useState<Record<string, number>>({});
  const [isLoadingAutomationStats, setIsLoadingAutomationStats] = useState(false);
  const [browserstackBuilds, setBrowserstackBuilds] = useState<BrowserstackBuild[]>([]);
  const [isLoadingBrowserstack, setIsLoadingBrowserstack] = useState(false);
  const { t: translation } = useTranslation();

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const data = await organizationService.list();
        setOrganizations(data);
        const organizationFromParam = searchParams.get('organizationId');
        const hasValidOrganizationParam = Boolean(
          organizationFromParam && data.some((item) => item.id === organizationFromParam),
        );

        if (hasValidOrganizationParam && organizationFromParam) {
          setSelectedOrganizationId(organizationFromParam);
          setIsOrganizationLocked(true);
          return;
        }

        setIsOrganizationLocked(false);
        if (data.length > 0) {
          setSelectedOrganizationId(data[0].id);
        } else {
          setSelectedOrganizationId('');
        }
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: translation('AdminStoresPage.toast-error-load-orgs') });
      }
    };

    void fetchOrganizations();
  }, [searchParams, showToast, translation]);

  useEffect(() => {
    if (!selectedOrganizationId) {
      setStores([]);
      setStoreAutomationCounts({});
      return;
    }

    const fetchStores = async () => {
      try {
        setIsLoadingStores(true);
        const data = await storeService.listByOrganization(selectedOrganizationId);
        setStores(data);
        setSearchParams({ organizationId: selectedOrganizationId });
      } catch (error) {
        console.error(error);
        showToast({
          type: 'error',
          message: translation('AdminStoresPage.toast-error-load-stores'),
        });
      } finally {
        setIsLoadingStores(false);
      }
    };

    void fetchStores();
  }, [selectedOrganizationId, setSearchParams, showToast, translation]);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId],
  );

  useEffect(() => {
    setActiveOrganization(selectedOrganization ?? null);
  }, [selectedOrganization, setActiveOrganization]);

  useEffect(() => () => setActiveOrganization(null), [setActiveOrganization]);

  useEffect(() => {
    if (!selectedOrganizationId || stores.length === 0) {
      setStoreAutomationCounts({});
      return;
    }

    let isMounted = true;

    const fetchAutomationStats = async () => {
      setIsLoadingAutomationStats(true);
      try {
        const results = await Promise.all(
          stores.map(async (store) => {
            const scenarios = await storeService.listScenarios(store.id);
            const automatedCount = scenarios.filter((scenario) =>
              isAutomatedScenario(scenario.automation),
            ).length;

            return [store.id, automatedCount] as const;
          }),
        );

        if (isMounted) {
          setStoreAutomationCounts(Object.fromEntries(results));
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          showToast({
            type: 'error',
            message: translation('AdminStoresPage.toast-error-load-automation-stats'),
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingAutomationStats(false);
        }
      }
    };

    void fetchAutomationStats();

    return () => {
      isMounted = false;
    };
  }, [selectedOrganizationId, stores, showToast, translation]);

  useEffect(() => {
    const searchTerm = newMemberEmail.trim();

    if (!searchTerm) {
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
        } catch (error) {
          console.error(error);
          setUserSuggestions([]);
        } finally {
          setIsSearchingUsers(false);
        }
      };

      void fetchSuggestions();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [newMemberEmail, selectedOrganization]);

  const selectedOrganizationCredentials = selectedOrganization?.browserstackCredentials ?? null;
  const hasBrowserstackCredentials = useMemo(
    () =>
      Boolean(
        selectedOrganizationCredentials?.username && selectedOrganizationCredentials?.accessKey,
      ),
    [selectedOrganizationCredentials?.accessKey, selectedOrganizationCredentials?.username],
  );

  const loadBrowserstackBuilds = useCallback(async () => {
    if (!selectedOrganizationCredentials || !hasBrowserstackCredentials) {
      setBrowserstackBuilds([]);
      return;
    }

    try {
      setIsLoadingBrowserstack(true);
      const builds = await browserstackService.listBuilds(selectedOrganizationCredentials);
      setBrowserstackBuilds(builds);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : translation('AdminStoresPage.toast-error-load-browserstack');

      setBrowserstackBuilds([]);
      showToast({ type: 'error', message });
    } finally {
      setIsLoadingBrowserstack(false);
    }
  }, [hasBrowserstackCredentials, selectedOrganizationCredentials, showToast, translation]);

  useEffect(() => {
    void loadBrowserstackBuilds();
  }, [loadBrowserstackBuilds]);

  const scenariosPerStoreData = useMemo(
    () =>
      stores.map((store) => ({
        label: store.name,
        value: store.scenarioCount,
      })),
    [stores],
  );

  const automatedScenariosPerStoreData = useMemo(
    () =>
      stores.map((store) => ({
        label: store.name,
        value: storeAutomationCounts[store.id] ?? 0,
      })),
    [stores, storeAutomationCounts],
  );

  const openCreateModal = () => {
    setStoreForm(initialStoreForm);
    setStoreError(null);
    setIsStoreModalOpen(true);
  };

  const closeStoreModal = () => {
    setIsStoreModalOpen(false);
    setStoreForm(initialStoreForm);
    setStoreError(null);
  };

  const openOrganizationModal = () => {
    if (!selectedOrganization) {
      return;
    }

    const slackWebhookUrl = selectedOrganization.slackWebhookUrl ?? '';
    const emailDomain = selectedOrganization.emailDomain ?? '';
    const browserstackUsername = selectedOrganization.browserstackCredentials?.username ?? '';
    const browserstackAccessKey = selectedOrganization.browserstackCredentials?.accessKey ?? '';

    setOrganizationForm({
      name: selectedOrganization.name,
      slackWebhookUrl,
      emailDomain,
      browserstackUsername,
      browserstackAccessKey,
    });
    setIsOrganizationSlackSectionOpen(Boolean(slackWebhookUrl.trim()));
    setIsOrganizationBrowserstackSectionOpen(
      Boolean(browserstackUsername.trim() || browserstackAccessKey.trim()),
    );
    setOrganizationError(null);
    setIsOrganizationModalOpen(true);
  };

  const closeOrganizationModal = () => {
    setIsOrganizationModalOpen(false);
    setOrganizationError(null);
    setIsOrganizationSlackSectionOpen(false);
    setIsOrganizationBrowserstackSectionOpen(false);
    setOrganizationForm(initialOrganizationForm);
    setNewMemberEmail('');
    setUserSuggestions([]);
  };

  const toggleOrganizationSlackSection = () => {
    setIsOrganizationSlackSectionOpen((previous) => {
      const nextValue = !previous;

      if (!nextValue) {
        setOrganizationForm((form) => ({ ...form, slackWebhookUrl: '' }));
      }

      return nextValue;
    });
  };

  const toggleOrganizationBrowserstackSection = () => {
    setIsOrganizationBrowserstackSectionOpen((previous) => {
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

  const handleStoreSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStoreError(null);

    const trimmedName = storeForm.name.trim();
    const trimmedSite = storeForm.site.trim();

    if (!selectedOrganizationId) {
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

      const created = await storeService.create({
        organizationId: selectedOrganizationId,
        name: trimmedName,
        site: trimmedSite,
        stage: '',
      });

      setStores((previous) => [...previous, created].sort((a, b) => a.name.localeCompare(b.name)));
      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-store-created'),
      });
      closeStoreModal();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : translation('AdminStoresPage.toast-error-save-store');
      setStoreError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingStore(false);
    }
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
      const browserstackUsername = isOrganizationBrowserstackSectionOpen
        ? organizationForm.browserstackUsername.trim()
        : '';
      const browserstackAccessKey = isOrganizationBrowserstackSectionOpen
        ? organizationForm.browserstackAccessKey.trim()
        : '';

      const updated = await organizationService.update(selectedOrganization.id, {
        name: trimmedName,
        description: (selectedOrganization.description ?? '').trim(),
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

      setOrganizations((previous) =>
        previous.map((organization) => (organization.id === updated.id ? updated : organization)),
      );
      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-org-updated'),
      });
      closeOrganizationModal();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : translation('AdminStoresPage.toast-error-save-org');
      setOrganizationError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleDeleteOrganization = async (organization: Organization) => {
    try {
      setIsSavingOrganization(true);
      await organizationService.delete(organization.id);
      const remainingOrganizations = organizations.filter((item) => item.id !== organization.id);
      setOrganizations(remainingOrganizations);
      setStores([]);
      closeOrganizationModal();
      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-org-removed'),
      });

      setSelectedOrganizationId('');
      setSearchParams({});
      navigate('/admin');
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : translation('AdminStoresPage.toast-error-remove-org');
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
      const member = await organizationService.addUser({
        organizationId: selectedOrganization.id,
        userEmail: trimmedEmail,
      });

      setOrganizations((previous) =>
        previous.map((organization) =>
          organization.id === selectedOrganization.id
            ? {
                ...organization,
                members: [...organization.members, member],
                memberIds: [...organization.memberIds, member.uid],
              }
            : organization,
        ),
      );

      setNewMemberEmail('');
      setUserSuggestions([]);
      setOrganizationError(null);
      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-member-added'),
      });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : translation('AdminStoresPage.toast-error-add-member');
      setOrganizationError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsManagingMembers(false);
    }
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (!selectedOrganization) {
      return;
    }

    try {
      setIsManagingMembers(true);
      await organizationService.removeUser({
        organizationId: selectedOrganization.id,
        userId: member.uid,
      });

      setOrganizations((previous) =>
        previous.map((organization) =>
          organization.id === selectedOrganization.id
            ? {
                ...organization,
                members: organization.members.filter((item) => item.uid !== member.uid),
                memberIds: organization.memberIds.filter((item) => item !== member.uid),
              }
            : organization,
        ),
      );

      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-member-removed'),
      });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : translation('AdminStoresPage.toast-error-remove-member');
      showToast({ type: 'error', message });
    } finally {
      setIsManagingMembers(false);
    }
  };

  const openDeleteOrganizationModal = () => {
    if (!selectedOrganization) {
      return;
    }

    setDeleteConfirmation({
      message: translation('AdminStoresPage.confirm-delete-org-message', {
        organizationName: selectedOrganization.name,
      }),
      description: translation('AdminStoresPage.confirm-delete-org-description'),
      onConfirm: () => handleDeleteOrganization(selectedOrganization),
    });
  };

  const openRemoveMemberModal = (member: OrganizationMember) => {
    if (!selectedOrganization) {
      return;
    }

    setDeleteConfirmation({
      message: translation('AdminStoresPage.confirm-remove-member-message', {
        memberName: member.displayName || member.email,
      }),
      description: translation('AdminStoresPage.confirm-remove-member-description', {
        organizationName: selectedOrganization.name,
      }),
      onConfirm: () => handleRemoveMember(member),
    });
  };

  const closeDeleteConfirmation = () => {
    if (isConfirmingDelete) {
      return;
    }

    setDeleteConfirmation(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) {
      return;
    }

    try {
      setIsConfirmingDelete(true);
      await deleteConfirmation.onConfirm();
    } finally {
      setIsConfirmingDelete(false);
      setDeleteConfirmation(null);
    }
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

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
            {selectedOrganization && (
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
              onClick={openCreateModal}
              disabled={!selectedOrganizationId}
              data-testid="new-store-button"
            >
              {translation('AdminStoresPage.new-store-button')}
            </Button>
          </div>
        </div>

        {isLoadingStores ? (
          <p className="section-subtitle">
            {translation('AdminStoresPage.loading-stores-message')}
          </p>
        ) : stores.length === 0 ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">
              {translation('AdminStoresPage.no-stores-title')}
            </h2>
            <p className="section-subtitle">{translation('AdminStoresPage.no-stores-subtitle')}</p>
            <Button type="button" onClick={openCreateModal} disabled={!selectedOrganizationId}>
              {translation('AdminStoresPage.new-store-button')}
            </Button>
          </div>
        ) : (
          <>
            {selectedOrganization && (
              <div className="page-section">
                <OrganizationLogPanel organizationId={selectedOrganization.id} />
              </div>
            )}

            <div className="dashboard-grid">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="card card-clickable"
                  data-testid={`store-card-${store.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/stores/${store.id}`)}
                  onKeyDown={(event) =>
                    handleCardKeyDown(event, () => navigate(`/stores/${store.id}`))
                  }
                >
                  <div className="card-header">
                    <div className="card-title-group">
                      <span className="card-title-icon" aria-hidden>
                        <StorefrontIcon className="icon icon--lg" />
                      </span>
                      <div>
                        <h2 className="card-title">{store.name}</h2>
                      </div>
                    </div>
                    <span className="badge">
                      {translation('AdminStoresPage.store-card-scenarios-badge', {
                        scenarioCount: store.scenarioCount,
                      })}
                    </span>
                  </div>
                  <div className="card-link-hint">
                    <span>{translation('storesPage.openStore')}</span>
                    <span aria-hidden>&rarr;</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="organization-extra">
              {selectedOrganization && (
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
                          <UserAvatar name={member.displayName || member.email} size="sm" />
                          <div className="collaborator-card__details">
                            <strong>{member.displayName || member.email}</strong>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              <section className="organization-charts-grid">
                <SimpleBarChart
                  title={translation('AdminStoresPage.chart-scenarios-title')}
                  description={translation('AdminStoresPage.scenarios-per-store-chart-description')}
                  data={scenariosPerStoreData}
                  emptyMessage={translation(
                    'AdminStoresPage.scenarios-per-store-chart-empty-message',
                  )}
                  icon={<BarChartIcon aria-hidden className="icon icon--lg" />}
                />
                <SimpleBarChart
                  title={translation('AdminStoresPage.chart-automated-title')}
                  description={translation('AdminStoresPage.automated-scenarios-chart-description')}
                  data={automatedScenariosPerStoreData}
                  emptyMessage={translation(
                    'AdminStoresPage.automated-scenarios-chart-empty-message',
                  )}
                  isLoading={isLoadingAutomationStats}
                  variant="info"
                  icon={<SparklesIcon aria-hidden className="icon icon--lg" />}
                />
              </section>

              {hasBrowserstackCredentials && (
                <BrowserstackKanban
                  builds={browserstackBuilds}
                  isLoading={isLoadingBrowserstack}
                  onRefresh={loadBrowserstackBuilds}
                />
              )}
            </div>
          </>
        )}
      </section>

      <Modal
        isOpen={isStoreModalOpen}
        onClose={closeStoreModal}
        title={translation('AdminStoresPage.store-name-label')}
        description={translation('AdminStoresPage.modal-store-description')}
      >
        {storeError && <p className="form-message form-message--error">{storeError}</p>}
        <form className="form-grid" onSubmit={handleStoreSubmit} data-testid="store-form">
          <TextInput
            id="store-name"
            label={translation('AdminStoresPage.store-name-label')}
            value={storeForm.name}
            onChange={(event) =>
              setStoreForm((previous) => ({ ...previous, name: event.target.value }))
            }
            placeholder={translation('AdminStoresPage.store-name-placeholder')}
            required
            dataTestId="store-name-input"
          />
          <TextInput
            id="store-site"
            label={translation('AdminStoresPage.store-site-label')}
            value={storeForm.site}
            onChange={(event) =>
              setStoreForm((previous) => ({ ...previous, site: event.target.value }))
            }
            placeholder={translation('AdminStoresPage.store-site-placeholder')}
            dataTestId="store-site-input"
          />
          <div className="form-actions">
            <Button
              type="submit"
              isLoading={isSavingStore}
              loadingText={translation('AdminStoresPage.save-button-saving')}
              data-testid="save-store-button"
            >
              {translation('AdminStoresPage.save-store-button')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeStoreModal}
              disabled={isSavingStore}
              data-testid="cancel-store-button"
            >
              {translation('AdminStoresPage.cancel-store-button')}
            </Button>
          </div>
        </form>
      </Modal>

      {selectedOrganization && (
        <Modal
          isOpen={isOrganizationModalOpen}
          onClose={closeOrganizationModal}
          title={translation('AdminStoresPage.modal-org-title', {
            organizationName: selectedOrganization.name,
          })}
        >
          {organizationError && (
            <p className="form-message form-message--error">{organizationError}</p>
          )}

          <form
            className="form-grid"
            onSubmit={handleOrganizationSubmit}
            data-testid="organization-settings-form"
          >
            <TextInput
              id="organization-name"
              label={translation('AdminStoresPage.org-name-label')}
              value={organizationForm.name}
              onChange={(event) =>
                setOrganizationForm((previous) => ({ ...previous, name: event.target.value }))
              }
              placeholder={translation('AdminStoresPage.org-name-placeholder')}
              required
              dataTestId="organization-settings-name"
            />
            <TextInput
              id="organization-email-domain"
              label={translation('AdminStoresPage.org-email-domain-label')}
              value={organizationForm.emailDomain}
              onChange={(event) =>
                setOrganizationForm((previous) => ({
                  ...previous,
                  emailDomain: event.target.value,
                }))
              }
              placeholder={translation('AdminStoresPage.org-email-domain-placeholder')}
              dataTestId="organization-settings-email-domain"
            />
            <p className="form-hint">{translation('AdminStoresPage.org-email-domain-hint')}</p>
            <div className="collapsible-section">
              <div className="collapsible-section__header">
                <div className="collapsible-section__titles">
                  <img
                    className="collapsible-section__icon"
                    src="https://img.icons8.com/color/48/browser-stack.png"
                    alt={translation('AdminStoresPage.org-browserstack-icon-alt')}
                    width={48}
                    height={48}
                  />
                  <p className="collapsible-section__title">
                    {translation('AdminStoresPage.org-browserstack-section-title')}
                  </p>
                  <p className="collapsible-section__description">
                    {translation('AdminStoresPage.org-browserstack-section-description')}
                  </p>
                </div>
                <label className="collapsible-section__toggle">
                  <input
                    type="checkbox"
                    checked={isOrganizationBrowserstackSectionOpen}
                    onChange={toggleOrganizationBrowserstackSection}
                    aria-expanded={isOrganizationBrowserstackSectionOpen}
                    aria-controls="organization-settings-browserstack-section"
                  />
                  <span>
                    {isOrganizationBrowserstackSectionOpen
                      ? translation('AdminStoresPage.org-browserstack-toggle-on')
                      : translation('AdminStoresPage.org-browserstack-toggle-off')}
                  </span>
                </label>
              </div>
              {isOrganizationBrowserstackSectionOpen && (
                <div
                  className="collapsible-section__body"
                  id="organization-settings-browserstack-section"
                  data-testid="organization-settings-browserstack-section"
                >
                  <div className="form-grid">
                    <TextInput
                      id="organization-browserstack-username"
                      label={translation('AdminStoresPage.org-browserstack-username-label')}
                      value={organizationForm.browserstackUsername}
                      onChange={(event) =>
                        setOrganizationForm((previous) => ({
                          ...previous,
                          browserstackUsername: event.target.value,
                        }))
                      }
                      placeholder={translation(
                        'AdminStoresPage.org-browserstack-username-placeholder',
                      )}
                      dataTestId="organization-settings-browserstack-username"
                    />
                    <TextInput
                      id="organization-browserstack-access-key"
                      label={translation('AdminStoresPage.org-browserstack-access-key-label')}
                      value={organizationForm.browserstackAccessKey}
                      onChange={(event) =>
                        setOrganizationForm((previous) => ({
                          ...previous,
                          browserstackAccessKey: event.target.value,
                        }))
                      }
                      placeholder={translation(
                        'AdminStoresPage.org-browserstack-access-key-placeholder',
                      )}
                      type="password"
                      dataTestId="organization-settings-browserstack-access-key"
                    />
                  </div>
                  <p className="form-hint">
                    {translation('AdminStoresPage.org-browserstack-hint')}
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
                    alt={translation('AdminStoresPage.org-slack-icon-alt')}
                    width={24}
                    height={24}
                  />
                  <p className="collapsible-section__title">
                    {translation('AdminStoresPage.org-slack-section-title')}
                  </p>
                  <p className="collapsible-section__description">
                    {translation('AdminStoresPage.org-slack-section-description')}
                  </p>
                </div>
                <label className="collapsible-section__toggle">
                  <input
                    type="checkbox"
                    checked={isOrganizationSlackSectionOpen}
                    onChange={toggleOrganizationSlackSection}
                    aria-expanded={isOrganizationSlackSectionOpen}
                    aria-controls="organization-settings-slack-section"
                  />
                  <span>
                    {isOrganizationSlackSectionOpen
                      ? translation('AdminStoresPage.org-slack-toggle-on')
                      : translation('AdminStoresPage.org-slack-toggle-off')}
                  </span>
                </label>
              </div>
              {isOrganizationSlackSectionOpen && (
                <div
                  className="collapsible-section__body"
                  id="organization-settings-slack-section"
                  data-testid="organization-settings-slack-section"
                >
                  <TextInput
                    id="organization-slack-webhook"
                    label={translation('AdminStoresPage.org-slack-webhook-label')}
                    value={organizationForm.slackWebhookUrl}
                    onChange={(event) =>
                      setOrganizationForm((previous) => ({
                        ...previous,
                        slackWebhookUrl: event.target.value,
                      }))
                    }
                    placeholder={translation('AdminStoresPage.org-slack-webhook-placeholder')}
                    dataTestId="organization-settings-slack-webhook"
                  />
                  <p className="form-hint">
                    {translation('AdminStoresPage.org-slack-webhook-hint')}
                  </p>
                </div>
              )}
            </div>
            <div className="form-actions">
              <Button
                type="submit"
                isLoading={isSavingOrganization}
                loadingText={translation('saving')}
                data-testid="save-organization-settings"
              >
                {translation('saveChanges')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={closeOrganizationModal}
                disabled={isSavingOrganization}
                data-testid="cancel-organization-settings"
              >
                {translation('AdminStoresPage.cancel-store-button')}
              </Button>
            </div>
          </form>

          <div className="card bg-surface" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-semibold text-primary">
                  {translation('AdminStoresPage.org-vinculed-members')}
                </h3>
                <p className="section-subtitle">
                  {translation('AdminStoresPage.org-slack-added-user')}
                </p>
              </div>
              <span className="badge">
                {translation('AdminStoresPage.member-count', {
                  count: selectedOrganization.members.length,
                })}
              </span>
            </div>

            <div className="member-invite-grid">
              <TextInput
                id="organization-add-member"
                label={translation('AdminStoresPage.org-added-user-to-email')}
                value={newMemberEmail}
                onChange={(event) => setNewMemberEmail(event.target.value)}
                placeholder={translation('AdminStoresPage.org-email-placeholder')}
                autoComplete="email"
                dataTestId="organization-add-member-input"
              />
              <Button
                type="button"
                onClick={handleAddMember}
                isLoading={isManagingMembers}
                loadingText={translation('AdminStoresPage.org-button-addeding')}
                data-testid="add-organization-member"
              >
                {translation('AdminStoresPage.org-added-user')}
              </Button>
            </div>
            <p className="form-hint">{translation('AdminStoresPage.member-add-hint')}</p>
            {isSearchingUsers && (
              <p className="form-hint">{translation('AdminStoresPage.user-search-loading')}</p>
            )}
            {!isSearchingUsers && userSuggestions.length > 0 && (
              <ul
                className="suggestion-list"
                role="listbox"
                aria-label={translation('AdminStoresPage.user-search-suggestions')}
              >
                {userSuggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      className="suggestion-option"
                      onClick={() => setNewMemberEmail(suggestion.email)}
                    >
                      <UserAvatar name={suggestion.displayName || suggestion.email} size="sm" />
                      <div className="suggestion-option__details">
                        <span className="suggestion-option__name">
                          {suggestion.displayName || suggestion.email}
                        </span>
                        <span className="suggestion-option__email">{suggestion.email}</span>
                      </div>
                      <span className="suggestion-option__hint">
                        {translation('AdminStoresPage.user-search-email-hint')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selectedOrganization.members.length === 0 ? (
              <p className="section-subtitle">
                {translation('AdminStoresPage.no-members-message')}
              </p>
            ) : (
              <ul className="member-list">
                {selectedOrganization.members.map((member) => (
                  <li key={member.uid} className="member-list-item">
                    <UserAvatar name={member.displayName || member.email} />
                    <div className="member-list-details">
                      <span className="member-list-name">{member.displayName || member.email}</span>
                      <span className="member-list-email">{member.email}</span>
                    </div>
                    <button
                      type="button"
                      className="member-list-remove"
                      onClick={() => openRemoveMemberModal(member)}
                      disabled={isManagingMembers}
                    >
                      {translation('AdminStoresPage.org-remove-user')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="modal-danger-zone">
            <div>
              <h4>{translation('AdminStoresPage.org-danger-zone')}</h4>
              <p>{translation('AdminStoresPage.org-remove-org-and-users')}</p>
            </div>
            <button
              type="button"
              className="link-danger"
              onClick={openDeleteOrganizationModal}
              disabled={isSavingOrganization}
              data-testid="delete-organization-button"
            >
              {translation('AdminStoresPage.org-remove-organization')}
            </button>
          </div>
        </Modal>
      )}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteConfirmation)}
        message={deleteConfirmation?.message}
        description={deleteConfirmation?.description}
        onClose={closeDeleteConfirmation}
        onConfirm={handleConfirmDelete}
        isConfirming={isConfirmingDelete}
      />
    </Layout>
  );
};
