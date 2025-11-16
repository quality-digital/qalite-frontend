import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { firebaseFirestore } from '../../infra/firebase/firebaseConfig';
import type { PresentUserProfile } from './usePresentUsers';

export const useUserProfiles = (userIds: string[]) => {
  const [profiles, setProfiles] = useState<PresentUserProfile[]>([]);

  useEffect(() => {
    let isMounted = true;
    const uniqueIds = Array.from(new Set(userIds));

    if (uniqueIds.length === 0) {
      setProfiles([]);
      return () => {
        isMounted = false;
      };
    }

    const fetchProfiles = async () => {
      const entries = await Promise.all(
        uniqueIds.map(async (userId) => {
          const userRef = doc(firebaseFirestore, 'users', userId);
          const snapshot = await getDoc(userRef);
          const data = snapshot.data();
          return {
            id: userId,
            name: data?.displayName ?? data?.email ?? 'Usuário',
            photoURL: data?.photoURL ?? undefined,
          } as PresentUserProfile;
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
  }, [userIds]);

  return profiles;
};
