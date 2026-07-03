// Central place for required environment variables.
// Importing this module fails fast at process startup if JWT_SECRET is
// missing or too weak, instead of silently falling back to a public
// default (previously 'fallback_secret') that would let anyone forge
// valid JWTs, including superadmin tokens.

const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
  throw new Error(
    'JWT_SECRET environment variable must be set to a random string of at least 32 characters. ' +
    'Refusing to start with a missing or weak secret.'
  );
}

export const JWT_SECRET: string = secret;
export const JWT_EXPIRY: string = process.env.JWT_EXPIRY || '7d';
export type JwtExpiry = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}` | number;
