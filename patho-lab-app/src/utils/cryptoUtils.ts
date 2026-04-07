// Simple obfuscation for local storage credentials
// NOTE: This is for "Remember Me" convenience, not high-security vaulting.

const SECRET_KEY = 'pathodesk-v1-secret';

/**
 * Obfuscates a string using a simple XOR with a fixed key and Base64 encoding.
 * While not mathematically "unbreakable", it prevents plain-text visibility in localStorage.
 */
export function obfuscate(text: string): string {
    if (!text) return '';
    const chars = text.split('').map((c, i) => 
        String.fromCharCode(c.charCodeAt(0) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length))
    );
    return btoa(unescape(encodeURIComponent(chars.join(''))));
}

/**
 * De-obfuscates a string previously obfuscated by obfuscate().
 */
export function deobfuscate(encoded: string): string {
    if (!encoded) return '';
    try {
        const text = decodeURIComponent(escape(atob(encoded)));
        const chars = text.split('').map((c, i) => 
            String.fromCharCode(c.charCodeAt(0) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length))
        );
        return chars.join('');
    } catch (e) {
        console.error('Failed to deobfuscate credential:', e);
        return '';
    }
}
