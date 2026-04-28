import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const FILE_NAME = 'Saya_Industrial_Software_Delivery_Certificate_28April2026.pdf';
const TOTAL_PAGES = 8;

const PAGE = {
  width: 210,
  height: 297,
  margin: 20,
};

const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const PT_TO_MM = 0.352778;
const COMPANY_NAME = 'SAYA Industrial Automation Pvt. Ltd.';

const COLORS = {
  teal: [13, 148, 136],
  tealSoft: [240, 253, 250],
  dark: [15, 23, 42],
  grey: [71, 85, 105],
  light: [248, 250, 252],
  border: [203, 213, 225],
  red: [220, 38, 38],
  redSoft: [254, 242, 242],
};

const TECHNOLOGY_ROWS = [
  ['Frontend Framework', 'React.js (Vite)'],
  ['UI Library', 'Tailwind CSS + ShadCN'],
  ['Database', 'Firebase Firestore'],
  ['Authentication', 'Firebase Auth'],
  ['Hosting', 'Vercel (Global CDN)'],
  ['Backend API', 'Vercel Serverless Functions'],
  ['WhatsApp API', 'MSG91 WhatsApp Business'],
  ['AI Integration', 'Google Gemini 1.5 Flash'],
  ['Version Control', 'GitHub'],
  ['Mobile App', 'Progressive Web App (PWA)'],
];

const ADMIN_FEATURES = [
  [
    '1. Dashboard',
    'Real-time business overview; interactive charts and graphs; team performance leaderboard; quick access popup summaries; activity timeline feed; upcoming deadlines widget; smart alerts system.',
  ],
  [
    '2. Project Management',
    'Create and manage projects; task assignment to team members; real-time completion tracking; project health indicators; expense management per project; PO value vs expense tracking; Gantt-style timeline view; project export reports.',
  ],
  [
    '3. Open Enquiry Management',
    'Enquiry creation and assignment; company and contact tracking; pipeline view (Kanban); conversion rate analytics; auto overdue calculation; follow-up scheduling.',
  ],
  [
    '4. Follow-Up Management',
    'Complete followup tracking; calendar view; reschedule with history; outcome tracking; due today highlights.',
  ],
  [
    '5. Incoming Payments Module',
    'Invoice tracking; partial payment support; net pending calculation; aging analysis; payment receipt generation; auto reminder system.',
  ],
  [
    '6. Outgoing Payments Module',
    'Vendor payment tracking; payment cycle automation; cash flow summary; vendor statement generation.',
  ],
  [
    '7. RGP / Challan Tracking',
    'Document tracking; status management; auto alerts for overdue; company-wise summary.',
  ],
  [
    '8. Salary Management',
    'Monthly salary processing; LOP calculation (automatic); per day rate calculation; net salary auto-calculation; salary slip generation; bulk payroll processing; WhatsApp salary notification.',
  ],
  [
    '9. Tool Assignment Module',
    'Tool issue and return tracking; overdue return alerts; tool history per member; condition tracking.',
  ],
  [
    '10. Team Management',
    'Member creation with roles; page-wise access control; performance leaderboard; activity heatmap; workload visualization; unique color avatars.',
  ],
  [
    '11. WhatsApp Automation',
    'MSG91 WhatsApp Business integration; automated morning reminders (7 AM); automated evening reminders (7 PM); custom message broadcast; template-based messaging; balance tracker (Rs.1 per message); message logs and analytics; admin summary reports.',
  ],
  [
    '12. Settings Module',
    'Company settings; app preferences; notification controls; admin profile management; data backup (JSON export); audit log; maintenance tracker; danger zone controls.',
  ],
];

const TEAM_FEATURES = [
  [
    '1. Mobile Dashboard',
    'Personalized greeting; assigned tasks overview; current projects display; assigned tools widget; today\'s followups.',
  ],
  [
    '2. Task Management',
    'Project-wise task grouping; progress update (slider); expense entry per task; real-time sync with admin.',
  ],
  ['3. Enquiry Module', 'View assigned enquiries; status updates; note addition; company details visible.'],
  ['4. Follow-Up Module', 'Complete followup management; mark done with outcome; reschedule feature; notes addition.'],
  ['5. RGP/Challan Module', 'View assigned documents; status updates; document progress steps.'],
  ['6. Profile Module', 'Personal information; salary history (read-only); performance stats; password change.'],
  ['7. Notifications', 'Real-time push notifications; WhatsApp notifications; in-app notification center; sound alerts.'],
];

