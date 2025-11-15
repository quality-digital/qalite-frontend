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
  members: OrganizationMember[];
  memberIds: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
}
