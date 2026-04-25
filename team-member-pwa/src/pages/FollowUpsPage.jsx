import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, MessageSquarePlus, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Timestamp, increment, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Label } from '../components/ui/label';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import { useFollowUps } from '../hooks/useFollowUps';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/formatters';
import { logInfo } from '../lib/firestoreDebug';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'due_today', label: 'Due Today' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'overdue', label: 'Overdue' },
];

const OUTCOMES = [
  { value: 'positive', label: 'Positive', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'neutral', label: 'Neutral', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'negative', label: 'Negative', tone: 'border-red-200 bg-red-50 text-red-700' },
];

function humanizeStatus(status) {
  return String(status || 'open')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getStatusBadge(status) {
  if (status === 'closed') {
    return <Badge variant="secondary">Closed</Badge>;
  }

  return <Badge variant="default">{humanizeStatus(status)}</Badge>;
}

function SummaryCard({ label, value, accentClass }) {
  return (
    <Card className={`min-w-[140px] border-none bg-gradient-to-br ${accentClass} shadow-lg`}>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">{label}</p>
        <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

function FollowUpCardSkeleton() {
  return (
    <Card className="border-gray-100">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100" />
          <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="mt-4 h-16 animate-pulse rounded-xl bg-gray-50" />
        <div className="mt-4 flex gap-2">
          <div className="h-11 flex-1 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-11 flex-1 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-11 flex-1 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </CardContent>
    </Card>
  );
}

function FollowUpCard({
  item,
  highlighted = false,
  onMarkDone,
  onReschedule,
  onAddNote,
}) {
  return (
    <Card
      className={`border-l-4 ${
        item.overdueDays > 0 && !item.isClosed ? 'border-l-red-500' : 'border-l-transparent'
      } ${highlighted ? 'border-teal-200 bg-teal-50/70' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <Badge className="capitalize">{item.taskType || 'Follow-up'}</Badge>
          {getStatusBadge(item.status)}
        </div>

        <div className="mt-4 space-y-1.5 text-xs text-[var(--text-secondary)]">
          <p><span className="font-medium text-[var(--text-primary)]">Assigned:</span> {formatDate(item.assignedDate || item.createdAt)}</p>
          <p><span className="font-medium text-[var(--text-primary)]">Target:</span> {formatDate(item.targetDate)}</p>
          <p><span className="font-medium text-[var(--text-primary)]">Next Follow-up:</span> {formatDate(item.nextFollowupDate || item.targetDate)}</p>
          {item.overdueDays > 0 && !item.isClosed && (
            <p className="font-semibold text-red-600">
              Overdue: {item.overdueDays} day{item.overdueDays === 1 ? '' : 's'} overdue
            </p>
          )}
        </div>

        <div className="mt-4 rounded-xl bg-gray-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Notes</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
            {item.remarks || item.notes || 'No notes added yet.'}
          </p>
          {(item.rescheduleCount || 0) > 0 && (
            <p className="mt-3 text-xs font-semibold text-amber-600">
              Rescheduled {item.rescheduleCount} time{item.rescheduleCount === 1 ? '' : 's'}
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {!item.isClosed && (
            <Button type="button" variant="secondary" className="h-11" onClick={() => onMarkDone(item)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark Done
            </Button>
          )}
          {!item.isClosed && (
            <Button type="button" variant="outline" className="h-11" onClick={() => onReschedule(item)}>
              <CalendarClock className="mr-2 h-4 w-4" />
              Reschedule
            </Button>
          )}
          <Button type="button" variant="outline" className="h-11" onClick={() => onAddNote(item)}>
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Add Note
          </Button>
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
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState('positive');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, onConfirm: null });

  const dueTodayItems = useMemo(
    () => followUps.filter((item) => item.isDueToday && !item.isClosed),
    [followUps],
  );

  const summary = useMemo(() => ({
    total: followUps.length,
    dueToday: dueTodayItems.length,
    overdue: followUps.filter((item) => item.overdueDays > 0 && !item.isClosed).length,
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
    setSelectedFollowUp(null);
    setSelectedOutcome('positive');
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
    setNoteText('');
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

  const handleMarkDone = () => {
    if (!selectedFollowUp) {
      return;
    }

    setConfirmState({
      open: true,
      onConfirm: async () => {
        setConfirmState({ open: false, onConfirm: null });
        await saveCompletedFollowUp();
      },
    });
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
    <div className="pb-6">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-gray-900">Follow-Ups</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Stay on top of every follow-up assigned to you.</p>
      </div>

      <div className="overflow-x-auto px-4 pb-1">
        <div className="flex gap-3">
          <SummaryCard label="Total" value={summary.total} accentClass="from-teal-500 to-teal-600" />
          <SummaryCard label="Due Today" value={summary.dueToday} accentClass="from-sky-500 to-blue-600" />
          <SummaryCard label="Overdue" value={summary.overdue} accentClass="from-rose-500 to-red-600" />
        </div>
      </div>

      {dueTodayItems.length > 0 && !loading && !error && (
        <div className="mx-4 mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-teal-700">
            <RefreshCw className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Due Today ({dueTodayItems.length})</h2>
          </div>
          <div className="space-y-3">
            {dueTodayItems.map((item) => (
              <FollowUpCard
                key={item.id}
                item={item}
                highlighted
                onMarkDone={openCompleteSheet}
                onReschedule={openRescheduleSheet}
                onAddNote={openNoteSheet}
              />
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {FILTERS.map((filter) => (
              <TabsTrigger key={filter.value} value={filter.value}>
                {filter.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-3 px-4 pt-4">
        {loading && Array.from({ length: 3 }).map((_, index) => <FollowUpCardSkeleton key={index} />)}

        {!loading && error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-semibold text-red-700">Could not load follow-ups</p>
              <p className="mt-1 text-xs text-red-600">
                {error.message || 'Please check your internet connection and try again.'}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && filteredFollowUps.length === 0 && (
          <Card className="border-dashed border-gray-200 bg-[var(--bg-card)]">
            <CardContent className="flex flex-col items-center px-6 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                <RefreshCw className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-[var(--text-primary)]">No follow-ups assigned</h2>
              <p className="mt-2 max-w-[260px] text-sm leading-6 text-[var(--text-secondary)]">
                Follow-ups assigned by admin will appear here.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && filteredFollowUps.map((item) => (
          <FollowUpCard
            key={item.id}
            item={item}
            onMarkDone={openCompleteSheet}
            onReschedule={openRescheduleSheet}
            onAddNote={openNoteSheet}
          />
        ))}
      </div>

      <Sheet open={completeSheetOpen} onOpenChange={setCompleteSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Mark Follow-up Done</SheetTitle>
          </SheetHeader>

          {selectedFollowUp && (
            <div className="space-y-5 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Follow-up</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {selectedFollowUp.customerName || selectedFollowUp.taskType || 'Assigned follow-up'}
                </p>
              </div>

              <div className="space-y-3">
                <Label>Outcome</Label>
                <div className="space-y-2">
                  {OUTCOMES.map((outcome) => (
                    <button
                      key={outcome.value}
                      type="button"
                      onClick={() => setSelectedOutcome(outcome.value)}
                      className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                        selectedOutcome === outcome.value
                          ? outcome.tone
                          : 'border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)]'
                      }`}
                    >
                      {outcome.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button className="h-11 w-full" onClick={handleMarkDone} disabled={saving}>
                {saving ? 'Saving...' : 'Mark Done'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={rescheduleSheetOpen} onOpenChange={setRescheduleSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Reschedule Follow-up</SheetTitle>
          </SheetHeader>

          {selectedFollowUp && (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label htmlFor="followup-reschedule-date">New Follow-up Date</Label>
                <input
                  id="followup-reschedule-date"
                  type="date"
                  value={rescheduleDate}
                  onChange={(event) => setRescheduleDate(event.target.value)}
                  className="flex h-12 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-base text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="followup-reschedule-reason">Reason</Label>
                <textarea
                  id="followup-reschedule-reason"
                  rows={4}
                  value={rescheduleReason}
                  onChange={(event) => setRescheduleReason(event.target.value)}
                  placeholder="Reason for rescheduling..."
                  className="flex min-h-[120px] w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <Button className="h-11 w-full" onClick={handleReschedule} disabled={saving}>
                {saving ? 'Saving...' : 'Save Reschedule'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={noteSheetOpen} onOpenChange={setNoteSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Note</SheetTitle>
          </SheetHeader>

          {selectedFollowUp && (
            <div className="space-y-5 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Date</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="followup-note">Note</Label>
                <textarea
                  id="followup-note"
                  rows={4}
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Write your note here..."
                  className="flex min-h-[120px] w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <Button className="h-11 w-full" onClick={handleAddNote} disabled={saving}>
                {saving ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <DeleteConfirmDialog
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, onConfirm: null })}
        onConfirm={() => confirmState.onConfirm?.()}
        title="Complete follow-up?"
        description="Mark this follow-up as completed?"
        confirmLabel="Yes, Complete"
        loadingLabel="Completing..."
        isDeleting={saving}
      />
    </div>
  );
}
