import { useEffect, useMemo, useState } from 'react';
import { Save, MessageSquare, Clock, ToggleLeft, ToggleRight, Search, CheckCircle2, XCircle, BarChart3, Send } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useWhatsAppConfig } from '../hooks/useWhatsAppConfig';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';
import { formatDate } from '../lib/formatters';
import { clearCollection } from '../lib/deleteActions';
import CountUpNumber from '../components/ui/CountUpNumber';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';

function Toggle({ checked, onChange }) {
 return (
 <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${checked ? 'bg-teal-600' : 'bg-gray-200'}`}>
 <span className={`inline-block h-4 w-4 transform rounded-full bg-[var(--bg-card)] shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
 </button>
 );
}

export default function WhatsAppAutomationPage() {
  const toast = useToast();
  const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
  const { logs, saveConfig, getConfig } = useWhatsAppConfig();

  const dailyConfig = getConfig('daily_reminder') || {};
  const summaryConfig = getConfig('admin_summary') || {};

 const [dailyForm, setDailyForm] = useState({
 isActive: false,
 scheduledTime: '',
 messageTemplate: '',
 });

 const [summaryForm, setSummaryForm] = useState({
 isActive: false,
 scheduledTime: '',
 recipients: ['', '', ''],
 messageTemplate: '',
 });

 const [activeSection, setActiveSection] = useState('daily');
 const [saving, setSaving] = useState(false);
 const [filterType, setFilterType] = useState('All');

 useEffect(() => {
 setDailyForm({
 isActive: dailyConfig.isActive ?? false,
 scheduledTime: dailyConfig.scheduledTime || '',
 messageTemplate: dailyConfig.messageTemplate || '',
 });
 }, [dailyConfig.id, dailyConfig.isActive, dailyConfig.scheduledTime, dailyConfig.messageTemplate]);

 useEffect(() => {
 setSummaryForm({
 isActive: summaryConfig.isActive ?? false,
 scheduledTime: summaryConfig.scheduledTime || '',
 recipients: Array.isArray(summaryConfig.recipients)
 ? [...summaryConfig.recipients, '', '', ''].slice(0, 3)
 : ['', '', ''],
 messageTemplate: summaryConfig.messageTemplate || '',
 });
 }, [summaryConfig.id, summaryConfig.isActive, summaryConfig.scheduledTime, summaryConfig.recipients, summaryConfig.messageTemplate]);

 const handleSaveDaily = async () => {
 setSaving(true);
 try {
 await saveConfig('daily_reminder', {
 isActive: dailyForm.isActive,
 scheduledTime: dailyForm.scheduledTime,
 messageTemplate: dailyForm.messageTemplate,
 templateName: 'Daily Reminder',
 });
 toast.success('Daily reminder settings saved!');
 } catch (err) { toast.error('Failed: ' + err.message); }
 finally { setSaving(false); }
 };

 const handleSaveSummary = async () => {
 setSaving(true);
 try {
 await saveConfig('admin_summary', {
 isActive: summaryForm.isActive,
 scheduledTime: summaryForm.scheduledTime,
 recipients: summaryForm.recipients.filter(r => r.trim()),
 messageTemplate: summaryForm.messageTemplate,
 templateName: 'Admin Daily Summary',
 });
 toast.success('Admin summary settings saved!');
 } catch (err) { toast.error('Failed: ' + err.message); }
 finally { setSaving(false); }
 };

 const updateRecipient = (index, value) => {
 const next = [...summaryForm.recipients];
 next[index] = value;
 setSummaryForm({ ...summaryForm, recipients: next });
 };

 const filteredLogs = filterType === 'All' ? logs : logs.filter(l => l.type === filterType);

 const clearWhatsAppLogs = () => {
 confirmDelete({
 title: 'Clear WhatsApp Logs',
 description: 'Delete all message logs?',
 onConfirm: async () => {
 await clearCollection('whatsapp_logs');
 toast.success('Logs cleared');
 },
 });
 };

 const chartData = useMemo(() => {
 const map = {};
 logs.forEach(l => {
 const t = (l.type || 'Unknown').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
 if (!map[t]) map[t] = { name: t, sent: 0, failed: 0 };
 if (l.status === 'sent') map[t].sent++;
 else map[t].failed++;
 });
 return Object.values(map);
 }, [logs]);

 const sections = [
 { id: 'daily', label: 'Daily Reminder', icon: Clock },
 { id: 'summary', label: 'Admin Summary', icon: MessageSquare },
 { id: 'logs', label: 'Message Log', icon: Search },
 { id: 'analytics', label: 'Analytics', icon: BarChart3 },
 ];

 return (
 <div className="space-y-6 page-transition">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">WhatsApp Automation</h1>
 <p className="text-sm text-[var(--text-muted)] mt-0.5">Configure automated WhatsApp messages and view history</p>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-4 gap-4">
 <div className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><MessageSquare className="w-5 h-5 text-green-600" /></div>
 <div><p className="text-[10px] text-gray-400 uppercase font-medium">Total Sent</p><p className="text-lg font-bold text-gray-900"><CountUpNumber end={logs.length} /></p></div>
 </div>
 <div className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Send className="w-5 h-5 text-blue-600" /></div>
 <div><p className="text-[10px] text-gray-400 uppercase font-medium">Delivered</p><p className="text-lg font-bold text-blue-600"><CountUpNumber end={logs.filter(l => l.status === 'sent').length} /></p></div>
 </div>
 <div className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>
 <div><p className="text-[10px] text-gray-400 uppercase font-medium">Failed</p><p className="text-lg font-bold text-red-600"><CountUpNumber end={logs.filter(l => l.status === 'failed').length} /></p></div>
 </div>
 <div className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-teal-600" /></div>
 <div><p className="text-[10px] text-gray-400 uppercase font-medium">Automations</p><p className="text-lg font-bold text-teal-600">{(dailyConfig.isActive ? 1 : 0) + (summaryConfig.isActive ? 1 : 0)} active</p></div>
 </div>
 </div>

 <div className="flex gap-6">
 {/* Left sidebar */}
 <div className="w-52 flex-shrink-0">
 <div className="card p-2 space-y-0.5">
 {sections.map(section => {
 const Icon = section.icon;
 return (
 <button key={section.id} onClick={() => setActiveSection(section.id)}
 className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSection === section.id ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
 <Icon className="w-4 h-4" />{section.label}
 </button>
 );
 })}
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 card">
 {activeSection === 'daily' && (
 <div className="space-y-5">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Daily Reminder Settings</h2>
 <Toggle checked={dailyForm.isActive} onChange={val => setDailyForm({ ...dailyForm, isActive: val })} />
 </div>

 <div className={`space-y-4 ${!dailyForm.isActive ? 'opacity-50 pointer-events-none' : ''}`}>
 <div>
 <label className="label">Scheduled Time</label>
 <input className="input-field w-40" type="time" value={dailyForm.scheduledTime}
 onChange={e => setDailyForm({ ...dailyForm, scheduledTime: e.target.value })} />
 </div>

 <div>
 <div className="flex items-center justify-between mb-1">
 <label className="label" style={{ marginBottom: 0 }}>Message Template</label>
 <span className="text-xs text-gray-400 italic">Template stays blank until you save a Firestore-backed config</span>
 </div>
 <textarea className="input-field resize-none font-mono text-sm" rows={7}
 value={dailyForm.messageTemplate}
 onChange={e => setDailyForm({ ...dailyForm, messageTemplate: e.target.value })} />
 </div>

 <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
 <p className="text-xs font-semibold text-blue-700 mb-1">Available Variables:</p>
 <div className="flex flex-wrap gap-2">
 {['{name}', '{open_tasks}', '{overdue_tasks}', '{company_name}'].map(v => (
 <span key={v} className="bg-white text-blue-600 px-2 py-0.5 rounded text-xs font-mono border border-blue-200">{v}</span>
 ))}
 </div>
 </div>
 </div>

 <button onClick={handleSaveDaily} disabled={saving} className="btn-primary">
 <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Settings'}
 </button>
 </div>
 )}

 {activeSection === 'summary' && (
 <div className="space-y-5">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Admin Daily Summary</h2>
 <Toggle checked={summaryForm.isActive} onChange={val => setSummaryForm({ ...summaryForm, isActive: val })} />
 </div>

 <div className={`space-y-4 ${!summaryForm.isActive ? 'opacity-50 pointer-events-none' : ''}`}>
 <div>
 <label className="label">WhatsApp Numbers (Monitoring)</label>
 <div className="space-y-2">
 {[0, 1, 2].map(i => (
 <input key={i} className="input-field" placeholder={`WhatsApp number ${i + 1}`}
 value={summaryForm.recipients[i] || ''}
 onChange={e => updateRecipient(i, e.target.value)} />
 ))}
 </div>
 </div>

 <div>
 <div className="flex items-center justify-between mb-1">
 <label className="label" style={{ marginBottom: 0 }}>Message Template</label>
 <span className="text-xs text-gray-400 italic">Template stays blank until you save a Firestore-backed config</span>
 </div>
 <textarea className="input-field resize-none font-mono text-sm" rows={8}
 value={summaryForm.messageTemplate}
 onChange={e => setSummaryForm({ ...summaryForm, messageTemplate: e.target.value })} />
 </div>

 <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
 <p className="text-xs font-semibold text-blue-700 mb-1">Available Variables:</p>
 <div className="flex flex-wrap gap-2">
 {['{date}', '{team_summary}', '{total_open}', '{total_overdue}', '{company_name}'].map(v => (
 <span key={v} className="bg-white text-blue-600 px-2 py-0.5 rounded text-xs font-mono border border-blue-200">{v}</span>
 ))}
 </div>
 </div>
 </div>

 <button onClick={handleSaveSummary} disabled={saving} className="btn-primary">
 <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Settings'}
 </button>
 </div>
 )}

 {activeSection === 'logs' && (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Message Log / History</h2>
 <div className="flex items-center gap-3">
 <select className="input-field w-44" value={filterType} onChange={e => setFilterType(e.target.value)}>
 <option value="All">All Types</option>
 <option value="daily_reminder">Daily Reminder</option>
 <option value="admin_summary">Admin Summary</option>
 <option value="task_complete">Task Complete</option>
 </select>
 {logs.length > 0 && <DeleteButton onClick={clearWhatsAppLogs} label="Clear Logs" title="Clear logs" />}
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full">
 <thead><tr className="bg-gray-50">
 <th className="table-header">Type</th>
 <th className="table-header">Recipient</th>
 <th className="table-header">Message Preview</th>
 <th className="table-header">Sent At</th>
 <th className="table-header">Status</th>
 </tr></thead>
 <tbody>
 {filteredLogs.length === 0 ? (
 <tr><td colSpan={5} className="table-cell text-center text-gray-400 py-12">No message logs yet. Logs appear after scheduled messages are sent.</td></tr>
 ) : filteredLogs.map(log => (
 <tr key={log.id} className="hover:bg-gray-50 transition-colors">
 <td className="table-cell"><span className="badge badge-teal">{(log.type || '').replace('_', ' ')}</span></td>
 <td className="table-cell text-gray-600 text-xs">{log.recipient || '-'}</td>
 <td className="table-cell text-[var(--text-muted)] text-xs max-w-xs truncate">{(log.message || '').substring(0, 80)}...</td>
 <td className="table-cell text-[var(--text-muted)] text-xs">{formatDate(log.sentAt)}</td>
 <td className="table-cell"><span className={`badge ${log.status === 'sent' ? 'badge-green' : 'badge-red'}`}>{log.status || 'unknown'}</span></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {activeSection === 'analytics' && (
 <div className="space-y-4">
 <h2 className="text-lg font-semibold text-gray-900">Message Analytics</h2>
 {chartData.length === 0 ? (
 <div className="py-12 text-center text-gray-400 text-sm">No analytics available yet. Logs will appear here once messages are sent.</div>
 ) : (
 <div className="card">
 <h3 className="text-sm font-semibold text-gray-700 mb-4">Messages Sent by Type</h3>
 <ResponsiveContainer width="100%" height={260}>
 <BarChart data={chartData}>
 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
 <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
 <Legend iconType="circle" cursor="pointer" wrapperStyle={{ fontSize: '12px' }} />
 <Bar dataKey="sent" stackId="a" fill="#14b8a6" name="Sent" radius={[0, 0, 4, 4]} />
 <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
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
