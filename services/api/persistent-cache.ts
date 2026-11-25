import AsyncStorage from "@react-native-async-storage/async-storage";

interface CacheEntry<T> {
  savedAt: number;
  value: T;
}

const CACHE_PREFIX = "@green-spice/api-cache:v1:";
const inFlightRequests = new Map<string, Promise<unknown>>();
const revalidatedThisSession = new Set<string>();
const cacheVersions = new Map<string, number>();
let cacheGeneration = 0;

function invalidateInMemoryCache(storageKey: string): void {
  cacheVersions.set(storageKey, (cacheVersions.get(storageKey) || 0) + 1);
  inFlightRequests.delete(storageKey);
  revalidatedThisSession.delete(storageKey);
}

function startCacheRefresh<T>(
  storageKey: string,
  load: () => Promise<T>,
): Promise<T> {
  const pendingRequest = inFlightRequests.get(storageKey);
  if (pendingRequest) return pendingRequest as Promise<T>;

  const generation = cacheGeneration;
  const version = cacheVersions.get(storageKey) || 0;
  const request = Promise.resolve()
    .then(load)
    .then(async (value) => {
      if (
        value !== undefined &&
        generation === cacheGeneration &&
        version === (cacheVersions.get(storageKey) || 0)
      ) {
        try {
          await AsyncStorage.setItem(
            storageKey,
            JSON.stringify({
              savedAt: Date.now(),
              value,
            } satisfies CacheEntry<T>),
          );
        } catch (error) {
          console.warn("Unable to save local API cache data.", error);
        }
      }
      return value;
    })
    .finally(() => {
      if (inFlightRequests.get(storageKey) === request) {
        inFlightRequests.delete(storageKey);
      }
    });

  inFlightRequests.set(storageKey, request);
  return request;
}

function notifyCacheUpdate<T>(
  onUpdate: ((value: T) => void) | undefined,
  value: T,
): void {
  if (!onUpdate) return;
  try {
    onUpdate(value);
  } catch (error) {
    console.warn("Unable to apply refreshed local API cache data.", error);
  }
}

export async function getPersistentCache<T>(
  key: string,
  maxAgeMs: number,
  forceRefresh: boolean,
  load: () => Promise<T>,
  onUpdate?: (value: T) => void,
  revalidateInBackground = false,
): Promise<T> {
  const storageKey = `${CACHE_PREFIX}${key}`;
  let cached: CacheEntry<T> | null = null;

  try {
    const stored = await AsyncStorage.getItem(storageKey);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (
        parsed &&
        typeof parsed === "object" &&
        "savedAt" in parsed &&
        typeof parsed.savedAt === "number" &&
        Number.isFinite(parsed.savedAt) &&
        parsed.savedAt <= Date.now() &&
        "value" in parsed
      ) {
        cached = parsed as CacheEntry<T>;
      } else {
        console.warn("Ignoring malformed local API cache data.");
        await AsyncStorage.removeItem(storageKey);
      }
    }
  } catch (error) {
    console.warn("Unable to read local API cache data.", error);
  }

  if (!forceRefresh && cached) {
    const isStale = Date.now() - cached.savedAt >= maxAgeMs;
    const shouldRevalidate =
      isStale ||
      (revalidateInBackground && !revalidatedThisSession.has(storageKey));
    const generation = cacheGeneration;
    const version = cacheVersions.get(storageKey) || 0;
    const pendingRequest: Promise<T> | undefined = shouldRevalidate
      ? startCacheRefresh(storageKey, load)
      : (inFlightRequests.get(storageKey) as Promise<T> | undefined);
    if (shouldRevalidate) revalidatedThisSession.add(storageKey);
    if (pendingRequest && (shouldRevalidate || onUpdate)) {
      void pendingRequest.then(
        (value) => {
          if (
            generation === cacheGeneration &&
            version === (cacheVersions.get(storageKey) || 0)
          ) {
            notifyCacheUpdate(onUpdate, value);
          }
        },
        (error: unknown) => {
          if (shouldRevalidate) {
            console.warn("Unable to refresh stale local API cache data.", error);
          }
        },
      );
    }
    return cached.value;
  }

  revalidatedThisSession.add(storageKey);
  return startCacheRefresh(storageKey, load);
}

export function getAccountCacheScope(token: string): string {
  let firstHash = 0x811c9dc5;
  let secondHash = 0x9e3779b9;
  for (let index = 0; index < token.length; index += 1) {
    const code = token.charCodeAt(index);
    firstHash = Math.imul(firstHash ^ code, 0x01000193) >>> 0;
    secondHash = Math.imul(secondHash ^ code, 0x85ebca6b) >>> 0;
  }
  return `${firstHash.toString(36)}${secondHash.toString(36)}`;
}

export async function invalidatePersistentCache(key: string): Promise<void> {
  const storageKey = `${CACHE_PREFIX}${key}`;
  invalidateInMemoryCache(storageKey);
  await AsyncStorage.removeItem(storageKey);
}

export async function clearPersistentCache(): Promise<void> {
  cacheGeneration += 1;
  inFlightRequests.clear();
  revalidatedThisSession.clear();
  cacheVersions.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
  } finally {
    cacheGeneration += 1;
    inFlightRequests.clear();
    revalidatedThisSession.clear();
    cacheVersions.clear();
  }
}

export async function clearAccountPersistentCache(
  identity: string,
  resourcePrefix = "",
): Promise<void> {
  const accountPrefix = `${CACHE_PREFIX}customer:${getAccountCacheScope(identity)}:${resourcePrefix}`;
  const keys = await AsyncStorage.getAllKeys();
  const storedKeys = keys.filter((key) => key.startsWith(accountPrefix));
  const activeKeys = [
    ...inFlightRequests.keys(),
    ...cacheVersions.keys(),
  ].filter((key) => key.startsWith(accountPrefix));
  const accountKeys = [...new Set([...storedKeys, ...activeKeys])];
  accountKeys.forEach(invalidateInMemoryCache);
  if (storedKeys.length > 0) await AsyncStorage.multiRemove(storedKeys);
}
