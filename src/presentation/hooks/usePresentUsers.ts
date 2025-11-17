import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { EnvironmentStatus } from '../../domain/entities/Environment';
import { environmentService } from '../../main/factories/environmentServiceFactory';
import { useAuth } from './useAuth';

interface UsePresentUsersParams {
  environmentId: string | null | undefined;
  presentUsersIds: string[];
  status: EnvironmentStatus | null | undefined;
  shouldAutoJoin?: boolean;
}

export const usePresentUsers = ({
  environmentId,
  presentUsersIds,
  status,
  shouldAutoJoin = true,
}: UsePresentUsersParams) => {
  const { user } = useAuth();
  const hasJoinedRef = useRef(false);

  const isEnvironmentLocked = status === 'done';
  const isCurrentUserPresent = useMemo(
    () => (user?.uid ? presentUsersIds.includes(user.uid) : false),
    [presentUsersIds, user?.uid],
  );

  useEffect(() => {
    hasJoinedRef.current = isCurrentUserPresent;
  }, [isCurrentUserPresent]);

  const joinEnvironment = useCallback(async () => {
    if (!environmentId || !user?.uid || isEnvironmentLocked || hasJoinedRef.current) {
      return;
    }

    try {
      await environmentService.addUser(environmentId, user.uid);
      hasJoinedRef.current = true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, [environmentId, isEnvironmentLocked, user?.uid]);

  useEffect(() => {
    if (!environmentId || !user?.uid || isEnvironmentLocked || !shouldAutoJoin) {
      return;
    }

    void joinEnvironment().catch(() => undefined);
  }, [environmentId, isEnvironmentLocked, joinEnvironment, shouldAutoJoin, user?.uid]);

  return { isCurrentUserPresent, joinEnvironment };
};
