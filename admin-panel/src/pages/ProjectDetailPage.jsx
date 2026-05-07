import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useProjects, useExpenses } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useTeam } from '../hooks/useTeam';
import { useToast } from '../hooks/useToast';
import useAuditLog from '../hooks/useAuditLog';
import useDelete from '../hooks/useDelete';
import { formatDate, formatCurrency, formatLakhs } from '../lib/formatters';
import { deleteExpenseAndRecalculate, deleteTaskCascade } from '../lib/deleteActions';
import { notifyTaskAssigned } from '../lib/notify';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';
import BulkDeleteBar from '../components/BulkDeleteBar';


function AddTaskModal({ onClose, onSubmit, members, projectId }) {
  const [form, setForm] = useState({
    title: '',
    assignedTo: '',
    assignedToName: '',
    targetDate: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        projectId,
        targetDate: form.targetDate ? Timestamp.fromDate(new Date(form.targetDate)) : null,
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md mx-4 modal-content">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Task</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Task Title</label>
            <input
              className="input-field"
              placeholder="Enter task title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>

          <div>
            <label className="label">Assign To</label>
            <select
              className="input-field"
              value={form.assignedTo}
              onChange={(event) => {
                const member = members.find((item) => item.id === event.target.value);
                setForm({ ...form, assignedTo: event.target.value, assignedToName: member?.name || '' });
              }}
            >
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Target Date</label>
            <input
              className="input-field"
              type="date"
              value={form.targetDate}
              onChange={(event) => setForm({ ...form, targetDate: event.target.value })}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Adding...' : <><Plus className="w-4 h-4" /> Add Task</>}
          </button>
        </div>
      </div>
    </div>
  );
}


function AddExpenseModal({ onClose, onSubmit, projectId }) {
  const [form, setForm] = useState({ activity: '', amount: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.activity || !form.amount) return;
    setSaving(true);
    try {
      await onSubmit({
        activity: form.activity,
        amount: Number(form.amount),
        projectId,
        taskId: '',
        assignedTo: '',
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-sm mx-4 modal-content">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Expense</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Activity</label>
            <input
              className="input-field"
              placeholder="e.g. Server costs"
              value={form.activity}
              onChange={(event) => setForm({ ...form, activity: event.target.value })}
            />
          </div>
          <div>
            <label className="label">Amount (Rs.)</label>
            <input
              className="input-field"
              type="number"
              placeholder="0"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Adding...' : <><Plus className="w-4 h-4" /> Add</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { log } = useAuditLog();
  const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
  const { userData } = useAuth();
  const { addNotification } = useNotifications(userData?.uid);
  const { projects, recalcTotalExpense, recalcCompletion } = useProjects();
  const { tasks, loading: tasksLoading, addTask } = useTasks();
  const { expenses, loading: expensesLoading, addExpense } = useExpenses(id);
  const { members } = useTeam();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  const project = projects.find((projectItem) => projectItem.id === id);
  const projectTasks = tasks.filter((task) => task.projectId === id);
  const activeMembers = members.filter((member) => member.role === 'member' && member.status === 'active');
  const selectedTaskSet = new Set(selectedTaskIds);
  const allTasksSelected = projectTasks.length > 0 && projectTasks.every((task) => selectedTaskSet.has(task.id));

  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds((prev) => (
      prev.includes(taskId)
        ? prev.filter((selectedId) => selectedId !== taskId)
        : [...prev, taskId]
    ));
  };

  const toggleAllTasks = () => {
    setSelectedTaskIds((prev) => {
      if (allTasksSelected) {
        return prev.filter((taskId) => !projectTasks.some((task) => task.id === taskId));
      }
      return Array.from(new Set([...prev, ...projectTasks.map((task) => task.id)]));
    });
  };

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Project not found or loading...</p>
        <button onClick={() => navigate('/projects')} className="btn-primary mt-4">Back to Projects</button>
      </div>
    );
  }

  const handleAddTask = async (taskData) => {
    try {
      const taskRef = await addTask(taskData);
      await recalcCompletion(id);

      if (taskData.assignedTo) {
        await addNotification(taskData.assignedTo, {
          message: `New task assigned: ${taskData.title}`,
          relatedId: taskRef.id,
          type: 'task',
        });

        // Silent WhatsApp notification via MSG91 task_assigned template
        const member = members.find((m) => m.id === taskData.assignedTo);
        if (member) {
          await notifyTaskAssigned(member, taskData, project);
        }
      }

      await log('task_assigned', {
        taskId: taskRef.id,
        taskName: taskData.title || '',
        assignedTo: taskData.assignedTo || '',
        projectId: id,
        projectName: project.name || '',
      });

      toast.success('Task added!');
    } catch (error) {
      toast.error(`Failed: ${error.message}`);
      throw error;
    }
  };

  const handleAddExpense = async (expenseData) => {
    try {
      await addExpense(expenseData);
      await recalcTotalExpense(id);
      toast.success('Expense added!');
    } catch (error) {
      toast.error(`Failed: ${error.message}`);
      throw error;
    }
  };

  const deleteTask = (taskId, taskName) => {
    confirmDelete({
      title: 'Delete Task',
      description: `Delete task "${taskName}"? Related task expenses will also be removed. This cannot be undone.`,
      onConfirm: async () => {
        await deleteTaskCascade(taskId, id);
        await log('task_deleted', { taskId, taskName, projectId: id, projectName: project.name || '' });
        setSelectedTaskIds((prev) => prev.filter((selectedId) => selectedId !== taskId));
        toast.success('Task deleted');
      },
    });
  };

  const deleteExpense = (expenseId) => {
    confirmDelete({
      title: 'Delete Expense',
      description: 'Remove this expense entry?',
      onConfirm: async () => {
        await deleteExpenseAndRecalculate(expenseId, id);
        await log('expense_deleted', { expenseId, projectId: id, projectName: project.name || '' });
        toast.success('Expense deleted');
      },
    });
  };

  const bulkDeleteTasks = () => {
    const taskIdsToDelete = selectedTaskIds.filter((taskId) => projectTasks.some((task) => task.id === taskId));
    if (taskIdsToDelete.length === 0) return;

    confirmDelete({
      title: `Delete ${taskIdsToDelete.length} Tasks`,
      description: `Permanently delete ${taskIdsToDelete.length} selected tasks? Related task expenses will also be deleted. This cannot be undone.`,
      onConfirm: async () => {
        await Promise.all(taskIdsToDelete.map((taskId) => deleteTaskCascade(taskId, id)));
        await log('tasks_bulk_deleted', { taskIds: taskIdsToDelete, projectId: id, projectName: project.name || '' });
        setSelectedTaskIds([]);
        toast.success(`${taskIdsToDelete.length} tasks deleted`);
      },
    });
  };

  const statusColors = { open: 'badge-blue', completed: 'badge-green', overdue: 'badge-red' };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/projects')} className="p-2 rounded-lg border border-[var(--border-primary)] hover:bg-gray-50">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-500">{project.client || ''} | {project.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <div className="card text-center">
          <p className="text-xs text-gray-400">PO Value</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{formatLakhs(project.poValue)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400">Total Expense</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{formatLakhs(project.totalExpense)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400">Completion</p>
          <p className="text-2xl font-bold text-teal-600 mt-1">{project.completionPercent || 0}%</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400">Tasks</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{projectTasks.length}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Tasks</h2>
          <button onClick={() => setShowTaskModal(true)} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        </div>
        <BulkDeleteBar
          selectedCount={selectedTaskIds.length}
          onDelete={bulkDeleteTasks}
          onClear={() => setSelectedTaskIds([])}
        />
        {tasksLoading ? (
          <div className="py-4 text-center text-gray-400">Loading...</div>
        ) : projectTasks.length === 0 ? (
          <div className="py-4 text-center text-gray-400 text-sm">No tasks in this project yet. Click Add Task to create one.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-header w-10">
                  <input
                    type="checkbox"
                    checked={allTasksSelected}
                    onChange={toggleAllTasks}
                    className="rounded accent-teal-600"
                    title="Select all tasks"
                  />
                </th>
                <th className="table-header">Task</th>
                <th className="table-header">Assigned To</th>
                <th className="table-header">Target Date</th>
                <th className="table-header">Completion</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projectTasks.map((task) => (
                <tr key={task.id} className="group hover:bg-gray-50">
                  <td className="table-cell">
                    <input
                      type="checkbox"
                      checked={selectedTaskSet.has(task.id)}
                      onChange={() => toggleTaskSelection(task.id)}
                      className="rounded accent-teal-600"
                      title="Select task"
                    />
                  </td>
                  <td className="table-cell font-medium">{task.title}</td>
                  <td className="table-cell text-gray-600">{task.assignedToName || '-'}</td>
                  <td className="table-cell text-xs text-gray-500">{formatDate(task.targetDate)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 progress-bar">
                        <div className="progress-fill bg-teal-500" style={{ width: `${task.completionPercent || 0}%` }} />
                      </div>
                      <span className="text-xs font-semibold w-8">{task.completionPercent || 0}%</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${statusColors[task.status] || 'badge-gray'}`}>{task.status}</span>
                  </td>
                  <td className="table-cell">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DeleteButton onClick={() => deleteTask(task.id, task.title)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Expenses</h2>
          <button onClick={() => setShowExpenseModal(true)} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Expense
          </button>
        </div>
        {expensesLoading ? (
          <div className="py-4 text-center text-gray-400">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="py-4 text-center text-gray-400 text-sm">No expenses yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-header">Activity</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="group hover:bg-gray-50">
                  <td className="table-cell">{expense.activity}</td>
                  <td className="table-cell text-right font-semibold">{formatCurrency(expense.amount)}</td>
                  <td className="table-cell">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DeleteButton onClick={() => deleteExpense(expense.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showTaskModal && (
        <AddTaskModal
          onClose={() => setShowTaskModal(false)}
          onSubmit={handleAddTask}
          members={activeMembers}
          projectId={id}
        />
      )}
      {showExpenseModal && (
        <AddExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSubmit={handleAddExpense}
          projectId={id}
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
