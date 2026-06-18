import { getAdminApp } from '../lib/firebaseAdmin.js';
import { sendDailyReminder, sendGeneralMessage } from '../lib/msg91.js';

// Timezone-aware IST date YYYY-MM-DD
const getISTDateString = () => {
  const now = new Date();
  const utcOffset = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istDate = new Date(utcOffset + (3600000 * 5.5));
  return istDate.toISOString().split('T')[0];
};

// Helper for timeout protection per send
const timeoutPromise = (promise, ms = 8000) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Send operation timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeout
  ]);
};

// Validate user details
const validateUser = (user) => {
  if (!user) return false;
  if (user.status !== 'active') return false;
  if (!user.name || !user.name.trim()) return false;
  if (!user.whatsapp || !user.whatsapp.trim()) return false;

  const cleaned = String(user.whatsapp)
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .replace(/^91/, '');
  if (cleaned.length !== 10) {
    return false;
  }
  return true;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const results = {
    sent: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  const slot = req.query.slot;

  try {
    // Verify secret
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('Invalid cron secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!slot) {
      return res.status(400).json({ error: 'slot param required: morning or evening' });
    }

    console.log(`Cron started: ${slot}`);

    let adminApp;
    try {
      adminApp = getAdminApp();
    } catch (e) {
      console.log('Firebase init failed:', e.message);
      return res.status(200).json({
        success: false,
        error: 'Firebase init failed: ' + e.message,
        slot,
        sent: 0,
        failed: 0,
        skipped: 0,
        details: []
      });
    }

    const { db } = adminApp;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr = getISTDateString();
    const lastSentField = slot === 'morning' ? 'lastMorningSent' : 'lastEveningSent';

    // Fetch all active users
    const usersSnap = await db
      .collection('users')
      .where('status', '==', 'active')
      .get();

    const allUsers = usersSnap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(u => u.isHidden !== true);
      
    const members = allUsers.filter(u => u.role === 'member');

    console.log(`Users: ${allUsers.length}, Members: ${members.length}`);

    // ═══════════════════════════
    // MORNING: daily_reminder
    // Members only
    // ═══════════════════════════
    if (slot === 'morning') {
      for (const member of members) {
        if (!validateUser(member)) {
          // Skip silently if whatsapp empty, invalid, or user inactive
          continue;
        }

        if (member[lastSentField] === todayStr) {
          console.log(`Already sent today to ${member.name}, skipping`);
          results.skipped++;
          results.details.push({
            name: member.name,
            status: 'skipped',
            reason: 'duplicate'
          });
          continue;
        }

        try {
          // Fetch tasks
          const tasksSnap = await db
            .collection('tasks')
            .where('assignedTo', '==', member.uid)
            .get();

          const tasks = tasksSnap.docs.map(d => d.data());
          const pending = tasks.filter(t => t.status !== 'completed').length;
          const overdue = tasks.filter(t => {
            const target = t.targetDate?.toDate?.() || new Date(t.targetDate);
            return t.status !== 'completed' && target < today;
          }).length;

          console.log(`${member.name}: pending=${pending} overdue=${overdue}`);

          const pendingStr = String(pending ?? '0');
          const overdueStr = String(overdue ?? '0');
          const nameStr = String(member.name || '0');

          const result = await timeoutPromise(
            sendDailyReminder(
              member.whatsapp,
              nameStr,
              pendingStr,
              overdueStr
            ),
            8000
          );

          // Log to Firestore
          await db.collection('whatsapp_logs').add({
            to: member.whatsapp,
            memberName: member.name,
            memberUid: member.uid,
            slot: 'morning',
            template: 'daily_reminder',
            variables: { name: member.name, pending: pendingStr, overdue: overdueStr },
            status: result.success ? 'sent' : 'failed',
            msg91Response: result.response,
            sentAt: new Date()
          });

          if (result.success) {
            results.sent++;
            try {
              await db.collection('users').doc(member.uid).update({
                [lastSentField]: todayStr
              });
            } catch (updateErr) {
              console.log(`Failed to update ${lastSentField} for ${member.name}:`, updateErr.message);
            }
          } else {
            results.failed++;
          }

          results.details.push({
            name: member.name,
            status: result.success ? 'sent' : 'failed',
            pending,
            overdue
          });

        } catch (err) {
          console.log(`Morning error ${member.name}:`, err.message);
          results.failed++;
          results.details.push({ name: member.name, status: 'error', error: err.message });

          try {
            await db.collection('whatsapp_logs').add({
              to: member.whatsapp || '0',
              memberName: member.name || '0',
              memberUid: member.uid || '0',
              slot: 'morning',
              template: 'daily_reminder',
              status: 'failed',
              error: err.message,
              sentAt: new Date()
            });
          } catch (logErr) {
            console.log('Failed to write failure log to Firestore:', logErr.message);
          }
        }

        // 700ms rate limit protection
        await new Promise(r => setTimeout(r, 700));
      }
    }

    // ═══════════════════════════
    // EVENING: general_message
    // All users (members + admins)
    // ═══════════════════════════
    if (slot === 'evening') {
      // 1. Send individual summary to members
      for (const member of members) {
        if (!validateUser(member)) {
          // Skip silently if whatsapp empty, invalid, or user inactive
          continue;
        }

        if (member[lastSentField] === todayStr) {
          console.log(`Already sent today to ${member.name}, skipping`);
          results.skipped++;
          results.details.push({
            name: member.name,
            status: 'skipped',
            reason: 'duplicate'
          });
          continue;
        }

        try {
          const tasksSnap = await db
            .collection('tasks')
            .where('assignedTo', '==', member.uid)
            .get();
          const tasks = tasksSnap.docs.map(d => d.data());
          const pending = tasks.filter(t => t.status !== 'completed').length;
          const overdue = tasks.filter(t => {
            const target = t.targetDate?.toDate?.() || new Date(t.targetDate);
            return t.status !== 'completed' && target < today;
          }).length;
          const doneToday = tasks.filter(t => {
            const updated = t.updatedAt?.toDate?.() || new Date(t.updatedAt);
            return t.status === 'completed' && updated >= today;
          }).length;

          const followupsSnap = await db
            .collection('followups')
            .where('assignedTo', '==', member.uid)
            .where('status', '==', 'open')
            .get();

          const enquiriesSnap = await db
            .collection('enquiries')
            .where('assignedTo', '==', member.uid)
            .where('status', '==', 'open')
            .get();

          const paymentsSnap = await db
            .collection('payments')
            .where('assignedTo', '==', member.uid)
            .where('paymentStatus', '!=', 'received')
            .get();

          const rgpSnap = await db
            .collection('rgp')
            .where('assignedTo', '==', member.uid)
            .where('status', '==', 'open')
            .get();

          const summary = `Tasks pending: ${pending}, Overdue: ${overdue}, Completed today: ${doneToday}, Followups: ${followupsSnap.size}, Enquiries: ${enquiriesSnap.size}, Payments: ${paymentsSnap.size}, RGP open: ${rgpSnap.size}`;
          const nameStr = String(member.name || '0');
          const summaryStr = String(summary || '0');

          const result = await timeoutPromise(
            sendGeneralMessage(
              member.whatsapp,
              nameStr,
              summaryStr
            ),
            8000
          );

          await db.collection('whatsapp_logs').add({
            to: member.whatsapp,
            memberName: member.name,
            memberUid: member.uid,
            slot: 'evening',
            template: 'general_message',
            summary,
            status: result.success ? 'sent' : 'failed',
            msg91Response: result.response,
            sentAt: new Date()
          });

          if (result.success) {
            results.sent++;
            try {
              await db.collection('users').doc(member.uid).update({
                [lastSentField]: todayStr
              });
            } catch (updateErr) {
              console.log(`Failed to update ${lastSentField} for ${member.name}:`, updateErr.message);
            }
          } else {
            results.failed++;
          }

          results.details.push({
            name: member.name,
            role: 'member',
            status: result.success ? 'sent' : 'failed'
          });

        } catch (err) {
          console.log(`Evening error ${member.name}:`, err.message);
          results.failed++;
          results.details.push({ name: member.name, status: 'error', error: err.message });

          try {
            await db.collection('whatsapp_logs').add({
              to: member.whatsapp || '0',
              memberName: member.name || '0',
              memberUid: member.uid || '0',
              slot: 'evening',
              template: 'general_message',
              status: 'failed',
              error: err.message,
              sentAt: new Date()
            });
          } catch (logErr) {
            console.log('Failed to write failure log to Firestore:', logErr.message);
          }
        }

        // 700ms rate limit protection
        await new Promise(r => setTimeout(r, 700));
      }

      // 2. Generate and send Admin Summary
      try {
        const allTasksSnap = await db.collection('tasks').get();
        const allTasks = allTasksSnap.docs.map(d => d.data());

        const totalPending = allTasks.filter(t => t.status !== 'completed').length;
        const totalOverdue = allTasks.filter(t => {
          const target = t.targetDate?.toDate?.() || new Date(t.targetDate);
          return t.status !== 'completed' && target < today;
        }).length;
        const totalDone = allTasks.filter(t => {
          const updated = t.updatedAt?.toDate?.() || new Date(t.updatedAt);
          return t.status === 'completed' && updated >= today;
        }).length;

        const allFollowupsSnap = await db
          .collection('followups')
          .where('status', '==', 'open')
          .get();
        const allEnquiriesSnap = await db
          .collection('enquiries')
          .where('status', '==', 'open')
          .get();
        const allPaymentsSnap = await db
          .collection('payments')
          .where('paymentStatus', '!=', 'received')
          .get();
        const allRgpSnap = await db
          .collection('rgp')
          .where('status', '==', 'open')
          .get();

        const adminSummary = `Team tasks open: ${totalPending}, Overdue: ${totalOverdue}, Done today: ${totalDone}, Followups: ${allFollowupsSnap.size}, Enquiries: ${allEnquiriesSnap.size}, Payments: ${allPaymentsSnap.size}, RGP: ${allRgpSnap.size}`;

        // Send to specified admin numbers
        const adminNumbers = [
          '+918130299515',
          '+917023024124',
          '+919910822889'
        ];

        for (const phone of adminNumbers) {
          // Clean/validate phone
          let cleanedPhone;
          try {
            cleanedPhone = phone
              .replace(/\D/g, '')
              .replace(/^0+/, '')
              .replace(/^91/, '');
            if (cleanedPhone.length !== 10) {
              console.log(`Skipping invalid admin phone: ${phone}`);
              continue;
            }
            cleanedPhone = `91${cleanedPhone}`;
          } catch (phoneErr) {
            console.log(`Skipping invalid admin phone: ${phone}`, phoneErr.message);
            continue;
          }

          // Attempt to find user to get their real name if they exist in DB
          const adminUser = allUsers.find(u => {
            const uPhone = u.whatsapp ? String(u.whatsapp).replace(/\D/g, '').replace(/^0+/, '').replace(/^91/, '') : '';
            return uPhone === cleanedPhone.replace(/^91/, '');
          });
          const adminName = adminUser ? adminUser.name : 'Admin';
          const adminUid = adminUser ? adminUser.uid : 'system_admin';

          // Duplicate prevention check for admin if they exist in database
          if (adminUser) {
            if (adminUser[lastSentField] === todayStr) {
              console.log(`Already sent today to Admin ${adminName}, skipping`);
              results.skipped++;
              results.details.push({
                name: adminName,
                status: 'skipped',
                reason: 'duplicate'
              });
              continue;
            }
          }

          try {
            const adminNameStr = String(adminName || 'Admin');
            const adminSummaryStr = String(adminSummary || '0');

            const result = await timeoutPromise(
              sendGeneralMessage(
                cleanedPhone,
                adminNameStr,
                adminSummaryStr
              ),
              8000
            );

            await db.collection('whatsapp_logs').add({
              to: cleanedPhone,
              memberName: adminName,
              memberUid: adminUid,
              slot: 'evening',
              template: 'general_message',
              summary: adminSummary,
              status: result.success ? 'sent' : 'failed',
              msg91Response: result.response,
              sentAt: new Date()
            });

            if (result.success) {
              results.sent++;
              
              if (adminUser) {
                try {
                  await db.collection('users').doc(adminUser.uid).update({
                    [lastSentField]: todayStr
                  });
                } catch (updateErr) {
                  console.log(`Failed to update admin sent status for ${adminName}:`, updateErr.message);
                }
              }
            } else {
              results.failed++;
            }

            results.details.push({
              name: adminName,
              role: 'admin',
              status: result.success ? 'sent' : 'failed'
            });

          } catch (sendErr) {
            console.log(`Admin send error for ${adminName}:`, sendErr.message);
            results.failed++;
            results.details.push({ name: adminName, role: 'admin', status: 'error', error: sendErr.message });

            // Log attempt to Firestore
            try {
              await db.collection('whatsapp_logs').add({
                to: cleanedPhone,
                memberName: adminName,
                memberUid: adminUid,
                slot: 'evening',
                template: 'general_message',
                status: 'failed',
                error: sendErr.message,
                sentAt: new Date()
              });
            } catch (logErr) {
              console.log('Failed to write admin failure log to Firestore:', logErr.message);
            }
          }

          // 700ms rate limit protection
          await new Promise(r => setTimeout(r, 700));
        }

      } catch (err) {
        console.log(`Admin summary error:`, err.message);
        results.failed++;
        results.details.push({ name: 'Admins', status: 'error', error: err.message });
      }
    }

    console.log('Cron done:', results);

    return res.status(200).json({
      success: true,
      slot,
      time: new Date().toISOString(),
      sent: results.sent,
      failed: results.failed,
      skipped: results.skipped,
      details: results.details
    });

  } catch (error) {
    console.log('Cron fatal error:', error.message);
    return res.status(200).json({
      success: false,
      error: error.message,
      slot,
      time: new Date().toISOString(),
      sent: results.sent,
      failed: results.failed,
      skipped: results.skipped,
      details: results.details
    });
  }
}
