import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const draftMessage = async (eventType, context) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompts = {
    task_assigned: `
      Draft a professional WhatsApp message
      for a team member who has been assigned
      a new task.
      
      Details:
      - Member Name: ${context.memberName}
      - Task Title: ${context.taskName}
      - Project: ${context.projectName}
      - Start Date: ${context.startDate}
      - Deadline: ${context.deadline}
      - Description: ${context.description}
      - Company: ${context.company}
      
      Rules:
      - Greet by name
      - Mention task and project clearly
      - Mention start date and deadline
      - Professional but warm tone
      - End with encouragement
      - Max 5 lines
      - Plain text only
      - No markdown, no asterisks
    `,

    task_completed: `
      Draft a congratulatory WhatsApp message
      for admin about a task completion.
      
      Details:
      - Member Name: ${context.memberName}
      - Task Title: ${context.taskName}
      - Project: ${context.projectName}
      - Completed On: ${context.completedOn}
      - Company: ${context.company}
      
      Rules:
      - Addressed to admin
      - Mention member completed the task
      - Mention project name
      - Short and positive
      - Max 4 lines
      - Plain text only
    `,

    task_overdue: `
      Draft a professional but gentle
      overdue reminder WhatsApp message
      for a team member.
      
      Details:
      - Member Name: ${context.memberName}
      - Task Title: ${context.taskName}
      - Project: ${context.projectName}
      - Original Deadline: ${context.deadline}
      - Overdue By: ${context.overdueDays} days
      - Company: ${context.company}
      
      Rules:
      - Greet by name
      - Remind about overdue task politely
      - Mention how many days overdue
      - Ask to update status or contact admin
      - Not harsh, professional
      - Max 5 lines
      - Plain text only
    `,

    salary_paid: `
      Draft a salary credit notification
      WhatsApp message for a team member.
      
      Details:
      - Member Name: ${context.memberName}
      - Month: ${context.month}
      - Working Days: ${context.workingDays}
      - Present Days: ${context.presentDays}
      - LOP Days: ${context.lopDays}
      - Base Salary: ${context.baseSalary}
      - LOP Deduction: ${context.lopDeduction}
      - Net Salary: ${context.netSalary}
      - Payment Date: ${context.paidDate}
      - Company: ${context.company}
      
      Rules:
      - Greet by name
      - Confirm salary credited
      - Show clean breakdown:
        Working Days / Present / LOP /
        Net Salary
      - Professional and warm
      - Max 8 lines
      - Plain text only
      - Show amounts with rupee symbol
    `,

    enquiry_assigned: `
      Draft a professional WhatsApp message
      for a team member assigned a new enquiry.
      
      Details:
      - Member Name: ${context.memberName}
      - Enquiry Type: ${context.enquiryType}
      - Assigned Date: ${context.assignedDate}
      - Target Date: ${context.targetDate}
      - Next Followup: ${context.nextFollowup}
      - Company: ${context.company}
      
      Rules:
      - Greet by name
      - Mention enquiry type clearly
      - Mention target and followup dates
      - Ask to take prompt action
      - Professional tone
      - Max 5 lines
      - Plain text only
    `,

    followup_due: `
      Draft a follow-up reminder WhatsApp
      message for a team member.
      
      Details:
      - Member Name: ${context.memberName}
      - Followup Type: ${context.followupType}
      - Customer/Topic: ${context.topic}
      - Due Date: ${context.dueDate}
      - Company: ${context.company}
      
      Rules:
      - Greet by name
      - Remind about followup due today
      - Mention customer/topic
      - Ask to complete and update status
      - Friendly but urgent tone
      - Max 4 lines
      - Plain text only
    `,

    payment_due: `
      Draft a payment follow-up reminder
      WhatsApp message for a team member.
      
      Details:
      - Member Name: ${context.memberName}
      - Customer Name: ${context.customerName}
      - Invoice Number: ${context.invoiceNo}
      - Amount Pending: ${context.amount}
      - Due Date: ${context.dueDate}
      - Overdue Days: ${context.overdueDays}
      - Company: ${context.company}
      
      Rules:
      - Greet by name
      - Mention customer and invoice
      - Mention pending amount clearly
      - If overdue: mention days overdue
      - Ask to follow up today
      - Professional tone
      - Max 5 lines
      - Plain text only
    `,

    rgp_overdue: `
      Draft a reminder WhatsApp message
      for a team member about an overdue
      RGP or Challan.
      
      Details:
      - Member Name: ${context.memberName}
      - Type: ${context.type}
      - Doc Number: ${context.docNumber}
      - From: ${context.fromCompany}
      - To: ${context.toCompany}
      - Open Since: ${context.openDays} days
      - Company: ${context.company}
      
      Rules:
      - Greet by name
      - Mention RGP/Challan details
      - Mention how long it has been open
      - Ask to take action and update status
      - Professional tone
      - Max 5 lines
      - Plain text only
    `,

    tool_not_returned: `
      Draft a tool return reminder
      WhatsApp message for a team member.
      
      Details:
      - Member Name: ${context.memberName}
      - Tool Name: ${context.toolName}
      - Issued Date: ${context.issuedDate}
      - Days Since Issued: ${context.days}
      - Company: ${context.company}
      
      Rules:
      - Greet by name
      - Mention tool name
      - Mention when it was issued
      - Politely request return
      - Friendly tone
      - Max 4 lines
      - Plain text only
    `
  };

  try {
    const result = await model.generateContent(prompts[eventType]);
    return result.response.text().trim();
  } catch (error) {
    // Fallback messages if Gemini fails
    const fallbacks = {
      task_assigned: 
        `Hello ${context.memberName},\n` +
        `A new task has been assigned to you: ${context.taskName}\n` +
        `Project: ${context.projectName}\n` +
        `Deadline: ${context.deadline}\n` +
        `Please check your app for details.`,
      
      task_completed:
        `Task Completed!\n` +
        `${context.memberName} has completed task: ${context.taskName}\n` +
        `Project: ${context.projectName}`,
      
      task_overdue:
        `Hello ${context.memberName},\n` +
        `Your task "${context.taskName}" is overdue by ${context.overdueDays} days.\n` +
        `Please update the status.`,
      
      salary_paid:
        `Hello ${context.memberName},\n` +
        `Your salary of Rs.${context.netSalary} for ${context.month} has been processed.\n` +
        `Payment Date: ${context.paidDate}`,
      
      enquiry_assigned:
        `Hello ${context.memberName},\n` +
        `New ${context.enquiryType} enquiry assigned.\n` +
        `Target Date: ${context.targetDate}`,
      
      followup_due:
        `Hello ${context.memberName},\n` +
        `Follow-up due today: ${context.topic}\n` +
        `Please complete and update status.`,
      
      payment_due:
        `Hello ${context.memberName},\n` +
        `Payment follow-up needed.\n` +
        `Customer: ${context.customerName}\n`+
        `Amount: Rs.${context.amount}`,
      
      rgp_overdue:
        `Hello ${context.memberName},\n` +
        `${context.type} ${context.docNumber} is open for ${context.openDays} days.\n` +
        `Please take action.`,
      
      tool_not_returned:
        `Hello ${context.memberName},\n` +
        `Please return ${context.toolName} issued on ${context.issuedDate}.\n` +
        `It has been ${context.days} days.`
    };
    
    return fallbacks[eventType] || 'Please check your app for updates.';
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  const { eventType, context } = req.body;
  const message = await draftMessage(eventType, context);
  return res.status(200).json({ success: true, message });
}
