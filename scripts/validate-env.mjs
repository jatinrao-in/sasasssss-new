import { createPrivateKey } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const target = process.argv[2];

if (!target) {
  console.error('Usage: node scripts/validate-env.mjs <admin-panel|team-member-pwa|backend>');
  process.exit(1);
}

const envMode = process.env.NODE_ENV || 'production';
const appDir = process.cwd();
const envFiles = [
  `.env.${envMode}.local`,
  '.env.local',
  `.env.${envMode}`,
  '.env',
];

const requiredByApp = {
  'admin-panel': [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_API_BASE_URL',
    'VITE_PWA_URL',
    'VITE_ADMIN_URL',
  ],
  'team-member-pwa': [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_VAPID_KEY',
    'VITE_API_BASE_URL',
    'VITE_ADMIN_URL',
  ],
  backend: [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ],
};

function hasSuspiciousNewlineCharacters(value) {
  return /\\[rn]|[\r\n]/.test(String(value ?? ''));
}

function normalizePrivateKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return acc;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        return acc;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      acc[key] = value;
      return acc;
    }, {});
}

const fileValues = envFiles.reduce(
  (acc, fileName) => ({ ...acc, ...parseEnvFile(path.join(appDir, fileName)) }),
  {},
);

const requiredKeys = requiredByApp[target];

if (!requiredKeys) {
  console.error(`Unknown app "${target}". Expected one of: ${Object.keys(requiredByApp).join(', ')}`);
  process.exit(1);
}

const missing = requiredKeys.filter((key) => {
  const value = process.env[key] ?? fileValues[key];
  return !String(value || '').trim();
});

if (missing.length > 0) {
  console.error(`[env] Missing required variables for ${target}: ${missing.join(', ')}`);
  process.exit(1);
}

const suspicious = requiredKeys.filter((key) => {
  const value = process.env[key] ?? fileValues[key];
  return hasSuspiciousNewlineCharacters(value);
});

if (suspicious.length > 0) {
  console.warn(
    `[env] Warning: suspicious newline characters detected for ${target}: ${suspicious.join(', ')}`,
  );
}

if (target === 'backend') {
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY ?? fileValues.FIREBASE_PRIVATE_KEY);
  const hasPemBoundary = /-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(privateKey)
    && /-----END (?:RSA )?PRIVATE KEY-----/.test(privateKey);

  if (!hasPemBoundary) {
    console.error('[env] FIREBASE_PRIVATE_KEY is missing a valid PEM header/footer.');
    process.exit(1);
  }

  try {
    createPrivateKey(privateKey);
  } catch (error) {
    console.error('[env] FIREBASE_PRIVATE_KEY could not be decoded:', error.message);
    process.exit(1);
  }
}

console.log(`[env] ${target} production variables look good.`);
