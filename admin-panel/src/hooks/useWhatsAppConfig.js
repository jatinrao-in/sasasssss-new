import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuditLog from './useAuditLog';
import { COLLECTIONS, setDocument } from '../lib/firestore-helpers';

export function useWhatsAppConfig() {
  const [configs, setConfigs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { log } = useAuditLog();

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
      collection(db, COLLECTIONS.whatsapp_logs),
      orderBy('sentAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      logQuery,
      (snapshot) => {
        setLogs(
          snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              type: data.type || data.eventType || '',
            };
          })
        );
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
      await setDocument(
        doc(db, COLLECTIONS.whatsapp_config, messageType),
        {
          ...configData,
          messageType,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
        { action: 'save whatsapp config', collectionName: COLLECTIONS.whatsapp_config },
      );
      await log('whatsapp_config_saved', {
        messageType,
        isActive: Boolean(configData.isActive),
        scheduledTime: configData.scheduledTime || '',
      });
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
