type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  version: string;
};

type CacheReadResult<T> = {
  value: T | null;
  isExpired: boolean;
};

interface CacheStoreOptions {
  namespace: string;
  version: string;
  ttlMs: number;
}

const safeNow = () => Date.now();

export class CacheStore {
  private readonly namespace: string;
  private readonly version: string;
  private readonly ttlMs: number;
  private readonly memory = new Map<string, CacheEntry<unknown>>();

  constructor(options: CacheStoreOptions) {
    this.namespace = options.namespace;
    this.version = options.version;
    this.ttlMs = options.ttlMs;
  }

  getWithStatus<T>(key: string): CacheReadResult<T> {
    const entry = this.readEntry<T>(key);

    if (!entry) {
      return { value: null, isExpired: false };
    }

    const isExpired = safeNow() > entry.expiresAt;

    return {
      value: entry.value,
      isExpired,
    };
  }

  get<T>(key: string): T | null {
    const entry = this.readEntry<T>(key);
    if (!entry) {
      return null;
    }

    if (safeNow() > entry.expiresAt) {
      this.remove(key);
      return null;
    }

    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: safeNow() + (ttlMs ?? this.ttlMs),
      version: this.version,
    };

    this.memory.set(key, entry);
    this.writeToStorage(key, entry);
  }

  remove(key: string): void {
    this.memory.delete(key);
    this.removeFromStorage(key);
  }

  invalidatePrefix(prefix: string): void {
    Array.from(this.memory.keys())
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => this.memory.delete(key));

    this.removeFromStorageByPrefix(prefix);
  }

  private readEntry<T>(key: string): CacheEntry<T> | null {
    const inMemory = this.memory.get(key);
    if (inMemory && inMemory.version === this.version) {
      return inMemory as CacheEntry<T>;
    }

    const persisted = this.readFromStorage<T>(key);
    if (!persisted) {
      return null;
    }

    if (persisted.version !== this.version) {
      this.remove(key);
      return null;
    }

    this.memory.set(key, persisted);
    return persisted;
  }

  private storageKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private readFromStorage<T>(key: string): CacheEntry<T> | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(this.storageKey(key));
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as CacheEntry<T> | null;
      if (!parsed || typeof parsed.expiresAt !== 'number') {
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn('CacheStore read failed', error);
      return null;
    }
  }

  private writeToStorage<T>(key: string, entry: CacheEntry<T>): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(this.storageKey(key), JSON.stringify(entry));
    } catch (error) {
      console.warn('CacheStore write failed', error);
    }
  }

  private removeFromStorage(key: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.removeItem(this.storageKey(key));
    } catch (error) {
      console.warn('CacheStore remove failed', error);
    }
  }

  private removeFromStorageByPrefix(prefix: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const basePrefix = this.storageKey(prefix);
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const storageKey = window.localStorage.key(index);
        if (storageKey && storageKey.startsWith(basePrefix)) {
          window.localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.warn('CacheStore invalidate failed', error);
    }
  }
}
