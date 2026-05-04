export async function assertWhatsAppBalance(db, cost = 1) {
  const balanceDoc = await db.collection('settings').doc('whatsapp_balance').get();
  const balance = balanceDoc.exists ? (balanceDoc.data().balance || 0) : 0;
  
  if (balance < cost) {
    throw Object.assign(new Error('Insufficient WhatsApp balance'), { statusCode: 402, balance });
  }
  
  return balance;
}

export async function recordSuccessfulWhatsAppSend(db, data) {
  const { actor, balanceBefore, messageType, phone, recipientName } = data;
  
  await db.collection('settings').doc('whatsapp_balance').update({
    balance: balanceBefore - 1,
    lastSentAt: new Date(),
    lastRecipient: recipientName
  });
}
