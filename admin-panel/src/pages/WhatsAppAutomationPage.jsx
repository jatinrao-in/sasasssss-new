import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  LoaderCircle,
  Save,
  Send,
  X,
} from 'lucide-react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import DeleteButton from '../components/DeleteButton';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import useAuditLog from '../hooks/useAuditLog';
import useDelete from '../hooks/useDelete';
import { useTeam } from '../hooks/useTeam';
import { useToast } from '../hooks/useToast';
import { sendWhatsAppCustom } from '../lib/api';
import { clearCollection } from '../lib/deleteActions';
import { db } from '../lib/firebase';
import { COLLECTIONS, setDocument, timestampToDate } from '../lib/firestore-helpers';
import { exportCSV } from '../lib/exportUtils';

const DEFAULT_SETTINGS = {
  morningEnabled: true,
  morningTime: '07:00',
  eveningEnabled: true,
  eveningTime: '19:00',
  adminSummaryEnabled: true,
  adminNumbers: ['', '', ''],
  morningTemplate: `Good morning {name}!

Here is your daily work update:

Pending Tasks: {pending_tasks}
Overdue Tasks: {overdue_tasks}
Today's Followups: {followups_today}

Task Details:
{task_list}

Please update your progress today.
- {company_name}`,
  eveningTemplate: `Good evening {name}!

End of day summary:

Tasks Completed Today: {completed_today}
Overall Progress: {overall_progress}%
Pending Tasks: {pending_tasks}
Overdue Tasks: {overdue_tasks}

Keep up the great work!
- {company_name}`,
  adminTemplate: `Daily Team Summary - {date}

{team_summary}

Total Open: {total_open}
Total Overdue: {total_overdue}
Total Completed Today: {completed_today}

- {company_name}`,
};

const TEMPLATE_VARIABLES = [
  '{name}',
  '{pending_tasks}',
  '{overdue_tasks}',
  '{followups_today}',
  '{task_list}',
  '{completed_today}',
  '{overall_progress}',
  '{company_name}',
  '{date}',
];

const TEMPLATE_PREVIEW_DATA = {
  name: 'John Doe',
  pending_tasks: 4,
  overdue_tasks: 1,
  followups_today: 2,
  task_list: '- Sales quote follow-up (60%)\n- Site visit report (20%)\n- Vendor approval (0%)',
  completed_today: 3,
  overall_progress: 68,
  company_name: 'Saya Industrial',
  date: new Date().toLocaleDateString('en-IN'),
  team_summary: 'John Doe: Sent\nSara Khan: Sent\nRaj Patel: Failed (Invalid phone number)',
  total_open: 18,
  total_overdue: 5,
};

const LOG_PAGE_SIZE = 25;

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
        checked ? 'bg-teal-600' : 'bg-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase();
  const className = normalized === 'sent'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-red-50 text-red-700 border-red-200';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {normalized === 'sent' ? 'Sent' : 'Failed'}
    </span>
  );
}

function TypeBadge({ type }) {
  const labels = {
    morning: 'Morning',
    evening: 'Evening',
    admin_summary: 'Admin',
    custom: 'Custom',
  };

  return (
    <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
      {labels[type] || type || 'Unknown'}
    </span>
  );
}