const SYSTEM_FEATURES = [
  'Role-based access control',
  'Page-wise permission system',
  'Real-time data sync',
  'Dark mode / Light mode',
  'Skeleton loading animations',
  'Offline support (PWA)',
  'Automatic data backup',
  'Audit trail logging',
  'Maintenance tracking system',
  'Secure Firebase authentication',
  'AI-powered WhatsApp messages (Google Gemini 1.5 Flash)',
];

const THIRD_PARTY_SERVICES = [
  [
    '1. Firebase (Google)',
    'Purpose: Database, Authentication, Real-time sync. Plan: Spark/Blaze (as agreed). Client manages: Firebase Console. Cost: As per agreement (included in project cost).',
  ],
  [
    '2. MSG91 WhatsApp Business API',
    'Purpose: WhatsApp notifications and automation. Cost per message: Rs. 1.00. Initial balance added: Rs. 50. Top-up: Client responsibility. Note: Messages will stop when balance reaches Rs. 0. Top-up at: msg91.com -> WhatsApp -> Add Balance.',
  ],
  [
    '3. Vercel (Hosting)',
    'Purpose: Web hosting for both applications + API. Plan: Free Hobby tier. Client manages: vercel.com.',
  ],
  [
    '4. GitHub',
    'Purpose: Code storage and version control. Plan: Free. Full source code: Delivered via Google Drive link.',
  ],
];

const TERMS = [
  [
    '1. WARRANTY PERIOD',
    'The developer provides bug fixing support until 15 May 2026. Any errors or issues reported before this date will be resolved at no additional charge.',
  ],
  [
    '2. POST-WARRANTY',
    'After 15 May 2026, any bug fixes, updates, or modifications will be charged separately as per scope of work.',
  ],
  [
    '3. MAINTENANCE POLICY',
    'Software maintenance is recommended every 2 months; maintenance is NOT mandatory but highly recommended; without maintenance, bugs may appear and third-party service updates may cause issues; maintenance fee: Rs. 500 per session; client may use any developer for maintenance, our fee is Rs. 500; services like Firebase, Railway, GitHub release regular updates that require code adjustments.',
  ],
  [
    '4. SOURCE CODE',
    'Full source code (~12 GB) will be delivered via Google Drive link; code is custom-built with dedication and expertise; please handle with care and maintain confidentiality.',
  ],
  [
    '5. WHATSAPP SERVICE',
    'MSG91 WhatsApp is a paid service; cost: Rs. 1 per successful message; initial Rs. 50 added by developer; future top-ups are the client\'s responsibility; templates used: Utility category (no marketing restrictions); top-up at: msg91.com.',
  ],
  [
    '6. THIRD-PARTY SERVICES',
    'Developer is not responsible for third-party service outages; Firebase, Vercel, MSG91, GitHub are independent services; any price changes by these services are the client\'s responsibility.',
  ],
  [
    '7. INTELLECTUAL PROPERTY',
    'Software is custom built for SAYA Industrial exclusively; source code delivered in full; developer retains right to use similar architecture for other projects.',
  ],
  [
    '8. PAYMENT TERMS',
    'Balance due: Rs. 5,000; payable upon delivery; late payment may affect support availability.',
  ],
  [
    '9. SUPPORT CONTACT',
    'During warranty period, contact: Phone: 9306018924 / 9499473347; Email: info.raojatin@gmail.com; Developer: Rao Jatin; Location: Rewari, Haryana; Registration: MSME Freelancer.',
  ],
  [
    '10. LIMITATION OF LIABILITY',
    'Developer liability is limited to the amount paid for development. Developer is not liable for any business losses due to software downtime or third-party failures.',
  ],
];

