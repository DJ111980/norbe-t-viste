import { scryptAsync } from '@noble/hashes/scrypt.js';
import { randomBytes } from '@noble/hashes/utils.js';

const HASH_ALGORITHM = 'scrypt';

export const SCRYPT_PARAMS = {
  // Parametros moderados para Cloudflare Workers: elevan el costo frente a fuerza bruta
  // sin acercarse innecesariamente a los limites de CPU en un sistema interno.
  N: 2 ** 14,
  r: 8,
  p: 1,
  dkLen: 32,
  saltLength: 16,
} as const;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }

  return diff === 0;
}

async function derivePasswordHash(password: string, salt: Uint8Array): Promise<Uint8Array> {
  return scryptAsync(password, salt, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    dkLen: SCRYPT_PARAMS.dkLen,
  });
}

export async function hashPassword(password: string): Promise<string> {
  // No usamos bcrypt nativo porque Cloudflare Workers no soporta modulos nativos de Node.
  // scrypt de @noble/hashes funciona sobre JavaScript/Web Crypto y mantiene el hash portable.
  const salt = randomBytes(SCRYPT_PARAMS.saltLength);
  const hash = await derivePasswordHash(password, salt);

  return [
    HASH_ALGORITHM,
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    bytesToBase64(salt),
    bytesToBase64(hash),
  ].join('$');
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');

  if (parts.length !== 6 || parts[0] !== HASH_ALGORITHM) {
    return false;
  }

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);

  if (!Number.isSafeInteger(N) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p)) {
    return false;
  }

  try {
    const salt = base64ToBytes(rawSalt);
    const expectedHash = base64ToBytes(rawHash);
    const actualHash = await scryptAsync(password, salt, {
      N,
      r,
      p,
      dkLen: expectedHash.length,
    });

    return timingSafeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
}
