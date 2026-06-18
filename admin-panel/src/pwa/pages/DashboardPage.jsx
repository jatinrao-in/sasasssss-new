import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  ClipboardList, AlertTriangle, CalendarClock, CreditCard, Building,
  ChevronRight, Clock, Activity, Folder, Wrench, Users, FileText,
  Megaphone, Sun, CloudSun, CloudMoon, Download, Plus, CheckCircle2,
  Play, Square, Loader2, UserPlus, ShieldCheck, Bell, Lock, Power, CheckSquare, Search, User, X, ArrowLeftRight, HelpCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useFollowUps } from '../hooks/useFollowUps';
import { usePayments } from '../hooks/usePayments';
import { useProjects } from '../hooks/useProjects';
import { useTools } from '../hooks/useTools';
import { useNotifications } from '../hooks/useNotifications';
import { useEnquiries } from '../hooks/useEnquiries';
import { useRgp } from '../hooks/useRgp';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/formatters';
import { logInfo } from '../lib/firestoreDebug';
import { toDateValue } from '../lib/firestore-helpers';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';





export default function DashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { userData, currentUser } = useAuth();
  const uid = userData?.uid;

  const hasPermission = (key) => {
    return Array.isArray(currentUser?.permissions) && currentUser.permissions.includes(key);
  };
  
  // Database Hooks
  const { tasks, loading: tasksLoading, updateCompletion } = useTasks(uid);
  const { followUps, loading: fuLoading } = useFollowUps(uid);
  const { payments, loading: payLoading } = usePayments(uid);
  const { projects, loading: projLoading } = useProjects(uid);
  const { tools, loading: toolsLoading } = useTools(uid);
  const { unreadCount } = useNotifications();
  const { enquiries, addEnquiry } = useEnquiries(uid);
  const { rgp: rgpList } = useRgp();

  // Dialog Bottom Sheet States
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showQuickEnquiry, setShowQuickEnquiry] = useState(false);
  
  // Spotlight Search States
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const matchingTasks = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return tasks.filter(t => t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
  }, [searchQuery, tasks]);

  const matchingEnquiries = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return (enquiries || []).filter(e => e.customerName?.toLowerCase().includes(q) || e.companyName?.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q));
  }, [searchQuery, enquiries]);

  const matchingRgp = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const myRgp = (rgpList || []).filter(item => item.assignedTo === uid || item.createdBy === uid);
    return myRgp.filter(r => r.itemName?.toLowerCase().includes(q) || r.referenceNumber?.toLowerCase().includes(q) || r.receiverName?.toLowerCase().includes(q));
  }, [searchQuery, rgpList, uid]);

  const matchingProjects = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return projects.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  }, [searchQuery, projects]);

  // Slider auto-slide and manual-scroll ref states
  const scrollContainerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // Auto-scroll horizontal cards every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isUserScrolling) {
        setActiveCardIndex((prev) => (prev + 1) % 2);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isUserScrolling]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const firstCard = container.querySelector('.snap-center');
      const cardWidth = firstCard ? firstCard.offsetWidth + 16 : 316;
      container.scrollTo({
        left: activeCardIndex * cardWidth,
        behavior: 'smooth'
      });
    }
  }, [activeCardIndex]);

  const handleSliderScroll = (e) => {
    setIsUserScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    
    // Debounce the state update until scrolling settles down.
    // This stops React from triggering rendering cycles while dragging,
    // avoiding scroll stutter and fight conditions.
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const firstCard = container.querySelector('.snap-center');
        const cardWidth = firstCard ? firstCard.offsetWidth + 16 : 316;
        const index = Math.round(container.scrollLeft / cardWidth);
        if (index >= 0 && index < 2) {
          setActiveCardIndex(index);
        }
      }
    }, 150);
  };

  // Quick Enquiry Form States
  const [custName, setCustName] = useState('');
  const [compName, setCompName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custNotes, setCustNotes] = useState('');
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);

  // Quick task complete directly updates Firestore in real-time
  const handleTaskComplete = async (taskId, taskTitle) => {
    try {
      toast.info(`Updating task "${taskTitle}" status...`);
      await updateCompletion(taskId, 100, taskTitle);
      toast.success(`Task "${taskTitle}" completed!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to complete task.');
    }
  };

  // Quick Enquiry Submit
  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    if (!custName || !custPhone) {
      toast.warning('Customer Name and Phone are required.');
      return;
    }
    setSubmittingEnquiry(true);
    try {
      await addEnquiry({
        customerName: custName,
        companyName: compName,
        phone: custPhone,
        notes: custNotes,
        assignedTo: uid || ''
      });
      toast.success('New client enquiry saved!');
      setCustName('');
      setCompName('');
      setCustPhone('');
      setCustNotes('');
      setShowQuickEnquiry(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to register enquiry.');
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  // Mock handlers for tool requests
  const handleToolReturn = (toolName) => {
    toast.success(`Return request for "${toolName}" registered. Warehouse manager notified.`);
  };

  const handleToolDamage = (toolName) => {
    toast.warning(`Damage report logged for "${toolName}". Please surrender tool to warehouse.`);
  };

  // Filter lists
  const myTasks = tasks;
  const myFollowUps = followUps;
  const myPayments = payments;

  const openTasks = myTasks.filter(t => t.status === 'open');
  const overdueTasks = myTasks.filter(t => t.status === 'overdue');
  const openFollowups = myFollowUps.filter(f => f.status === 'open' || f.status === 'overdue');
  const pendingPayments = myPayments.filter(p => p.paymentStatus !== 'received');

  // Stats helpers for the 6 Console Statistics cards
  const activeFollowUps = myFollowUps.filter(f => !f.isClosed);
  const overdueFollowUps = myFollowUps.filter(f => !f.isClosed && f.overdueDays > 0);
  const pendingPaymentsList = myPayments.filter(p => p.paymentStatus !== 'received' && p.paymentStatus !== 'fully_received');
  const totalPendingAmount = myPayments.reduce((sum, p) => sum + Number(p.netPending || 0), 0);
  const activeRgpList = (rgpList || []).filter(r => !r.isClosed);

  const myProjectIds = [...new Set(myTasks.filter(t => t.projectId).map(t => t.projectId))];
  const myProjects = projects.filter(p => myProjectIds.includes(p.id));
  const myPendingTools = tools.filter(t => t.returnStatus === 'pending');
  const myAllTools = tools;

  const loading = tasksLoading || fuLoading || payLoading || projLoading || toolsLoading;

  const dynamicNotices = useMemo(() => {
    const list = [];
    const now = new Date();
    const hasTasksAccess = Array.isArray(currentUser?.permissions) && currentUser.permissions.includes('tasks');
    const hasEnquiryAccess = Array.isArray(currentUser?.permissions) && currentUser.permissions.includes('enquiry');

    // 1. Process Tasks
    if (hasTasksAccess && Array.isArray(tasks)) {
      tasks.forEach(task => {
        // Skip completed tasks
        if (task.status === 'completed' || (task.completionPercent || 0) >= 100) {
          return;
        }

        const dueDate = toDateValue(task.targetDate);
        if (!dueDate) return;

        const timeDiff = dueDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 0) {
          const daysOverdue = Math.floor(Math.abs(hoursDiff) / 24);
          list.push({
            id: `task-overdue-${task.id}`,
            type: 'task',
            title: task.title,
            status: 'overdue',
            dueDate,
            dateStr: formatDate(task.targetDate) || dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            content: `Task is overdue by ${daysOverdue > 0 ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''}` : 'a few hours'}. Deadline was ${formatDate(task.targetDate)}.`,
            targetPath: '/pwa/tasks'
          });
        } else if (hoursDiff <= 48) {
          const hoursLeft = Math.round(hoursDiff);
          list.push({
            id: `task-nearby-${task.id}`,
            type: 'task',
            title: task.title,
            status: 'nearby',
            dueDate,
            dateStr: formatDate(task.targetDate) || dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            content: `Deadline nearby! ${hoursLeft > 0 ? `${hoursLeft} hour${hoursLeft > 1 ? 's' : ''} remaining` : 'due very soon'}. Due date: ${formatDate(task.targetDate)}.`,
            targetPath: '/pwa/tasks'
          });
        }
      });
    }

    // 2. Process Enquiries
    if (hasEnquiryAccess && Array.isArray(enquiries)) {
      enquiries.forEach(enquiry => {
        // Skip closed enquiries
        if (enquiry.isClosed || enquiry.statusCategory === 'closed') {
          return;
        }

        const dueDate = toDateValue(enquiry.targetDate);
        if (!dueDate) return;

        const timeDiff = dueDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        const name = enquiry.customerName || enquiry.companyName || 'Unknown Client';

        if (hoursDiff < 0) {
          const daysOverdue = Math.floor(Math.abs(hoursDiff) / 24);
          list.push({
            id: `enquiry-overdue-${enquiry.id}`,
            type: 'enquiry',
            title: `Client Enquiry: ${name}`,
            status: 'overdue',
            dueDate,
            dateStr: formatDate(enquiry.targetDate) || dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            content: `Enquiry response overdue by ${daysOverdue > 0 ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''}` : 'a few hours'}. Action required.`,
            targetPath: '/pwa/enquiries'
          });
        } else if (hoursDiff <= 48) {
          const hoursLeft = Math.round(hoursDiff);
          list.push({
            id: `enquiry-nearby-${enquiry.id}`,
            type: 'enquiry',
            title: `Client Enquiry: ${name}`,
            status: 'nearby',
            dueDate,
            dateStr: formatDate(enquiry.targetDate) || dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            content: `Response due soon! ${hoursLeft > 0 ? `${hoursLeft} hour${hoursLeft > 1 ? 's' : ''} remaining` : 'due very soon'}.`,
            targetPath: '/pwa/enquiries'
          });
        }
      });
    }

    // Sort by status ('overdue' first) and then by closest due date
    return list.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'overdue' ? -1 : 1;
      }
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }, [tasks, enquiries, currentUser?.permissions]);

  useEffect(() => {
    logInfo('DashboardPage', 'Render state:', {
      uid,
      tasks: myTasks.length,
      followUps: myFollowUps.length,
      payments: myPayments.length,
      projects: myProjects.length,
      tools: myPendingTools.length,
      loading,
    });
  }, [
    loading,
    myFollowUps.length,
    myPayments.length,
    myPendingTools.length,
    myProjects.length,
    myTasks.length,
    uid,
  ]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good Morning', icon: Sun };
    if (h < 17) return { text: 'Good Afternoon', icon: CloudSun };
    return { text: 'Good Evening', icon: CloudMoon };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  const today = new Date();
  const dayNum = today.toLocaleDateString('en-IN', { day: '2-digit' });
  const monthYear = today.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  const weekday = today.toLocaleDateString('en-IN', { weekday: 'long' });

  // Circular progress donut calculation
  const totalTasksCount = myTasks.length;
  const completedTasksCount = myTasks.filter(t => t.status === 'completed').length;
  const taskCompletionPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (taskCompletionPercent / 100) * circumference;

  return (
    <div 
      className="pwa-dashboard-container pb-8 relative scroll-area font-sans text-[var(--color-text-primary)] min-h-screen overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #FAF6EE 0%, #EAE4D9 100%)',
      }}
    >
      {/* Background Waves & Circles SVG with warm minimalist tones and 40% opacity */}
      <svg className="absolute bottom-0 left-0 right-0 w-full h-[240px] pointer-events-none z-0 overflow-hidden opacity-40" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="warmWaveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DFD8CC" />
            <stop offset="100%" stopColor="#D5CDBE" />
          </linearGradient>
          <linearGradient id="warmWaveGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EFECE4" />
            <stop offset="100%" stopColor="#E4DEC3" />
          </linearGradient>
          <linearGradient id="warmCircleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EADEC9" />
            <stop offset="100%" stopColor="#D5CBB5" />
          </linearGradient>
        </defs>
        
        {/* Floating Circles */}
        <circle cx="820" cy="180" r="14" fill="url(#warmCircleGrad)" />
        <circle cx="1120" cy="160" r="10" fill="url(#warmCircleGrad)" />
        <circle cx="980" cy="210" r="24" fill="url(#warmCircleGrad)" />
        
        {/* Back Layer Wave */}
        <path d="M0,280 C150,280 200,200 420,200 C640,200 700,320 1020,320 C1220,320 1350,220 1440,200 L1440,320 L0,320 Z" fill="url(#warmWaveGrad1)" />
        
        {/* Front Layer Wave */}
        <path d="M0,120 C100,120 100,260 320,260 C520,260 720,220 920,220 C1120,220 1220,320 1440,320 L1440,320 L0,320 Z" fill="url(#warmWaveGrad2)" />
      </svg>

      <div className="relative z-10 space-y-6">
        
        {/* Profile Greeting Section (Directly on canvas matching Image 2) */}
        <div className="flex justify-between items-center px-4 pt-5">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-[var(--color-text-secondary)] uppercase">
              {greeting.text}
            </p>
            <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight mt-0.5 leading-none pwa-headline">
              {(userData?.name || 'Rao Jatin').toUpperCase()} !!
            </h1>
          </div>
          
          {/* Avatar container on the right - clean user profile icon */}
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--color-primary)]/20 flex items-center justify-center bg-[#FAF6EE] shadow-sm flex-shrink-0">
            {userData?.profilePicture ? (
              <img src={userData.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                <User size={24} className="stroke-[1.5]" />
              </div>
            )}
          </div>
        </div>

        {/* Feature Cards Horizontal Scroll (Image 2 Card Peek Style) */}
        {hasPermission('tasks') && (
          <div className="w-full">
            <div 
              ref={scrollContainerRef}
              onScroll={handleSliderScroll}
              className="flex gap-4 overflow-x-auto pb-5 pt-1 snap-x px-4 scroll-smooth no-scrollbar"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              
              {/* Card 2: Equipment Locker (Coral Orange Card) */}
              <div className="pwa-3d-card-orange text-white p-6 w-[300px] flex-shrink-0 snap-center relative overflow-hidden flex flex-col justify-between h-[180px]">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <circle cx="90" cy="10" r="30" fill="currentColor" />
                    <circle cx="10" cy="90" r="20" fill="currentColor" />
                  </svg>
                </div>
                {/* No image watermark */}

                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.08em] leading-none">EQUIPMENT LOCKER</p>
                    <h3 className="text-[20px] font-black mt-2 tracking-tight leading-tight truncate max-w-[200px]">
                      {myPendingTools.length > 0 ? myPendingTools[0].toolName : 'LOCKER EMPTY'}
                    </h3>
                  </div>
                  <div className="h-8 w-8 rounded-full flex items-center justify-center bg-[#FAF6EE]/15 border border-[#FAF6EE]/20">
                    <Lock className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="relative z-10 flex items-end justify-between mt-4">
                  <div className="text-left">
                    <p className="text-[9px] font-semibold text-white/60 uppercase tracking-wider">
                      ISSUED TOOLS
                    </p>
                    <p className="text-[12px] font-extrabold text-white uppercase mt-0.5 tracking-wide">
                      {myPendingTools.length} ITEMS HELD
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (currentUser?.permissions?.includes('tasks')) {
                        navigate('/pwa/tasks');
                      } else {
                        toast.warning("You don't have permission to access My Tasks.");
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl text-[11px] font-extrabold tracking-wider uppercase transition-all bg-[#FAF6EE] text-[#ff5216] hover:bg-[#FAF6EE]/95 border-none shadow-md active:scale-95 duration-100"
                  >
                    LEDGER
                  </button>
                </div>
              </div>

              {/* Card 3: Active Project (Purple Card) */}
              <div className="pwa-3d-card-purple text-white p-6 w-[300px] flex-shrink-0 snap-center relative overflow-hidden flex flex-col justify-between h-[180px]">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0,0 L50,0 L30,100 L0,100 Z" fill="currentColor" />
                  </svg>
                </div>

                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.08em] leading-none">OPERATIONAL PROJECT</p>
                    <h3 className="text-[20px] font-black mt-2 tracking-tight leading-tight truncate max-w-[200px]">
                      {myProjects.length > 0 ? myProjects[0].name : 'NO ACTIVE PROJECT'}
                    </h3>
                    {myProjects.length > 0 && (
                      <p className="text-[10px] text-white/60 font-semibold mt-1">
                        Created: {formatDate(myProjects[0].createdAt)}
                      </p>
                    )}
                  </div>
                  <div className="h-8 w-8 rounded-full flex items-center justify-center bg-[#FAF6EE]/15 border border-[#FAF6EE]/20">
                    <Folder className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="relative z-10 flex items-end justify-between mt-4">
                  <div className="text-left">
                    <p className="text-[9px] font-semibold text-white/60 uppercase tracking-wider">
                      PROJECT PROGRESS
                    </p>
                    <p className="text-[12px] font-extrabold text-white uppercase mt-0.5 tracking-wide">
                      {myProjects.length > 0 ? `${myProjects[0].completionPercent || 0}% COMPLETED` : 'INACTIVE'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (currentUser?.permissions?.includes('tasks')) {
                        navigate('/pwa/tasks');
                      } else {
                        toast.warning("You don't have permission to access My Tasks.");
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl text-[11px] font-extrabold tracking-wider uppercase transition-all bg-[#FAF6EE] text-[#6d28d9] hover:bg-[#FAF6EE]/95 border-none shadow-md active:scale-95 duration-100"
                  >
                    TASKS
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Shortcuts Section (Quick Action circles matching Image 2 "Send Money To") */}
        <div className="px-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[13px] font-black tracking-tight text-[var(--color-text-primary)] pwa-headline">Quick Actions</h2>
            <Search 
              size={16} 
              className="text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-primary)] transition-all active:scale-90" 
              onClick={() => { setShowSearch(true); setSearchQuery(''); }}
            />
          </div>
          
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 bg-[#F2ECE1] p-5 rounded-[28px] border border-[#DFD5C6] shadow-sm">
            {/* Quick action 1: Tasks */}
            {hasPermission('tasks') && (
              <div 
                onClick={() => {
                  if (currentUser?.permissions?.includes('tasks')) {
                    navigate('/pwa/tasks');
                  } else {
                    toast.warning("You don't have permission to access My Tasks.");
                  }
                }}
                className="flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="h-14 w-14 bg-[#E8F0FE] text-[#1a73e8] rounded-full flex items-center justify-center mb-2 shadow-sm border border-white/40 group-active:scale-95 transition-all">
                  <ClipboardList size={22} className="stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 tracking-tight leading-none">Tasks</span>
              </div>
            )}

            {/* Quick action 2: Follow-Ups */}
            {hasPermission('followups') && (
              <div 
                onClick={() => {
                  if (currentUser?.permissions?.includes('followups')) {
                    navigate('/pwa/follow-ups');
                  } else {
                    toast.warning("You don't have permission to access Follow-Ups.");
                  }
                }}
                className="flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="h-14 w-14 bg-[#F3E8FF] text-[#9333EA] rounded-full flex items-center justify-center mb-2 shadow-sm border border-white/40 group-active:scale-95 transition-all">
                  <CalendarClock size={22} className="stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 tracking-tight leading-none">Follow-Ups</span>
              </div>
            )}

            {/* Quick action 3: Payments */}
            {hasPermission('payments') && (
              <div 
                onClick={() => {
                  if (currentUser?.permissions?.includes('payments')) {
                    navigate('/pwa/payments');
                  } else {
                    toast.warning("You don't have permission to access Payments.");
                  }
                }}
                className="flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="h-14 w-14 bg-[#D1FAE5] text-[#059669] rounded-full flex items-center justify-center mb-2 shadow-sm border border-white/40 group-active:scale-95 transition-all">
                  <CreditCard size={22} className="stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 tracking-tight leading-none">Payments</span>
              </div>
            )}

            {/* Quick action 4: RGP Challans */}
            {hasPermission('rgp') && (
              <div 
                onClick={() => {
                  if (currentUser?.permissions?.includes('rgp')) {
                    navigate('/pwa/rgp');
                  } else {
                    toast.warning("You don't have permission to access RGP Challans.");
                  }
                }}
                className="flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="h-14 w-14 bg-[#FFEDD5] text-[#EA580C] rounded-full flex items-center justify-center mb-2 shadow-sm border border-white/40 group-active:scale-95 transition-all">
                  <ArrowLeftRight size={22} className="stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 tracking-tight leading-none">RGP</span>
              </div>
            )}

            {/* Quick action 5: New Lead */}
            {hasPermission('enquiry') && (
              <div 
                onClick={() => setShowQuickEnquiry(true)}
                className="flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="h-14 w-14 bg-[#FCE7F3] text-[#DB2777] rounded-full flex items-center justify-center mb-2 shadow-sm border border-white/40 group-active:scale-95 transition-all">
                  <UserPlus size={22} className="stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 tracking-tight leading-none">New Lead</span>
              </div>
            )}

            {/* Quick action 6: Enquiries */}
            {hasPermission('enquiry') && (
              <div 
                onClick={() => {
                  if (currentUser?.permissions?.includes('enquiry')) {
                    navigate('/pwa/enquiries');
                  } else {
                    toast.warning("You don't have permission to access Enquiries.");
                  }
                }}
                className="flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="h-14 w-14 bg-[#ECFEFF] text-[#0891B2] rounded-full flex items-center justify-center mb-2 shadow-sm border border-white/40 group-active:scale-95 transition-all">
                  <Building size={22} className="stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 tracking-tight leading-none">Enquiries</span>
              </div>
            )}

            {/* Quick action 7: Notices */}
            {(hasPermission('tasks') || hasPermission('enquiry')) && (
              <div 
                onClick={() => setShowAnnouncements(true)}
                className="flex flex-col items-center justify-center text-center cursor-pointer group relative"
              >
                {dynamicNotices.length > 0 && (
                  <span className="absolute top-0 right-2 bg-red-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center min-w-[16px] h-[16px] animate-pulse">
                    {dynamicNotices.length}
                  </span>
                )}
                <div className="h-14 w-14 bg-[#FEF3C7] text-[#D97706] rounded-full flex items-center justify-center mb-2 shadow-sm border border-white/40 group-active:scale-95 transition-all">
                  <Bell size={22} className="stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 tracking-tight leading-none">Notices</span>
              </div>
            )}

            {/* Quick action 8: Support */}
            <div 
              onClick={() => navigate('/pwa/support')}
              className="flex flex-col items-center justify-center text-center cursor-pointer group"
            >
              <div className="h-14 w-14 bg-[#E0E7FF] text-[#4F46E5] rounded-full flex items-center justify-center mb-2 shadow-sm border border-white/40 group-active:scale-95 transition-all">
                <HelpCircle size={22} className="stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold text-slate-600 tracking-tight leading-none">Support</span>
            </div>
          </div>
        </div>

        {/* Overview Statistics (Console Statistics Section) */}
        <div className="px-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Console Statistics</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3.5">
            {/* Box 1: Total Tasks Card */}
            {hasPermission('tasks') && (
              <div 
                onClick={() => {
                  if (currentUser?.permissions?.includes('tasks')) {
                    navigate('/pwa/tasks');
                  } else {
                    toast.warning("You don't have permission to access My Tasks.");
                  }
                }}
                className="bg-[#F2ECE1] border border-[#DFD5C6] p-4 rounded-xl shadow-sm hover:border-[#DFD5C6]/80 transition-all cursor-pointer flex flex-col justify-between h-[105px]"
              >
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</p>
                  <h3 className="text-3xl font-extrabold text-[var(--color-text-primary)] mt-1.5 tracking-tight">{myTasks.length}</h3>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                  <span className={`h-1.5 w-1.5 rounded-full ${overdueTasks.length > 0 ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <span>{overdueTasks.length > 0 ? `${overdueTasks.length} Late` : 'All tasks on track'}</span>
                </div>
              </div>
            )}

            {/* Box 2: Follow-Ups Card */}
            {hasPermission('followups') && (
              <div 
                onClick={() => {
                  if (currentUser?.permissions?.includes('followups')) {
                    navigate('/pwa/follow-ups');
                  } else {
                    toast.warning("You don't have permission to access Follow-Ups.");
                  }
                }}
                className="bg-[#F2ECE1] border border-[#DFD5C6] p-4 rounded-xl shadow-sm hover:border-[#DFD5C6]/80 transition-all cursor-pointer flex flex-col justify-between h-[105px]"
              >
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Follow-Ups</p>
                  <h3 className="text-3xl font-extrabold text-[var(--color-text-primary)] mt-1.5 tracking-tight">{activeFollowUps.length}</h3>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                  <span className={`h-1.5 w-1.5 rounded-full ${overdueFollowUps.length > 0 ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <span>{overdueFollowUps.length > 0 ? `${overdueFollowUps.length} Overdue` : 'All on track'}</span>
                </div>
              </div>
            )}

            {/* Box 3: Pending Payments Card */}
            {hasPermission('payments') && (
              <div 
                onClick={() => {
                  if (currentUser?.permissions?.includes('payments')) {
                    navigate('/pwa/payments');
                  } else {
                    toast.warning("You don't have permission to access Payments.");
                  }
                }}
                className="bg-[#F2ECE1] border border-[#DFD5C6] p-4 rounded-xl shadow-sm hover:border-[#DFD5C6]/80 transition-all cursor-pointer flex flex-col justify-between h-[105px]"
              >
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payments</p>
                  <h3 className="text-3xl font-extrabold text-[var(--color-text-primary)] mt-1.5 tracking-tight">{pendingPaymentsList.length}</h3>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-medium truncate">
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${totalPendingAmount > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <span className="truncate">₹{totalPendingAmount.toLocaleString('en-IN')} pending</span>
                </div>
              </div>
            )}

            {/* Box 4: RGP Challans Card */}
            {hasPermission('rgp') && (
              <div 
                onClick={() => {
                  if (currentUser?.permissions?.includes('rgp')) {
                    navigate('/pwa/rgp');
                  } else {
                    toast.warning("You don't have permission to access RGP Challans.");
                  }
                }}
                className="bg-[#F2ECE1] border border-[#DFD5C6] p-4 rounded-xl shadow-sm hover:border-[#DFD5C6]/80 transition-all cursor-pointer flex flex-col justify-between h-[105px]"
              >
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RGP Challans</p>
                  <h3 className="text-3xl font-extrabold text-[var(--color-text-primary)] mt-1.5 tracking-tight">{activeRgpList.length}</h3>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                  <span className={`h-1.5 w-1.5 rounded-full ${(rgpList || []).length > 0 ? 'bg-amber-400' : 'bg-slate-300'}`} />
                  <span>{(rgpList || []).length} Total Challans</span>
                </div>
              </div>
            )}

            {/* Box 5: Locker Tools Card */}
            {hasPermission('tasks') && (
              <div 
                onClick={() => {
                  if (currentUser?.permissions?.includes('tasks')) {
                    navigate('/pwa/tasks');
                  } else {
                    toast.warning("You don't have permission to access My Tasks.");
                  }
                }}
                className="bg-[#F2ECE1] border border-[#DFD5C6] p-4 rounded-xl shadow-sm hover:border-[#DFD5C6]/80 transition-all cursor-pointer flex flex-col justify-between h-[105px]"
              >
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Locker Tools</p>
                  <h3 className="text-3xl font-extrabold text-[var(--color-text-primary)] mt-1.5 tracking-tight">{myAllTools.length}</h3>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                  <span className={`h-1.5 w-1.5 rounded-full ${myPendingTools.length > 0 ? 'bg-amber-400' : 'bg-slate-300'}`} />
                  <span>{myPendingTools.length > 0 ? `${myPendingTools.length} Items Held` : 'Locker empty'}</span>
                </div>
              </div>
            )}

            {/* Box 6: Notifications Card */}
            <div 
              onClick={() => {
                navigate('/pwa/notifications');
              }}
              className="bg-[#F2ECE1] border border-[#DFD5C6] p-4 rounded-xl shadow-sm hover:border-[#DFD5C6]/80 transition-all cursor-pointer flex flex-col justify-between h-[105px]"
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notifications</p>
                <h3 className="text-3xl font-extrabold text-[var(--color-text-primary)] mt-1.5 tracking-tight">{unreadCount}</h3>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                <span className={`h-1.5 w-1.5 rounded-full ${unreadCount > 0 ? 'bg-amber-400' : 'bg-slate-300'}`} />
                <span>{unreadCount > 0 ? 'Unread Messages' : 'All caught up'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Efficiency Section */}
        {hasPermission('tasks') && (
          <div className="px-4">
            <div 
              onClick={() => {
                if (currentUser?.permissions?.includes('tasks')) {
                  navigate('/pwa/tasks');
                } else {
                  toast.warning("You don't have permission to access My Tasks.");
                }
              }}
              className="bg-[#F2ECE1] border border-[#DFD5C6] p-4 rounded-lg shadow-sm hover:border-[#DFD5C6]/80 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-center mb-2.5">
                <div>
                  <h4 className="text-[12px] font-bold text-[var(--color-text-primary)]">System Efficiency</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tasks completion rate efficiency</p>
                </div>
                <span className="text-sm font-bold text-[var(--color-primary)]">{taskCompletionPercent}%</span>
              </div>
              
              <div className="w-full bg-slate-50 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-500"
                  style={{ width: `${taskCompletionPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Announcements Sheet */}
      <Sheet open={showAnnouncements} onOpenChange={setShowAnnouncements}>
        <SheetContent className="bg-[#F2ECE1] border-t border-[#DFD5C6] rounded-t-[28px]">
          <SheetHeader className="text-center pb-2">
            <SheetTitle className="text-base font-bold text-[var(--color-text-primary)]">Workspace Notices</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center py-4 text-center border-b border-[#DFD5C6] mb-2">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-2">
              <Megaphone size={24} className="stroke-[1.5]" />
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium">Keep updated with company alerts</p>
          </div>
          <div className="space-y-3 mt-4 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
            {dynamicNotices.length === 0 ? (
              <div className="bg-[#FAF6EE] border border-dashed border-[#DFD5C6] p-8 text-center rounded-xl shadow-sm">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2 opacity-75" />
                <p className="text-xs text-[var(--color-text-secondary)] font-bold italic">No Pending Notices</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                  All site tasks and client enquiries are currently on track!
                </p>
              </div>
            ) : (
              dynamicNotices.map(item => {
                const isOverdue = item.status === 'overdue';
                return (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      setShowAnnouncements(false);
                      navigate(item.targetPath);
                    }}
                    className={`bg-[#FAF6EE] border border-[#DFD5C6] rounded-xl p-4 shadow-sm text-[var(--color-text-primary)] cursor-pointer transition-all active:scale-[0.98] hover:border-[#DFD5C6]/80 relative overflow-hidden flex items-center justify-between gap-3 ${
                      isOverdue 
                        ? 'border-l-4 border-l-red-500' 
                        : 'border-l-4 border-l-amber-500'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1.5 gap-2">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          isOverdue 
                            ? 'bg-red-50 text-red-600' 
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {item.type === 'task' ? 'Task ' : 'Enquiry '}{isOverdue ? 'Overdue' : 'Due Soon'}
                        </span>
                        <span className="text-[9px] font-bold text-[var(--color-text-muted)]">{item.dateStr}</span>
                      </div>
                      <h4 className="text-xs font-black text-[var(--color-text-primary)] truncate">{item.title}</h4>
                      <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed font-medium mt-1">{item.content}</p>
                    </div>
                    
                    <ChevronRight size={14} className="text-slate-400 flex-shrink-0 self-center" />
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>


      {/* Quick Enquiry Creator Sheet Form */}
      <Sheet open={showQuickEnquiry} onOpenChange={setShowQuickEnquiry}>
        <SheetContent className="bg-[#F2ECE1] border-t border-[#DFD5C6] rounded-t-[28px] p-6 pb-8">
          <SheetHeader className="text-center pb-2">
            <SheetTitle className="text-base font-bold text-[var(--color-text-primary)]">Record New Enquiry</SheetTitle>
          </SheetHeader>
          
          <form onSubmit={handleEnquirySubmit} className="space-y-4 mt-4 text-[var(--color-text-primary)]">
            <div>
              <label className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Customer Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={custName}
                onChange={e => setCustName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFD5C6] focus:outline-none focus:ring-1 focus:ring-[#A68F6D] bg-[#FAF6EE] text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Saya Industries"
                value={compName}
                onChange={e => setCompName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFD5C6] focus:outline-none focus:ring-1 focus:ring-[#A68F6D] bg-[#FAF6EE] text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Contact Phone *</label>
              <input
                type="tel"
                required
                placeholder="e.g. +91 99999 99999"
                value={custPhone}
                onChange={e => setCustPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFD5C6] focus:outline-none focus:ring-1 focus:ring-[#A68F6D] bg-[#FAF6EE] text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Requirements / Notes</label>
              <textarea
                rows="3"
                placeholder="e.g. Enquiry about standard parts inventory"
                value={custNotes}
                onChange={e => setCustNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFD5C6] focus:outline-none focus:ring-1 focus:ring-[#A68F6D] bg-[#FAF6EE] text-xs text-slate-800 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submittingEnquiry}
              className="w-full h-11 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-sm font-semibold mt-4 disabled:opacity-50"
            >
              {submittingEnquiry ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Saving Enquiry...</span>
                </>
              ) : (
                <span>Register Enquiry</span>
              )}
            </button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Spotlight Search Overlay */}
      {showSearch && (
        <div 
          className="fixed inset-y-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-[430px] w-full z-[100] flex flex-col bg-[#FAF6EE] pwa-theme animate-fade-in text-slate-800"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif'
          }}
        >
          {/* Light Theme Pill Search Header */}
          <div className="pt-6 px-4 pb-4 bg-transparent flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex-1 flex items-center bg-[#F2ECE1] pl-4 pr-1.5 py-1.5 rounded-full border border-[#DFD5C6] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all">
              <input
                type="search"
                autoFocus
                placeholder="Search tasks, enquiries, RGP..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="ios-search-input flex-1 bg-transparent border-none outline-none text-[16px] text-black placeholder-slate-400 font-medium py-1.5 pr-2"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="text-slate-400 hover:text-black mr-2 bg-transparent border-none cursor-pointer flex items-center justify-center p-0.5"
                >
                  <X size={16} />
                </button>
              )}
              <div className="w-9 h-9 rounded-full bg-[#3E362E] text-white flex items-center justify-center shadow-md cursor-pointer hover:opacity-90 active:scale-95 transition-all flex-shrink-0">
                <Search size={16} />
              </div>
            </div>
            
            <button 
              onClick={() => { setShowSearch(false); setSearchQuery(''); }}
              className="text-[17px] font-semibold text-[#3E362E] bg-transparent hover:opacity-70 active:opacity-40 transition-opacity cursor-pointer border-none p-1"
            >
              Cancel
            </button>
          </div>

           {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-area">
            {!searchQuery.trim() ? (
              <div className="bg-[#F2ECE1] rounded-lg p-8 border border-[#DFD5C6] shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center max-w-[340px] mx-auto mt-12 animate-slide-up">
                <div className="w-16 h-16 rounded-full bg-[#3E362E]/10 text-[#3E362E] flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Search size={28} className="stroke-[1.5] animate-pulse" />
                </div>
                <p className="text-[20px] font-black text-slate-800 tracking-tight">Spotlight Search</p>
                <p className="text-[13px] text-slate-500 leading-relaxed mt-2 max-w-[255px] mx-auto font-normal">
                  Type keywords to search real-time tasks, enquiries, and challans on-site.
                </p>
              </div>
            ) : ((!hasPermission('tasks') || (matchingTasks.length === 0 && matchingProjects.length === 0)) &&
                 (!hasPermission('enquiry') || matchingEnquiries.length === 0) &&
                 (!hasPermission('rgp') || matchingRgp.length === 0)) ? (
              <div className="bg-[#F2ECE1] rounded-lg p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#DFD5C6] text-center max-w-[340px] mx-auto mt-12">
                <div className="w-16 h-16 rounded-full bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={28} className="stroke-[1.5]" />
                </div>
                <p className="text-[20px] font-bold text-black tracking-tight">No Results Found</p>
                <p className="text-[13px] text-[#8E8E93] leading-relaxed mt-2 max-w-[240px] mx-auto font-normal">We couldn't find matches for "{searchQuery}". Check spelling or try other keywords.</p>
              </div>
            ) : (
              <div className="space-y-5">
                
                {/* Matching Projects */}
                {matchingProjects.length > 0 && hasPermission('tasks') && (
                  <div className="space-y-2.5 animate-slide-up">
                    <h4 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider px-1">Projects ({matchingProjects.length})</h4>
                    
                    <div className="bg-[#F2ECE1] rounded-lg border border-[#DFD5C6] divide-y divide-[#DFD5C6] overflow-hidden shadow-sm">
                      {matchingProjects.map(proj => (
                        <div
                           key={proj.id}
                           onClick={() => { setShowSearch(false); navigate('/pwa/tasks'); }}
                           className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#EAE4D9]/85 transition-all group"
                        >
                           <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#34C759]/10 text-[#34C759]">
                            <Folder size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-semibold text-black truncate group-hover:text-[#7B00FF] transition-colors">{proj.name}</p>
                            <p className="text-[12px] text-[#8E8E93] mt-0.5 truncate">{proj.description || 'Active industrial project block.'}</p>
                          </div>
                          <ChevronRight size={16} className="text-[#C7C7CC] flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching Tasks */}
                {matchingTasks.length > 0 && hasPermission('tasks') && (
                  <div className="space-y-2.5 animate-slide-up">
                    <h4 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider px-1">My Tasks ({matchingTasks.length})</h4>
                    
                    <div className="bg-[#F2ECE1] rounded-lg border border-[#DFD5C6] divide-y divide-[#DFD5C6] overflow-hidden shadow-sm">
                      {matchingTasks.map(task => (
                        <div
                           key={task.id}
                           onClick={() => { setShowSearch(false); navigate('/pwa/tasks'); }}
                           className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#EAE4D9]/85 transition-all group"
                        >
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#007AFF]/10 text-[#007AFF]">
                            <CheckSquare size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-semibold text-black truncate group-hover:text-[#7B00FF] transition-colors">{task.title}</p>
                            <p className="text-[12px] text-[#8E8E93] mt-0.5 truncate">{task.description || 'Assigned site tasks operations.'}</p>
                          </div>
                          <ChevronRight size={16} className="text-[#C7C7CC] flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                 {/* Matching Enquiries */}
                {matchingEnquiries.length > 0 && hasPermission('enquiry') && (
                  <div className="space-y-2.5 animate-slide-up">
                    <h4 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider px-1">Enquiries ({matchingEnquiries.length})</h4>
                    
                    <div className="bg-[#F2ECE1] rounded-lg border border-[#DFD5C6] divide-y divide-[#DFD5C6] overflow-hidden shadow-sm">
                      {matchingEnquiries.map(enq => (
                        <div
                           key={enq.id}
                           onClick={() => { setShowSearch(false); navigate('/pwa/enquiries'); }}
                           className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#EAE4D9]/85 transition-all group"
                        >
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#FF9500]/10 text-[#FF9500]">
                            <Search size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-semibold text-black truncate group-hover:text-[#7B00FF] transition-colors">{enq.customerName}</p>
                            <p className="text-[12px] text-[#8E8E93] mt-0.5 truncate">
                              <span className="font-semibold text-gray-700">{enq.companyName || 'Private Customer'}</span>
                              {enq.phone && ` · ${enq.phone}`}
                              {enq.notes && ` · ${enq.notes}`}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-[#C7C7CC] flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching RGP */}
                {matchingRgp.length > 0 && hasPermission('rgp') && (
                  <div className="space-y-2.5 animate-slide-up">
                    <h4 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider px-1">RGP Challans ({matchingRgp.length})</h4>
                    
                    <div className="bg-[#F2ECE1] rounded-lg border border-[#DFD5C6] divide-y divide-[#DFD5C6] overflow-hidden shadow-sm">
                      {matchingRgp.map(rgp => (
                        <div
                           key={rgp.id}
                           onClick={() => { setShowSearch(false); navigate('/pwa/rgp'); }}
                           className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#EAE4D9]/85 transition-all group"
                        >
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#AF52DE]/10 text-[#AF52DE]">
                            <ArrowLeftRight size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-semibold text-black truncate group-hover:text-[#7B00FF] transition-colors">{rgp.itemName}</p>
                            <p className="text-[12px] text-[#8E8E93] mt-0.5 truncate">
                              <span className="font-semibold text-gray-700">REF: {rgp.referenceNumber}</span>
                              {rgp.receiverName && ` · Recipient: ${rgp.receiverName}`}
                              {rgp.status && ` · Status: ${rgp.status}`}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-[#C7C7CC] flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
