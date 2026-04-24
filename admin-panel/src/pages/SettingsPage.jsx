import { useState } from 'react';
import { Settings, User, Bell, Shield, Palette, Save, Building2, Download, Database } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getInitials } from '../lib/formatters';

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
 <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${checked ? 'bg-teal-600' : 'bg-gray-200'}`}>
 <span className={`inline-block h-4 w-4 transform rounded-full bg-[var(--bg-card)] shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
 </button>
 );
}

export default function SettingsPage() {
 const { userData } = useAuth();
 const toast = useToast();
 const [activeSection, setActiveSection] = useState('profile');
 const [profile, setProfile] = useState({
 name: userData?.name || '', email: userData?.email || '', phone: userData?.phone || '',
 });
 const [saving, setSaving] = useState(false);
 const [notifs, setNotifs] = useState({ email: true, tasks: true, payments: false, reports: true });
 const [company, setCompany] = useState({ name: 'Saya Industrial Solutions', email: 'contact@sayaindustrial.com', address: 'India', gst: '' });
 const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
 const [backupLoading, setBackupLoading] = useState(false);

 const lastBackup = localStorage.getItem('lastBackupTimestamp');

 const handleSaveProfile = async () => {
 if (!userData?.uid) return;
 setSaving(true);
 try {
 await updateDoc(doc(db, 'users', userData.uid), { name: profile.name, phone: profile.phone });
 toast.success('Profile saved!');
 } catch (err) { toast.error('Failed: ' + err.message); }
 finally { setSaving(false); }
 };

 const handleChangePassword = async () => {
 if (passwords.newPass !== passwords.confirm) { toast.error('Passwords do not match'); return; }
 if (passwords.newPass.length < 8) { toast.error('Password must be at least 8 characters'); return; }
 setSaving(true);
 try {
 const user = auth.currentUser;
 const cred = EmailAuthProvider.credential(user.email, passwords.current);
 await reauthenticateWithCredential(user, cred);
 await updatePassword(user, passwords.newPass);
 toast.success('Password updated!');
 setPasswords({ current: '', newPass: '', confirm: '' });
 } catch (err) { toast.error('Failed: ' + err.message); }
 finally { setSaving(false); }
 };

 const handleBackup = async () => {
 setBackupLoading(true);
 try {
 const collections = [
 'users', 'projects', 'tasks', 'expenses',
 'enquiries', 'followups', 'payments',
 'outgoing_payments', 'rgp', 'tools', 'salary',
 'notifications',
 ];

 const backupData = {};

 for (const colName of collections) {
 try {
 const snapshot = await getDocs(collection(db, colName));
 backupData[colName] = snapshot.docs.map(d => ({
 id: d.id,
 ...d.data(),
 }));
 } catch (err) {
 console.warn(`Skipping collection ${colName}:`, err.message);
 backupData[colName] = [];
 }
 }

 const now = new Date();
 const fileName = `backup_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}.json`;

 const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = fileName;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);

 localStorage.setItem('lastBackupTimestamp', now.toISOString());
 toast.success('Backup downloaded successfully');
 } catch (err) {
 toast.error('Backup failed: ' + err.message);
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
 <div className="flex items-center gap-5 pb-5 border-b border-gray-100">
 <div className="w-20 h-20 bg-teal-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">{getInitials(profile.name)}</div>
 <div><p className="text-sm font-medium text-gray-900">{profile.name}</p><p className="text-xs text-gray-400">{profile.email}</p></div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div><label className="label">Full Name</label><input className="input-field" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} /></div>
 <div><label className="label">Email (read-only)</label><input className="input-field bg-gray-50 text-gray-400 cursor-not-allowed" value={profile.email} disabled /></div>
 <div><label className="label">Phone</label><input className="input-field" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} /></div>
 <div><label className="label">Role</label><input className="input-field bg-gray-50 text-gray-400 cursor-not-allowed" value="Super Admin" disabled /></div>
 </div>
 <button onClick={handleSaveProfile} disabled={saving} className="btn-primary mt-2"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}</button>
 </div>
 );
 case 'notifications':
 return (
 <div className="space-y-5">
 <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
 <div className="space-y-4">
 {[{ key: 'email', label: 'Email Notifications', desc: 'Receive important updates via email' },
 { key: 'tasks', label: 'Task Reminders', desc: 'Get reminded about upcoming and overdue tasks' },
 { key: 'payments', label: 'Payment Alerts', desc: 'Notifications for pending and overdue payments' },
 { key: 'reports', label: 'Monthly Reports', desc: 'Receive monthly performance and financial reports' },
 ].map(item => (
 <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-50">
 <div><p className="text-sm font-medium text-gray-800">{item.label}</p><p className="text-xs text-gray-400 mt-0.5">{item.desc}</p></div>
 <Toggle checked={notifs[item.key]} onChange={val => setNotifs({...notifs, [item.key]: val})} />
 </div>
 ))}
 </div>
 </div>
 );
 case 'security':
 return (
 <div className="space-y-5">
 <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
 <div className="space-y-4">
 <div><label className="label">Current Password</label><input className="input-field" type="password" placeholder="Enter current password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} /></div>
 <div><label className="label">New Password</label><input className="input-field" type="password" placeholder="Enter new password" value={passwords.newPass} onChange={e => setPasswords({...passwords, newPass: e.target.value})} /></div>
 <div><label className="label">Confirm Password</label><input className="input-field" type="password" placeholder="Confirm new password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} /></div>
 </div>
 <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700"><strong>Password requirements:</strong> Minimum 8 characters, at least one uppercase letter, number and special character.</div>
 <button onClick={handleChangePassword} disabled={saving} className="btn-primary"><Shield className="w-4 h-4" />{saving ? 'Updating...' : 'Update Password'}</button>
 </div>
 );
 case 'backup':
 return (
 <div className="space-y-5">
 <h2 className="text-lg font-semibold text-gray-900">Data Backup</h2>
 <p className="text-sm text-gray-500">Download complete app data as JSON file</p>

 <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 space-y-4">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center">
 <Download className="w-6 h-6 text-teal-600" />
 </div>
 <div>
 <h3 className="text-base font-semibold text-teal-800">Full Data Backup</h3>
 <p className="text-xs text-teal-600 mt-0.5">Exports all collections: users, projects, tasks, expenses, enquiries, followups, payments, outgoing_payments, rgp, tools, salary, notifications</p>
 </div>
 </div>

 <button onClick={handleBackup} disabled={backupLoading}
 className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
 {backupLoading ? (
 <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Preparing Backup...</>
 ) : (
 <><Download className="w-4 h-4" /> Download Backup Now</>
 )}
 </button>
 </div>

 {lastBackup && (
 <div className="flex items-center gap-2 text-sm text-gray-500">
 <span className="w-2 h-2 bg-green-400 rounded-full"></span>
 Last backup: {new Date(lastBackup).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
 </div>
 )}

 <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
 <strong>Recommendation:</strong> Manual backup recommended every hour for data safety.
 </div>
 </div>
 );
 case 'appearance':
 return (
 <div className="space-y-5">
 <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
 <div><label className="label mb-3">Theme</label>
 <div className="grid grid-cols-3 gap-3">{['Light', 'Dark', 'System'].map(theme => (
 <button key={theme} className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${theme === 'Light' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
 {theme}
 </button>
 ))}</div>
 </div>
 <div><label className="label mb-3">Accent Color</label>
 <div className="flex gap-3">{['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'].map(color => (
 <button key={color} style={{ backgroundColor: color }} className="w-10 h-10 rounded-full border-4 border-white shadow-sm hover:scale-110 transition-transform" />
 ))}</div>
 </div>
 </div>
 );
 case 'company':
 return (
 <div className="space-y-5">
 <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
 <div className="grid grid-cols-2 gap-4">
 <div><label className="label">Company Name</label><input className="input-field" value={company.name} onChange={e => setCompany({...company, name: e.target.value})} /></div>
 <div><label className="label">Company Email</label><input className="input-field" type="email" value={company.email} onChange={e => setCompany({...company, email: e.target.value})} /></div>
 <div className="col-span-2"><label className="label">Address</label><textarea className="input-field resize-none" rows={2} value={company.address} onChange={e => setCompany({...company, address: e.target.value})} /></div>
 <div><label className="label">GST Number</label><input className="input-field" value={company.gst} onChange={e => setCompany({...company, gst: e.target.value})} /></div>
 </div>
 <button className="btn-primary"><Save className="w-4 h-4" /> Save Company Info</button>
 </div>
 );
 default: return null;
 }
 };

 return (
 <div className="space-y-6 page-transition">
 <div><h1 className="text-2xl font-bold text-gray-900">Settings</h1><p className="text-sm text-[var(--text-muted)] mt-0.5">Manage your account and application preferences</p></div>
 <div className="flex gap-6">
 <div className="w-52 flex-shrink-0">
 <div className="card p-2 space-y-0.5">{settingsSections.map(section => {
 const Icon = section.icon;
 return (<button key={section.id} onClick={() => setActiveSection(section.id)}
 className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSection === section.id ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
 <Icon className="w-4 h-4" />{section.label}</button>);
 })}</div>
 </div>
 <div className="flex-1 card">{renderContent()}</div>
 </div>
 </div>
 );
}

