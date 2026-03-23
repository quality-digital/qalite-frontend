import { ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { listenToAllPendingAccessRequests } from '../../infrastructure/external/organizations';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ToastContext';

export const AdminAccessRequestsNotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const previousCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      previousCountRef.current = null;
      return;
    }

    return listenToAllPendingAccessRequests(
      (requests) => {
        const nextCount = requests.length;
        const previousCount = previousCountRef.current;

        if (previousCount !== null && nextCount > previousCount) {
          showToast({
            type: 'alert',
            message: t('organizationAccessRequests.adminToast', { count: nextCount }),
            duration: 7000,
          });
        }

        previousCountRef.current = nextCount;
      },
      () => undefined,
    );
  }, [showToast, t, user?.role]);

  return <>{children}</>;
};
