import { useEffect, useMemo, useState } from 'react';

import type { EnvironmentTimeTracking } from '../../domain/entities/environment';
import { formatDurationFromMs } from '../../shared/utils/time';

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

  const totalMs = useMemo(() => {
    if (!timeTracking) {
      return 0;
    }

    if (isRunning && timeTracking.start) {
      const startedAt = new Date(timeTracking.start).getTime();
      return timeTracking.totalMs + Math.max(0, now - startedAt);
    }

    return timeTracking.totalMs;
  }, [isRunning, now, timeTracking]);

  return { totalMs, formattedTime: formatDurationFromMs(totalMs) };
};
