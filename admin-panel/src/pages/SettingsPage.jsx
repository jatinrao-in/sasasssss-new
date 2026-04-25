import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  Database,
  Download,
  FileClock,
  RotateCcw,
  Save,
  Settings2,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import UserAvatar from '../components/UserAvatar';
import { SkeletonForm, SkeletonTable } from '../components/ui/Skeleton';
import { useAuth } from '../hooks/useAuth';
import useAuditLog from '../hooks/useAuditLog';
import { useToast } from '../hooks/useToast';
import { auth, db } from '../lib/firebase';
import { clearCollection } from '../lib/deleteActions';
import {
  COLLECTIONS,
  deleteDocumentRef,
  setDocument,
  updateDocumentRef,
} from '../lib/firestore-helpers';

const settingsSections = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'preferences', label: 'Preferences', icon: Settings2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Admin Profile', icon: User },
  { id: 'backup', label: 'Data Backup', icon: Database },
  { id: 'audit', label: 'Audit Log', icon: FileClock },
  { id: 'danger', label: 'Danger Zone', icon: Shield },
];

const DEFAULT_COMPANY = {
  name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  gst: '',
};

const DEFAULT_PREFERENCES = {
  dateFormat: 'DD/MM/YYYY',
  currency: '₹ INR',
  workingDays: 26,
  taskReminderDays: 1,
  rgpAlertDays: 15,
  toolAlertDays: 30,
};

const DEFAULT_NOTIFICATION_SETTINGS = {
  taskCompletionAlertToAdmin: true,
  taskOverdueAlertToMember: true,
  paymentDueReminder: true,
  followupDueReminder: true,
  rgpOverdueAlert: true,
  toolReturnReminder: true,
  dailyWhatsAppSummary: true,
  salaryCreditNotification: true,
};

const NOTIFICATION_FIELDS = [
  { key: 'taskCompletionAlertToAdmin', label: 'Task Completion Alert to Admin' },
  { key: 'taskOverdueAlertToMember', label: 'Task Overdue Alert to Member' },
  { key: 'paymentDueReminder', label: 'Payment Due Reminder' },
  { key: 'followupDueReminder', label: 'Follow-up Due Reminder' },
  { key: 'rgpOverdueAlert', label: 'RGP Overdue Alert' },
  { key: 'toolReturnReminder', label: 'Tool Return Reminder' },
  { key: 'dailyWhatsAppSummary', label: 'Daily WhatsApp Summary' },
  { key: 'salaryCreditNotification', label: 'Salary Credit Notification' },
];

const INITIAL_CONFIRM_STATE = {
  open: false,
  title: '',
  description: '',
  confirmLabel: 'Confirm',
  loadingLabel: 'Working...',
  actionKey: '',
  onConfirm: null,
};

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
        checked ? 'bg-teal-600' : 'bg-gray-200'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-[var(--bg-card)] shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function serializeValue(value) {
  if (value == null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeValue(nestedValue)]),
    );
  }

  return value;
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const parsedDate = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '-';
  }

  return parsedDate.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? '');
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function downloadTextFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function fetchNestedRecords(parentCollectionName, parentIds, subCollectionName) {
  const uniqueIds = [...new Set(parentIds.filter(Boolean))];
  const result = {};

  await Promise.all(uniqueIds.map(async (parentId) => {
    const snapshot = await getDocs(collection(db, parentCollectionName, parentId, subCollectionName));
    result[parentId] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...serializeValue(docSnap.data()),
    }));
  }));

  return result;
}

