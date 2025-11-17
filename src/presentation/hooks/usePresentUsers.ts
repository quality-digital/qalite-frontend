import { useCallback, useEffect, useMemo, useState } from 'react';

import type { UserSummary } from '../../domain/entities/UserSummary';
import { environmentService } from '../../main/factories/environmentServiceFactory';
import { userService } from '../../main/factories/userServiceFactory';
import { useAuth } from './useAuth';

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
  const [profiles, setProfiles] = useState<UserSummary[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchProfiles = async () => {
      if (!presentUsersIds || presentUsersIds.length === 0) {
        if (isMounted) {
          setProfiles([]);
        }
        return;
      }

      try {
        const summaries = await userService.getSummariesByIds(presentUsersIds);
        if (isMounted) {
          setProfiles(summaries);
        }
      } catch (error) {
        console.error('Failed to fetch user profiles', error);
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
