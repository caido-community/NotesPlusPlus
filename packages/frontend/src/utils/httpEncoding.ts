/**
 * Decodes a Caido GraphQL `Blob` scalar value (used for `Request.raw` /
 * `Response.raw` / `ReplayEntry.raw`) into a text string.
 *
 * Caido's `Blob` scalar is Base64-encoded over the wire — confirmed against
 * captured traffic in Caido's own GraphQL documentation, where e.g.
 * `"raw":"R0VUIC8gSFRUUC8xLjENCkhvc3Q6..."` decodes to `"GET / HTTP/1.1\r\nHost:..."`.
 *
 * A naive `atob()` is not enough: it returns a "binary string" where each
 * character is one raw byte (0–255), which corrupts any multi-byte UTF-8
 * content (e.g. emoji or accented characters in a request/response body).
 * This decodes properly by reinterpreting those bytes as UTF-8.
 *
 * Invalid byte sequences (e.g. genuinely binary, non-text bodies) are
 * replaced with the U+FFFD replacement character rather than throwing,
 * since this is for display in a text editor either way.
 */
export function decodeRawBlob(base64: string): string {
  if (!base64) return "";

  try {
    const binaryString = atob(base64);
    const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch (err) {
    console.error("Failed to decode raw HTTP content:", err);
    return "";
  }
}
