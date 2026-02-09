/**
 * Storage abstraction for HelloJohn JS SDK.
 * Provides pluggable storage adapters (localStorage, sessionStorage, memory, cookie).
 */

export interface StorageAdapter {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

/** localStorage adapter (default for browser) */
export const localStorageAdapter: StorageAdapter = {
  get(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Storage full or unavailable
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Unavailable
    }
  },
}

/** sessionStorage adapter */
export const sessionStorageAdapter: StorageAdapter = {
  get(key) {
    try {
      return sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, value)
    } catch {
      // Storage full or unavailable
    }
  },
  remove(key) {
    try {
      sessionStorage.removeItem(key)
    } catch {
      // Unavailable
    }
  },
}

/** In-memory adapter (for SSR, testing, or privacy) */
export function createMemoryStorageAdapter(): StorageAdapter {
  const store = new Map<string, string>()
  return {
    get(key) {
      return store.get(key) ?? null
    },
    set(key, value) {
      store.set(key, value)
    },
    remove(key) {
      store.delete(key)
    },
  }
}

/** Cookie adapter (for SSR-safe storage) */
export function createCookieStorageAdapter(options?: {
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: "Strict" | "Lax" | "None"
  maxAge?: number
}): StorageAdapter {
  const opts = {
    path: "/",
    secure: true,
    sameSite: "Lax" as const,
    ...options,
  }

  return {
    get(key) {
      if (typeof document === "undefined") return null
      const match = document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(key)}=([^;]*)`))
      return match ? decodeURIComponent(match[1]) : null
    },
    set(key, value) {
      if (typeof document === "undefined") return
      let cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      cookie += `; path=${opts.path}`
      if (opts.domain) cookie += `; domain=${opts.domain}`
      if (opts.secure) cookie += "; secure"
      cookie += `; samesite=${opts.sameSite}`
      if (opts.maxAge !== undefined) cookie += `; max-age=${opts.maxAge}`
      document.cookie = cookie
    },
    remove(key) {
      if (typeof document === "undefined") return
      let cookie = `${encodeURIComponent(key)}=; max-age=0; path=${opts.path}`
      if (opts.domain) cookie += `; domain=${opts.domain}`
      document.cookie = cookie
    },
  }
}
