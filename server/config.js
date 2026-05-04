export function handleConfigError(res, error) {
  if (error.message?.includes('FIREBASE_PRIVATE_KEY')) {
    res.status(500).json({ error: 'Server configuration error: Missing private key' });
    return true;
  }
  return false;
}