const DELIVERY_CHECKLIST = [
  ['Admin Panel Web Application', 'URL: https://sasasssss.vercel.app/admin'],
  ['Team Member PWA Application', 'URL: https://sasasssss.vercel.app'],
  ['Firebase Project Setup', 'Database, Authentication configured'],
  ['MSG91 WhatsApp Integration', '8 templates configured and approved'],
  ['Vercel Hosting Setup', 'Both applications live and accessible'],
  ['GitHub Repository', 'Full source code committed'],
  ['Google Drive Link', 'Complete codebase (~12 GB). To be shared separately.'],
  ['Admin Credentials', 'Shared separately via WhatsApp'],
  ['Documentation', 'This delivery document'],
];

function mmFromPt(fontSize, factor = 1.35) {
  return fontSize * PT_TO_MM * factor;
}

function setTextStyle(doc, { size = 10, style = 'normal', color = COLORS.grey } = {}) {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function fillRect(doc, x, y, width, height, color) {
  doc.setFillColor(...color);
  doc.rect(x, y, width, height, 'F');
}

function drawRoundedCard(doc, x, y, width, height, fillColor = COLORS.light, borderColor = COLORS.border) {
  fillRect(doc, x, y, width, height, fillColor);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, 3, 3);
}

function drawLabel(doc, text, x, y) {
  setTextStyle(doc, { size: 9, style: 'bold', color: COLORS.teal });
  const labelWidth = doc.getTextWidth(text) + 9;
  fillRect(doc, x, y - 4.4, labelWidth, 6.2, COLORS.tealSoft);
  doc.text(text, x + 4.5, y);
}

function renderText(
  doc,
  text,
  x,
  y,
  width,
  { size = 10, style = 'normal', color = COLORS.grey, lineHeight = 1.35, align = 'left' } = {},
) {
  setTextStyle(doc, { size, style, color });
  const lines = Array.isArray(text) ? text : doc.splitTextToSize(text, width);
  doc.text(lines, x, y, { align, lineHeightFactor: lineHeight, maxWidth: width });
  return y + lines.length * mmFromPt(size, lineHeight);
}

function drawHeaderFooter(doc, pageNumber) {
  fillRect(doc, 0, 0, PAGE.width, 14, COLORS.teal);
  setTextStyle(doc, { size: 11.5, style: 'bold', color: [255, 255, 255] });
  doc.text(COMPANY_NAME, PAGE.margin, 9);
  setTextStyle(doc, { size: 8.5, color: [255, 255, 255] });
  doc.text('Software Delivery Certificate', PAGE.width - PAGE.margin, 9, { align: 'right' });

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(PAGE.margin, 17, PAGE.width - PAGE.margin, 17);
  doc.line(PAGE.margin, PAGE.height - 15, PAGE.width - PAGE.margin, PAGE.height - 15);

  setTextStyle(doc, { size: 8.2, color: COLORS.grey });
  doc.text('Rao Jatin | Freelance Developer | MSME | Rewari, Haryana', PAGE.margin, PAGE.height - 8.3);
  doc.text(`Page ${pageNumber} of ${TOTAL_PAGES}`, PAGE.width - PAGE.margin, PAGE.height - 8.3, {
    align: 'right',
  });
}

function drawPageTitle(doc, pageNumber, title) {
  drawHeaderFooter(doc, pageNumber);
  setTextStyle(doc, { size: 18, style: 'bold', color: COLORS.dark });
  doc.text(title, PAGE.margin, 28);
  doc.setDrawColor(...COLORS.teal);
  doc.setLineWidth(0.7);
  doc.line(PAGE.margin, 31.5, PAGE.margin + 40, 31.5);
}

function renderFeatureColumn(doc, items, x, startY, width) {
  let y = startY;

  items.forEach(([title, details]) => {
    y = renderText(doc, title, x, y, width, {
      size: 8.1,
      style: 'bold',
      color: COLORS.dark,
      lineHeight: 1.16,
    });
    y = renderText(doc, details, x, y + 0.7, width, {
      size: 7.2,
      color: COLORS.grey,
      lineHeight: 1.22,
    });
    y += 1.2;
  });

  return y;
}

