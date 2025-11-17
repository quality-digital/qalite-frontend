import { useCallback, useEffect, useMemo } from 'react';
import { environmentService } from '../../main/factories/environmentServiceFactory';
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

  return { isCurrentUserPresent, joinEnvironment, leaveEnvironment };
};
