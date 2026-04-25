import { securePost } from './secureApi';

export async function createTeamMember(memberData) {
  return securePost('/api/create-member', memberData);
}

export async function updateTeamMember(memberData) {
  return securePost('/api/update-member', memberData);
}

export default { createTeamMember, updateTeamMember };