function renderChecklistItem(doc, x, y, width, title, details) {
  doc.setFillColor(...COLORS.teal);
  doc.setDrawColor(...COLORS.teal);
  doc.roundedRect(x, y - 4.6, 6, 6, 1.1, 1.1, 'FD');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  doc.line(x + 1.5, y - 1.8, x + 2.6, y - 0.3);
  doc.line(x + 2.6, y - 0.3, x + 4.8, y - 3.1);

  const textX = x + 9.5;
  const titleBottom = renderText(doc, title, textX, y, width - 9.5, {
    size: 9.2,
    style: 'bold',
    color: COLORS.dark,
    lineHeight: 1.14,
  });
  const detailBottom = renderText(doc, details, textX, titleBottom + 0.5, width - 9.5, {
    size: 8.4,
    color: COLORS.grey,
    lineHeight: 1.2,
  });

  return detailBottom + 2.2;
}

function renderSignatureBox(doc, x, y, width, height, title, lines) {
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, width, height, 3, 3);
  setTextStyle(doc, { size: 11, style: 'bold', color: COLORS.dark });
  doc.text(title, x + 6, y + height - 24);
  setTextStyle(doc, { size: 9.2, color: COLORS.grey });
  doc.text(lines, x + 6, y + height - 17, { lineHeightFactor: 1.3 });
  doc.line(x + 6, y + height - 8, x + width - 6, y + height - 8);
}

function addCoverPage(doc) {
  fillRect(doc, 0, 0, PAGE.width, 22, COLORS.teal);
  fillRect(doc, 0, PAGE.height - 18, PAGE.width, 18, COLORS.teal);

  setTextStyle(doc, { size: 16.5, style: 'bold', color: [255, 255, 255] });
  doc.text(COMPANY_NAME, PAGE.width / 2, 10.8, { align: 'center' });
  setTextStyle(doc, { size: 9.8, color: [255, 255, 255] });
  doc.text('Subsidiary of Saya Engineers', PAGE.width / 2, 16.3, { align: 'center' });

  setTextStyle(doc, { size: 18, style: 'bold', color: COLORS.dark });
  doc.text(COMPANY_NAME, PAGE.width / 2, 42, { align: 'center' });
  setTextStyle(doc, { size: 10.5, color: COLORS.grey });
  doc.text('Subsidiary of Saya Engineers', PAGE.width / 2, 48, { align: 'center' });
  doc.text('ISO 9001 Certified | Est. 2020', PAGE.width / 2, 53, { align: 'center' });

  doc.setDrawColor(...COLORS.teal);
  doc.setLineWidth(0.7);
  doc.line(36, 78, 174, 78);
  doc.line(36, 104, 174, 104);

  setTextStyle(doc, { size: 20, style: 'bold', color: COLORS.dark });
  doc.text('SOFTWARE DELIVERY CERTIFICATE', PAGE.width / 2, 92, { align: 'center' });

  drawRoundedCard(doc, PAGE.margin, 114, CONTENT_WIDTH, 124);

  let y = 128;
  drawLabel(doc, 'Project', PAGE.margin + 10, y);
  y = renderText(
    doc,
    'Enterprise Business Management Software Suite (Admin Panel + Team Member PWA)',
    PAGE.margin + 10,
    y + 6,
    CONTENT_WIDTH - 20,
    {
      size: 11.5,
      style: 'bold',
      color: COLORS.dark,
      lineHeight: 1.24,
    },
  );

  y += 8;
  drawLabel(doc, 'Delivered By', PAGE.margin + 10, y);
  y = renderText(doc, 'Rao Jatin\nFreelance Developer\nMSME Registered\nRewari, Haryana', PAGE.margin + 10, y + 6, 64, {
    size: 10,
    color: COLORS.grey,
    lineHeight: 1.3,
  });

  drawLabel(doc, 'Delivered To', PAGE.margin + 90, y - 20.8);
  renderText(doc, 'SAYA Industrial Automation Pvt. Ltd.\nAvinash Kumar\n+91 81302 99515', PAGE.margin + 90, y - 14.8, 60, {
    size: 10,
    color: COLORS.grey,
    lineHeight: 1.3,
  });

  y += 12;
  drawLabel(doc, 'Project Period', PAGE.margin + 10, y);
  renderText(doc, 'Start Date: 02 April 2026\nDelivery Date: 28 April 2026\nDuration: 26 Days', PAGE.margin + 10, y + 6, 70, {
    size: 10.4,
    style: 'bold',
    color: COLORS.dark,
    lineHeight: 1.26,
  });

  setTextStyle(doc, { size: 8.6, color: [255, 255, 255] });
  doc.text('Rao Jatin | Freelance Developer | MSME | Rewari, Haryana', PAGE.margin, PAGE.height - 8.2);
  doc.text('Page 1 of 8', PAGE.width - PAGE.margin, PAGE.height - 8.2, { align: 'right' });
}

