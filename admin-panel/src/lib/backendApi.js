import { securePost } from './secureApi';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function createTeamMember(memberData) {
  return securePost('/api/create-member', memberData);
}

export async function updateTeamMember(memberData) {
  const { uid, ...data } = memberData;
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp()
  });
  return { success: true, uid };
}

export async function deleteTeamMember(uid) {
  return securePost('/api/delete-member', { uid });
}

export default { createTeamMember, updateTeamMember, deleteTeamMember };
