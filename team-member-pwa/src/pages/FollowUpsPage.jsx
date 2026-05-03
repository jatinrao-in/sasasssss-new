import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, MessageSquarePlus, RefreshCw } from 'lucide-react';
import { Timestamp, increment, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Label } from '../components/ui/label';
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
          <div className="h-3 w-44 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="mt-4 h-20 animate-pulse rounded-xl bg-gray-50" />
        <div className="mt-4 flex gap-2">
          <div className="h-11 flex-1 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-11 flex-1 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-11 flex-1 animate-pulse rounded-lg bg-gray-100" />
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
  onMarkDone,
  onReschedule,
  onAddNote,
}) {
  return (
    <Card className={item.overdueDays > 0 && !item.isClosed ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <Badge className="capitalize">{item.taskType || 'Follow-up'}</Badge>
          {getStatusBadge(item)}
        </div>

        <div className="mt-4 border-b border-gray-100 pb-4">
          <p className="text-sm font-semibold text-gray-900">
            Company: {item.companyName || 'N/A'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Contact: {item.contactPerson ? `${item.contactPerson} | ` : ''}{item.contactPhone || 'N/A'}
          </p>
          <p className="mt-2 text-sm text-gray-700">
            <span className="font-medium">Activity:</span> {item.description || 'No description provided'}
          </p>
        </div>

        <div className="mt-4 space-y-1.5 text-xs text-[var(--text-secondary)]">
          <p><span className="font-medium text-[var(--text-primary)]">Target:</span> {formatDate(item.targetDate)}</p>
          <p><span className="font-medium text-[var(--text-primary)]">Next Followup:</span> {formatDate(item.nextFollowupDate || item.targetDate)}</p>
          <p><span className="font-medium text-[var(--text-primary)]">Rescheduled:</span> {item.rescheduleCount || 0} time{item.rescheduleCount === 1 ? '' : 's'}</p>
          {item.overdueDays > 0 && !item.isClosed && (
            <p className="font-semibold text-red-600">
              Overdue: {item.overdueDays} day{item.overdueDays === 1 ? '' : 's'}
            </p>
          )}
          {item.isClosed && item.outcome && (
            <p><span className="font-medium text-[var(--text-primary)]">Outcome:</span> {item.outcome}</p>
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
    <div className="pb-6">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-gray-900">Follow-Ups</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Stay on top of every follow-up assigned to you.</p>
      </div>

      <div className="overflow-x-auto px-4 pb-1">
        <div className="flex gap-3">
          <SummaryCard label="Total" value={summary.total} accentClass="from-teal-500 to-teal-600" />
          <SummaryCard label="Due Today" value={summary.dueToday} accentClass="from-orange-400 to-amber-500" />
          <SummaryCard label="Overdue" value={summary.overdue} accentClass="from-rose-500 to-red-600" />
          <SummaryCard label="Closed" value={summary.closed} accentClass="from-emerald-500 to-green-600" />
        </div>
      </div>

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
              <h2 className="mt-4 text-base font-semibold text-[var(--text-primary)]">No followups assigned yet</h2>
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
            <SheetTitle>Mark as completed?</SheetTitle>
          </SheetHeader>

          {selectedFollowUp && (
            <div className="space-y-5 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Follow-up</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {selectedFollowUp.companyName || selectedFollowUp.taskType || 'Assigned follow-up'}
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

              <div className="space-y-2">
                <Label htmlFor="followup-completion-note">Note</Label>
                <textarea
                  id="followup-completion-note"
                  rows={4}
                  value={completionNote}
                  onChange={(event) => setCompletionNote(event.target.value)}
                  placeholder="Optional closing note..."
                  className="flex min-h-[120px] w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <Button className="h-11 w-full" onClick={saveCompletedFollowUp} disabled={saving}>
                {saving ? 'Saving...' : 'Confirm'}
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
                <Label htmlFor="followup-reschedule-date">New date</Label>
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
                {saving ? 'Saving...' : 'Save'}
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
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
