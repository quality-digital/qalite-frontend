import { useEffect, useState } from 'react';

import type { UserSummary } from '../../lib/types';
import { userService } from '../../services';

export const useUserProfiles = (userIds: string[]) => {
  const [profiles, setProfiles] = useState<UserSummary[]>([]);

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
      try {
        const summaries = await userService.getSummariesByIds(uniqueIds);
        if (isMounted) {
          setProfiles(summaries);
        }
      } catch (error) {
        console.error('Failed to load user profiles', error);
      }
    };

    void fetchProfiles();
    return () => {
      isMounted = false;
    };
  }, [userIds]);

  return profiles;
};
