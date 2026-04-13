// Legacy file retained only for compatibility with old references.
// The active deployment path now uses Upstash Redis on Vercel.

export const pool = null;

export async function withTransaction() {
  throw new Error("Deprecated: MySQL transaction helper is no longer used.");
}
