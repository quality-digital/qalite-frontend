import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { Organization, OrganizationAccessRequest } from '../../domain/entities/organization';
import {
  listenToOrganizationsSummary,
  listenToPendingAccessRequestsByUser,
} from '../../infrastructure/external/organizations';
import { organizationService } from '../../infrastructure/services/organizationService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { CachedImage } from '../components/CachedImage';
import { UsersGroupIcon } from '../components/icons';

export const NoOrganizationPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pendingRequests, setPendingRequests] = useState<OrganizationAccessRequest[]>([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [requestingOrganizationId, setRequestingOrganizationId] = useState<string | null>(null);
  const [cancelingOrganizationId, setCancelingOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.organizationId) {
      navigate('/organization', { replace: true });
    }
  }, [navigate, user?.organizationId]);

  useEffect(() => {
    setIsLoadingOrganizations(true);

    const unsubscribe = listenToOrganizationsSummary(
      (nextOrganizations) => {
        setOrganizations(nextOrganizations);
        setIsLoadingOrganizations(false);
      },
      (error) => {
        console.error(error);
        setIsLoadingOrganizations(false);
        showToast({
          type: 'error',
          message: t('organizationAccessRequests.loadOrganizationsError'),
        });
      },
    );

    return () => {
      unsubscribe();
    };
  }, [showToast, t]);

  useEffect(() => {
    if (!user?.uid) {
      setPendingRequests([]);
      return;
    }

    const unsubscribe = listenToPendingAccessRequestsByUser(
      user.uid,
      setPendingRequests,
      (error) => {
        console.error(error);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  const pendingRequestMap = useMemo(
    () => new Set(pendingRequests.map((request) => request.organizationId)),
    [pendingRequests],
  );
  const hasAnyPendingRequest = pendingRequests.length > 0;

  const handleRequestAccess = async (organization: Organization) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setRequestingOrganizationId(organization.id);
      await organizationService.requestAccess({
        organizationId: organization.id,
        userId: user.uid,
        userEmail: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL ?? null,
      });
      showToast({
        type: 'success',
        message: t('organizationAccessRequests.requestCreated', {
          organizationName: organization.name,
        }),
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: 'error',
        message:
          error instanceof Error ? error.message : t('organizationAccessRequests.requestError'),
      });
    } finally {
      setRequestingOrganizationId(null);
    }
  };

  const handleCancelRequest = async (organization: Organization) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setCancelingOrganizationId(organization.id);
      await organizationService.cancelAccessRequest({
        organizationId: organization.id,
        userId: user.uid,
      });
      showToast({
        type: 'success',
        message: t('organizationAccessRequests.cancelSuccess', {
          organizationName: organization.name,
        }),
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: 'error',
        message:
          error instanceof Error ? error.message : t('organizationAccessRequests.cancelError'),
      });
    } finally {
      setCancelingOrganizationId(null);
    }
  };

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <h1 className="section-title">{t('noOrganization.title')}</h1>
            <p className="section-subtitle">{t('noOrganization.subtitle')}</p>
          </div>
        </div>
        <div className="page-header">
          <div>
            <h2 className="section-title">
              {t('organizationAccessRequests.availableOrganizations')}
            </h2>
            <p className="section-subtitle">
              {t('organizationAccessRequests.availableOrganizationsSubtitle')}
            </p>
            {hasAnyPendingRequest ? (
              <p className="section-subtitle" style={{ marginTop: 6 }}>
                {t('organizationAccessRequests.singlePendingRule')}
              </p>
            ) : null}
          </div>
        </div>

        {isLoadingOrganizations ? (
          <p className="section-subtitle">{t('organizationAccessRequests.loading')}</p>
        ) : organizations.length === 0 ? (
          <div className="dashboard-empty">
            <h3 className="text-xl font-semibold text-primary">
              {t('organizationAccessRequests.emptyTitle')}
            </h3>
            <p className="section-subtitle">{t('organizationAccessRequests.emptyDescription')}</p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {organizations.map((organization) => {
              const hasPendingRequest = pendingRequestMap.has(organization.id);
              const isBlockedBySinglePendingRule = hasAnyPendingRequest && !hasPendingRequest;

              return (
                <article key={organization.id} className="card">
                  <div className="card-title-group">
                    {organization.logoUrl ? (
                      <CachedImage
                        src={organization.logoUrl}
                        alt={organization.name}
                        style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8 }}
                      />
                    ) : (
                      <span className="card-title-icon" aria-hidden>
                        <UsersGroupIcon className="icon icon--lg" />
                      </span>
                    )}
                    <div>
                      <h3 className="card-title">{organization.name}</h3>
                      <p className="section-subtitle">
                        {organization.emailDomain
                          ? t('organizationAccessRequests.domainHint', {
                              emailDomain: organization.emailDomain,
                            })
                          : t('organizationAccessRequests.manualApprovalHint')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <span className="badge">
                      {hasPendingRequest
                        ? t('organizationAccessRequests.pendingBadge')
                        : isBlockedBySinglePendingRule
                          ? t('organizationAccessRequests.requestBlocked')
                          : t('organizationAccessRequests.availableBadge')}
                    </span>
                    {hasPendingRequest ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleCancelRequest(organization)}
                        disabled={cancelingOrganizationId === organization.id}
                        isLoading={cancelingOrganizationId === organization.id}
                        loadingText={t('organizationAccessRequests.canceling')}
                      >
                        {t('organizationAccessRequests.cancelButton')}
                      </Button>
                    ) : isBlockedBySinglePendingRule ? null : (
                      <Button
                        type="button"
                        onClick={() => handleRequestAccess(organization)}
                        disabled={requestingOrganizationId === organization.id}
                        isLoading={requestingOrganizationId === organization.id}
                        loadingText={t('organizationAccessRequests.requesting')}
                      >
                        {t('organizationAccessRequests.requestButton')}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
};
