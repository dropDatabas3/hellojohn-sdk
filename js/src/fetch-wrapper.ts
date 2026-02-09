/**
 * Authenticated fetch wrapper for HelloJohn JS SDK.
 * Automatically injects Bearer token into every request.
 */

/**
 * Create a fetch function that auto-injects the current access token.
 * Token is always fresh — getAccessToken() handles refresh if needed.
 */
export function createFetchWrapper(
  getAccessToken: () => Promise<string>,
): typeof fetch {
  return async function authedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const token = await getAccessToken()

    const headers = new Headers(init?.headers)
    headers.set("Authorization", `Bearer ${token}`)

    return fetch(input, {
      ...init,
      headers,
    })
  }
}
