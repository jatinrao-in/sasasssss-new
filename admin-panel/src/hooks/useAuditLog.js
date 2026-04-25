import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './useAuth';
import { db } from '../lib/firebase';

export default function useAuditLog() {
  const { currentUser } = useAuth();

  const log = async (action, details = {}) => {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action,
        details,
        performedBy: currentUser?.uid || null,
        performedByName: currentUser?.name || currentUser?.displayName || currentUser?.email || 'Unknown user',
        timestamp: serverTimestamp(),
        appVersion: '1.0.0',
      });
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  };

  return { log };
}
