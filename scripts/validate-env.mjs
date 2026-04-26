import { createPrivateKey } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const target = args[0];

const extraEnvFiles = [];
for (let index = 1; index < args.length; index += 1) {
  if (args[index] === '--env-file' && args[index + 1]) {
    extraEnvFiles.push(args[index + 1]);
    index += 1;
  }
}

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
  return /[\r\n]|\\r\\n|\\n|\\r/.test(String(value ?? ''));
}

function normalizeScalarEnvValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/\\r\\n|\\n|\\r/g, '')
    .trim();
}

function isPlainOriginUrl(value) {
  const trimmed = normalizeScalarEnvValue(value);

  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.origin === trimmed;
  } catch {
    return false;
  }
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

function hasClosingQuote(value, quoteCharacter) {
  if (!value.endsWith(quoteCharacter)) {
    return false;
  }

  let backslashCount = 0;
  for (let index = value.length - 2; index >= 0 && value[index] === '\\'; index -= 1) {
    backslashCount += 1;
  }

  return backslashCount % 2 === 0;
}

function unwrapQuotedValue(value) {
  const trimmed = String(value ?? '').trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const lines = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  const parsed = {};
  let multilineKey = null;
  let multilineQuote = null;
  let multilineValue = [];

  for (const line of lines) {
    if (multilineKey) {
      multilineValue.push(line);

      if (hasClosingQuote(line, multilineQuote)) {
        parsed[multilineKey] = unwrapQuotedValue(multilineValue.join('\n'));
        multilineKey = null;
        multilineQuote = null;
        multilineValue = [];
      }

      continue;
    }

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().replace(/^export\s+/, '');
    const value = line.slice(separatorIndex + 1).trim();

    if (!value) {
      parsed[key] = '';
      continue;
    }

    const quoteCharacter = value.startsWith('"') || value.startsWith('\'') ? value[0] : null;
    if (quoteCharacter && !hasClosingQuote(value, quoteCharacter)) {
      multilineKey = key;
      multilineQuote = quoteCharacter;
      multilineValue = [value];
      continue;
    }

    parsed[key] = unwrapQuotedValue(value);
  }

  if (multilineKey) {
    parsed[multilineKey] = unwrapQuotedValue(multilineValue.join('\n'));
  }

  return parsed;
}

const resolvedExtraEnvFiles = extraEnvFiles
  .map((filePath) => (path.isAbsolute(filePath) ? filePath : path.resolve(appDir, filePath)));

const fileValues = envFiles.reduce(
  (acc, fileName) => ({ ...acc, ...parseEnvFile(path.join(appDir, fileName)) }),
  {},
);
const explicitFileValues = resolvedExtraEnvFiles.reduce(
  (acc, fileName) => ({ ...acc, ...parseEnvFile(fileName) }),
  {},
);
const mergedFileValues = { ...fileValues, ...explicitFileValues };

const requiredKeys = requiredByApp[target];

if (!requiredKeys) {
  console.error(`Unknown app "${target}". Expected one of: ${Object.keys(requiredByApp).join(', ')}`);
  process.exit(1);
}

const missing = requiredKeys.filter((key) => {
  const value = process.env[key] ?? mergedFileValues[key];
  return !String(value || '').trim();
});

if (missing.length > 0) {
  console.error(`[env] Missing required variables for ${target}: ${missing.join(', ')}`);
  process.exit(1);
}

const suspicious = requiredKeys.filter((key) => {
  const value = process.env[key] ?? mergedFileValues[key];

  if (key.includes('PRIVATE_KEY')) {
    return false;
  }

  return hasSuspiciousNewlineCharacters(value);
});

if (suspicious.length > 0) {
  console.warn(
    `[env] Warning: suspicious newline characters detected for ${target}: ${suspicious.join(', ')}`,
  );
}

if (target !== 'backend') {
  const apiBaseUrl = process.env.VITE_API_BASE_URL ?? mergedFileValues.VITE_API_BASE_URL;

  if (!isPlainOriginUrl(apiBaseUrl)) {
    console.error(
      '[env] VITE_API_BASE_URL must be a plain origin like https://sasasssss.vercel.app with no trailing slash or extra path.',
    );
    process.exit(1);
  }
}

if (target === 'backend') {
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY ?? mergedFileValues.FIREBASE_PRIVATE_KEY);
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
