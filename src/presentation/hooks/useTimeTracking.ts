import { useEffect, useMemo, useState } from 'react';

import type { EnvironmentTimeTracking } from '../../domain/entities/Environment';

const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [hours, minutes, seconds].map((value) => String(value).padStart(2, '0'));
  return `${parts[0]}:${parts[1]}:${parts[2]}`;
};

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

  return { totalMs, formattedTime: formatDuration(totalMs) };
};
