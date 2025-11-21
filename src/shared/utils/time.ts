import type { EnvironmentTimeTracking } from '../../domain/entities/environment';

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return 'Não registrado';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Não registrado';
  }

  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

export const getElapsedMilliseconds = (
  timeTracking: EnvironmentTimeTracking | null | undefined,
  isRunning: boolean,
  currentTimestamp = Date.now(),
): number => {
  if (!timeTracking) {
    return 0;
  }

  if (isRunning && timeTracking.start) {
    const startedAt = new Date(timeTracking.start).getTime();
    return timeTracking.totalMs + Math.max(0, currentTimestamp - startedAt);
  }

  return timeTracking.totalMs;
};

export const formatEndDateTime = (
  timeTracking: EnvironmentTimeTracking | null | undefined,
  isRunning: boolean,
): string => {
  if (timeTracking?.end) {
    return formatDateTime(timeTracking.end);
  }

  return isRunning ? 'Em andamento' : 'Não encerrado';
};

export const formatDurationFromMs = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
};
