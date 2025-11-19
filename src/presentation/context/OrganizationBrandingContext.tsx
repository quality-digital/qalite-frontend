import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { Organization } from '../../lib/types';

interface OrganizationBrandingContextValue {
  activeOrganization: Organization | null;
  setActiveOrganization: (organization: Organization | null) => void;
}

const OrganizationBrandingContext = createContext<OrganizationBrandingContextValue | undefined>(
  undefined,
);

export const OrganizationBrandingProvider = ({ children }: { children: ReactNode }) => {
  const [activeOrganization, setActiveOrganizationState] = useState<Organization | null>(null);

  const setActiveOrganization = useCallback((organization: Organization | null) => {
    setActiveOrganizationState(organization);
  }, []);

  const value = useMemo(
    () => ({
      activeOrganization,
      setActiveOrganization,
    }),
    [activeOrganization, setActiveOrganization],
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