function ModalShell({ open, onOpenChange, title, description, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[90] w-[calc(100%-32px)] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 shadow-2xl"
          style={{
            background: 'var(--bg-modal)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-4 top-4 rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>

          <div className="mb-5">
            <Dialog.Title className="text-lg font-semibold text-[var(--text-primary)]">{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1 text-sm text-[var(--text-muted)]">
                {description}
              </Dialog.Description>
            ) : (
              <Dialog.Description className="sr-only">
                Dialog
              </Dialog.Description>
            )}
          </div>

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function mergeSettings(data = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    adminNumbers: Array.isArray(data?.adminNumbers)
      ? [...data.adminNumbers, '', '', ''].slice(0, 3)
      : [...DEFAULT_SETTINGS.adminNumbers],
  };
}

function renderTemplate(template, variables) {
  return String(template || '').replace(/\{([a-z_]+)\}/gi, (match, key) => {
    const replacement = variables[key];
    return replacement === undefined || replacement === null ? match : String(replacement);
  });
}

function formatDateTime(value) {
  const parsed = timestampToDate(value);
  if (!parsed) {
    return '-';
  }

  return parsed.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  return value || '-';
}

function previewMessage(value, maxLength = 50) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized || '-';
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function filterLogs(logs, filters) {
  return logs.filter((log) => {
    const sentAt = timestampToDate(log.sentAt);
    const memberId = log.memberUid || '';

    if (filters.startDate) {
      const startDate = new Date(`${filters.startDate}T00:00:00`);
      if (!sentAt || sentAt < startDate) {
        return false;
      }
    }

    if (filters.endDate) {
      const endDate = new Date(`${filters.endDate}T23:59:59`);
      if (!sentAt || sentAt > endDate) {
        return false;
      }
    }

    if (filters.type !== 'all' && log.messageType !== filters.type) {
      return false;
    }

    if (filters.status !== 'all' && log.status !== filters.status) {
      return false;
    }

    if (filters.member !== 'all' && memberId !== filters.member) {
      return false;
    }

    return true;
  });
}

export default function WhatsAppAutomationPage() {
  const toast = useToast();
  const { log } = useAuditLog();
  const { currentUser } = useAuth();
  const { members, loading: membersLoading } = useTeam();
  const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();

  const [settings, setSettings] = useState(mergeSettings());
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [activeTemplateTab, setActiveTemplateTab] = useState('morning');
  const [activeTemplateField, setActiveTemplateField] = useState('morningTemplate');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [recipientMode, setRecipientMode] = useState('all');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [singleMemberId, setSingleMemberId] = useState('');
  const [composeMode, setComposeMode] = useState('write');
  const [customMessage, setCustomMessage] = useState('');
  const [templateSelection, setTemplateSelection] = useState('morning');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [sendResults, setSendResults] = useState([]);
  const [sendSummary, setSendSummary] = useState({ sent: 0, failed: 0, total: 0 });
  const [sending, setSending] = useState(false);
  const [logFilters, setLogFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all',
    status: 'all',
    member: 'all',
  });
  const [page, setPage] = useState(1);

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === 'active' && member.role === 'member'),
    [members],
  );

  useEffect(() => {
    const settingsRef = doc(db, COLLECTIONS.settings, 'whatsapp_automation');

    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        setSettings(mergeSettings(snapshot.exists() ? snapshot.data() : {}));
        setSettingsLoading(false);
      },
      (error) => {
        console.error('WhatsApp settings listener failed:', error);
        toast.error(`Failed to load WhatsApp settings: ${error.message}`);
        setSettingsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    const logsQuery = query(
      collection(db, COLLECTIONS.whatsapp_logs),
      orderBy('sentAt', 'desc'),
      limit(500),
    );

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        setLogs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLogsLoading(false);
      },
      (error) => {
        console.warn('WhatsApp logs listener failed:', error);
        setLogsLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [logFilters]);

  useEffect(() => {
    if (recipientMode !== 'single') {
      return;
    }

    if (!singleMemberId && activeMembers.length) {
      setSingleMemberId(activeMembers[0].id);
    }
  }, [activeMembers, recipientMode, singleMemberId]);

  const recipientOptions = useMemo(() => activeMembers.map((member) => ({
    id: member.id,
    uid: member.id,
    name: member.name || 'Unknown',
    whatsapp: member.whatsapp || '',
  })), [activeMembers]);

  const selectedRecipients = useMemo(() => {
    if (recipientMode === 'single') {
      return recipientOptions.filter((member) => member.id === singleMemberId);
    }

    if (recipientMode === 'specific') {
      return recipientOptions.filter((member) => selectedMemberIds.includes(member.id));
    }

    return recipientOptions;
  }, [recipientMode, recipientOptions, selectedMemberIds, singleMemberId]);

  const templatePreviewText = useMemo(() => {
    const template = templateSelection === 'morning'
      ? settings.morningTemplate
      : settings.eveningTemplate;
    return renderTemplate(template, TEMPLATE_PREVIEW_DATA);
  }, [settings.eveningTemplate, settings.morningTemplate, templateSelection]);

  const finalPreviewText = composeMode === 'write' ? customMessage : templatePreviewText;
  const filteredLogs = useMemo(() => filterLogs(logs, logFilters), [logFilters, logs]);
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / LOG_PAGE_SIZE));
  const paginatedLogs = filteredLogs.slice((page - 1) * LOG_PAGE_SIZE, page * LOG_PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const canPreview = selectedRecipients.length > 0
    && (composeMode === 'write' ? customMessage.trim().length > 0 : Boolean(templateSelection));

  const persistSettings = async (successMessage, stateSetter) => {
    stateSetter(true);

    try {
      await setDocument(
        doc(db, COLLECTIONS.settings, 'whatsapp_automation'),
        {
          ...settings,
          adminNumbers: settings.adminNumbers.map((number) => String(number || '').trim()),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
        { action: 'save whatsapp automation settings', collectionName: COLLECTIONS.settings },
      );

      await log('whatsapp_automation_settings_saved', {
        updatedBy: currentUser?.uid || '',
        morningEnabled: settings.morningEnabled,
        eveningEnabled: settings.eveningEnabled,
        adminSummaryEnabled: settings.adminSummaryEnabled,
      });
      toast.success(successMessage);
    } catch (error) {
      toast.error(`Save failed: ${error.message}`);
    } finally {
      stateSetter(false);
    }
  };

  const handleSaveSchedule = async () => {
    await persistSettings('Schedule saved!', setSavingSchedule);
  };

  const handleSaveTemplates = async () => {
    await persistSettings('Templates saved!', setSavingTemplates);
  };

  const handleInsertVariable = (variable) => {
    const fieldName = activeTemplateField || `${activeTemplateTab}Template`;
    setSettings((current) => ({
      ...current,
      [fieldName]: `${current[fieldName] || ''}${variable}`,
    }));
  };

  const handleRecipientToggle = (memberId) => {
    setSelectedMemberIds((current) => (
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    ));
  };

  const handleSendCustom = async () => {
    if (!customMessage.trim()) {
      toast.error('Please write a message');
      return;
    }
    
    if (!selectedRecipients.length) {
      toast.error('Please select recipients');
      return;
    }
    
    setSending(true);
    
    try {
      const result = await sendWhatsAppCustom(
        selectedRecipients,
        customMessage,
        'custom'
      );

      console.log('Full result:', JSON.stringify(result));

      if (result.results) {
        result.results.forEach(r => {
          console.log('Member:', r.memberName,
            'Status:', r.status,
            'Error:', r.error,
            'MSG91:', r.msg91Response
          );
        });
      }
      
      if (result.success || result.summary) {
        toast.success(
          `Sent: ${result.summary?.sent || 0}, ` +
          `Failed: ${result.summary?.failed || 0}`
        );
        if (result.results) {
          setSendResults(result.results);
        }
        if (result.summary) {
          setSendSummary(result.summary);
        }
        setResultsOpen(true);
        setCustomMessage('');
      }
    } catch (error) {
      toast.error('Send failed: ' + 
        error.message);
    } finally {
      setSending(false);
    }
  };

  const handleExportLogs = () => {
    exportCSV(
      filteredLogs.map((item) => ({
        dateTime: formatDateTime(item.sentAt),
        memberName: item.memberName || '',
        type: item.messageType || '',
        to: item.to || '',
        status: item.status || '',
        message: item.message || '',
        msg91Response: item.msg91Response || {},
      })),
      `whatsapp_logs_${new Date().toISOString().slice(0, 10)}`,
    );
  };

  const handleClearLogs = () => {
    confirmDelete({
      title: 'Clear WhatsApp logs?',
      description: 'Delete every document in /whatsapp_logs. This action cannot be undone.',
      onConfirm: async () => {
        await clearCollection(COLLECTIONS.whatsapp_logs);
        await log('whatsapp_logs_cleared');
        toast.success('WhatsApp logs cleared');
      },
    });
  };

  const scheduleDisabled = settingsLoading || savingSchedule;
  const templatesDisabled = settingsLoading || savingTemplates;

  return (
    <div className="page-transition space-y-6">
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-600 to-cyan-600 p-6 text-white">
        <p className="text-sm font-medium text-teal-100">Powered by MSG91</p>
        <h1 className="mt-1 text-2xl font-bold">WhatsApp Automation</h1>
        <p className="mt-1 text-sm text-white/80">
          Manage automated reminders, reusable templates, instant sends, and delivery history.
        </p>
      </div>

      <div className="grid gap-6">
        <section className="card space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Automated Schedule</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Save daily morning and evening reminder settings in Firestore.</p>
            </div>
            <CalendarClock className="h-5 w-5 text-teal-600" />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Morning Reminder</h3>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">Sends daily progress report to all active team members.</p>
                </div>
                <Toggle
                  checked={settings.morningEnabled}
                  disabled={scheduleDisabled}
                  onChange={(value) => setSettings((current) => ({ ...current, morningEnabled: value }))}
                />
              </div>
              <div className="mt-4">
                <label className="label">Time</label>
                <input
                  className="input-field max-w-[180px]"
                  type="time"
                  value={settings.morningTime}
                  disabled={scheduleDisabled}
                  onChange={(event) => setSettings((current) => ({ ...current, morningTime: event.target.value }))}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Evening Reminder</h3>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">Sends end of day summary to all active team members.</p>
                </div>
                <Toggle
                  checked={settings.eveningEnabled}
                  disabled={scheduleDisabled}
                  onChange={(value) => setSettings((current) => ({ ...current, eveningEnabled: value }))}
                />
              </div>
              <div className="mt-4">
                <label className="label">Time</label>
                <input
                  className="input-field max-w-[180px]"
                  type="time"
                  value={settings.eveningTime}
                  disabled={scheduleDisabled}
                  onChange={(event) => setSettings((current) => ({ ...current, eveningTime: event.target.value }))}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Admin Daily Summary</h3>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">Sends team summary to admin numbers after the selected reminder run.</p>
                </div>
                <Toggle
                  checked={settings.adminSummaryEnabled}
                  disabled={scheduleDisabled}
                  onChange={(value) => setSettings((current) => ({ ...current, adminSummaryEnabled: value }))}
                />
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-gray-800">Admin WhatsApp Numbers</p>
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      className="input-field flex-1"
                      placeholder={`Number ${index + 1}: +91XXXXXXXXXX`}
                      value={settings.adminNumbers[index] || ''}
                      disabled={scheduleDisabled}
                      onChange={(event) => {
                        const nextNumbers = [...settings.adminNumbers];
                        nextNumbers[index] = event.target.value;
                        setSettings((current) => ({ ...current, adminNumbers: nextNumbers }));
                      }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={scheduleDisabled}
                      onClick={() => {
                        const nextNumbers = [...settings.adminNumbers];
                        nextNumbers[index] = '';
                        setSettings((current) => ({ ...current, adminNumbers: nextNumbers }));
                      }}
                    >
                      Clear
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button type="button" className="btn-primary w-full justify-center" disabled={scheduleDisabled} onClick={handleSaveSchedule}>
            {savingSchedule ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {savingSchedule ? 'Saving...' : 'Save Schedule'}
          </button>
        </section>

        <section className="card space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Message Templates</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Customize morning, evening, and admin summary messages.</p>
          </div>

          <div className="flex gap-2 border-b border-gray-200">
            {['morning', 'evening'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTemplateTab(tab);
                  setActiveTemplateField(`${tab}Template`);
                }}
                className={`rounded-t-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTemplateTab === tab
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab === 'morning' ? 'Morning' : 'Evening'}
              </button>
            ))}
          </div>

          <div>
            <label className="label">{activeTemplateTab === 'morning' ? 'Morning Template' : 'Evening Template'}</label>
            <textarea
              className="input-field min-h-[220px] resize-y font-mono text-sm"
              value={settings[`${activeTemplateTab}Template`]}
              disabled={templatesDisabled}
              onFocus={() => setActiveTemplateField(`${activeTemplateTab}Template`)}
              onChange={(event) => setSettings((current) => ({
                ...current,
                [`${activeTemplateTab}Template`]: event.target.value,
              }))}
            />
          </div>

          <div>
            <label className="label">Admin Summary Template</label>
            <textarea
              className="input-field min-h-[180px] resize-y font-mono text-sm"
              value={settings.adminTemplate}
              disabled={templatesDisabled}
              onFocus={() => setActiveTemplateField('adminTemplate')}
              onChange={(event) => setSettings((current) => ({ ...current, adminTemplate: event.target.value }))}
            />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-800">Variables</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TEMPLATE_VARIABLES.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-50"
                  onClick={() => handleInsertVariable(variable)}
                >
                  {variable}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="btn-primary justify-center" disabled={templatesDisabled} onClick={handleSaveTemplates}>
            {savingTemplates ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {savingTemplates ? 'Saving...' : 'Save Templates'}
          </button>
        </section>

        <section className="card space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Send Custom Message</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Send an instant WhatsApp message or use one of the saved member templates.</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">Step 1 - Select Recipients</p>
            <div className="grid gap-2 md:grid-cols-3">
              {[
                { key: 'all', label: 'All Team Members' },
                { key: 'specific', label: 'Specific Members' },
                { key: 'single', label: 'Single Member' },
              ].map((option) => (
                <label key={option.key} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-100 px-4 py-3">
                  <input
                    type="radio"
                    name="recipientMode"
                    checked={recipientMode === option.key}
                    onChange={() => setRecipientMode(option.key)}
                  />
                  <span className="text-sm font-medium text-gray-800">{option.label}</span>
                </label>
              ))}
            </div>

            {recipientMode === 'specific' ? (
              <div className="rounded-2xl border border-gray-100 p-4">
                {membersLoading ? (
                  <p className="text-sm text-[var(--text-muted)]">Loading members...</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {recipientOptions.map((member) => (
                      <label key={member.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(member.id)}
                          onChange={() => handleRecipientToggle(member.id)}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">{member.name}</p>
                          <p className="truncate text-xs text-[var(--text-muted)]">{formatPhone(member.whatsapp)}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {recipientMode === 'single' ? (
              <div>
                <label className="label">Member</label>
                <select className="input-field" value={singleMemberId} onChange={(event) => setSingleMemberId(event.target.value)}>
                  {recipientOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({formatPhone(member.whatsapp)})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">Step 2 - Message</p>

            <div className="flex gap-2">
              {[
                { key: 'write', label: 'Write Message' },
                { key: 'template', label: 'Use Template' },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    composeMode === option.key
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setComposeMode(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {composeMode === 'write' ? (
              <div>
                <textarea
                  className="input-field min-h-[150px] resize-y"
                  maxLength={1000}
                  rows={6}
                  value={customMessage}
                  onChange={(event) => setCustomMessage(event.target.value)}
                  placeholder="Write your custom WhatsApp message here..."
                />
                <p className="mt-2 text-right text-xs text-[var(--text-muted)]">{customMessage.length} / 1000</p>
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-gray-100 p-4">
                <div>
                  <label className="label">Template</label>
                  <select
                    className="input-field"
                    value={templateSelection}
                    onChange={(event) => setTemplateSelection(event.target.value)}
                  >
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>

                <div>
                  <p className="label">Preview</p>
                  <pre className="max-h-[220px] overflow-auto rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm whitespace-pre-wrap text-[var(--text-primary)]">
                    {templatePreviewText}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">Step 3 - Preview &amp; Send</p>
            <button type="button" className="btn-primary" disabled={!canPreview} onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" />
              Preview Message
            </button>
          </div>
        </section>

        <section className="card space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Message History</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Track MSG91 sends, filter delivery history, and inspect provider responses.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" disabled={!filteredLogs.length} onClick={handleExportLogs}>
                <Download className="h-4 w-4" />
                Export Logs
              </button>
              {logs.length ? <DeleteButton onClick={handleClearLogs} label="Clear Logs" title="Clear logs" /> : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="label">Start Date</label>
              <input
                className="input-field"
                type="date"
                value={logFilters.startDate}
                onChange={(event) => setLogFilters((current) => ({ ...current, startDate: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                className="input-field"
                type="date"
                value={logFilters.endDate}
                onChange={(event) => setLogFilters((current) => ({ ...current, endDate: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select
                className="input-field"
                value={logFilters.type}
                onChange={(event) => setLogFilters((current) => ({ ...current, type: event.target.value }))}
              >
                <option value="all">All</option>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="admin_summary">Admin</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="input-field"
                value={logFilters.status}
                onChange={(event) => setLogFilters((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="all">All</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="label">Member</label>
              <select
                className="input-field"
                value={logFilters.member}
                onChange={(event) => setLogFilters((current) => ({ ...current, member: event.target.value }))}
              >
                <option value="all">All</option>
                {activeMembers.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Date &amp; Time</th>
                  <th className="table-header">Member Name</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Message</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr>
                    <td className="table-cell text-center text-[var(--text-muted)]" colSpan={6}>Loading logs...</td>
                  </tr>
                ) : paginatedLogs.length === 0 ? (
                  <tr>
                    <td className="table-cell text-center text-[var(--text-muted)]" colSpan={6}>No logs found for the selected filters.</td>
                  </tr>
                ) : paginatedLogs.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-50">
                    <td className="table-cell text-sm text-gray-700">{formatDateTime(entry.sentAt)}</td>
                    <td className="table-cell text-sm text-gray-700">{entry.memberName || '-'}</td>
                    <td className="table-cell"><TypeBadge type={entry.messageType} /></td>
                    <td className="table-cell text-sm text-[var(--text-muted)]">{previewMessage(entry.message)}</td>
                    <td className="table-cell"><StatusBadge status={entry.status} /></td>
                    <td className="table-cell">
                      <button type="button" className="btn-secondary" onClick={() => setSelectedLog(entry)}>
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              Showing {paginatedLogs.length ? (page - 1) * LOG_PAGE_SIZE + 1 : 0}-{Math.min(page * LOG_PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[100px] text-center text-sm font-medium text-gray-700">Page {page} / {totalPages}</span>
              <button type="button" className="btn-secondary" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <ModalShell
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Preview Message"
        description={composeMode === 'template' ? 'Template messages will be personalized per recipient when sent.' : ''}
      >
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-800">Recipients</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedRecipients.map((member) => (
                <span key={member.id} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                  {member.name} ({formatPhone(member.whatsapp)})
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-800">Final Message</p>
            <pre className="mt-3 max-h-[260px] overflow-auto rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm whitespace-pre-wrap text-[var(--text-primary)]">
              {finalPreviewText}
            </pre>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setPreviewOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={sending} onClick={handleSendCustom}>
              {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Sending...' : 'Send Now'}
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={resultsOpen}
        onOpenChange={setResultsOpen}
        title="Send Results"
        description={`Sent: ${sendSummary.sent}  Failed: ${sendSummary.failed}  Total: ${sendSummary.total}`}
      >
        <div className="space-y-3">
          {sendResults.map((result, index) => (
            <div key={`${result.memberName}-${index}`} className="flex items-start justify-between gap-3 rounded-2xl border border-gray-100 px-4 py-3">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 ${result.status === 'sent' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {result.status === 'sent' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{result.memberName}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{result.error || formatPhone(result.phone)}</p>
                </div>
              </div>
              <StatusBadge status={result.status} />
            </div>
          ))}
        </div>
      </ModalShell>

      <ModalShell
        open={Boolean(selectedLog)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLog(null);
          }
        }}
        title="Message Details"
        description={selectedLog ? `${selectedLog.memberName || 'Unknown'} - ${formatDateTime(selectedLog.sentAt)}` : ''}
      >
        {selectedLog ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">To</p>
                <p className="mt-2 text-sm font-medium text-gray-800">{formatPhone(selectedLog.to)}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Type</p>
                <div className="mt-2"><TypeBadge type={selectedLog.messageType} /></div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery Status</p>
                <div className="mt-2"><StatusBadge status={selectedLog.status} /></div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800">Full Message</p>
              <pre className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm whitespace-pre-wrap text-[var(--text-primary)]">
                {selectedLog.message || '-'}
              </pre>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800">MSG91 Response</p>
              <pre className="mt-3 max-h-[260px] overflow-auto rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs whitespace-pre-wrap text-[var(--text-primary)]">
                {JSON.stringify(selectedLog.msg91Response || {}, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </ModalShell>

      <DeleteConfirmDialog
        isOpen={deleteState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={deleteState.title}
        description={deleteState.description}
        isDeleting={deleteState.isDeleting}
      />
    </div>
  );
}
