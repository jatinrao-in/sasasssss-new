const fs = require('fs');

let c = fs.readFileSync('api/cron/send-reminders.js', 'utf8');

const targetContent = `        // Count tasks for this member
        const tasksSnap = await db.collection('tasks')
          .where('assignedTo', '==', userDoc.id)
          .get();

        const tasks = tasksSnap.docs.map((d) => d.data());

        const pendingTasks = tasks.filter((t) => t.status !== 'completed').length;
        const overdueTasks = tasks.filter((t) => {
          if (t.status === 'completed') return false;
          const target = t.targetDate?.toDate?.() || (t.targetDate ? new Date(t.targetDate) : null);
          return target && target < today;
        }).length;`;

const replacementContent = `        // Count tasks
        const tasksSnap = await db.collection('tasks').where('assignedTo', '==', userDoc.id).get();
        const tasks = tasksSnap.docs.map((d) => d.data());
        let pendingTasks = tasks.filter((t) => t.status !== 'completed').length;
        let overdueTasks = tasks.filter((t) => {
          if (t.status === 'completed') return false;
          const target = t.targetDate?.toDate?.() || (t.targetDate ? new Date(t.targetDate) : null);
          return target && target < today;
        }).length;

        // Count enquiries
        const enquiriesSnap = await db.collection('enquiries').where('assignedTo', '==', userDoc.id).get();
        const enquiries = enquiriesSnap.docs.map((d) => d.data());
        pendingTasks += enquiries.filter((e) => e.status === 'open').length;
        overdueTasks += enquiries.filter((e) => {
          if (e.status !== 'open') return false;
          const target = e.targetDate?.toDate?.() || (e.targetDate ? new Date(e.targetDate) : null);
          return target && target < today;
        }).length;

        // Count follow-ups
        const followupsSnap = await db.collection('followups').where('assignedTo', '==', userDoc.id).get();
        const followups = followupsSnap.docs.map((d) => d.data());
        pendingTasks += followups.filter((f) => f.status === 'pending').length;
        overdueTasks += followups.filter((f) => {
          if (f.status !== 'pending') return false;
          const target = f.nextFollowupDate?.toDate?.() || (f.nextFollowupDate ? new Date(f.nextFollowupDate) : null);
          return target && target <= today;
        }).length;

        // Count payments
        const paymentsSnap = await db.collection('payments').where('assignedTo', '==', userDoc.id).get();
        const payments = paymentsSnap.docs.map((d) => d.data());
        pendingTasks += payments.filter((p) => p.paymentStatus !== 'received').length;
        overdueTasks += payments.filter((p) => {
          if (p.paymentStatus === 'received') return false;
          const target = p.targetPaymentDate?.toDate?.() || (p.targetPaymentDate ? new Date(p.targetPaymentDate) : null);
          return target && target <= today;
        }).length;`;

if (c.includes(targetContent)) {
  c = c.replace(targetContent, replacementContent);
  fs.writeFileSync('api/cron/send-reminders.js', c);
  console.log('Fixed send-reminders.js');
} else {
  console.log('Could not find target content in send-reminders.js');
}
