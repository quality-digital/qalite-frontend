import type { BrowserstackCredentials } from './browserstack';

export interface OrganizationMember {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

export interface OrganizationAccessRequest {
  id: string;
  organizationId: string;
  userId: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Organization {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  slackWebhookUrl: string | null;
  emailDomain: string | null;
  browserstackCredentials?: BrowserstackCredentials | null;
  members: OrganizationMember[];
  memberIds: string[];
  pendingAccessRequests: OrganizationAccessRequest[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateOrganizationPayload {
  name: string;
  description: string;
  slackWebhookUrl?: string | null;
  emailDomain?: string | null;
  browserstackCredentials?: BrowserstackCredentials | null;
}

export interface UpdateOrganizationPayload {
  name: string;
  description: string;
  logoUrl?: string | null;
  slackWebhookUrl?: string | null;
  emailDomain?: string | null;
  browserstackCredentials?: BrowserstackCredentials | null;
}

export interface AddUserToOrganizationPayload {
  organizationId: string;
  userEmail: string;
}

export interface RemoveUserFromOrganizationPayload {
  organizationId: string;
  userId: string;
}

export interface RequestOrganizationAccessPayload {
  organizationId: string;
  userId: string;
  userEmail: string;
  displayName: string;
  photoURL?: string | null;
}

export interface CancelOrganizationAccessRequestPayload {
  organizationId: string;
  userId: string;
}