function addProjectOverviewPage(doc) {
  drawPageTitle(doc, 2, 'PROJECT OVERVIEW');

  let y = 39;
  drawLabel(doc, 'Section 1  About the Software', PAGE.margin, y);
  y = renderText(
    doc,
    'This Enterprise Business Management Software Suite has been custom developed exclusively for SAYA Industrial Automation Pvt. Ltd. The solution comprises two interconnected applications:',
    PAGE.margin,
    y + 6,
    CONTENT_WIDTH,
    {
      size: 10.4,
      color: COLORS.grey,
      lineHeight: 1.4,
    },
  );

  y += 5;
  y = renderText(doc, '1. Admin Panel (Web Application)', PAGE.margin, y, CONTENT_WIDTH, {
    size: 10.5,
    style: 'bold',
    color: COLORS.dark,
    lineHeight: 1.2,
  });
  y = renderText(doc, '- Desktop-optimized management portal\n- Full business operations control\n- Real-time analytics dashboard', PAGE.margin + 3, y + 1, CONTENT_WIDTH - 3, {
    size: 9.6,
    color: COLORS.grey,
    lineHeight: 1.28,
  });

  y += 3;
  y = renderText(doc, '2. Team Member PWA (Mobile Application)', PAGE.margin, y, CONTENT_WIDTH, {
    size: 10.5,
    style: 'bold',
    color: COLORS.dark,
    lineHeight: 1.2,
  });
  y = renderText(doc, '- Progressive Web App (PWA)\n- Mobile-first design\n- Works like native Android app\n- Installable on any smartphone', PAGE.margin + 3, y + 1, CONTENT_WIDTH - 3, {
    size: 9.6,
    color: COLORS.grey,
    lineHeight: 1.28,
  });

  y += 8;
  drawLabel(doc, 'Section 2  Technology Stack', PAGE.margin, y);

  autoTable(doc, {
    startY: y + 7,
    head: [['Component', 'Technology']],
    body: TECHNOLOGY_ROWS,
    margin: { left: PAGE.margin, right: PAGE.margin },
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.teal,
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left',
    },
    bodyStyles: {
      font: 'helvetica',
      fontSize: 9.5,
      textColor: COLORS.dark,
      cellPadding: 3,
      lineColor: COLORS.border,
      lineWidth: 0.2,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: COLORS.light,
    },
    tableLineColor: COLORS.border,
    tableLineWidth: 0.25,
    columnStyles: {
      0: { cellWidth: 64 },
      1: { cellWidth: 106 },
    },
  });
}

