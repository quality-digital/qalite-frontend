import { useEffect, useRef, useState } from 'react';

interface UseRealtimeResourceOptions<T> {
  resourceId?: string | null;
  getInitialValue: () => T;
  subscribe: (resourceId: string, handler: (value: T) => void) => () => void;
  missingResourceMessage?: string;
}

export const useRealtimeResource = <T>({
  resourceId,
  getInitialValue,
  subscribe,
  missingResourceMessage,
}: UseRealtimeResourceOptions<T>) => {
  const initialValueRef = useRef<T>();

  if (initialValueRef.current === undefined) {
    initialValueRef.current = getInitialValue();
  }

  const [value, setValue] = useState<T>(initialValueRef.current!);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(resourceId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resourceId) {
      setValue(initialValueRef.current!);
      setIsLoading(false);
      setError(missingResourceMessage ?? null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribe(resourceId, (nextValue) => {
      setValue(nextValue);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [resourceId, subscribe, missingResourceMessage]);

  return { value, isLoading, error };
};
