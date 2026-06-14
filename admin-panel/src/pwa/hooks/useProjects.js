import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRealtime } from '../context/RealtimeContext';
import { COLLECTIONS } from '../lib/firestore-helpers';
import {
  logDocSnapshot,
  logError,
  logFetch,
  logInfo,
  logSkip,
  logSnapshot,
} from '../lib/firestoreDebug';

export function useProjects(memberUid = null, filterProjectIds = null) {
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
      logInfo('useProjects', 'Using realtime projects:', realtimeProjects.length);
      setProjects(realtimeProjects);
      setLoading(Boolean(realtime?.loading?.projects));
      return undefined;
    }

    if (!memberUid) {
      logSkip('useProjects');
      setProjects([]);
      setLoading(false);
      return undefined;
    }

    logFetch('useProjects.tasks', memberUid);

    let projectUnsubs = [];
    let activeProjectKey = '';

    const syncProjectListeners = (projectIds = []) => {
      const uniqueProjectIds = [...new Set(projectIds.filter(Boolean))];
      const nextKey = uniqueProjectIds.join(',');

      if (nextKey === activeProjectKey) {
        return;
      }

      activeProjectKey = nextKey;
      projectUnsubs.forEach((unsubscribe) => unsubscribe());
      projectUnsubs = [];
      setLoading(true);

      logInfo('useProjects', 'Derived project IDs from member tasks:', uniqueProjectIds);

      if (!uniqueProjectIds.length) {
        setProjects([]);
        setLoading(false);
        return;
      }

      const projectMap = new Map();

      projectUnsubs = uniqueProjectIds.map((projectId) => onSnapshot(
        doc(db, COLLECTIONS.projects, projectId),
        (snapshot) => {
          logDocSnapshot(`useProjects.${projectId}`, snapshot);

          if (snapshot.exists()) {
            projectMap.set(projectId, { id: snapshot.id, ...snapshot.data() });
          } else {
            projectMap.delete(projectId);
          }

          const nextProjects = uniqueProjectIds
            .map((id) => projectMap.get(id))
            .filter(Boolean);

          setProjects(
            stableFilterKey
              ? nextProjects.filter((project) => stableFilterKey.split(',').includes(project.id))
              : nextProjects,
          );
          setLoading(false);
        },
        (error) => {
          logError('useProjects', error);
          setLoading(false);
        },
      ));
    };

    const tasksQuery = query(
      collection(db, COLLECTIONS.tasks),
      where('assignedTo', '==', memberUid),
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        logSnapshot('useProjects.tasks', snapshot);
        syncProjectListeners(snapshot.docs.map((taskDoc) => taskDoc.data().projectId));
      },
      (error) => {
        logError('useProjects.tasks', error);
        setLoading(false);
      },
    );

    return () => {
      projectUnsubs.forEach((stopListening) => stopListening());
      unsubscribe();
    };
  }, [memberUid, realtime?.loading?.projects, realtimeProjects, stableFilterKey]);

  return { projects, loading };
}
