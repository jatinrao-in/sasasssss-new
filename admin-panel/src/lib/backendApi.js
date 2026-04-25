import { securePost } from './secureApi';

export async function createTeamMember(memberData) {
  return securePost('/api/create-member', memberData);
}

export async function sendWhatsAppMessage({ to, templateName, components }) {
  return securePost('/api/whatsapp/send-text', { to, templateName, components });
}

export default { createTeamMember, sendWhatsAppMessage };
