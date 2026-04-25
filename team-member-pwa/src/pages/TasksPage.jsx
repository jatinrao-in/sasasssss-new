import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Percent, IndianRupee, Folder, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/formatters';
import { db } from '../lib/firebase';
import { COLLECTIONS, addDocument, recalculateProjectTotalExpense } from '../lib/firestore-helpers';
import { notify } from '../lib/notify';
import { formatDate as fmtDate } from '../lib/helpers';
import { logInfo } from '../lib/firestoreDebug';

export default function TasksPage() {
  const { userData } = useAuth();
  const toast = useToast();
  
  const { tasks, loading: tasksLoading, updateCompletion } = useTasks(userData?.uid);
  const myTasks = tasks;

  const { projects, loading: projectsLoading } = useProjects(userData?.uid);
  
  const [activeTab, setActiveTab] = useState('all');
  const [collapsedProjects, setCollapsedProjects] = useState({});
  
  // Update % Sheet
  const [updateSheetOpen, setUpdateSheetOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [sliderValue, setSliderValue] = useState(0);
  const [saving, setSaving] = useState(false);

  // Add Expense Sheet
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [expenseActivity, setExpenseActivity] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const loading = tasksLoading || projectsLoading;

  useEffect(() => {
    logInfo('TasksPage', 'Render state:', {
      uid: userData?.uid || null,
      tasks: myTasks.length,
      projects: projects.length,
      activeTab,
      loading,
    });
  }, [activeTab, loading, myTasks.length, projects.length, userData?.uid]);

  // Group and sort tasks by project
  const groupedData = useMemo(() => {
    const map = {};
    const hasAnyTasks = myTasks.length > 0;

    const filteredTasks = myTasks.filter(t => {
      if (activeTab === 'all') return true;
      if (activeTab === 'open') return t.status === 'open';
      if (activeTab === 'completed') return t.status === 'completed';
      if (activeTab === 'overdue') return t.status === 'overdue';
      return true;
    });

    const uniqueProjectIds = [...new Set(myTasks.filter(t => t.projectId).map(t => t.projectId))];

    uniqueProjectIds.forEach(pid => {
      const pTasksFiltered = filteredTasks.filter(t => t.projectId === pid);
      if (pTasksFiltered.length === 0) return; 

      const allPTasks = myTasks.filter(t => t.projectId === pid); 
      const pDetails = projects.find(p => p.id === pid) || { name: 'Unknown Project' };

      const sortedTasks = [...pTasksFiltered].sort((a, b) => {
        const order = { overdue: 0, open: 1, completed: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      });

      const overdueCount = allPTasks.filter(t => t.status === 'overdue').length;
      const openCount = allPTasks.filter(t => t.status === 'open').length;
      const completedCount = allPTasks.filter(t => t.status === 'completed').length;
      const myCompletion = allPTasks.length > 0 ? Math.round((completedCount / allPTasks.length) * 100) : 0;

      map[pid] = {
        projectId: pid,
        project: { ...pDetails, myCompletion },
        tasks: sortedTasks,
        stats: { open: openCount, overdue: overdueCount, completed: completedCount },
        hasOverdue: overdueCount > 0
      };
    });

    const noProjectTasks = filteredTasks.filter(t => !t.projectId);
    if (noProjectTasks.length > 0) {
      const allNoPTasks = myTasks.filter(t => !t.projectId);
      const overdueCount = allNoPTasks.filter(t => t.status === 'overdue').length;
      const openCount = allNoPTasks.filter(t => t.status === 'open').length;
      const completedCount = allNoPTasks.filter(t => t.status === 'completed').length;
      const myCompletion = allNoPTasks.length > 0 ? Math.round((completedCount / allNoPTasks.length) * 100) : 0;

      const sortedTasks = [...noProjectTasks].sort((a, b) => {
        const order = { overdue: 0, open: 1, completed: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      });

      map['no-project'] = {
        projectId: 'no-project',
        project: { name: 'No Project', myCompletion },
        tasks: sortedTasks,
        stats: { open: openCount, overdue: overdueCount, completed: completedCount },
        hasOverdue: overdueCount > 0
      };
    }

    const sortedGroups = Object.values(map).sort((a, b) => {
      if (a.hasOverdue && !b.hasOverdue) return -1;
      if (!a.hasOverdue && b.hasOverdue) return 1;
      return 0;
    });

    return { groups: sortedGroups, hasAnyTasks, hasFilteredTasks: sortedGroups.length > 0 };
  }, [myTasks, projects, activeTab]);

  const toggleCollapse = (projectId) => {
    setCollapsedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const openUpdateSheet = (task) => { 
    setSelectedTask(task); 
    setSliderValue(task.completionPercent || 0); 
    setUpdateSheetOpen(true); 
  };
  
  const openExpenseSheet = (task) => { 
    setSelectedTask(task); 
    setExpenseActivity(''); 
    setExpenseAmount(''); 
    setExpenseSheetOpen(true); 
  };

  const handleUpdateCompletion = async () => {
    if (!selectedTask) return;
    setSaving(true);
    try {
      await updateCompletion(selectedTask.id, sliderValue);
      toast.success('Task updated!');

      // Notify admin when task is completed
      if (sliderValue === 100) {
        const project = projects.find(p => p.id === selectedTask.projectId);
        notify('task_completed', {
          // No memberUid here — this notifies the admin
          whatsappNumber: '', // Admin whatsapp — leave empty, admin will configure
          memberName: userData?.displayName || userData?.name || 'Team Member',
          taskName: selectedTask.title,
          projectName: project?.name || 'Unknown Project',
          completedOn: fmtDate(new Date()),
        });
      }

      setUpdateSheetOpen(false);
    } catch (err) { 
      toast.error('Failed: ' + err.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleAddExpense = async () => {
    if (!selectedTask || !expenseActivity || !expenseAmount) return;
    setSaving(true);
    try {
      await addDocument(db, COLLECTIONS.expenses, {
        activity: expenseActivity,
        amount: Number(expenseAmount),
        assignedTo: userData?.uid || '',
        createdAt: serverTimestamp(),
        projectId: selectedTask.projectId,
        taskId: selectedTask.id,
      }, 'save task expense');
      await recalculateProjectTotalExpense(db, selectedTask.projectId);
      toast.success('Expense added!');
      setExpenseSheetOpen(false);
    } catch (err) { 
      toast.error('Failed: ' + err.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const getBorderColor = (status) => {
    if (status === 'completed') return 'border-green-500';
    if (status === 'overdue') return 'border-red-500';
    return 'border-teal-500';
  };

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-gray-900">My Tasks</h1>
      </div>
      
      <div className="px-4 mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="open" className="flex-1">Open</TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">Done</TabsTrigger>
            <TabsTrigger value="overdue" className="flex-1">Overdue</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 space-y-4">
        {loading ? (
          Array(2).fill(0).map((_, i) => (
            <div key={i} className="space-y-2">
              <Card className="bg-[var(--bg-secondary)] border-b-0 rounded-b-none">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-teal-100 rounded animate-pulse" />
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
              <div className="space-y-2 px-2">
                {Array(2).fill(0).map((_, j) => (
                  <Card key={j}>
                    <CardContent className="p-4 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
                      <div className="h-2 bg-gray-100 rounded w-full mb-3" />
                      <div className="flex gap-2">
                        <div className="h-10 bg-gray-100 rounded w-1/2" />
                        <div className="h-10 bg-gray-100 rounded w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        ) : !groupedData.hasAnyTasks ? (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-900 font-medium">No tasks assigned yet</p>
            <p className="text-gray-400 text-sm mt-1">Your tasks will appear here once admin assigns them</p>
          </div>
        ) : !groupedData.hasFilteredTasks ? (
          <div className="text-center py-12">
            <p className="text-gray-900 font-medium">No {activeTab} tasks</p>
            <p className="text-gray-400 text-sm mt-1 mb-4">Switch to All to see everything</p>
            <Button variant="outline" onClick={() => setActiveTab('all')}>Clear Filter</Button>
          </div>
        ) : (
          groupedData.groups.map(group => (
            <div key={group.projectId} className="mb-4">
              <Card 
                onClick={() => toggleCollapse(group.projectId)} 
                className={`cursor-pointer bg-[var(--bg-secondary)] transition-all ${collapsedProjects[group.projectId] ? '' : 'border-b-0 rounded-b-none'}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-teal-600" />
                      <span className="font-bold text-gray-900 text-sm">{group.project.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {group.stats.overdue >= 3 ? (
                        <Badge variant="destructive">Critical</Badge>
                      ) : group.stats.overdue > 0 ? (
                        <Badge variant="warning">At Risk</Badge>
                      ) : (
                        <Badge variant="success">On Track</Badge>
                      )}
                      {collapsedProjects[group.projectId] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-gray-500 mb-3">
                    {group.stats.open} open · {group.stats.overdue} overdue · {group.stats.completed} done
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-500">My Progress</span>
                      <span className="font-medium text-teal-600">{group.project.myCompletion}%</span>
                    </div>
                    <Progress value={group.project.myCompletion} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>

              {!collapsedProjects[group.projectId] && (
                <div className="space-y-2 mt-2 px-1">
                  {group.tasks.map(task => (
                    <Card key={task.id} className={`hover:shadow-card-hover transition-shadow border-l-4 ${getBorderColor(task.status)}`}>
                      <CardContent className="p-3.5">
                        <p className="font-semibold text-sm text-[var(--text-primary)] mb-1">{task.title}</p>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mb-2">
                          <span>Start: {formatDate(task.startDate)}</span>
                          <span>Due: {formatDate(task.targetDate)}</span>
                        </div>
                        
                        {task.status === 'overdue' && (
                          <p className="text-xs text-red-500 font-medium mb-2">⚠ {task.overdueDays || '?'} days overdue</p>
                        )}
                        
                        <div className="mt-2 mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-500">Task Completion</span>
                            <span className="text-[10px] font-semibold text-teal-600">{task.completionPercent || 0}%</span>
                          </div>
                          <Progress value={task.completionPercent || 0} className="h-1.5" />
                        </div>
                        
                        {task.status !== 'completed' && (
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" className="flex-1 h-9" onClick={() => openUpdateSheet(task)}>
                              <Percent className="h-3 w-3 mr-1" /> Update %
                            </Button>
                            {task.projectId && (
                              <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => openExpenseSheet(task)}>
                                <IndianRupee className="h-3 w-3 mr-1" /> Add Expense
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Sheet open={updateSheetOpen} onOpenChange={setUpdateSheetOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>Update Completion</SheetTitle></SheetHeader>
          {selectedTask && (
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Task</p>
                <p className="text-sm font-medium text-gray-900">{selectedTask.title}</p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Completion</Label>
                  <span className="text-xl font-bold text-teal-600">{sliderValue}%</span>
                </div>
                
                <div className="flex gap-2 mb-4">
                  {[25, 50, 75, 100].map(val => (
                    <Button 
                      key={val} 
                      variant={sliderValue === val ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex-1 h-8"
                      onClick={() => setSliderValue(val)}
                    >
                      {val}%
                    </Button>
                  ))}
                </div>

                <input 
                  type="range" min="0" max="100" step="5" 
                  value={sliderValue} 
                  onChange={e => setSliderValue(Number(e.target.value))} 
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600" 
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
              
              {sliderValue === 100 && (
                <div className="bg-teal-50 border border-teal-100 rounded-lg p-3 text-sm text-teal-800">
                  <p className="font-medium flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Final Update</p>
                  <p className="mt-1 text-xs">This will mark the task as completed. You cannot add expenses to completed tasks.</p>
                </div>
              )}
              
              <Button className="w-full min-h-[44px]" onClick={handleUpdateCompletion} disabled={saving}>
                {saving ? 'Saving...' : 'Confirm Update'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={expenseSheetOpen} onOpenChange={setExpenseSheetOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>Add Expense</SheetTitle></SheetHeader>
          {selectedTask && (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Task</p>
                <p className="text-sm font-medium text-gray-900">{selectedTask.title}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expActivity">Activity</Label>
                <Input id="expActivity" placeholder="e.g., Material Purchase" value={expenseActivity} onChange={e => setExpenseActivity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expAmount">Amount (₹)</Label>
                <Input id="expAmount" type="number" placeholder="Enter amount" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
              </div>
              <Button className="w-full min-h-[44px] mt-2" onClick={handleAddExpense} disabled={saving}>
                {saving ? 'Submitting...' : 'Submit Expense'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