function addFeaturesPage(doc) {
  drawPageTitle(doc, 3, 'COMPLETE FEATURES DELIVERED');

  const columnGap = 10;
  const columnWidth = (CONTENT_WIDTH - columnGap) / 2;
  const leftX = PAGE.margin;
  const rightX = leftX + columnWidth + columnGap;
  const startY = 39;

  drawLabel(doc, 'A. ADMIN PANEL MODULES', leftX, startY);
  renderFeatureColumn(doc, ADMIN_FEATURES, leftX, startY + 7, columnWidth);

  drawLabel(doc, 'B. TEAM MEMBER PWA FEATURES', rightX, startY);
  let rightY = renderFeatureColumn(doc, TEAM_FEATURES, rightX, startY + 7, columnWidth);
  rightY += 1.5;
  drawLabel(doc, 'C. SYSTEM FEATURES', rightX, rightY);
  renderText(
    doc,
    SYSTEM_FEATURES.map((item) => `- ${item}`),
    rightX,
    rightY + 7,
    columnWidth,
    {
      size: 7.5,
      color: COLORS.grey,
      lineHeight: 1.2,
    },
  );

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.25);
  doc.line(PAGE.width / 2, 38, PAGE.width / 2, PAGE.height - 24);
}

function addPricingPage(doc) {
  drawPageTitle(doc, 4, 'INVESTMENT SUMMARY');

  let y = 39;
  renderText(doc, 'Project: Enterprise Business Management Software Suite', PAGE.margin, y, CONTENT_WIDTH, {
    size: 10.6,
    style: 'bold',
    color: COLORS.dark,
    lineHeight: 1.2,
  });
  y += 9;
  drawLabel(doc, 'COST BREAKDOWN', PAGE.margin, y);

  const pricingRows = [
    ['Firebase (Realtime DB + Auth + 10GB Bandwidth/Month - Lifetime)', 'Rs. 3,488\n(USD $37)'],
    ['Railway Backend (API + Backend Workflow + 5GB Bandwidth)', 'Rs. 3,960\n(USD $42)'],
    ['MSG91 WhatsApp Business (Registration + Setup)', 'Rs. 299'],
    ['Developer Charges (Full Development - Admin Panel + PWA)', 'Rs. 5,000'],
    ['Subtotal', 'Rs. 12,747'],
    ['Discount Applied', '- Rs. 1,747'],
    ['TOTAL AMOUNT', 'Rs. 11,000'],
    ['Amount Paid', 'Rs. 6,000'],
    ['BALANCE DUE', 'Rs. 5,000'],
  ];

  autoTable(doc, {
    startY: y + 7,
    head: [['Item', 'Amount']],
    body: pricingRows,
    margin: { left: PAGE.margin, right: PAGE.margin },
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.teal,
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left',
    },
    bodyStyles: {
      font: 'helvetica',
      fontSize: 9.2,
      textColor: COLORS.dark,
      lineColor: COLORS.border,
      lineWidth: 0.2,
      cellPadding: 3,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 116 },
      1: { cellWidth: 54, halign: 'left' },
    },
    didParseCell: ({ section, row, cell }) => {
      if (section !== 'body') {
        return;
      }

      if (row.index === 4 || row.index === 7) {
        cell.styles.fillColor = COLORS.light;
        cell.styles.fontStyle = 'bold';
      }

      if (row.index === 5) {
        cell.styles.textColor = COLORS.red;
        cell.styles.fontStyle = 'bold';
      }

      if (row.index === 6) {
        cell.styles.fillColor = COLORS.tealSoft;
        cell.styles.textColor = COLORS.teal;
        cell.styles.fontStyle = 'bold';
      }

      if (row.index === 8) {
        cell.styles.fillColor = COLORS.redSoft;
        cell.styles.textColor = COLORS.red;
        cell.styles.fontStyle = 'bold';
      }
    },
  });

  const tableBottom = doc.lastAutoTable.finalY + 8;
  drawLabel(doc, 'PAYMENT DETAILS', PAGE.margin, tableBottom);
  drawRoundedCard(doc, PAGE.margin, tableBottom + 4, 80, 46);
  drawRoundedCard(doc, PAGE.margin + 90, tableBottom + 4, 80, 46);

  renderText(doc, 'Bank Transfer', PAGE.margin + 5, tableBottom + 12, 70, {
    size: 10.2,
    style: 'bold',
    color: COLORS.dark,
    lineHeight: 1.2,
  });
  renderText(doc, 'Account Holder: Jatin\nBank: State Bank of India\nAccount Number: 44221138872\nIFSC Code: SBIN0016567', PAGE.margin + 5, tableBottom + 18, 70, {
    size: 9.1,
    color: COLORS.grey,
    lineHeight: 1.26,
  });

  renderText(doc, 'UPI Payment', PAGE.margin + 95, tableBottom + 12, 70, {
    size: 10.2,
    style: 'bold',
    color: COLORS.dark,
    lineHeight: 1.2,
  });
  renderText(doc, 'UPI ID: 9306018924@yapl\nMobile: 9306018624', PAGE.margin + 95, tableBottom + 18, 70, {
    size: 9.1,
    color: COLORS.grey,
    lineHeight: 1.26,
  });

  renderText(doc, 'Note: Balance payment of Rs. 5,000 is requested upon satisfactory delivery of the software.', PAGE.margin, tableBottom + 58, CONTENT_WIDTH, {
    size: 9.2,
    style: 'italic',
    color: COLORS.red,
    lineHeight: 1.28,
  });
}