export default function SettingsPage() {
  const { userData, currentUser } = useAuth();
  const { log } = useAuditLog();
  const toast = useToast();

  const [activeSection, setActiveSection] = useState('company');
  const [company, setCompany] = useState(DEFAULT_COMPANY);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilters, setAuditFilters] = useState({
    startDate: '',
    endDate: '',
    actionType: 'all',
  });
  const [lastBackup, setLastBackup] = useState(localStorage.getItem('lastBackup') || '');
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [saving, setSaving] = useState({
    company: false,
    preferences: false,
    profile: false,
    password: false,
    notifications: false,
    backup: false,
  });
  const [dangerAction, setDangerAction] = useState('');
  const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM_STATE);

  useEffect(() => {
    setProfile({
      name: userData?.name || '',
      email: userData?.email || auth.currentUser?.email || '',
      phone: userData?.phone || '',
      whatsapp: userData?.whatsapp || '',
    });
  }, [userData?.email, userData?.name, userData?.phone, userData?.whatsapp]);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);

      try {
        const [companySnap, preferencesSnap, notificationsSnap] = await Promise.all([
          getDoc(doc(db, COLLECTIONS.settings, 'company')),
          getDoc(doc(db, COLLECTIONS.settings, 'preferences')),
          getDoc(doc(db, COLLECTIONS.settings, 'notifications')),
        ]);

        setCompany({
          ...DEFAULT_COMPANY,
          ...(companySnap.exists() ? companySnap.data() : {}),
        });
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...(preferencesSnap.exists() ? preferencesSnap.data() : {}),
        });
        setNotificationSettings({
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...(notificationsSnap.exists() ? notificationsSnap.data() : {}),
        });
      } catch (error) {
        console.error('Settings load failed:', error);
        toast.error(`Failed to load settings: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    const loadAuditLogs = async () => {
      setAuditLoading(true);

      try {
        const auditQuery = query(
          collection(db, COLLECTIONS.audit_logs),
          orderBy('timestamp', 'desc'),
          limit(50),
        );
        const snapshot = await getDocs(auditQuery);
        setAuditLogs(snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })));
      } catch (error) {
        console.error('Audit log load failed:', error);
        toast.error(`Failed to load audit logs: ${error.message}`);
      } finally {
        setAuditLoading(false);
      }
    };

    loadSettings();
    loadAuditLogs();
  }, [toast]);

  const auditActionOptions = useMemo(
    () => [...new Set(auditLogs.map((entry) => entry.action).filter(Boolean))].sort(),
    [auditLogs],
  );

  const filteredAuditLogs = useMemo(() => auditLogs.filter((entry) => {
    if (auditFilters.actionType !== 'all' && entry.action !== auditFilters.actionType) {
      return false;
    }

    const entryDate = entry.timestamp?.toDate?.() || new Date(entry.timestamp);

    if (Number.isNaN(entryDate.getTime())) {
      return true;
    }

    if (auditFilters.startDate) {
      const startDate = new Date(`${auditFilters.startDate}T00:00:00`);
      if (entryDate < startDate) {
        return false;
      }
    }

    if (auditFilters.endDate) {
      const endDate = new Date(`${auditFilters.endDate}T23:59:59`);
      if (entryDate > endDate) {
        return false;
      }
    }

    return true;
  }), [auditFilters.actionType, auditFilters.endDate, auditFilters.startDate, auditLogs]);

  const updateSavingState = (key, value) => {
    setSaving((current) => ({ ...current, [key]: value }));
  };

  const handleSaveCompany = async () => {
    updateSavingState('company', true);

    try {
      await setDocument(
        doc(db, COLLECTIONS.settings, 'company'),
        {
          name: company.name.trim(),
          address: company.address.trim(),
          phone: company.phone.trim(),
          email: company.email.trim(),
          website: company.website.trim(),
          gst: company.gst.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
        { action: 'save company settings', collectionName: COLLECTIONS.settings },
      );
      await log('company_settings_updated', serializeValue(company));
      toast.success('Company settings saved');
    } catch (error) {
      toast.error(`Failed to save company settings: ${error.message}`);
    } finally {
      updateSavingState('company', false);
    }
  };

  const handleSavePreferences = async () => {
    updateSavingState('preferences', true);

    try {
      await setDocument(
        doc(db, COLLECTIONS.settings, 'preferences'),
        {
          dateFormat: preferences.dateFormat,
          currency: preferences.currency,
          workingDays: Number(preferences.workingDays) || DEFAULT_PREFERENCES.workingDays,
          taskReminderDays: Number(preferences.taskReminderDays) || DEFAULT_PREFERENCES.taskReminderDays,
          rgpAlertDays: Number(preferences.rgpAlertDays) || DEFAULT_PREFERENCES.rgpAlertDays,
          toolAlertDays: Number(preferences.toolAlertDays) || DEFAULT_PREFERENCES.toolAlertDays,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
        { action: 'save app preferences', collectionName: COLLECTIONS.settings },
      );
      await log('app_preferences_updated', serializeValue(preferences));
      toast.success('Preferences saved');
    } catch (error) {
      toast.error(`Failed to save preferences: ${error.message}`);
    } finally {
      updateSavingState('preferences', false);
    }
  };

  const handleNotificationToggle = async (key, value) => {
    const previousSettings = notificationSettings;
    const nextSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(nextSettings);
    updateSavingState('notifications', true);

    try {
      await setDocument(
        doc(db, COLLECTIONS.settings, 'notifications'),
        {
          [key]: value,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
        { action: 'save notification settings', collectionName: COLLECTIONS.settings },
      );
      await log('notification_setting_updated', { key, value });
      toast.success('Notification setting updated');
    } catch (error) {
      setNotificationSettings(previousSettings);
      toast.error(`Failed to update notification setting: ${error.message}`);
    } finally {
      updateSavingState('notifications', false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userData?.uid) {
      toast.error('User profile not loaded yet');
      return;
    }

    updateSavingState('profile', true);

    try {
      await updateDocumentRef(
        doc(db, COLLECTIONS.users, userData.uid),
        {
          name: profile.name.trim(),
          phone: profile.phone.trim(),
          whatsapp: profile.whatsapp.trim(),
          updatedAt: serverTimestamp(),
        },
        { action: 'save admin profile', collectionName: COLLECTIONS.users },
      );
      await log('admin_profile_updated', serializeValue(profile));
      toast.success('Admin profile updated');
    } catch (error) {
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      updateSavingState('profile', false);
    }
  };

  const handlePasswordChange = async () => {
    if (!auth.currentUser?.email) {
      toast.error('Current user email is unavailable');
      return;
    }

    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      toast.error('Please fill all password fields');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwords.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    updateSavingState('password', true);

    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        passwords.currentPassword,
      );

      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwords.newPassword);
      await log('admin_password_updated', { userUid: auth.currentUser.uid });
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast.success('Password updated!');
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        toast.error('Current password wrong');
      } else {
        toast.error(`Update failed: ${error.message}`);
      }
    } finally {
      updateSavingState('password', false);
    }
  };

  const downloadBackup = async () => {
    updateSavingState('backup', true);

    try {
      const collectionNames = [
        COLLECTIONS.users,
        COLLECTIONS.projects,
        COLLECTIONS.tasks,
        COLLECTIONS.expenses,
        COLLECTIONS.enquiries,
        COLLECTIONS.followups,
        COLLECTIONS.payments,
        COLLECTIONS.outgoing_payments,
        COLLECTIONS.rgp,
        COLLECTIONS.tools,
        COLLECTIONS.whatsapp_logs,
      ];

      const backup = {
        generatedAt: new Date().toISOString(),
      };

      const topLevelCollections = await Promise.all(collectionNames.map(async (collectionName) => {
        const snapshot = await getDocs(collection(db, collectionName));
        return [
          collectionName,
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...serializeValue(docSnap.data()),
          })),
        ];
      }));

      topLevelCollections.forEach(([collectionName, records]) => {
        backup[collectionName] = records;
      });

      const [settingsSnapshot, salaryRootSnapshot, notificationRootSnapshot] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.settings)),
        getDocs(collection(db, COLLECTIONS.salary)),
        getDocs(collection(db, COLLECTIONS.notifications)),
      ]);
      const userIds = [...new Set([
        ...backup[COLLECTIONS.users].map((user) => user.id),
        ...salaryRootSnapshot.docs.map((docSnap) => docSnap.id),
        ...notificationRootSnapshot.docs.map((docSnap) => docSnap.id),
      ])];

      backup.salary = await fetchNestedRecords(COLLECTIONS.salary, userIds, 'months');
      backup.notifications = await fetchNestedRecords(COLLECTIONS.notifications, userIds, 'items');

      backup.settings = settingsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...serializeValue(docSnap.data()),
      }));

      const now = new Date();
      const fileName = `backup_${now.toISOString().replace(/[:.]/g, '-').slice(0, 16)}.json`;
      downloadTextFile(JSON.stringify(backup, null, 2), fileName, 'application/json');
      localStorage.setItem('lastBackup', now.toISOString());
      setLastBackup(now.toISOString());
      await log('full_backup_downloaded', { generatedAt: now.toISOString() });
      toast.success('Backup downloaded!');
    } catch (error) {
      toast.error(`Backup failed: ${error.message}`);
    } finally {
      updateSavingState('backup', false);
    }
  };

  const handleExportAuditCsv = () => {
    const header = ['Action', 'Performed By', 'Date & Time', 'Details'];
    const rows = filteredAuditLogs.map((entry) => [
      entry.action || '',
      entry.performedByName || entry.performedBy || '',
      formatDateTime(entry.timestamp),
      JSON.stringify(serializeValue(entry.details || {})),
    ]);

    const csvContent = [
      header.map(escapeCsvValue).join(','),
      ...rows.map((row) => row.map(escapeCsvValue).join(',')),
    ].join('\n');

    const now = new Date();
    const fileName = `audit_logs_${now.toISOString().replace(/[:.]/g, '-').slice(0, 16)}.csv`;
    downloadTextFile(csvContent, fileName, 'text/csv;charset=utf-8');
  };

  const openConfirmDialog = (nextState) => {
    setConfirmState({
      ...INITIAL_CONFIRM_STATE,
      ...nextState,
      open: true,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmState.onConfirm) {
      return;
    }

    setDangerAction(confirmState.actionKey || 'working');

    try {
      await confirmState.onConfirm();
      setConfirmState(INITIAL_CONFIRM_STATE);
    } catch (error) {
      toast.error(error.message || 'Action failed');
    } finally {
      setDangerAction('');
    }
  };

  const clearAllNotifications = async () => {
    const [usersSnapshot, rootSnapshot] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.users)),
      getDocs(collection(db, COLLECTIONS.notifications)),
    ]);

    const userIds = new Set([
      ...usersSnapshot.docs.map((docSnap) => docSnap.id),
      ...rootSnapshot.docs.map((docSnap) => docSnap.id),
    ]);

    await Promise.all([...userIds].map(async (userId) => {
      const itemsSnapshot = await getDocs(collection(db, COLLECTIONS.notifications, userId, 'items'));
      await Promise.all(itemsSnapshot.docs.map((docSnap) => deleteDocumentRef(
        docSnap.ref,
        { action: 'delete notification item', collectionName: COLLECTIONS.notifications },
      )));

      await deleteDocumentRef(
        doc(db, COLLECTIONS.notifications, userId),
        { action: 'delete notification root', collectionName: COLLECTIONS.notifications },
      );
    }));
  };

  const resetAppSettings = async () => {
    await Promise.all([
      setDocument(
        doc(db, COLLECTIONS.settings, 'company'),
        {
          ...DEFAULT_COMPANY,
          updatedAt: serverTimestamp(),
        },
        {},
        { action: 'reset company settings', collectionName: COLLECTIONS.settings },
      ),
      setDocument(
        doc(db, COLLECTIONS.settings, 'preferences'),
        {
          ...DEFAULT_PREFERENCES,
          updatedAt: serverTimestamp(),
        },
        {},
        { action: 'reset preference settings', collectionName: COLLECTIONS.settings },
      ),
      setDocument(
        doc(db, COLLECTIONS.settings, 'notifications'),
        {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          updatedAt: serverTimestamp(),
        },
        {},
        { action: 'reset notification settings', collectionName: COLLECTIONS.settings },
      ),
    ]);

    setCompany(DEFAULT_COMPANY);
    setPreferences(DEFAULT_PREFERENCES);
    setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
  };

  const renderSectionContent = () => {
    if (activeSection === 'company') {
      if (loading) {
        return <SkeletonForm fields={6} />;
      }

      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Company Settings</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              This company name is used in WhatsApp messages, salary slips, and notifications.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name</label>
              <input
                className="input-field"
                value={company.name}
                disabled={saving.company}
                onChange={(event) => setCompany((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">Company Phone</label>
              <input
                className="input-field"
                value={company.phone}
                disabled={saving.company}
                onChange={(event) => setCompany((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">Company Email</label>
              <input
                className="input-field"
                type="email"
                value={company.email}
                disabled={saving.company}
                onChange={(event) => setCompany((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">Company Website</label>
              <input
                className="input-field"
                value={company.website}
                disabled={saving.company}
                onChange={(event) => setCompany((current) => ({ ...current, website: event.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Company Address</label>
              <textarea
                className="input-field min-h-[100px] resize-none"
                value={company.address}
                disabled={saving.company}
                onChange={(event) => setCompany((current) => ({ ...current, address: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">GST Number</label>
              <input
                className="input-field"
                value={company.gst}
                disabled={saving.company}
                onChange={(event) => setCompany((current) => ({ ...current, gst: event.target.value }))}
              />
            </div>
          </div>

          <button type="button" onClick={handleSaveCompany} disabled={saving.company} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving.company ? 'Saving...' : 'Save Company Settings'}
          </button>
        </div>
      );
    }

    if (activeSection === 'preferences') {
      if (loading) {
        return <SkeletonForm fields={6} />;
      }

      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">App Preferences</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Control global date, currency, and reminder defaults for the admin panel and member app.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date Format</label>
              <select
                className="input-field"
                value={preferences.dateFormat}
                disabled={saving.preferences}
                onChange={(event) => setPreferences((current) => ({ ...current, dateFormat: event.target.value }))}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="label">Currency Symbol</label>
              <select
                className="input-field"
                value={preferences.currency}
                disabled={saving.preferences}
                onChange={(event) => setPreferences((current) => ({ ...current, currency: event.target.value }))}
              >
                <option value="₹ INR">₹ INR</option>
                <option value="$ USD">$ USD</option>
                <option value="€ EUR">€ EUR</option>
              </select>
            </div>
            <div>
              <label className="label">Working Days per Month</label>
              <input
                className="input-field"
                type="number"
                min="1"
                value={preferences.workingDays}
                disabled={saving.preferences}
                onChange={(event) => setPreferences((current) => ({ ...current, workingDays: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">Default Task Reminder</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={preferences.taskReminderDays}
                disabled={saving.preferences}
                onChange={(event) => setPreferences((current) => ({ ...current, taskReminderDays: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">RGP Alert After (days)</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={preferences.rgpAlertDays}
                disabled={saving.preferences}
                onChange={(event) => setPreferences((current) => ({ ...current, rgpAlertDays: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">Tool Return Alert After (days)</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={preferences.toolAlertDays}
                disabled={saving.preferences}
                onChange={(event) => setPreferences((current) => ({ ...current, toolAlertDays: event.target.value }))}
              />
            </div>
          </div>

          <button type="button" onClick={handleSavePreferences} disabled={saving.preferences} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving.preferences ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      );
    }

    if (activeSection === 'notifications') {
      if (loading) {
        return <SkeletonForm fields={5} />;
      }

      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Each toggle saves immediately to Firestore as soon as you change it.
            </p>
          </div>

          <div className="space-y-4">
            {NOTIFICATION_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{field.label}</p>
                </div>
                <Toggle
                  checked={Boolean(notificationSettings[field.key])}
                  disabled={saving.notifications}
                  onChange={(value) => handleNotificationToggle(field.key, value)}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeSection === 'profile') {
      return (
        <div className="space-y-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Admin Profile</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Update the admin details used across the system.
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <UserAvatar user={currentUser || userData} size={64} showRing />
              <div>
                <p className="text-base font-semibold text-gray-900">{profile.name || 'Administrator'}</p>
                <p className="text-sm text-[var(--text-muted)]">{profile.email || 'No email available'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input-field"
                  value={profile.name}
                  disabled={saving.profile}
                  onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input-field cursor-not-allowed bg-gray-50 text-gray-400" value={profile.email} disabled />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  className="input-field"
                  value={profile.phone}
                  disabled={saving.profile}
                  onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <div>
                <label className="label">WhatsApp Number</label>
                <input
                  className="input-field"
                  value={profile.whatsapp}
                  disabled={saving.profile}
                  onChange={(event) => setProfile((current) => ({ ...current, whatsapp: event.target.value }))}
                />
              </div>
            </div>

            <button type="button" onClick={handleSaveProfile} disabled={saving.profile} className="btn-primary">
              <Save className="h-4 w-4" />
              {saving.profile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          <div className="space-y-5 rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Change Password</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Re-authentication is required before the password can be updated.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Current Password</label>
                <input
                  className="input-field"
                  type="password"
                  value={passwords.currentPassword}
                  disabled={saving.password}
                  onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  className="input-field"
                  type="password"
                  value={passwords.newPassword}
                  disabled={saving.password}
                  onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  className="input-field"
                  type="password"
                  value={passwords.confirmPassword}
                  disabled={saving.password}
                  onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
                />
              </div>
            </div>

            <button type="button" onClick={handlePasswordChange} disabled={saving.password} className="btn-primary">
              <Shield className="h-4 w-4" />
              {saving.password ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      );
    }

    if (activeSection === 'backup') {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Data Backup</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Download a full JSON backup of Firestore data, including nested salary and notification records.
            </p>
          </div>

          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-100">
                <Download className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-teal-800">Download Full Backup</p>
                <p className="mt-1 text-sm text-teal-700">
                  Includes users, projects, tasks, expenses, enquiries, followups, payments, outgoing payments, RGP,
                  tools, salary, notifications, WhatsApp logs, and settings.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={downloadBackup}
              disabled={saving.backup}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
            >
              {saving.backup ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Preparing Backup...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Backup Now
                </>
              )}
            </button>
          </div>

          {lastBackup && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Last backup: {formatDateTime(lastBackup)}
            </div>
          )}
        </div>
      );
    }

    if (activeSection === 'audit') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Review the last 50 admin actions and export the filtered result as CSV.
              </p>
            </div>
            <button type="button" onClick={handleExportAuditCsv} className="btn-secondary" disabled={filteredAuditLogs.length === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                className="input-field"
                type="date"
                value={auditFilters.startDate}
                onChange={(event) => setAuditFilters((current) => ({ ...current, startDate: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                className="input-field"
                type="date"
                value={auditFilters.endDate}
                onChange={(event) => setAuditFilters((current) => ({ ...current, endDate: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">Action Type</label>
              <select
                className="input-field"
                value={auditFilters.actionType}
                onChange={(event) => setAuditFilters((current) => ({ ...current, actionType: event.target.value }))}
              >
                <option value="all">All actions</option>
                {auditActionOptions.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
          </div>

          {auditLoading ? (
            <SkeletonTable rows={6} cols={4} />
          ) : filteredAuditLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
              <p className="text-sm font-semibold text-gray-700">No audit log entries found</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Try changing the date range or action filter.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Action</th>
                    <th className="table-header">Performed By</th>
                    <th className="table-header">Date &amp; Time</th>
                    <th className="table-header">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 align-top">
                      <td className="table-cell font-medium text-gray-900">{entry.action || '-'}</td>
                      <td className="table-cell text-gray-600">{entry.performedByName || entry.performedBy || '-'}</td>
                      <td className="table-cell text-gray-600">{formatDateTime(entry.timestamp)}</td>
                      <td className="table-cell text-xs text-gray-500">
                        <pre className="max-w-[420px] whitespace-pre-wrap break-words font-sans">
                          {JSON.stringify(serializeValue(entry.details || {}), null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (activeSection === 'danger') {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
            <p className="mt-1 text-sm text-red-600">
              These actions are destructive. Please double-check before proceeding.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-red-100 bg-white px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Clear All WhatsApp Logs</p>
                <p className="mt-1 text-sm text-gray-600">Delete every document in `/whatsapp_logs`.</p>
              </div>
              <button
                type="button"
                className="btn-secondary border border-red-200 bg-red-100 text-red-700 hover:bg-red-200"
                disabled={Boolean(dangerAction)}
                onClick={() => openConfirmDialog({
                  title: 'Clear WhatsApp logs?',
                  description: 'Delete all WhatsApp logs permanently?',
                  confirmLabel: 'Yes, Clear Logs',
                  loadingLabel: 'Clearing...',
                  actionKey: 'whatsapp_logs',
                  onConfirm: async () => {
                    await clearCollection(COLLECTIONS.whatsapp_logs);
                    await log('whatsapp_logs_cleared_from_settings');
                    toast.success('WhatsApp logs cleared');
                  },
                })}
              >
                <Trash2 className="h-4 w-4" />
                Clear Logs
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-red-100 bg-white px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Clear All Notifications</p>
                <p className="mt-1 text-sm text-gray-600">Delete all member notification items across the app.</p>
              </div>
              <button
                type="button"
                className="btn-secondary border border-red-200 bg-red-100 text-red-700 hover:bg-red-200"
                disabled={Boolean(dangerAction)}
                onClick={() => openConfirmDialog({
                  title: 'Clear notifications?',
                  description: 'Delete all notifications for every user?',
                  confirmLabel: 'Yes, Clear Notifications',
                  loadingLabel: 'Clearing...',
                  actionKey: 'notifications',
                  onConfirm: async () => {
                    await clearAllNotifications();
                    await log('notifications_cleared_from_settings');
                    toast.success('All notifications cleared');
                  },
                })}
              >
                <Trash2 className="h-4 w-4" />
                Clear Notifications
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-red-100 bg-white px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Reset App Settings</p>
                <p className="mt-1 text-sm text-gray-600">Restore company, preferences, and notifications to defaults.</p>
              </div>
              <button
                type="button"
                className="btn-secondary border border-red-200 bg-red-100 text-red-700 hover:bg-red-200"
                disabled={Boolean(dangerAction)}
                onClick={() => openConfirmDialog({
                  title: 'Reset app settings?',
                  description: 'Reset settings documents back to their default values?',
                  confirmLabel: 'Yes, Reset Settings',
                  loadingLabel: 'Resetting...',
                  actionKey: 'settings_reset',
                  onConfirm: async () => {
                    await resetAppSettings();
                    await log('app_settings_reset_to_defaults');
                    toast.success('App settings reset to defaults');
                  },
                })}
              >
                <RotateCcw className="h-4 w-4" />
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="page-transition space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          Manage company info, app defaults, notifications, backups, and admin security.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[240px_1fr]">
        <div className="card h-fit space-y-0.5 p-2">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </div>

        <div className="card">{renderSectionContent()}</div>
      </div>

      <DeleteConfirmDialog
        isOpen={confirmState.open}
        onClose={() => {
          if (!dangerAction) {
            setConfirmState(INITIAL_CONFIRM_STATE);
          }
        }}
        onConfirm={handleConfirmAction}
        title={confirmState.title}
        description={confirmState.description}
        isDeleting={Boolean(dangerAction)}
        confirmLabel={confirmState.confirmLabel}
        loadingLabel={confirmState.loadingLabel}
      />
    </div>
  );
}
