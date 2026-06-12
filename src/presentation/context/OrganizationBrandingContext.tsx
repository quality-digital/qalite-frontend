import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { Organization } from '../../domain/entities/organization';

interface BrandingStore {
  id?: string | null;
  name: string;
  logoUrl?: string | null;
  site?: string | null;
}

interface OrganizationBrandingContextValue {
  activeOrganization: Organization | null;
  activeStore: BrandingStore | null;
  setActiveOrganization: (organization: Organization | null) => void;
  setActiveStore: (store: BrandingStore | null) => void;
}

const OrganizationBrandingContext = createContext<OrganizationBrandingContextValue | undefined>(
  undefined,
);

export const OrganizationBrandingProvider = ({ children }: { children: ReactNode }) => {
  const [activeOrganization, setActiveOrganizationState] = useState<Organization | null>(null);
  const [activeStore, setActiveStoreState] = useState<BrandingStore | null>(null);

  const setActiveOrganization = useCallback((organization: Organization | null) => {
    setActiveOrganizationState(organization);
  }, []);

  const setActiveStore = useCallback((store: BrandingStore | null) => {
    setActiveStoreState(store);
  }, []);

  const value = useMemo(
    () => ({
      activeOrganization,
      activeStore,
      setActiveOrganization,
      setActiveStore,
    }),
    [activeOrganization, activeStore, setActiveOrganization, setActiveStore],
  );

  return (
    <OrganizationBrandingContext.Provider value={value}>
      {children}
    </OrganizationBrandingContext.Provider>
  );
};

export const useOrganizationBranding = (): OrganizationBrandingContextValue => {
  const context = useContext(OrganizationBrandingContext);

  if (!context) {
    throw new Error('useOrganizationBranding must be used within OrganizationBrandingProvider');
  }

  return context;
};