function addThirdPartyServicesPage(doc) {
  drawPageTitle(doc, 5, 'THIRD PARTY SERVICES NOTE');

  let y = 39;
  y = renderText(
    doc,
    'The following third-party services are integrated in this software. These are external services with their own pricing and the client is responsible for their ongoing costs:',
    PAGE.margin,
    y,
    CONTENT_WIDTH,
    {
      size: 10.2,
      color: COLORS.grey,
      lineHeight: 1.36,
    },
  );

  y += 5;
  THIRD_PARTY_SERVICES.forEach(([title, body]) => {
    const bodyLines = doc.splitTextToSize(body, CONTENT_WIDTH - 10);
    const cardHeight = 12 + bodyLines.length * mmFromPt(9, 1.24);
    drawRoundedCard(doc, PAGE.margin, y - 4.5, CONTENT_WIDTH, cardHeight);
    y = renderText(doc, title, PAGE.margin + 5, y + 1.5, CONTENT_WIDTH - 10, {
      size: 10.3,
      style: 'bold',
      color: COLORS.dark,
      lineHeight: 1.18,
    });
    y = renderText(doc, bodyLines, PAGE.margin + 5, y + 1, CONTENT_WIDTH - 10, {
      size: 9,
      color: COLORS.grey,
      lineHeight: 1.24,
    });
    y += 6;
  });

  drawRoundedCard(doc, PAGE.margin, 231, CONTENT_WIDTH, 24, COLORS.redSoft, COLORS.red);
  renderText(doc, 'Note: Developer has no control over third-party service pricing changes, downtime, or policy updates.', PAGE.margin + 5, 241, CONTENT_WIDTH - 10, {
    size: 10,
    style: 'bold',
    color: COLORS.red,
    lineHeight: 1.3,
  });
}

function addTermsPage(doc) {
  drawPageTitle(doc, 6, 'TERMS AND CONDITIONS');

  const columnGap = 10;
  const columnWidth = (CONTENT_WIDTH - columnGap) / 2;
  const leftX = PAGE.margin;
  const rightX = leftX + columnWidth + columnGap;
  let leftY = 39;
  let rightY = 39;

  TERMS.slice(0, 5).forEach(([title, body]) => {
    leftY = renderText(doc, title, leftX, leftY, columnWidth, {
      size: 8.8,
      style: 'bold',
      color: COLORS.dark,
      lineHeight: 1.16,
    });
    leftY = renderText(doc, body, leftX, leftY + 0.7, columnWidth, {
      size: 7.6,
      color: COLORS.grey,
      lineHeight: 1.24,
    });
    leftY += 2.6;
  });

  TERMS.slice(5).forEach(([title, body]) => {
    rightY = renderText(doc, title, rightX, rightY, columnWidth, {
      size: 8.8,
      style: 'bold',
      color: COLORS.dark,
      lineHeight: 1.16,
    });
    rightY = renderText(doc, body, rightX, rightY + 0.7, columnWidth, {
      size: 7.6,
      color: COLORS.grey,
      lineHeight: 1.24,
    });
    rightY += 2.6;
  });

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.25);
  doc.line(PAGE.width / 2, 38, PAGE.width / 2, PAGE.height - 24);
}

