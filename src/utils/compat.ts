/**
 * Compatibility utilities for older browsers.
 * Polyfills and fallbacks for APIs not available in Chrome < 92, Safari < 15.4, etc.
 */

/**
 * Generate a UUID v4. Uses crypto.randomUUID() when available,
 * falls back to a manual implementation for older browsers.
 */
export function generateId(): string {
    // crypto.randomUUID is available in Chrome 92+, Safari 15.4+, Firefox 95+
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    // Fallback: manual UUID v4 using crypto.getRandomValues (Chrome 37+, Safari 7+)
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        // Set version (4) and variant (RFC 4122)
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        return (
            hex.slice(0, 8) + '-' +
            hex.slice(8, 12) + '-' +
            hex.slice(12, 16) + '-' +
            hex.slice(16, 20) + '-' +
            hex.slice(20)
        );
    }

    // Ultimate fallback: Math.random-based (not cryptographically secure, but functional)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
