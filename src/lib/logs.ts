import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';

import type { ActivityLog, ActivityLogInput } from './types';
import { getCurrentUser } from './auth';
import { firebaseFirestore } from './firebase';

const LOGS_COLLECTION = 'logs';
const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

const logsCollection = collection(firebaseFirestore, LOGS_COLLECTION);

const mapLog = (id: string, data: Record<string, unknown>): ActivityLog => {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;
  return {
    id,
    organizationId: (data.organizationId as string) ?? '',
    entityId: (data.entityId as string) ?? '',
    entityType: (data.entityType as ActivityLog['entityType']) ?? 'organization',
    action: (data.action as ActivityLog['action']) ?? 'create',
    message: (data.message as string) ?? '',
    actorId: (data.actorId as string | undefined | null) ?? null,
    actorName: (data.actorName as string | undefined | null) ?? 'Usuário não identificado',
    createdAt,
  };
};

const cleanupOldLogs = async (organizationId: string): Promise<void> => {
  const cutoff = Timestamp.fromMillis(Date.now() - THIRTY_DAYS_MS);
  const oldLogsQuery = query(
    logsCollection,
    where('organizationId', '==', organizationId),
    where('createdAt', '<', cutoff),
  );

  const snapshot = await getDocs(oldLogsQuery);

  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(firebaseFirestore);
  snapshot.docs.forEach((docSnapshot) => batch.delete(docSnapshot.ref));
  await batch.commit();
};

export const logActivity = async (input: ActivityLogInput): Promise<void> => {
  const actor = input.actor ?? (await getCurrentUser());

  await cleanupOldLogs(input.organizationId);

  await addDoc(logsCollection, {
    organizationId: input.organizationId,
    entityId: input.entityId,
    entityType: input.entityType,
    action: input.action,
    message: input.message,
    actorId: actor?.uid ?? null,
    actorName: actor?.displayName ?? actor?.email ?? 'Usuário não identificado',
    createdAt: serverTimestamp(),
  });
};

export const listOrganizationLogs = async (organizationId: string): Promise<ActivityLog[]> => {
  await cleanupOldLogs(organizationId);

  const logsQuery = query(
    logsCollection,
    where('organizationId', '==', organizationId),
    orderBy('createdAt', 'desc'),
  );

  const snapshot = await getDocs(logsQuery);
  return snapshot.docs.map((docSnapshot) => mapLog(docSnapshot.id, docSnapshot.data() ?? {}));
};
