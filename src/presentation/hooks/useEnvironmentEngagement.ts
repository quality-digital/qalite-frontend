import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Environment } from '../../lib/types';
import { environmentService } from '../../services';
import { useAuth } from './useAuth';

interface UseEnvironmentEngagementResult {
  hasEnteredEnvironment: boolean;
  isLocked: boolean;
  isScenarioLocked: boolean;
  isInteractionLocked: boolean;
  canCopyPublicLink: boolean;
  isShareDisabled: boolean;
  isJoiningEnvironment: boolean;
  isLeavingEnvironment: boolean;
  enterEnvironment: () => Promise<void>;
  leaveEnvironment: () => Promise<void>;
}

export const useEnvironmentEngagement = (
  environment: Environment | null | undefined,
): UseEnvironmentEngagementResult => {
  const { user } = useAuth();
  const [hasEnteredEnvironment, setHasEnteredEnvironment] = useState(false);
  const [isJoiningEnvironment, setIsJoiningEnvironment] = useState(false);
  const [isLeavingEnvironment, setIsLeavingEnvironment] = useState(false);
  const hasJoinedRef = useRef(false);
  const environmentId = environment?.id ?? null;
  const userId = user?.uid ?? null;
  const isLocked = environment?.status === 'done';
  const presentUsersIds = useMemo(
    () => environment?.presentUsersIds ?? [],
    [environment?.presentUsersIds],
  );
  const isCurrentUserPresent = useMemo(
    () => Boolean(userId && presentUsersIds.includes(userId)),
    [presentUsersIds, userId],
  );

  useEffect(() => {
    hasJoinedRef.current = isCurrentUserPresent;
  }, [isCurrentUserPresent]);

  useEffect(() => {
    if (!environmentId || !userId) {
      setHasEnteredEnvironment(false);
      return;
    }

    const hasPersistedEntry = environment?.participants?.includes(userId) ?? false;

    if (hasPersistedEntry && !hasEnteredEnvironment) {
      setHasEnteredEnvironment(true);
      return;
    }

    if (!hasPersistedEntry && !isCurrentUserPresent) {
      setHasEnteredEnvironment(false);
    }
  }, [
    environment?.id,
    environment?.participants,
    environmentId,
    hasEnteredEnvironment,
    isCurrentUserPresent,
    userId,
  ]);

  const joinEnvironment = useCallback(async () => {
    if (!environmentId || !userId || isLocked || hasJoinedRef.current) {
      return;
    }

    await environmentService.addUser(environmentId, userId);
    hasJoinedRef.current = true;
  }, [environmentId, isLocked, userId]);

  const enterEnvironment = useCallback(async () => {
    if (hasEnteredEnvironment || isLocked || isJoiningEnvironment) {
      return;
    }

    setIsJoiningEnvironment(true);
    try {
      await joinEnvironment();
      setHasEnteredEnvironment(true);
    } finally {
      setIsJoiningEnvironment(false);
    }
  }, [hasEnteredEnvironment, isLocked, isJoiningEnvironment, joinEnvironment]);

  const leaveEnvironment = useCallback(async () => {
    if (!environmentId || !userId || isLocked || isLeavingEnvironment) {
      return;
    }

    setIsLeavingEnvironment(true);
    try {
      await environmentService.removeUser(environmentId, userId);
      hasJoinedRef.current = false;
      setHasEnteredEnvironment(false);
    } finally {
      setIsLeavingEnvironment(false);
    }
  }, [environmentId, isLocked, isLeavingEnvironment, userId]);

  const shouldAutoJoin = hasEnteredEnvironment && !isLocked;

  useEffect(() => {
    if (!environmentId || !userId || isLocked || !shouldAutoJoin) {
      return;
    }

    void joinEnvironment().catch(() => undefined);
  }, [environmentId, isLocked, joinEnvironment, shouldAutoJoin, userId]);

  const isScenarioLocked = environment?.status !== 'in_progress' || !hasEnteredEnvironment;
  const isInteractionLocked = !hasEnteredEnvironment || isLocked;

  const canShare = hasEnteredEnvironment && !isLocked;

  return {
    hasEnteredEnvironment,
    isLocked,
    isScenarioLocked,
    isInteractionLocked,
    canCopyPublicLink: canShare,
    isShareDisabled: !canShare,
    isJoiningEnvironment,
    isLeavingEnvironment,
    enterEnvironment,
    leaveEnvironment,
  };
};
