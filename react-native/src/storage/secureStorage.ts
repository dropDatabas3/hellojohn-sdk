import type { StorageAdapter, TokenResponse } from "@hellojohn/js";
import * as SecureStore from "expo-secure-store";
import type { HelloJohnUser } from "../types";

const STORAGE_KEYS = {
  TOKEN: "hj:token",
  USER: "hj:user",
  CHALLENGE_TOKEN: "hj:challenge_token"
} as const;

const memoryStore = new Map<string, string>();

type KnownStorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

function knownKeys(): KnownStorageKey[] {
  return [STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER, STORAGE_KEYS.CHALLENGE_TOKEN];
}

async function persistRaw(key: string, value: string | null): Promise<void> {
  if (value === null) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

function setMemoryAndPersist(key: string, value: string): void {
  memoryStore.set(key, value);
  void persistRaw(key, value);
}

function removeMemoryAndPersist(key: string): void {
  memoryStore.delete(key);
  void persistRaw(key, null);
}

export function createSecureStorageAdapter(): StorageAdapter {
  return {
    get(key: string): string | null {
      return memoryStore.get(key) ?? null;
    },
    set(key: string, value: string): void {
      setMemoryAndPersist(key, value);
    },
    remove(key: string): void {
      removeMemoryAndPersist(key);
    }
  };
}

export async function hydrateSecureStorageMemory(): Promise<void> {
  const keys = knownKeys();
  const values = await Promise.all(keys.map((key) => SecureStore.getItemAsync(key)));
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const value = values[index];
    if (typeof value === "string") {
      memoryStore.set(key, value);
    } else {
      memoryStore.delete(key);
    }
  }
}

export async function writeTokenResponse(token: TokenResponse): Promise<void> {
  const serialized = JSON.stringify(token);
  memoryStore.set(STORAGE_KEYS.TOKEN, serialized);
  await persistRaw(STORAGE_KEYS.TOKEN, serialized);
}

export async function readTokenResponse(): Promise<TokenResponse | null> {
  const raw = memoryStore.get(STORAGE_KEYS.TOKEN) ?? (await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as TokenResponse;
  } catch {
    return null;
  }
}

export async function persistUser(user: HelloJohnUser): Promise<void> {
  const serialized = JSON.stringify(user);
  memoryStore.set(STORAGE_KEYS.USER, serialized);
  await persistRaw(STORAGE_KEYS.USER, serialized);
}

export async function readStoredUser(): Promise<HelloJohnUser | null> {
  const raw = memoryStore.get(STORAGE_KEYS.USER) ?? (await SecureStore.getItemAsync(STORAGE_KEYS.USER));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as HelloJohnUser;
  } catch {
    return null;
  }
}

export async function setChallengeToken(token: string): Promise<void> {
  memoryStore.set(STORAGE_KEYS.CHALLENGE_TOKEN, token);
  await persistRaw(STORAGE_KEYS.CHALLENGE_TOKEN, token);
}

export async function clearChallengeToken(): Promise<void> {
  memoryStore.delete(STORAGE_KEYS.CHALLENGE_TOKEN);
  await persistRaw(STORAGE_KEYS.CHALLENGE_TOKEN, null);
}

export async function getChallengeToken(): Promise<string | null> {
  const cached = memoryStore.get(STORAGE_KEYS.CHALLENGE_TOKEN);
  if (cached !== undefined) {
    return cached;
  }
  return SecureStore.getItemAsync(STORAGE_KEYS.CHALLENGE_TOKEN);
}

export async function clearAllSecureStore(): Promise<void> {
  memoryStore.clear();
  await Promise.all(knownKeys().map((key) => SecureStore.deleteItemAsync(key)));
}
