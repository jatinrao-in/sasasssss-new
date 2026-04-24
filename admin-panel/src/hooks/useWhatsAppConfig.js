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
 const q = query(collection(db, COLLECTIONS.whatsapp_config));

 const unsubscribe = onSnapshot(
 q,
 (snapshot) => {
 setConfigs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
 setLoading(false);
 },
 (error) => {
 console.error('WhatsApp config listener error:', error);
 setLoading(false);
 },
 );

 return () => unsubscribe();
 }, []);

 useEffect(() => {
 const logQuery = query(
 collection(db, COLLECTIONS.whatsapp_config, 'logs', 'items'),
 orderBy('sentAt', 'desc'),
 limit(50),
 );

 const unsubscribe = onSnapshot(
 logQuery,
 (snapshot) => {
 setLogs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
 },
 (error) => {
 // Log collection may not exist yet — that's okay
 console.warn('WhatsApp logs listener:', error.message);
 },
 );

 return () => unsubscribe();
 }, []);

 const saveConfig = async (messageType, configData) => {
 try {
 await setDoc(doc(db, COLLECTIONS.whatsapp_config, messageType), {
 ...configData,
 messageType,
 updatedAt: serverTimestamp(),
 }, { merge: true });
 } catch (err) {
 console.error('Error saving WhatsApp config:', err);
 throw err;
 }
 };

 const getConfig = (messageType) => configs.find((c) => c.id === messageType || c.messageType === messageType);

 return { configs, logs, loading, saveConfig, getConfig };
}
