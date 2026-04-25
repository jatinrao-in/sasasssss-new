import { useEffect, useState } from 'react';
import { User, Bell, Shield, Palette, Save, Building2, Download, Database } from 'lucide-react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import useAuditLog from '../hooks/useAuditLog';
import { useToast } from '../hooks/useToast';
import { auth, db } from '../lib/firebase';
import { getInitials } from '../lib/formatters';
import { COLLECTIONS } from '../lib/firestore-helpers';

const settingsSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'backup', label: 'Data Backup', icon: Database },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'company', label: 'Company', icon: Building2 },
];

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
        checked ? 'bg-teal-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-[var(--bg-card)] shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { userData } = useAuth();
  const { log } = useAuditLog();
  const toast = useToast();

  const [activeSection, setActiveSection] = useState('profile');
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [notifs, setNotifs] = useState({});
  const [company, setCompany] = useState({ name: '', email: '', address: '', gst: '' });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  const lastBackup = localStorage.getItem('lastBackupTimestamp');

  useEffect(() => {
    setProfile({
      name: userData?.name || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
    });
    setNotifs(userData?.notificationPreferences || {});
  }, [userData]);

  useEffect(() => {
    const companyRef = doc(db, COLLECTIONS.settings, 'company');

    return onSnapshot(
      companyRef,
      (snapshot) => {
        const data = snapshot.data() || {};
        setCompany({
          name: data.name || '',
          email: data.email || '',
          address: data.address || '',
          gst: data.gst || '',
        });
      },
      (error) => {
        console.error('Company settings listener error:', error);
      },
    );
  }, []);

  const handleSaveProfile = async () => {
    if (!userData?.uid) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.users, userData.uid), {
        name: profile.name,
        phone: profile.phone,
        notificationPreferences: notifs,
      });
      await log('admin_profile_updated', {
        userUid: userData.uid,
        name: profile.name,
        phone: profile.phone,
        notificationPreferences: notifs,
      });
      toast.success('Profile saved!');
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, COLLECTIONS.settings, 'company'),
        {
          ...company,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await log('company_settings_updated', company);
      toast.success('Company info saved!');
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.newPass !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwords.newPass.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, passwords.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwords.newPass);
      setPasswords({ current: '', newPass: '', confirm: '' });
      toast.success('Password updated!');
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const collectionsToExport = [
        'users',
        'projects',
        'tasks',
        'expenses',
        'enquiries',
        'followups',
        'payments',
        'outgoing_payments',
        'rgp',
        'tools',
        'salary',
        'notifications',
      ];

      const backupData = {};

      for (const collectionName of collectionsToExport) {
        try {
          const snapshot = await getDocs(collection(db, collectionName));
          backupData[collectionName] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
        } catch (err) {
          console.warn(`Skipping collection ${collectionName}:`, err.message);
          backupData[collectionName] = [];
        }
      }

      const now = new Date();
      const fileName = `backup_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate(),
      ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(
        2,
        '0',
      )}.json`;

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      localStorage.setItem('lastBackupTimestamp', now.toISOString());
      await log('data_backup_downloaded', {
        collections: collectionsToExport,
        exportedAt: now.toISOString(),
      });
      toast.success('Backup downloaded successfully');
    } catch (err) {
      toast.error(`Backup failed: ${err.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
            <div className="flex items-center gap-5 border-b border-gray-100 pb-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-600 text-2xl font-bold text-white">
                {getInitials(profile.name)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{profile.name}</p>
                <p className="text-xs text-gray-400">{profile.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input-field"
                  value={profile.name}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                />
              </div>
              <div>
                <label className="label">Email (read-only)</label>
                <input className="input-field cursor-not-allowed bg-gray-50 text-gray-400" value={profile.email} disabled />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  className="input-field"
                  value={profile.phone}
                  onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                />
              </div>
              <div>
                <label className="label">Role</label>
                <input
                  className="input-field cursor-not-allowed bg-gray-50 text-gray-400"
                  value={userData?.role || ''}
                  disabled
                />
              </div>
            </div>
            <button onClick={handleSaveProfile} disabled={saving} className="btn-primary mt-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
            <div className="space-y-4">
              {[
                { key: 'email', label: 'Email Notifications', desc: 'Receive important updates via email' },
                { key: 'tasks', label: 'Task Reminders', desc: 'Get reminded about upcoming and overdue tasks' },
                { key: 'payments', label: 'Payment Alerts', desc: 'Notifications for pending and overdue payments' },
                { key: 'reports', label: 'Monthly Reports', desc: 'Receive monthly performance and financial reports' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between border-b border-gray-50 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <Toggle
                    checked={Boolean(notifs[item.key])}
                    onChange={(value) => setNotifs({ ...notifs, [item.key]: value })}
                  />
                </div>
              ))}
            </div>
            <button onClick={handleSaveProfile} disabled={saving} className="btn-primary mt-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="Enter current password"
                  value={passwords.current}
                  onChange={(event) => setPasswords({ ...passwords, current: event.target.value })}
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="Enter new password"
                  value={passwords.newPass}
                  onChange={(event) => setPasswords({ ...passwords, newPass: event.target.value })}
                />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="Confirm new password"
                  value={passwords.confirm}
                  onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
                />
              </div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
              <strong>Password requirements:</strong> Minimum 8 characters, at least one uppercase letter, number and
              special character.
            </div>
            <button onClick={handleChangePassword} disabled={saving} className="btn-primary">
              <Shield className="h-4 w-4" />
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Data Backup</h2>
            <p className="text-sm text-gray-500">Download complete app data as JSON file</p>

            <div className="space-y-4 rounded-xl border border-teal-200 bg-teal-50 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-100">
                  <Download className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-teal-800">Full Data Backup</h3>
                  <p className="mt-0.5 text-xs text-teal-600">
                    Exports all collections: users, projects, tasks, expenses, enquiries, followups, payments,
                    outgoing_payments, rgp, tools, salary, notifications
                  </p>
                </div>
              </div>

              <button
                onClick={handleBackup}
                disabled={backupLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
              >
                {backupLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Last backup: {new Date(lastBackup).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            )}

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <strong>Recommendation:</strong> Manual backup recommended every hour for data safety.
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
            <div>
              <label className="label mb-3">Theme</label>
              <div className="grid grid-cols-3 gap-3">
                {['Light', 'Dark', 'System'].map((theme) => (
                  <button
                    key={theme}
                    className={`rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                      theme === 'Light'
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label mb-3">Accent Color</label>
              <div className="flex gap-3">
                {['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'].map((color) => (
                  <button
                    key={color}
                    style={{ backgroundColor: color }}
                    className="h-10 w-10 rounded-full border-4 border-white shadow-sm transition-transform hover:scale-110"
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'company':
        return (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Company Name</label>
                <input
                  className="input-field"
                  value={company.name}
                  onChange={(event) => setCompany({ ...company, name: event.target.value })}
                />
              </div>
              <div>
                <label className="label">Company Email</label>
                <input
                  className="input-field"
                  type="email"
                  value={company.email}
                  onChange={(event) => setCompany({ ...company, email: event.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="label">Address</label>
                <textarea
                  className="input-field resize-none"
                  rows={2}
                  value={company.address}
                  onChange={(event) => setCompany({ ...company, address: event.target.value })}
                />
              </div>
              <div>
                <label className="label">GST Number</label>
                <input
                  className="input-field"
                  value={company.gst}
                  onChange={(event) => setCompany({ ...company, gst: event.target.value })}
                />
              </div>
            </div>
            <button onClick={handleSaveCompany} disabled={saving} className="btn-primary">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Company Info'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page-transition space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">Manage your account and application preferences</p>
      </div>

      <div className="flex gap-6">
        <div className="w-52 flex-shrink-0">
          <div className="card space-y-0.5 p-2">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
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
        </div>

        <div className="card flex-1">{renderContent()}</div>
      </div>
    </div>
  );
}