function addChecklistPage(doc) {
  drawPageTitle(doc, 7, 'DELIVERY CHECKLIST');

  let y = 40;
  DELIVERY_CHECKLIST.forEach(([title, details]) => {
    y = renderChecklistItem(doc, PAGE.margin, y, CONTENT_WIDTH, title, details);
  });

  drawRoundedCard(doc, PAGE.margin, 226, CONTENT_WIDTH, 42, COLORS.tealSoft, COLORS.teal);
  renderText(doc, 'INSTALLATION FOR TEAM MEMBERS', PAGE.margin + 5, 236, CONTENT_WIDTH - 10, {
    size: 10.4,
    style: 'bold',
    color: COLORS.teal,
    lineHeight: 1.2,
  });
  renderText(doc, '1. Open PWA URL on Android phone in Chrome\n2. Tap 3 dots menu -> Add to Home Screen\n3. Tap Install\n4. Login with credentials from admin', PAGE.margin + 5, 244, CONTENT_WIDTH - 10, {
    size: 9.1,
    color: COLORS.grey,
    lineHeight: 1.26,
  });
}

function addAcknowledgementPage(doc) {
  drawPageTitle(doc, 8, 'ACKNOWLEDGEMENT');

  const introBottom = renderText(
    doc,
    'This document confirms the successful delivery of the Enterprise Business Management Software Suite to SAYA Industrial Automation Pvt. Ltd.',
    PAGE.margin,
    40,
    CONTENT_WIDTH,
    {
      size: 11,
      color: COLORS.grey,
      lineHeight: 1.4,
    },
  );

  renderText(
    doc,
    'By accepting this delivery, the client acknowledges receipt of all deliverables mentioned in this document.',
    PAGE.margin,
    introBottom + 6,
    CONTENT_WIDTH,
    {
      size: 10.4,
      color: COLORS.grey,
      lineHeight: 1.34,
    },
  );

  renderSignatureBox(doc, PAGE.margin, 92, 76, 96, 'Developer Signature', [
    'Rao Jatin',
    'Freelancer',
    'Rewari, Haryana',
    '',
    'Date: ______',
  ]);

  renderSignatureBox(doc, PAGE.margin + 94, 92, 76, 96, 'Client Signature', [
    'Avinash Kumar',
    'SAYA Industrial',
    'Automation Pvt. Ltd.',
    '',
    'Date: ______',
  ]);

  renderText(doc, 'Company Stamp: ___________________', PAGE.margin, 209, CONTENT_WIDTH, {
    size: 11,
    style: 'bold',
    color: COLORS.dark,
    lineHeight: 1.2,
  });

  drawRoundedCard(doc, PAGE.margin, 226, CONTENT_WIDTH, 28);
  renderText(doc, 'Rao Jatin | Freelance Developer | MSME | Rewari, Haryana\nContact: 9306018924 | info.raojatin@gmail.com', PAGE.margin + 5, 237, CONTENT_WIDTH - 10, {
    size: 9.4,
    color: COLORS.grey,
    lineHeight: 1.28,
  });
}

export function createDeliveryPDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setProperties({
    title: 'Saya Industrial Software Delivery Certificate',
    subject: 'Software Delivery Certificate',
    author: 'Rao Jatin',
    creator: 'SAYA Industrial Admin Panel',
    keywords: 'Saya Industrial, software delivery, certificate, PDF',
  });

  addCoverPage(doc);
  doc.addPage();
  addProjectOverviewPage(doc);
  doc.addPage();
  addFeaturesPage(doc);
  doc.addPage();
  addPricingPage(doc);
  doc.addPage();
  addThirdPartyServicesPage(doc);
  doc.addPage();
  addTermsPage(doc);
  doc.addPage();
  addChecklistPage(doc);
  doc.addPage();
  addAcknowledgementPage(doc);

  return doc;
}

export function generateDeliveryPDF() {
  const doc = createDeliveryPDF();
  doc.save(FILE_NAME);
  return doc;
}

export { FILE_NAME as DELIVERY_CERTIFICATE_FILE_NAME };
