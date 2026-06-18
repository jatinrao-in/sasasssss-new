import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FolderOpen, X, Search, LayoutGrid, List, Columns3,
  TrendingUp, Users, DollarSign, CircleDot, Edit3, ArrowUpRight, FolderKanban
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import useAuditLog from '../hooks/useAuditLog';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';
import { formatLakhs } from '../lib/formatters';
import { deleteProjectCascade } from '../lib/deleteActions';
import { SkeletonCards, SkeletonTable, SkeletonKanban } from '../components/ui/Skeleton';
import KanbanBoard from '../components/ui/KanbanBoard';
import EmptyState from '../components/ui/EmptyState';
import { StatusDot, StatusPill, getProjectHealthMeta } from '../components/ui/TextIndicators';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';
import BulkDeleteBar from '../components/BulkDeleteBar';

const PROJECT_STATUSES = ['planning', 'in_progress', 'review', 'completed', 'on_hold'];

const getInitials = (name) => {
  if (!name) return 'PM';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp?.toDate?.() ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

function formatProjectName(name) {
  if (!name) return '';
  if (name === name.toUpperCase()) {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return name;
}

function AddProjectModal({ onClose, onSubmit, editing }) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    client: editing?.client || '',
    poNumber: editing?.poNumber || '',
    poValue: editing?.poValue || '',
    status: editing?.status || 'planning',
    startDate: editing?.startDate
      ? (typeof editing.startDate.toDate === 'function' ? editing.startDate.toDate().toISOString().split('T')[0] : new Date(editing.startDate).toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0],
    deadline: editing?.deadline
      ? (typeof editing.deadline.toDate === 'function' ? editing.deadline.toDate().toISOString().split('T')[0] : new Date(editing.deadline).toISOString().split('T')[0])
      : '',
    projectManager: editing?.projectManager || '',
    description: editing?.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await onSubmit({
        name: form.name,
        client: form.client,
        poNumber: form.poNumber,
        poValue: Number(form.poValue) || 0,
        status: form.status,
        startDate: form.startDate ? Timestamp.fromDate(new Date(form.startDate)) : null,
        deadline: form.deadline ? Timestamp.fromDate(new Date(form.deadline)) : null,
        projectManager: form.projectManager,
        description: form.description,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-semibold text-slate-900">{editing ? 'Edit' : 'Add'} Project</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto bg-white flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Project Name *</label>
            <input
              className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
              placeholder="Enter project name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Client</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="Client name"
                value={form.client}
                onChange={e => setForm({ ...form, client: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">PO Number</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="PO-001"
                value={form.poNumber}
                onChange={e => setForm({ ...form, poNumber: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">PO Value (Rs)</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="0"
                value={form.poValue}
                onChange={e => setForm({ ...form, poValue: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                {PROJECT_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Start Date</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deadline</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Project Manager</label>
            <input
              className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
              placeholder="e.g. Rao Jatin"
              value={form.projectManager}
              onChange={e => setForm({ ...form, projectManager: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea
              className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 resize-none"
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100/50 transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> {editing ? 'Update' : 'Create'} Project</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function getHealthIndicator(project) {
  const completion = project.completionPercent || 0;
  const expense = project.totalExpense || 0;
  const poValue = project.poValue || 1;
  const utilization = (expense / poValue) * 100;

  if (completion >= 80 && utilization < 80) return getProjectHealthMeta('on-track');
  if (utilization > 90 || (completion < 30 && project.status === 'in_progress')) return getProjectHealthMeta('critical');
  return getProjectHealthMeta('at-risk');
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { log } = useAuditLog();
  const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
  const { projects, loading, addProject, updateProject } = useProjects();
  const { tasks } = useTasks();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterHealth, setFilterHealth] = useState('All');
  const [filterOwner, setFilterOwner] = useState('All');
  const [sortBy, setSortBy] = useState('name_asc');
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);

  const filtered = useMemo(() => {
    return projects.filter(project => {
      const matchSearch = search === '' ||
        (project.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (project.client || '').toLowerCase().includes(search.toLowerCase()) ||
        (project.poNumber || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'All' || project.status === filterStatus;
      const health = getHealthIndicator(project);
      const matchHealth = filterHealth === 'All' || health.label === filterHealth;
      const matchOwner = filterOwner === 'All' || project.projectManager === filterOwner;
      return matchSearch && matchStatus && matchHealth && matchOwner;
    });
  }, [projects, search, filterStatus, filterHealth, filterOwner]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === 'name_asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'po_desc') {
      list.sort((a, b) => Number(b.poValue || 0) - Number(a.poValue || 0));
    } else if (sortBy === 'progress_desc') {
      list.sort((a, b) => Number(b.completionPercent || 0) - Number(a.completionPercent || 0));
    } else if (sortBy === 'deadline_asc') {
      list.sort((a, b) => {
        const da = a.deadline?.toDate?.() || new Date(a.deadline || 0);
        const db = b.deadline?.toDate?.() || new Date(b.deadline || 0);
        return da - db;
      });
    }
    return list;
  }, [filtered, sortBy]);

  const uniqueOwners = useMemo(() => {
    return [...new Set(projects.map(p => p.projectManager).filter(Boolean))].sort();
  }, [projects]);

  const selectedProjectSet = useMemo(() => new Set(selectedProjectIds), [selectedProjectIds]);
  const visibleProjectIds = useMemo(() => sorted.map((project) => project.id), [sorted]);
  const allVisibleSelected = visibleProjectIds.length > 0
    && visibleProjectIds.every((projectId) => selectedProjectSet.has(projectId));

  const toggleProjectSelection = (projectId) => {
    setSelectedProjectIds((prev) => (
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    ));
  };

  const toggleAllVisibleProjects = () => {
    setSelectedProjectIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((projectId) => !visibleProjectIds.includes(projectId));
      }
      return Array.from(new Set([...prev, ...visibleProjectIds]));
    });
  };

  const handleAdd = async (data) => {
    try {
      await addProject(data);
      toast.success('Project created!');
    } catch (err) {
      toast.error('Failed: ' + err.message);
      throw err;
    }
  };

  const handleEdit = async (data) => {
    if (!editing?.id) return;
    try {
      await updateProject(editing.id, data);
      toast.success('Project updated successfully');
      setEditing(null);
      setShowModal(false);
    } catch (error) {
      console.error('Update project error:', error);
      toast.error('Failed to update project: ' + error.message);
    }
  };

  const handleKanbanDrop = async (item, newStatus) => {
    try {
      await updateProject(item.id, { status: newStatus });
      toast.success(`${formatProjectName(item.name)} -> ${newStatus.replace('_', ' ')}`);
    } catch (err) {
      toast.error('Failed: ' + err.message);
    }
  };

  const deleteProject = (projectId, projectName) => {
    confirmDelete({
      title: 'Delete Project',
      description: `Delete "${projectName}"? All tasks and expenses will also be permanently deleted.`,
      onConfirm: async () => {
        await deleteProjectCascade(projectId);
        await log('project_deleted', { projectId, projectName });
        setSelectedProjectIds((prev) => prev.filter((id) => id !== projectId));
        toast.success(`Project "${projectName}" deleted`);
      },
    });
  };

  const bulkDeleteProjects = () => {
    const idsToDelete = selectedProjectIds.filter((projectId) => projects.some((project) => project.id === projectId));
    if (idsToDelete.length === 0) return;

    confirmDelete({
      title: `Delete ${idsToDelete.length} Projects`,
      description: `Permanently delete ${idsToDelete.length} selected projects? All tasks and expenses for those projects will also be deleted. This cannot be undone.`,
      onConfirm: async () => {
        await Promise.all(idsToDelete.map((projectId) => deleteProjectCascade(projectId)));
        await log('projects_bulk_deleted', { projectIds: idsToDelete });
        setSelectedProjectIds([]);
        toast.success(`${idsToDelete.length} projects deleted`);
      },
    });
  };

  const statusLightClasses = {
    planning: 'bg-blue-50 text-blue-700 border border-blue-200',
    in_progress: 'bg-sky-50 text-sky-700 border border-sky-200',
    review: 'bg-amber-50 text-amber-700 border border-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    on_hold: 'bg-slate-50 text-slate-700 border border-slate-200',
  };

  const totalPO = projects.reduce((sum, project) => sum + Number(project.poValue || 0), 0);
  const totalExpense = projects.reduce((sum, project) => sum + Number(project.totalExpense || 0), 0);
  const avgCompletion = projects.length > 0 ? Math.round(projects.reduce((sum, project) => sum + (project.completionPercent || 0), 0) / projects.length) : 0;
  const activeProjectsCount = projects.filter(p => p.status !== 'completed').length;

  const kanbanColumns = PROJECT_STATUSES.map(status => ({
    id: status,
    label: status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
  }));

  const kanbanItems = sorted.map(project => ({
    ...project,
    column: project.status,
    title: formatProjectName(project.name),
    subtitle: project.client,
  }));

  return (
    <div className="space-y-6 page-transition bg-[#F8FAFC] min-h-screen text-[#0F172A] font-sans">
      {/* Page Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Projects</h1>
          <p className="text-sm text-[#64748B] mt-0.5 font-semibold">
            {activeProjectsCount} Active Projects &nbsp;·&nbsp; {formatLakhs(totalPO)} Portfolio Value
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="h-10 px-4 rounded-[12px] bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 shadow-sm hover:shadow transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Projects', value: activeProjectsCount, icon: FolderOpen, color: 'bg-blue-50 text-blue-600', trend: '+12% vs last month', isPos: true },
          { label: 'Portfolio Value', value: formatLakhs(totalPO), icon: DollarSign, color: 'bg-emerald-50 text-emerald-600', trend: '+8% vs last month', isPos: true },
          { label: 'Total Expenses', value: formatLakhs(totalExpense), icon: TrendingUp, color: 'bg-rose-50 text-rose-600', trend: '+15% vs last month', isPos: true },
          { label: 'Completion Rate', value: `${avgCompletion}%`, icon: CircleDot, color: 'bg-purple-50 text-purple-600', trend: '+4% vs last month', isPos: true },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
              <div className={`w-12 h-12 rounded-[12px] flex items-center justify-center ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-[#0F172A] mt-1 tracking-tight">{stat.value}</p>
                <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{stat.trend}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-[16px] min-h-14 py-3 md:py-0 px-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs bg-slate-50/30 font-medium text-slate-900"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        {/* Select filters & toggle */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2.5 w-full md:w-auto">
          <select
            className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-xs font-semibold text-slate-650 bg-slate-50/30"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            {PROJECT_STATUSES.map(status => (
              <option key={status} value={status}>
                {status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </option>
            ))}
          </select>
          
          <select
            className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-xs font-semibold text-slate-650 bg-slate-50/30"
            value={filterHealth}
            onChange={e => setFilterHealth(e.target.value)}
          >
            <option value="All">All Health</option>
            <option value="On Track">On Track</option>
            <option value="At Risk">At Risk</option>
            <option value="Critical">Critical</option>
          </select>
          
          <select
            className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-xs font-semibold text-slate-650 bg-slate-50/30"
            value={filterOwner}
            onChange={e => setFilterOwner(e.target.value)}
          >
            <option value="All">All Owners</option>
            {uniqueOwners.map(owner => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>

          <select
            className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-xs font-semibold text-slate-650 bg-slate-50/30"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="name_asc">Name (A-Z)</option>
            <option value="po_desc">PO Value (High-Low)</option>
            <option value="progress_desc">Progress (High-Low)</option>
            <option value="deadline_asc">Deadline (Soonest)</option>
          </select>
          
          <div className="h-6 w-px bg-slate-200 hidden md:block" />

          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-205">
            {[
              { id: 'grid', icon: LayoutGrid, label: 'Grid' },
              { id: 'list', icon: List, label: 'List' },
              { id: 'kanban', icon: Columns3, label: 'Kanban' },
            ].map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => setView(option.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                    view === option.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* New Project CTA inside toolbar */}
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="h-9 px-4 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      <BulkDeleteBar
        selectedCount={selectedProjectIds.length}
        onDelete={bulkDeleteProjects}
        onClear={() => setSelectedProjectIds([])}
      />

      {loading ? (
        view === 'kanban' ? <SkeletonKanban columns={5} /> :
        view === 'list' ? <SkeletonTable rows={5} cols={9} /> :
        <SkeletonCards count={8} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="noData"
          title="No projects created yet"
          description={search || filterStatus !== 'All' ? 'Try adjusting your filters.' : 'Click Add Project to get started.'}
          actionLabel="New Project"
          onAction={() => { setEditing(null); setShowModal(true); }}
        />
      ) : view === 'kanban' ? (
        <KanbanBoard
          columns={kanbanColumns}
          items={kanbanItems}
          onDrop={handleKanbanDrop}
          renderCard={(item) => {
            const health = getHealthIndicator(item);
            const projectTasks = (tasks || []).filter(t => t.projectId === item.id);
            const pendingReschedules = projectTasks.filter(t => t.rescheduleRequest?.status === 'pending');
            return (
              <div onClick={() => navigate(`/admin/projects/${item.id}`)} className="group cursor-pointer">
                <div className="mb-2 flex items-center justify-between gap-2" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedProjectSet.has(item.id)}
                    onChange={() => toggleProjectSelection(item.id)}
                    className="w-3.5 h-3.5 rounded border-slate-300 accent-blue-600 text-blue-600 focus:ring-blue-600/20 transition-all cursor-pointer"
                    title="Select project"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditing(item); setShowModal(true); }}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <DeleteButton
                      onClick={() => deleteProject(item.id, item.name)}
                      showLabel={false}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                </div>
                <div className="flex flex-col mb-2">
                  <span className="text-sm font-semibold text-slate-800 truncate">{formatProjectName(item.name)}</span>
                  <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{item.client || 'No client'}</span>
                  {pendingReschedules.length > 0 && (
                     <div className="mt-1 flex">
                       <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded shadow-sm">
                         <span className="relative flex h-1 w-1">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-1 w-1 bg-amber-500"></span>
                         </span>
                         {pendingReschedules.length} Reschedule
                       </span>
                     </div>
                   )}
                </div>
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <StatusPill
                    label={health.label}
                    color={health.color}
                    background={health.background}
                    borderColor={health.border}
                    className="font-bold text-[9px] px-1.5 py-0.2 rounded-full"
                  />
                  <span className={`badge ${statusLightClasses[item.status] || 'badge-gray'} text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full`}>
                    {(item.status || '').replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-600">{formatLakhs(item.poValue)}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${item.completionPercent || 0}%` }} />
                    </div>
                    <span className="text-[9px] text-slate-500 font-medium">{item.completionPercent || 0}%</span>
                  </div>
                </div>
              </div>
            );
          }}
        />
      ) : view === 'list' ? (
        <>
          {/* Desktop List Table */}
          <div className="hidden md:block bg-white border border-[#E2E8F0] rounded-[16px] p-0 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]" data-export-table>
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                    <th className="table-header w-10 py-3.5 text-slate-500 bg-transparent border-b border-[#E2E8F0]">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisibleProjects}
                        className="w-3.5 h-3.5 rounded border-slate-350 accent-blue-600 text-blue-600 focus:ring-blue-600/20 transition-all cursor-pointer"
                        title="Select all projects"
                      />
                    </th>
                    <th className="table-header py-3.5 text-slate-500 bg-transparent border-b border-[#E2E8F0]">Project</th>
                    <th className="table-header py-3.5 text-slate-500 bg-transparent border-b border-[#E2E8F0]">Client</th>
                    <th className="table-header py-3.5 text-slate-500 bg-transparent border-b border-[#E2E8F0]">Created Date</th>
                    <th className="table-header py-3.5 text-slate-500 bg-transparent border-b border-[#E2E8F0]">PO Value</th>
                    <th className="table-header py-3.5 text-slate-500 bg-transparent border-b border-[#E2E8F0]">Expense</th>
                    <th className="table-header py-3.5 text-slate-500 bg-transparent border-b border-[#E2E8F0]">Completion</th>
                    <th className="table-header py-3.5 text-slate-500 bg-transparent border-b border-[#E2E8F0]">Health</th>
                    <th className="table-header py-3.5 text-slate-500 bg-transparent border-b border-[#E2E8F0]">Status</th>
                    <th className="table-header py-3.5 text-slate-500 bg-transparent border-b border-[#E2E8F0]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(project => {
                    const health = getHealthIndicator(project);
                    const projectTasks = (tasks || []).filter(t => t.projectId === project.id);
                    const pendingReschedules = projectTasks.filter(t => t.rescheduleRequest?.status === 'pending');
                    return (
                      <tr
                        key={project.id}
                        className="group hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0"
                        onClick={() => navigate(`/admin/projects/${project.id}`)}
                      >
                        <td className="table-cell py-3.5 border-b border-slate-100" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedProjectSet.has(project.id)}
                            onChange={() => toggleProjectSelection(project.id)}
                            className="w-3.5 h-3.5 rounded border-slate-350 accent-blue-600 text-blue-600 focus:ring-blue-600/20 transition-all cursor-pointer"
                            title="Select project"
                          />
                        </td>
                        <td className="table-cell py-3.5 font-semibold text-slate-900 text-[14px] border-b border-slate-100">
                          <div>{formatProjectName(project.name)}</div>
                          {pendingReschedules.length > 0 && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shadow-sm">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                                </span>
                                {pendingReschedules.length} Reschedule Request{pendingReschedules.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="table-cell py-3.5 text-slate-500 font-medium border-b border-slate-100">{project.client || '-'}</td>
                        <td className="table-cell py-3.5 text-slate-500 font-medium border-b border-slate-100">{formatDate(project.createdAt)}</td>
                        <td className="table-cell py-3.5 font-bold text-slate-900 border-b border-slate-100">{formatLakhs(project.poValue)}</td>
                        <td className="table-cell py-3.5 text-slate-500 font-medium border-b border-slate-100">{formatLakhs(project.totalExpense)}</td>
                        <td className="table-cell py-3.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${project.completionPercent || 0}%` }} />
                            </div>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-10 text-center">{project.completionPercent || 0}%</span>
                          </div>
                        </td>
                        <td className="table-cell py-3.5 border-b border-slate-100">
                          <StatusPill
                            label={health.label}
                            color={health.color}
                            background={health.background}
                            borderColor={health.border}
                            className="font-bold text-[10px] px-2 py-0.5 rounded-full"
                          />
                        </td>
                        <td className="table-cell py-3.5 border-b border-slate-100">
                          <span className={`badge ${statusLightClasses[project.status] || 'badge-gray'} text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full`}>
                            {(project.status || '').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="table-cell py-3.5 border-b border-slate-100" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditing(project); setShowModal(true); }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <DeleteButton
                              onClick={() => deleteProject(project.id, project.name)}
                              className="p-1 rounded-md text-slate-400 hover:text-red-650 transition-all hover:bg-red-50"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-4">
            {sorted.map(project => {
              const health = getHealthIndicator(project);
              const projectTasks = (tasks || []).filter(t => t.projectId === project.id);
              const pendingReschedules = projectTasks.filter(t => t.rescheduleRequest?.status === 'pending');
              return (
                <div
                  key={project.id}
                  className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 space-y-4 hover:shadow-md transition-all duration-300"
                  onClick={() => navigate(`/admin/projects/${project.id}`)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="max-w-[70%]">
                      <p className="font-bold text-[15px] text-slate-900 break-words">{formatProjectName(project.name)}</p>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{project.client || 'No client'}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">Created: {formatDate(project.createdAt)}</p>
                      {pendingReschedules.length > 0 && (
                        <div className="mt-1.5 flex">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shadow-sm">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                            </span>
                            {pendingReschedules.length} Reschedule Request{pendingReschedules.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`badge ${statusLightClasses[project.status] || 'badge-gray'} text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full`}>
                        {(project.status || '').replace('_', ' ')}
                      </span>
                      <StatusPill
                        label={health.label}
                        color={health.color}
                        background={health.background}
                        borderColor={health.border}
                        className="font-bold text-[9px] px-1.5 py-0.2 rounded-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-3">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold tracking-wider">PO Value</span>
                      <span className="font-bold text-slate-800">{formatLakhs(project.poValue)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Total Expense</span>
                      <span className="font-bold text-slate-800">{formatLakhs(project.totalExpense)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1.5">Completion</span>
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${project.completionPercent || 0}%` }} />
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-10 text-center">{project.completionPercent || 0}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-100 pt-3" onClick={event => event.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedProjectSet.has(project.id)}
                        onChange={() => toggleProjectSelection(project.id)}
                        className="w-3.5 h-3.5 rounded border-slate-350 accent-blue-600 text-blue-600 focus:ring-blue-600/20 transition-all cursor-pointer"
                        title="Select project"
                      />
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Select</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setEditing(project); setShowModal(true); }}
                        className="text-xs text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 font-semibold transition-all"
                      >
                        Edit
                      </button>
                      <DeleteButton
                        onClick={() => deleteProject(project.id, project.name)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-655 transition-all hover:bg-red-50"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Redesigned 4-column Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sorted.map(project => {
            const health = getHealthIndicator(project);
            const profit = Number(project.poValue || 0) - Number(project.totalExpense || 0);
            const projectTasks = (tasks || []).filter(t => t.projectId === project.id);
            const pendingReschedules = projectTasks.filter(t => t.rescheduleRequest?.status === 'pending');
            return (
              <div
                key={project.id}
                onClick={() => navigate(`/admin/projects/${project.id}`)}
                className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 cursor-pointer group hover:shadow-md hover:border-blue-600/50 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between relative shadow-sm h-full"
              >
                {/* Header Row */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedProjectSet.has(project.id)}
                        onChange={() => toggleProjectSelection(project.id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 accent-blue-600 text-blue-600 focus:ring-blue-600/20 transition-all cursor-pointer shadow-sm"
                        title="Select project"
                      />
                      <span className="text-[9px] text-[#64748B] font-semibold uppercase tracking-wider">Select</span>
                    </div>
                    
                    <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                      <button
                        onClick={() => { setEditing(project); setShowModal(true); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit Project"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <DeleteButton
                        onClick={() => deleteProject(project.id, project.name)}
                        showLabel={false}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Project info details */}
                  <div className="flex items-start gap-3 mt-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/50 flex-shrink-0">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[18px] text-[#0F172A] truncate leading-tight group-hover:text-blue-600 transition-colors">
                        {formatProjectName(project.name)}
                      </h3>
                      <p className="text-sm text-[#64748B] font-medium truncate mt-0.5">
                        {project.client || 'No client assigned'}
                      </p>
                      <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                        Created: {formatDate(project.createdAt)}
                      </p>
                      {pendingReschedules.length > 0 && (
                        <div className="mt-1.5 flex">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md shadow-sm">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                            </span>
                            {pendingReschedules.length} Reschedule Request{pendingReschedules.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status and Health Badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <StatusPill
                      label={health.label}
                      color={health.color}
                      background={health.background}
                      borderColor={health.border}
                      className="font-bold text-[9px] px-2 py-0.5 rounded-full"
                    />
                    <span className={`badge ${statusLightClasses[project.status] || 'badge-gray'} text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full`}>
                      {(project.status || '').replace('_', ' ')}
                    </span>
                  </div>

                  {/* Progress info bar */}
                  <div className="space-y-1 mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>Progress</span>
                      <span className="font-semibold text-blue-650">{project.completionPercent || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
                        style={{ width: `${project.completionPercent || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Financial indicator metrics row */}
                <div>
                  <div className="grid grid-cols-2 gap-2 text-xs py-3 border-t border-slate-100 border-b border-slate-100 my-4 bg-slate-50/50 rounded-xl p-2.5">
                    <div>
                      <span className="block text-[9px] text-[#64748B] font-semibold uppercase tracking-wider">PO Value</span>
                      <span className="font-bold text-slate-800 text-[13px]">{formatLakhs(project.poValue)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#64748B] font-semibold uppercase tracking-wider">Expenses</span>
                      <span className="font-bold text-slate-800 text-[13px]">{formatLakhs(project.totalExpense)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#64748B] font-semibold uppercase tracking-wider">Profit</span>
                      <span className={`font-bold text-[13px] ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatLakhs(profit)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#64748B] font-semibold uppercase tracking-wider">Completion</span>
                      <span className="font-bold text-slate-800 text-[13px]">{project.completionPercent || 0}%</span>
                    </div>
                  </div>

                  {/* Card footer details */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Updated {formatDate(project.updatedAt || project.createdAt)}</span>
                    <div
                      className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 shadow-sm"
                      title={`Manager: ${project.projectManager || 'Unassigned'}`}
                    >
                      {getInitials(project.projectManager || 'PM')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AddProjectModal
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSubmit={editing ? handleEdit : handleAdd}
          editing={editing}
        />
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
