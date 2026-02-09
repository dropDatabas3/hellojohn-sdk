/**
 * PKCE Implementation for Browser (Web Crypto API)
 */

export async function generateCodeVerifier(): Promise<string> {
    const array = new Uint8Array(32);
    globalThis.crypto.getRandomValues(array);
    return base64UrlEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(new Uint8Array(hash));
}

export function generateState(): string {
    const array = new Uint8Array(32);
    globalThis.crypto.getRandomValues(array);
    return base64UrlEncode(array);
}

// Ensure URL-safe base64 (RFC A.2)
function base64UrlEncode(a: Uint8Array): string {
    let str = "";
    const bytes = Array.from(a);
    for (const b of bytes) {
        str += String.fromCharCode(b);
    }
    return btoa(str)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}
