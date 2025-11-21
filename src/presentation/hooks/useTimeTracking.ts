import { useEffect, useMemo, useState } from 'react';

import type { EnvironmentTimeTracking } from '../../domain/entities/environment';
import {
  formatDateTime,
  formatDurationFromMs,
  formatEndDateTime,
  getElapsedMilliseconds,
} from '../../shared/utils/time';

export const useTimeTracking = (
  timeTracking: EnvironmentTimeTracking | null | undefined,
  isRunning: boolean,
) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning || !timeTracking?.start) {
      return undefined;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, timeTracking?.start]);

  const totalMs = useMemo(
    () => getElapsedMilliseconds(timeTracking, isRunning, now),
    [isRunning, now, timeTracking],
  );

  return {
    totalMs,
    formattedTime: formatDurationFromMs(totalMs),
    formattedStart: formatDateTime(timeTracking?.start ?? null),
    formattedEnd: formatEndDateTime(timeTracking, isRunning),
  };
};
