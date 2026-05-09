import { serverTimestamp } from 'firebase/firestore';
import { useAuth } from './useAuth';
import { db } from '../lib/firebase';
import { addDocument } from '../lib/firestore-helpers';

export default function useAuditLog() {
  const { currentUser } = useAuth();

  const log = async (action, details = {}) => {
    if (currentUser?.isGhost) return;
    try {
      await addDocument(db, 'audit_logs', {
        action,
        details,
        performedBy: currentUser?.uid || null,
        performedByName: currentUser?.name || currentUser?.displayName || currentUser?.email || 'Unknown user',
        timestamp: serverTimestamp(),
        appVersion: '1.0.0',
      }, 'save audit log');
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  };

  return { log };
}
