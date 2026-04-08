/**
 * Secure credential storage utilities using the Web Crypto API.
 * 
 * NOTE: This implementation provides encrypted storage for user convenience
 * (e.g., "Remember Me" functionality) using modern cryptographic standards.
 */

/**
 * Derives a CryptoKey from a salt using PBKDF2.
 * @param salt - A unique string (e.g., userId or machineId) used as salt.
 */
export async function deriveKeyFromSalt(salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const seed = import.meta.env.VITE_CRYPTO_SEED || "pathodesk-v1-fallback-seed";
    const baseKey = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(seed),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: encoder.encode(salt),
            iterations: 100000,
            hash: "SHA-256"
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts a string using AES-GCM and returns a base64 encoded string containing the IV and ciphertext.
 */
export async function obfuscate(text: string, key: CryptoKey): Promise<string> {
    if (!text) return '';
    
    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = encoder.encode(text);

    const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encodedData
    );

    // Combine IV and ciphertext for storage
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64 encoded string containing an IV and AES-GCM ciphertext.
 */
export async function deobfuscate(encoded: string, key: CryptoKey): Promise<string> {
    if (!encoded) return '';
    
    try {
        const combined = new Uint8Array(
            atob(encoded).split('').map(char => char.charCodeAt(0))
        );

        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        // Silent failure to avoid leaking info about decryption errors, but log for debugging
        console.warn('Deobfuscation failed: check key or data integrity.');
        return '';
    }
}

