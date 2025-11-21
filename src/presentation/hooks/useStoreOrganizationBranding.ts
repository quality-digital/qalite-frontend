import { useEffect, useState } from 'react';

import type { Organization } from '../../domain/entities/types';
import { organizationService } from '../../application/use-cases/organization';
import { storeService } from '../../application/use-cases/store';

export const useStoreOrganizationBranding = (storeId: string | null | undefined) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchOrganization = async () => {
      if (!storeId) {
        if (isMounted) {
          setOrganization(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const store = await storeService.getById(storeId);

        if (!store?.organizationId) {
          if (isMounted) {
            setOrganization(null);
          }
          return;
        }

        const org = await organizationService.getById(store.organizationId);
        if (isMounted) {
          setOrganization(org);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setOrganization(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchOrganization();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  return { organization, isLoading };
};
