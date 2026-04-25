const PREFIX = '[TeamMemberPWA]';

export function logInfo(scope, ...args) {
  console.log(PREFIX, scope, ...args);
}

export function logSkip(scope) {
  console.log(PREFIX, scope, 'NO USER UID - skipping query');
}

export function logFetch(scope, uid, extra) {
  if (extra === undefined) {
    console.log(PREFIX, scope, 'Fetching data for uid:', uid);
    return;
  }

  console.log(PREFIX, scope, 'Fetching data for uid:', uid, extra);
}

export function logSnapshot(scope, snapshot) {
  console.log(PREFIX, scope, 'Snapshot received:', snapshot.size, 'documents');
  snapshot.docs.forEach((docSnapshot) => {
    console.log(PREFIX, scope, 'Doc:', docSnapshot.id, docSnapshot.data());
  });
}

export function logDocSnapshot(scope, snapshot) {
  const count = snapshot.exists() ? 1 : 0;
  console.log(PREFIX, scope, 'Snapshot received:', count, 'documents');

  if (snapshot.exists()) {
    console.log(PREFIX, scope, 'Doc:', snapshot.id, snapshot.data());
    return;
  }

  console.log(PREFIX, scope, 'Doc: none');
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
