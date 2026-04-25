export class ConfigError extends Error {
  constructor(missingKeys) {
    super(`Missing required environment variables: ${missingKeys.join(', ')}`);
    this.name = 'ConfigError';
    this.statusCode = 503;
    this.missingKeys = missingKeys;
  }
}

export class InvalidConfigError extends Error {
  constructor(message, invalidKeys = []) {
    super(message);
    this.name = 'InvalidConfigError';
    this.statusCode = 503;
    this.invalidKeys = invalidKeys;
  }
}

function stripWrappingQuotes(value) {
  const trimmed = String(value ?? '').trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function normalizeLineEndings(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

export function sanitizeEnvValue(value, { preserveMultiline = false } = {}) {
  const normalized = stripWrappingQuotes(normalizeLineEndings(value).trim());

  if (preserveMultiline) {
    return normalized
      .replace(/\\r/g, '')
      .replace(/\\n/g, '\n')
      .trim();
  }

  return normalized
    .replace(/\n+/g, '')
    .replace(/\\r/g, '')
    .replace(/\\n/g, '')
    .trim();
}

export function requireEnv(keys) {
  const sanitizedValues = Object.fromEntries(
    keys.map((key) => [key, sanitizeEnvValue(process.env[key], {
      preserveMultiline: key.includes('PRIVATE_KEY'),
    })]),
  );

  const missingKeys = keys.filter((key) => !sanitizedValues[key]);

  if (missingKeys.length > 0) {
    throw new ConfigError(missingKeys);
  }

  return sanitizedValues;
}

export function handleConfigError(res, error) {
  if (!(error instanceof ConfigError) && !(error instanceof InvalidConfigError)) {
    return false;
  }

  const payload = {
    error: error.message,
    code: 'CONFIG_ERROR',
  };

  if (error instanceof ConfigError) {
    payload.missing = error.missingKeys;
  }

  if (error instanceof InvalidConfigError) {
    payload.invalid = error.invalidKeys;
  }

  res.status(error.statusCode).json(payload);
  return true;
}
