import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/firestore-helpers';

export function useWhatsAppConfig() {
  const [configs, setConfigs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const configQuery = query(collection(db, COLLECTIONS.whatsapp_config));

    const unsubscribe = onSnapshot(
      configQuery,
      (snapshot) => {
        setConfigs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('WhatsApp config listener error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const logQuery = query(
      collection(db, COLLECTIONS.whatsapp_config, 'logs', 'items'),
      orderBy('sentAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      logQuery,
      (snapshot) => {
        setLogs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      },
      (error) => {
        // Log collection may not exist yet - that is okay.
        console.warn('WhatsApp logs listener:', error.message);
      }
    );

    return () => unsubscribe();
  }, []);

  const saveConfig = async (messageType, configData) => {
    try {
      await setDoc(
        doc(db, COLLECTIONS.whatsapp_config, messageType),
        {
          ...configData,
          messageType,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Error saving WhatsApp config:', err);
      throw err;
    }
  };

  const getConfig = (messageType) =>
    configs.find((config) => config.id === messageType || config.messageType === messageType);

  const fetchConfigs = async () => {
    const snapshot = await getDocs(collection(db, COLLECTIONS.whatsapp_config));
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  };

  return { configs, logs, loading, saveConfig, getConfig, fetchConfigs };
}
