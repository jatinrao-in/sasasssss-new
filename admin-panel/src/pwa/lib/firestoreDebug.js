const PREFIX = '[TeamMemberPWA]';

export function logInfo(scope, ...args) {
  (function(){})(PREFIX, scope, ...args);
}

export function logSkip(scope) {
  (function(){})(PREFIX, scope, 'NO USER UID - skipping query');
}

export function logFetch(scope, uid, extra) {
  if (extra === undefined) {
    (function(){})(PREFIX, scope, 'Fetching data for uid:', uid);
    return;
  }

  (function(){})(PREFIX, scope, 'Fetching data for uid:', uid, extra);
}

export function logSnapshot(scope, snapshot) {
  (function(){})(PREFIX, scope, 'Snapshot received:', snapshot.size, 'documents');
  snapshot.docs.forEach((docSnapshot) => {
    (function(){})(PREFIX, scope, 'Doc:', docSnapshot.id, docSnapshot.data());
  });
}

export function logDocSnapshot(scope, snapshot) {
  const count = snapshot.exists() ? 1 : 0;
  (function(){})(PREFIX, scope, 'Snapshot received:', count, 'documents');

  if (snapshot.exists()) {
    (function(){})(PREFIX, scope, 'Doc:', snapshot.id, snapshot.data());
    return;
  }

  (function(){})(PREFIX, scope, 'Doc: none');
}

export function logError(scope, error) {
  console.error(
    PREFIX,
    scope,
    'Firestore error:',
    error?.code || 'unknown',
    error?.message || error,
  );
}
