import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { firebaseFirestore } from '../../infra/firebase/firebaseConfig';
import { environmentService } from '../../main/factories/environmentServiceFactory';
import { useAuth } from './useAuth';

export interface PresentUserProfile {
  id: string;
  name: string;
  photoURL?: string;
}

interface UsePresentUsersParams {
  environmentId: string | null | undefined;
  presentUsersIds: string[];
  isLocked: boolean;
}

export const usePresentUsers = ({
  environmentId,
  presentUsersIds,
  isLocked,
}: UsePresentUsersParams) => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<PresentUserProfile[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchProfiles = async () => {
      if (!presentUsersIds || presentUsersIds.length === 0) {
        if (isMounted) {
          setProfiles([]);
        }
        return;
      }

      const entries = await Promise.all(
        presentUsersIds.map(async (userId) => {
          const userRef = doc(firebaseFirestore, 'users', userId);
          const snapshot = await getDoc(userRef);
          const data = snapshot.data();
          return {
            id: userId,
            name: data?.displayName ?? data?.email ?? 'Usuário',
            photoURL: data?.photoURL ?? undefined,
          };
        }),
      );

      if (isMounted) {
        setProfiles(entries);
      }
    };

    void fetchProfiles();
    return () => {
      isMounted = false;
    };
  }, [presentUsersIds]);

  const joinEnvironment = useCallback(async () => {
    if (!environmentId || !user?.uid || isLocked) {
      return;
    }

    try {
      await environmentService.addUser(environmentId, user.uid);
    } catch (error) {
      console.error(error);
    }
  }, [environmentId, isLocked, user?.uid]);

  const leaveEnvironment = useCallback(async () => {
    if (!environmentId || !user?.uid) {
      return;
    }

    try {
      await environmentService.removeUser(environmentId, user.uid);
    } catch (error) {
      console.error(error);
    }
  }, [environmentId, user?.uid]);

  useEffect(() => {
    if (!environmentId || !user?.uid || isLocked) {
      return undefined;
    }

    void joinEnvironment();
    return () => {
      void leaveEnvironment();
    };
  }, [environmentId, isLocked, joinEnvironment, leaveEnvironment, user?.uid]);

  const isCurrentUserPresent = useMemo(
    () => (user?.uid ? presentUsersIds.includes(user.uid) : false),
    [presentUsersIds, user?.uid],
  );

  return { presentUsers: profiles, isCurrentUserPresent, joinEnvironment, leaveEnvironment };
};
