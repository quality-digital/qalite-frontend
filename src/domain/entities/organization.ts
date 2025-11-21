export interface OrganizationMember {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

export interface Organization {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  members: OrganizationMember[];
  memberIds: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateOrganizationPayload {
  name: string;
  description: string;
  logoFile?: File | null;
}

export interface UpdateOrganizationPayload {
  name: string;
  description: string;
  logoFile?: File | null;
}

export interface AddUserToOrganizationPayload {
  organizationId: string;
  userEmail: string;
}

export interface RemoveUserFromOrganizationPayload {
  organizationId: string;
  userId: string;
}
