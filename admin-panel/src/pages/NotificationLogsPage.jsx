import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  MessageSquare, CheckCircle2, XCircle, Clock, RefreshCw,
  Filter, AlertTriangle, Phone, Calendar
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';
import { clearCollection } from '../lib/deleteActions';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';

const STATUS_CONFIG = {
  sent:        { label: 'Sent',        icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  pending:     { label: 'Pending',     icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  processing:  { label: 'Processing',  icon: RefreshCw,    color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  failed:      { label: 'Failed',      icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200' },
  skipped:     { label: 'Skipped',     icon: AlertTriangle,color: 'text-gray-500',    bg: 'bg-gray-50',    border: 'border-gray-200' },
  skipped_no_template: { label: 'No Template', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function formatPhone(to) {
  if (!to) return '-';
  const s = String(to);
  if (s.length === 12 && s.startsWith('91')) {
    return `+91 ${s.slice(2, 7)} ${s.slice(7)}`;
  }
  return s;
}

function formatTime(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function NotificationLogsPage() {
  const toast = useToast();
  const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
  const [logs, setLogs] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('logs');
  const [statusFilter, setStatusFilter] = useState('all');

  const { user } = useAuth();

  // Live logs from whatsapp_logs
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'whatsapp_logs'), orderBy('sentAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Logs listener error:', err);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Live queue from whatsapp_queue
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'whatsapp_queue'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setQueue(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Queue listener error:', err);
    });
    return unsub;
  }, [user]);

  const filteredLogs = statusFilter === 'all'
    ? logs
    : logs.filter(l => l.status === statusFilter);

  const stats = {
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
    pending: queue.filter(l => l.status === 'pending').length,
    total: logs.length,
  };

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

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="welcome-banner animated-gradient p-6 text-white">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-teal-200 text-sm font-medium mb-1">MSG91 WhatsApp</p>
            <h1 className="text-2xl font-bold">Notification Logs</h1>
            <p className="text-white/70 text-sm mt-1">Real-time delivery tracking for all automated WhatsApp messages</p>
          </div>
          <MessageSquare className="w-14 h-14 text-white/20" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Sent', value: stats.sent, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100' },
          { label: 'Failed', value: stats.failed, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', iconBg: 'bg-red-100' },
          { label: 'In Queue', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', iconBg: 'bg-amber-100' },
          { label: 'All Time Logs', value: stats.total, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50', iconBg: 'bg-blue-100' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`card ${s.bg} border border-gray-100 p-5 flex items-center gap-4`}>
              <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'logs', label: 'Delivery Logs', count: stats.total },
          { key: 'queue', label: 'Message Queue', count: queue.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-teal-500 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.key ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      {activeTab === 'logs' && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">Filter:</span>
          {['all', 'sent', 'failed', 'skipped', 'skipped_no_template'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                statusFilter === s
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
          {logs.length > 0 && (
            <div className="ml-auto">
              <DeleteButton onClick={clearWhatsAppLogs} label="Clear Logs" title="Clear logs" />
            </div>
          )}
        </div>
      )}

      {/* Logs Table */}
      {activeTab === 'logs' && (
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
              <p>Loading logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No logs found</p>
              <p className="text-sm mt-1">WhatsApp delivery logs will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">To</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Event / Template</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sent At</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-sm font-mono text-gray-700">{formatPhone(log.to)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2 py-1 rounded-md">
                          {log.payload?.payload?.template?.name || log.eventName || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatTime(log.sentAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {log.error ? (
                          <span className="text-xs text-red-600 font-medium truncate max-w-[200px] block" title={log.error}>
                            {log.error.substring(0, 60)}{log.error.length > 60 ? '...' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Queue Table */}
      {activeTab === 'queue' && (
        <div className="card overflow-hidden">
          {queue.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Queue is empty</p>
              <p className="text-sm mt-1">All messages have been processed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">To</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Event</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Retries</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map(item => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-sm font-mono text-gray-700">{formatPhone(item.to)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md">
                          {item.eventName || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${item.retries > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {item.retries || 0} / 3
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatTime(item.createdAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
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

