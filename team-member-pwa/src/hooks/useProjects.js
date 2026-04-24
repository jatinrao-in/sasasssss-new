import { useEffect, useMemo, useState } from 'react';
import {
 collection,
 onSnapshot,
 orderBy,
 query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/firestore-helpers';

export function useProjects(filterProjectIds = null) {
 const [projects, setProjects] = useState([]);
 const [loading, setLoading] = useState(true);

 // Stabilize the filter array reference to prevent infinite re-renders
 const stableFilterKey = useMemo(
 () => (Array.isArray(filterProjectIds) ? filterProjectIds.sort().join(',') : ''),
 [filterProjectIds],
 );

 useEffect(() => {
 const projectQuery = query(collection(db, COLLECTIONS.projects), orderBy('createdAt', 'desc'));

 const unsubscribe = onSnapshot(
 projectQuery,
 (snapshot) => {
 const nextProjects = snapshot.docs.map((projectDoc) => ({ id: projectDoc.id, ...projectDoc.data() }));
 setProjects(
 stableFilterKey
 ? nextProjects.filter((project) => stableFilterKey.split(',').includes(project.id))
 : nextProjects,
 );
 setLoading(false);
 },
 (error) => {
 console.error('Projects listener error:', error);
 setLoading(false);
 },
 );

 return () => unsubscribe();
 }, [stableFilterKey]);

 return { projects, loading };
}
