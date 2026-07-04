import bcrypt from 'bcryptjs';

export async function hashPin(pin) {
  return bcrypt.hash(pin, 8);
}

export async function verifyPin(pin, hash) {
  return bcrypt.compare(pin, hash);
}

export const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
