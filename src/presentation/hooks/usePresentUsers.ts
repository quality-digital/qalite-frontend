import { useCallback, useEffect, useMemo, useRef } from 'react';
import { environmentService } from '../../main/factories/environmentServiceFactory';
import { useAuth } from './useAuth';

interface UsePresentUsersParams {
  environmentId: string | null | undefined;
  presentUsersIds: string[];
  isLocked: boolean;
  shouldAutoJoin?: boolean;
}

export const usePresentUsers = ({
  environmentId,
  presentUsersIds,
  isLocked,
  shouldAutoJoin = true,
}: UsePresentUsersParams) => {
  const { user } = useAuth();
  const hasJoinedRef = useRef(false);
  const isExitLockedRef = useRef(isLocked);

  isExitLockedRef.current = isLocked;

  const joinEnvironment = useCallback(async () => {
    if (!environmentId || !user?.uid || isLocked || hasJoinedRef.current) {
      return;
    }

    try {
      await environmentService.addUser(environmentId, user.uid);
      hasJoinedRef.current = true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, [environmentId, isLocked, user?.uid]);

  const leaveEnvironment = useCallback(async () => {
    if (!environmentId || !user?.uid || isExitLockedRef.current) {
      return;
    }

    try {
      await environmentService.removeUser(environmentId, user.uid);
      hasJoinedRef.current = false;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, [environmentId, user?.uid]);

  useEffect(() => {
    if (!environmentId || !user?.uid || isLocked || !shouldAutoJoin) {
      return undefined;
    }

    void joinEnvironment().catch(() => undefined);
    return () => {
      if (hasJoinedRef.current && !isExitLockedRef.current) {
        void leaveEnvironment().catch(() => undefined);
      }
    };
  }, [environmentId, isLocked, joinEnvironment, leaveEnvironment, shouldAutoJoin, user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      hasJoinedRef.current = false;
      return;
    }

    hasJoinedRef.current = presentUsersIds.includes(user.uid);
  }, [presentUsersIds, user?.uid]);

  const isCurrentUserPresent = useMemo(
    () => (user?.uid ? presentUsersIds.includes(user.uid) : false),
    [presentUsersIds, user?.uid],
  );

  return { isCurrentUserPresent, joinEnvironment, leaveEnvironment };
};
