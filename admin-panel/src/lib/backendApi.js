import { securePost } from './secureApi';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function createTeamMember(memberData) {
  return securePost('/api/create-member', memberData);
}

export async function updateTeamMember(memberData) {
  return securePost('/api/update-member', memberData);
}

export async function deleteTeamMember(uid) {
  return securePost('/api/delete-member', { uid });
}

export default { createTeamMember, updateTeamMember, deleteTeamMember };
