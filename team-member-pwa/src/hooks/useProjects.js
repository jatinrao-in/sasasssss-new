import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRealtime } from '../context/RealtimeContext';
import { COLLECTIONS } from '../lib/firestore-helpers';

export function useProjects(filterProjectIds = null) {
  const realtime = useRealtime();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const stableFilterKey = useMemo(
    () => (Array.isArray(filterProjectIds) ? [...filterProjectIds].sort().join(',') : ''),
    [filterProjectIds],
  );

  const realtimeProjects = useMemo(() => {
    if (!realtime) {
      return null;
    }

    const filterIds = stableFilterKey ? stableFilterKey.split(',') : null;
    return filterIds
      ? realtime.projects.filter((project) => filterIds.includes(project.id))
      : realtime.projects;
  }, [realtime, stableFilterKey]);

  useEffect(() => {
    if (realtimeProjects) {
      setProjects(realtimeProjects);
      setLoading(Boolean(realtime?.loading?.projects));
      return undefined;
    }

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
  }, [realtimeProjects, realtime?.loading?.projects, stableFilterKey]);

  return { projects, loading };
}
