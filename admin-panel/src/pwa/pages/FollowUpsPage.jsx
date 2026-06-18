import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, MessageSquarePlus, RefreshCw, CheckSquare, Building, User, Phone, Calendar, Clock, ClipboardList, AlertTriangle, Check, TrendingUp, Briefcase, MoreHorizontal } from 'lucide-react';
import { Timestamp, increment, serverTimestamp } from 'firebase/firestore';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../hooks/useAuth';
import { useFollowUps } from '../hooks/useFollowUps';
import { useToast } from '../hooks/useToast';
import { logInfo } from '../lib/firestoreDebug';
import ActionLoader from '../components/ActionLoader';

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp?.toDate?.()
    ? timestamp.toDate()
    : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getInitials = (name) => {
  if (!name) return 'RJ';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const cardPress = (el, pressed) => {
  if (pressed) {
    el.style.boxShadow = 'none';
    el.style.transform = 'translate(4px,4px)';
  } else {
    el.style.boxShadow = '4px 4px 0px #3E362E';
    el.style.transform = '';
  }
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'due_today', label: 'Due Today' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
  { key: 'overdue', label: 'Overdue' },
];

const OUTCOMES = [
  { value: 'positive', label: 'Positive', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'neutral', label: 'Neutral', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'negative', label: 'Negative', tone: 'border-red-200 bg-red-50 text-red-700' },
];

function SummaryCard({ label, value, styleClass }) {
  const isYellow = styleClass.includes('bg-[#FFC700]');
  const isDark = styleClass.includes('bg-[#111827]');

  return (
    <Card className={`min-w-[130px] ${styleClass} shadow-md rounded-2xl`}>
      <CardContent className="p-4">
        <p className={`text-[10px] font-extrabold uppercase tracking-wider ${isYellow ? 'text-[#111827]/65' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
        <p className="mt-1 text-2xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}

function FollowUpCardSkeleton() {
  return (
    <Card className="bg-[#F2ECE1] border border-[#DFD5C6] rounded-[28px] animate-pulse h-auto min-h-[190px] md:h-[210px] w-full">
      <CardContent className="p-[18px] flex flex-col justify-between h-full">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#E5DFD3] animate-pulse flex-shrink-0" />
            <div className="h-6 bg-[#E5DFD3] rounded-lg w-1/2 animate-pulse" />
            <div className="w-10 h-10 rounded-full bg-[#E5DFD3] animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded-full bg-[#E5DFD3] animate-pulse" />
            <div className="h-8 w-24 rounded-full bg-[#E5DFD3] animate-pulse" />
          </div>
        </div>
        <div className="space-y-2.5">
          <hr className="border-t border-[#DFD5C6]/40 my-0" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-[#E5DFD3]" />
              <div className="space-y-1">
                <div className="h-3 w-10 bg-[#E5DFD3] rounded" />
                <div className="h-4 w-16 bg-[#E5DFD3] rounded" />
              </div>
            </div>
            <div className="w-[38px] h-[38px] rounded-full bg-[#E5DFD3]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusBadge(item) {
  if (item.isClosed) {
    return <Badge variant="secondary">Closed</Badge>;
  }

  return <Badge variant="default">Open</Badge>;
}

function FollowUpCard({
  item,
  onOpenActions,
}) {
  const { userData } = useAuth();
  const isClosed = item.isClosed;
  const isOverdue = item.overdueDays > 0 && !isClosed;

  return (
    <Card 
      className="bg-[#F2ECE1] rounded-lg overflow-hidden cursor-pointer"
      style={{
        border: '2px solid #3E362E',
        boxShadow: '4px 4px 0px #3E362E',
        transition: 'box-shadow 80ms, transform 80ms',
      }}
      onMouseDown={e => cardPress(e.currentTarget, true)}
      onMouseUp={e => cardPress(e.currentTarget, false)}
      onMouseLeave={e => cardPress(e.currentTarget, false)}
      onTouchStart={e => cardPress(e.currentTarget, true)}
      onTouchEnd={e => cardPress(e.currentTarget, false)}
      onClick={() => onOpenActions(item)}
    >
      <CardContent className="p-[18px] flex flex-col justify-between h-full">
        {/* Top Section */}
        <div className="space-y-2">
          {/* Top Row: Icon, Title, Action Menu */}
          <div className="flex items-center justify-between gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#FAF6EE] border border-[#DFD5C6] text-[#A68F6D] flex items-center justify-center flex-shrink-0">
              <CalendarClock className="h-5 w-5" />
            </div>
            <h3 className="text-slate-800 text-[18px] md:text-[20px] font-black tracking-tight flex-1 ml-1 leading-snug truncate">
              {item.companyName || 'N/A'}
            </h3>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onOpenActions(item);
              }}
              className="w-[36px] h-[36px] rounded-full flex items-center justify-center active:scale-90 hover:bg-[#FAF6EE] transition-all cursor-pointer flex-shrink-0"
            >
              <MoreHorizontal className="h-5 w-5 text-slate-600" />
            </button>
          </div>

          {/* Tags / Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pl-0.5 py-1.5 w-full">
            {/* Status Badge */}
            {isClosed ? (
              <span className="h-7 px-2.5 rounded-full inline-flex items-center text-[9px] font-black tracking-wider bg-[#EEF1E9] text-[#3B4731] border border-[#C5D5B8] uppercase flex-shrink-0">
                <span className="w-3.5 h-3.5 rounded-full bg-[#3B4731] text-white flex items-center justify-center mr-1 flex-shrink-0">
                  <Check className="h-2 w-2 stroke-[4px]" />
                </span>
                CLOSED
              </span>
            ) : isOverdue ? (
              <span className="h-7 px-2.5 rounded-full inline-flex items-center text-[9px] font-black tracking-wider bg-[#FBEAE9] text-[#7A3634] border border-[#E9C3C1] uppercase flex-shrink-0">
                <AlertTriangle className="h-3 w-3 mr-1 text-[#E11D48] flex-shrink-0" />
                OVERDUE
              </span>
            ) : (
              <span className="h-7 px-2.5 rounded-full inline-flex items-center text-[9px] font-black tracking-wider bg-[#FAF6EE] text-[#3E362E] border border-[#DFD5C6] uppercase flex-shrink-0">
                <Clock className="h-3 w-3 mr-1 text-[#A68F6D] flex-shrink-0" />
                OPEN
              </span>
            )}

            {/* On Track Badge */}
            {!isClosed && (
              <span className="h-7 px-2.5 rounded-full inline-flex items-center text-[9px] font-black tracking-wider bg-[#E8F0FE] text-[#1a73e8] border border-[#B3D1FD] uppercase flex-shrink-0">
                <TrendingUp className="h-3 w-3 mr-1 text-[#1a73e8] flex-shrink-0" />
                ON TRACK
              </span>
            )}

            {/* Contact Phone Badge */}
            {item.contactPhone ? (
              <a 
                href={`tel:${item.contactPhone}`} 
                onClick={(e) => e.stopPropagation()}
                className="h-7 px-2.5 rounded-full inline-flex items-center text-[9px] font-black tracking-wider bg-[#FAF6EE] text-[#3E362E] border border-[#DFD5C6] uppercase max-w-[180px] active:scale-95 transition-all hover:bg-[#E2E8D8] flex-shrink-0"
              >
                <Phone className="h-3 w-3 mr-1 text-[#3E362E] flex-shrink-0" />
                <span className="truncate">{item.contactPhone}</span>
              </a>
            ) : (
              <span className="h-7 px-2.5 rounded-full inline-flex items-center text-[9px] font-black tracking-wider bg-[#FAF6EE] text-[#3E362E] border border-[#DFD5C6] uppercase max-w-[180px] flex-shrink-0">
                <Briefcase className="h-3 w-3 mr-1 text-[#A68F6D] flex-shrink-0" />
                <span className="truncate">{item.taskType || 'FOLLOW-UP'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="space-y-2">
          {/* Divider Line */}
          <hr className="border-t border-[#DFD5C6]/40 my-0" />

          {/* Footer Row */}
          <div className="flex items-center justify-between pl-0.5">
            {/* Target Date block */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-[10px] bg-[#FAF6EE] border border-[#DFD5C6] text-[#A68F6D] flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">
                  Next Followup
                </span>
                <span className="text-xs font-black text-slate-800 leading-none">
                  {formatDate(item.nextFollowupDate || item.targetDate)}
                </span>
              </div>
            </div>

            {/* User Avatar */}
            <div className="w-[38px] h-[38px] rounded-full bg-[#3E362E] text-white border-2 border-[#F2ECE1] flex items-center justify-center text-[10px] font-black shadow-sm flex-shrink-0" title={item.assignedToName || userData?.name || 'Assigned User'}>
              {getInitials(item.assignedToName || userData?.name)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FollowUpsPage() {
  const { userData } = useAuth();
  const toast = useToast();
  const {
    followUps,
    loading,
    error,
    updateFollowUp,
  } = useFollowUps(userData?.uid);

  const [activeTab, setActiveTab] = useState('all');
  const [completeSheetOpen, setCompleteSheetOpen] = useState(false);
  const [rescheduleSheetOpen, setRescheduleSheetOpen] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState('positive');
  const [completionNote, setCompletionNote] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const dueTodayItems = useMemo(
    () => followUps.filter((item) => item.isDueToday && !item.isClosed),
    [followUps],
  );

  const summary = useMemo(() => ({
    total: followUps.length,
    dueToday: dueTodayItems.length,
    overdue: followUps.filter((item) => item.overdueDays > 0 && !item.isClosed).length,
    closed: followUps.filter((item) => item.isClosed).length,
  }), [dueTodayItems.length, followUps]);

  const filteredFollowUps = useMemo(() => followUps.filter((item) => {
    if (activeTab === 'due_today') {
      return item.isDueToday && !item.isClosed;
    }

    if (activeTab === 'open') {
      return !item.isClosed;
    }

    if (activeTab === 'closed') {
      return item.isClosed;
    }

    if (activeTab === 'overdue') {
      return item.overdueDays > 0 && !item.isClosed;
    }

    return true;
  }), [activeTab, followUps]);

  useEffect(() => {
    logInfo('FollowUpsPage', 'Render state:', {
      uid: userData?.uid || null,
      followUps: followUps.length,
      filtered: filteredFollowUps.length,
      dueToday: dueTodayItems.length,
      activeTab,
      loading,
      error: error?.code || null,
    });
  }, [activeTab, dueTodayItems.length, error?.code, filteredFollowUps.length, followUps.length, loading, userData?.uid]);

  const resetSheets = () => {
    setCompleteSheetOpen(false);
    setRescheduleSheetOpen(false);
    setNoteSheetOpen(false);
    setActionSheetOpen(false);
    setSelectedFollowUp(null);
    setSelectedOutcome('positive');
    setCompletionNote('');
    setRescheduleDate('');
    setRescheduleReason('');
    setNoteText('');
  };

  const handleFirestoreError = (firestoreError, fallbackMessage) => {
    if (firestoreError?.code === 'permission-denied') {
      toast.error('Permission denied. Contact admin.');
      return;
    }

    toast.error(fallbackMessage || firestoreError?.message || 'Update failed');
  };

  const openCompleteSheet = (item) => {
    setSelectedFollowUp(item);
    setSelectedOutcome(item.outcome || 'positive');
    setCompletionNote(item.closingNote || '');
    setCompleteSheetOpen(true);
  };

  const openRescheduleSheet = (item) => {
    const currentDate = item.nextFollowupDate?.toDate?.()
      || item.targetDate?.toDate?.()
      || item.nextFollowupDate
      || item.targetDate;
    const parsedDate = currentDate ? new Date(currentDate) : new Date();
    setSelectedFollowUp(item);
    setRescheduleDate(parsedDate.toISOString().slice(0, 10));
    setRescheduleReason(item.rescheduleReason || '');
    setRescheduleSheetOpen(true);
  };

  const openNoteSheet = (item) => {
    setSelectedFollowUp(item);
    setNoteText(item.remarks || '');
    setNoteSheetOpen(true);
  };

  const saveCompletedFollowUp = async () => {
    if (!selectedFollowUp) {
      return;
    }

    setSaving(true);
    try {
      await updateFollowUp(selectedFollowUp.id, {
        status: 'closed',
        outcome: selectedOutcome,
        closingNote: completionNote.trim(),
        closedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Follow-up marked as completed');
      resetSheets();
    } catch (firestoreError) {
      handleFirestoreError(firestoreError, 'Failed to complete follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedFollowUp) {
      return;
    }

    if (!rescheduleDate) {
      toast.error('Please choose a new follow-up date');
      return;
    }

    setSaving(true);
    try {
      await updateFollowUp(selectedFollowUp.id, {
        nextFollowupDate: Timestamp.fromDate(new Date(`${rescheduleDate}T00:00:00`)),
        rescheduleCount: increment(1),
        rescheduleReason: rescheduleReason.trim(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Follow-up rescheduled');
      resetSheets();
    } catch (firestoreError) {
      handleFirestoreError(firestoreError, 'Failed to reschedule follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedFollowUp) {
      return;
    }

    if (!noteText.trim()) {
      toast.error('Please write a note first');
      return;
    }

    setSaving(true);
    try {
      await updateFollowUp(selectedFollowUp.id, {
        remarks: noteText.trim(),
        lastNoteDate: serverTimestamp(),
        lastNoteBy: userData?.name || 'Unknown',
        updatedAt: serverTimestamp(),
      });
      toast.success('Note added successfully');
      resetSheets();
    } catch (firestoreError) {
      handleFirestoreError(firestoreError, 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  return (

    <div 
      className="pb-8 font-sans min-h-screen text-slate-800 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #FAF6EE 0%, #EAE4D9 100%)',
      }}
    >
      <ActionLoader visible={saving} message="Saving…" />
      {/* Background Waves SVG */}
      <svg className="absolute bottom-0 left-0 right-0 w-full h-[240px] pointer-events-none z-0 overflow-hidden opacity-40" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="fuWaveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DFD8CC" />
            <stop offset="100%" stopColor="#D5CDBE" />
          </linearGradient>
          <linearGradient id="fuWaveGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EFECE4" />
            <stop offset="100%" stopColor="#E4DEC3" />
          </linearGradient>
        </defs>
        <path d="M0,280 C150,280 200,200 420,200 C640,200 700,320 1020,320 C1220,320 1350,220 1440,200 L1440,320 L0,320 Z" fill="url(#fuWaveGrad1)" />
        <path d="M0,120 C100,120 100,260 320,260 C520,260 720,220 920,220 C1120,220 1220,320 1440,320 L1440,320 L0,320 Z" fill="url(#fuWaveGrad2)" />
      </svg>

      <div className="relative z-10">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FAF6EE] border border-[#DFD5C6] rounded-xl flex items-center justify-center text-[#A68F6D] shadow-sm">
              <CalendarClock className="h-5 w-5" />
            </div>
            <h1 className="text-[20px] font-black text-slate-800 tracking-tight">Follow-Ups</h1>
          </div>
        </div>

        {/* Stats Row */}
        <div className="px-4 mb-4 grid grid-cols-4 gap-2">
          <div className="bg-[#F2ECE1] border border-[#DFD5C6] rounded-2xl p-3 flex flex-col items-center shadow-sm">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Total</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{summary.total}</p>
          </div>
          <div className="bg-[#3E362E] rounded-2xl p-3 flex flex-col items-center shadow-sm">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-white/60">Today</p>
            <p className="text-xl font-black text-white mt-0.5">{summary.dueToday}</p>
          </div>
          <div className="bg-[#FBEAE9] border border-red-100 rounded-2xl p-3 flex flex-col items-center shadow-sm">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-red-400">Late</p>
            <p className="text-xl font-black text-red-700 mt-0.5">{summary.overdue}</p>
          </div>
          <div className="bg-[#EEF1E9] border border-[#DFD5C6] rounded-2xl p-3 flex flex-col items-center shadow-sm">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Done</p>
            <p className="text-xl font-black text-[#3B4731] mt-0.5">{summary.closed}</p>
          </div>
        </div>

        {/* ── TAB BAR ─────────────────────────────────────────────── */}
        <div className="px-4 mb-4">
          <div className="flex p-1 rounded-xl" style={{ background: '#E8E1D5' }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const counts = {
                all: summary.total,
                due_today: summary.dueToday,
                open: summary.total - summary.closed,
                closed: summary.closed,
                overdue: summary.overdue,
              };
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold transition-all duration-200 active:scale-[0.97] rounded-lg"
                  style={{
                    background: isActive ? '#FAF6EE' : 'transparent',
                    color: isActive ? '#3E362E' : '#A8998A',
                    boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {tab.label}
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-black"
                    style={{
                      background: isActive ? '#3E362E' : 'rgba(62,54,46,0.1)',
                      color: isActive ? '#FAF6EE' : '#A8998A',
                    }}
                  >
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card List */}
        <div className="space-y-3.5 px-4 pb-24">
          {loading && Array.from({ length: 3 }).map((_, index) => (
            <FollowUpCardSkeleton key={index} />
          ))}

          {!loading && error && (
            <div className="bg-[#FBEAE9] border border-red-100 rounded-xl p-4 text-center">
              <p className="text-sm font-bold text-red-700">Could not load follow-ups</p>
              <p className="mt-1 text-xs text-red-600">{error.message || 'Please check your connection.'}</p>
            </div>
          )}

          {!loading && !error && filteredFollowUps.length === 0 && (
            <div className="text-center py-16 bg-[#F2ECE1] border border-[#DFD5C6] rounded-xl p-6 shadow-sm flex flex-col items-center">
              <div className="h-16 w-16 bg-[#E5DFD3] text-slate-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <CalendarClock className="h-8 w-8 text-slate-600" />
              </div>
              <p className="text-slate-800 font-extrabold text-sm">No follow-ups found</p>
              <p className="text-slate-500 text-[11px] mt-1.5">Follow-ups assigned by admin will appear here.</p>
            </div>
          )}

          {!loading && !error && filteredFollowUps.map((item) => (
            <FollowUpCard
              key={item.id}
              item={item}
              onOpenActions={(selected) => {
                setSelectedFollowUp(selected);
                setActionSheetOpen(true);
              }}
            />
          ))}
        </div>
      </div>

      <Sheet open={actionSheetOpen} onOpenChange={setActionSheetOpen}>
        <SheetContent className="bg-[#F2ECE1] border-t border-[#DFD5C6] text-slate-800 rounded-t-[28px] p-6 pb-8">
          <SheetHeader className="pb-4 border-b border-[#DFD5C6]">
            <SheetTitle className="text-slate-855 font-black text-left flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Follow-up Details</span>
              <span className="text-base font-bold text-slate-800 truncate mt-1">
                {selectedFollowUp?.companyName || 'N/A'}
              </span>
            </SheetTitle>
          </SheetHeader>
          
          {selectedFollowUp && (
            <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar text-left">
              {selectedFollowUp.contactPerson && (
                <div>
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Contact Person</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedFollowUp.contactPerson}</p>
                </div>
              )}

              {selectedFollowUp.contactPhone && (
                <div>
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Phone</p>
                  <a 
                    href={`tel:${selectedFollowUp.contactPhone}`} 
                    className="text-sm font-black text-[var(--color-primary)] hover:underline inline-flex items-center gap-1.5 mt-0.5 active:scale-95 transition-all"
                  >
                    <Phone className="h-4 w-4 text-[#A68F6D]" />
                    {selectedFollowUp.contactPhone}
                  </a>
                </div>
              )}

              <div>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Activity Description</p>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed mt-1 whitespace-pre-wrap bg-[#FAF6EE] border border-[#DFD5C6]/40 p-3 rounded-xl">
                  {selectedFollowUp.description || 'No description provided'}
                </p>
              </div>

              {selectedFollowUp.isClosed && selectedFollowUp.outcome && (
                <div>
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Outcome</p>
                  <p className="text-xs font-bold text-emerald-700 mt-1 whitespace-pre-wrap bg-[#FAF6EE] border border-emerald-200/50 p-3 rounded-xl">
                    {selectedFollowUp.outcome}
                  </p>
                </div>
              )}

              <div>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Latest Remarks</p>
                <p className="text-xs text-slate-700 font-medium leading-relaxed mt-1 whitespace-pre-wrap bg-[#FAF6EE] border border-[#DFD5C6]/40 p-3 rounded-xl">
                  {selectedFollowUp.remarks || 'No remarks added yet.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                {!selectedFollowUp.isClosed && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 flex-1 border border-transparent bg-[#EEF1E9] text-[#3B4731] hover:bg-[#E2E8D8] text-xs font-bold rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
                    onClick={() => {
                      setActionSheetOpen(false);
                      setTimeout(() => {
                        setSelectedOutcome(selectedFollowUp.outcome || 'positive');
                        setCompletionNote(selectedFollowUp.closingNote || '');
                        setCompleteSheetOpen(true);
                      }, 150);
                    }}
                  >
                    <CheckSquare className="mr-1.5 h-4 w-4 text-[#3B4731]" />
                    Mark Done
                  </Button>
                )}
                {!selectedFollowUp.isClosed && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 border-[#DFD5C6] bg-transparent text-slate-755 hover:bg-[#FAF6EE] text-xs font-bold rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
                    onClick={() => {
                      setActionSheetOpen(false);
                      setTimeout(() => {
                        const currentDate = selectedFollowUp.nextFollowupDate?.toDate?.()
                          || selectedFollowUp.targetDate?.toDate?.()
                          || selectedFollowUp.nextFollowupDate
                          || selectedFollowUp.targetDate;
                        const parsedDate = currentDate ? new Date(currentDate) : new Date();
                        setRescheduleDate(parsedDate.toISOString().slice(0, 10));
                        setRescheduleReason(selectedFollowUp.rescheduleReason || '');
                        setRescheduleSheetOpen(true);
                      }, 150);
                    }}
                  >
                    <CalendarClock className="mr-1.5 h-4 w-4 text-slate-500" />
                    Reschedule
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 border-[#DFD5C6] bg-transparent text-slate-755 hover:bg-[#FAF6EE] text-xs font-bold rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
                  onClick={() => {
                    setActionSheetOpen(false);
                    setTimeout(() => {
                      setNoteText(selectedFollowUp.remarks || '');
                      setNoteSheetOpen(true);
                    }, 150);
                  }}
                >
                  <MessageSquarePlus className="mr-1.5 h-4 w-4 text-slate-500" />
                  Add Note
                </Button>
              </div>

              <button
                type="button"
                onClick={() => setActionSheetOpen(false)}
                className="w-full py-3 bg-[#FAF6EE] hover:bg-[#EAE4D9] text-slate-750 font-bold rounded-xl text-xs active:scale-[0.99] transition-all text-center mt-2 border border-[#DFD5C6] cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={completeSheetOpen} onOpenChange={setCompleteSheetOpen}>
        <SheetContent className="bg-[#F2ECE1] border-t border-[#DFD5C6] text-slate-800 rounded-t-[28px] p-6 pb-8">
          <SheetHeader className="pb-4 border-b border-[#DFD5C6]">
            <SheetTitle className="text-base font-black text-slate-800 text-left">Mark as completed?</SheetTitle>
          </SheetHeader>

          {selectedFollowUp && (
            <div className="space-y-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Follow-up</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedFollowUp.companyName || selectedFollowUp.taskType || 'Assigned follow-up'}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Outcome</p>
                <div className="space-y-2">
                  {OUTCOMES.map((outcome) => (
                    <button
                      key={outcome.value}
                      type="button"
                      onClick={() => setSelectedOutcome(outcome.value)}
                      className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                        selectedOutcome === outcome.value
                          ? outcome.tone
                          : 'border-[#DFD5C6] bg-[#FAF6EE] text-slate-700'
                      }`}
                    >
                      {outcome.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Note</p>
                <textarea
                  id="followup-completion-note"
                  rows={4}
                  value={completionNote}
                  onChange={(event) => setCompletionNote(event.target.value)}
                  placeholder="Optional closing note..."
                  className="flex min-h-[120px] w-full rounded-xl border border-[#DFD5C6] bg-[#FAF6EE] px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A68F6D] resize-none"
                />
              </div>

              <button 
                className="h-11 w-full bg-[#3E362E] text-white font-bold rounded-xl text-sm active:scale-[0.98] transition-all cursor-pointer border-none disabled:opacity-50"
                onClick={saveCompletedFollowUp} 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={rescheduleSheetOpen} onOpenChange={setRescheduleSheetOpen}>
        <SheetContent className="bg-[#F2ECE1] border-t border-[#DFD5C6] text-slate-800 rounded-t-[28px] p-6 pb-8">
          <SheetHeader className="pb-4 border-b border-[#DFD5C6]">
            <SheetTitle className="text-base font-black text-slate-800 text-left">Reschedule Follow-up</SheetTitle>
          </SheetHeader>

          {selectedFollowUp && (
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">New date</p>
                <input
                  id="followup-reschedule-date"
                  type="date"
                  value={rescheduleDate}
                  onChange={(event) => setRescheduleDate(event.target.value)}
                  className="flex h-12 w-full rounded-xl border border-[#DFD5C6] bg-[#FAF6EE] px-4 py-3 text-base text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A68F6D]"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Reason</p>
                <textarea
                  id="followup-reschedule-reason"
                  rows={4}
                  value={rescheduleReason}
                  onChange={(event) => setRescheduleReason(event.target.value)}
                  placeholder="Reason for rescheduling..."
                  className="flex min-h-[120px] w-full rounded-xl border border-[#DFD5C6] bg-[#FAF6EE] px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A68F6D] resize-none"
                />
              </div>

              <button 
                className="h-11 w-full bg-[#3E362E] text-white font-bold rounded-xl text-sm active:scale-[0.98] transition-all cursor-pointer border-none disabled:opacity-50"
                onClick={handleReschedule} 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={noteSheetOpen} onOpenChange={setNoteSheetOpen}>
        <SheetContent className="bg-[#F2ECE1] border-t border-[#DFD5C6] text-slate-800 rounded-t-[28px] p-6 pb-8">
          <SheetHeader className="pb-4 border-b border-[#DFD5C6]">
            <SheetTitle className="text-base font-black text-slate-800 text-left">Add Note</SheetTitle>
          </SheetHeader>

          {selectedFollowUp && (
            <div className="space-y-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Note</p>
                <textarea
                  id="followup-note"
                  rows={4}
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Write your note here..."
                  className="flex min-h-[120px] w-full rounded-xl border border-[#DFD5C6] bg-[#FAF6EE] px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A68F6D] resize-none"
                />
              </div>

              <button 
                className="h-11 w-full bg-[#3E362E] text-white font-bold rounded-xl text-sm active:scale-[0.98] transition-all cursor-pointer border-none disabled:opacity-50"
                onClick={handleAddNote} 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

