import React, { useEffect, useMemo, useState } from 'react';
import { Search, Save, MessageSquarePlus } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Label } from '../components/ui/label';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import { useEnquiries } from '../hooks/useEnquiries';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/formatters';
import { logInfo } from '../lib/firestoreDebug';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'overdue', label: 'Overdue' },
];

const ENQUIRY_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'closed', label: 'Closed' },
];

const CLOSED_STATUSES = new Set(['closed', 'won', 'lost']);

const SUMMARY_CARD_STYLES = [
  'from-teal-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-green-600',
];

function humanizeStatus(status) {
  return String(status || 'open')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function isClosedStatus(status) {
  return CLOSED_STATUSES.has(String(status || '').toLowerCase());
}

function getStatusBadge(status) {
  const normalizedStatus = String(status || 'open').toLowerCase();

  if (normalizedStatus === 'won') {
    return <Badge variant="success">Won</Badge>;
  }

  if (normalizedStatus === 'lost') {
    return <Badge variant="destructive">Lost</Badge>;
  }

  if (normalizedStatus === 'closed') {
    return <Badge variant="secondary">Closed</Badge>;
  }

  if (normalizedStatus === 'quoted') {
    return <Badge className="border-purple-200 bg-purple-100 text-purple-700">Quoted</Badge>;
  }

  if (normalizedStatus === 'in_progress') {
    return <Badge variant="warning">In Progress</Badge>;
  }

  if (normalizedStatus === 'on_hold') {
    return <Badge className="border-slate-200 bg-slate-100 text-slate-700">On Hold</Badge>;
  }

  return <Badge variant="default">{humanizeStatus(normalizedStatus)}</Badge>;
}

function SummaryCard({ label, value, toneClass }) {
  return (
    <Card className={`min-w-[140px] border-none bg-gradient-to-br ${toneClass} shadow-lg`}>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">{label}</p>
        <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

function EnquiryCardSkeleton() {
  return (
    <Card className="border-gray-100">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-28 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="mt-4 h-16 animate-pulse rounded-xl bg-gray-50" />
        <div className="mt-4 flex gap-2">
          <div className="h-11 flex-1 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-11 flex-1 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function EnquiriesPage() {
  const { userData } = useAuth();
  const toast = useToast();
  const {
    enquiries,
    loading,
    error,
    updateEnquiry,
  } = useEnquiries(userData?.uid);

  const [activeTab, setActiveTab] = useState('all');
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('open');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, onConfirm: null });

  const summary = useMemo(() => ({
    total: enquiries.length,
    open: enquiries.filter((item) => !item.isClosed).length,
    closed: enquiries.filter((item) => item.isClosed).length,
  }), [enquiries]);

  const filteredEnquiries = useMemo(() => enquiries.filter((item) => {
    if (activeTab === 'open') {
      return !item.isClosed;
    }

    if (activeTab === 'closed') {
      return item.isClosed;
    }

    if (activeTab === 'overdue') {
      return !item.isClosed && item.overdueDays > 0;
    }

    return true;
  }), [activeTab, enquiries]);

  useEffect(() => {
    logInfo('EnquiriesPage', 'Render state:', {
      uid: userData?.uid || null,
      enquiries: enquiries.length,
      filtered: filteredEnquiries.length,
      activeTab,
      loading,
      error: error?.code || null,
    });
  }, [activeTab, enquiries.length, error?.code, filteredEnquiries.length, loading, userData?.uid]);

  const closeSheets = () => {
    setStatusSheetOpen(false);
    setNoteSheetOpen(false);
    setSelectedEnquiry(null);
    setSelectedStatus('open');
    setStatusRemarks('');
    setNoteText('');
  };

  const openStatusSheet = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setSelectedStatus(enquiry.status || 'open');
    setStatusRemarks(enquiry.remarks || '');
    setStatusSheetOpen(true);
  };

  const openNoteSheet = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setNoteText('');
    setNoteSheetOpen(true);
  };

  const handleFirestoreError = (firestoreError, fallbackMessage) => {
    if (firestoreError?.code === 'permission-denied') {
      toast.error('Permission denied. Contact admin.');
      return;
    }

    toast.error(fallbackMessage || firestoreError?.message || 'Update failed');
  };

  const saveStatusUpdate = async () => {
    if (!selectedEnquiry) {
      return;
    }

    setSaving(true);
    try {
      await updateEnquiry(selectedEnquiry.id, {
        status: selectedStatus,
        remarks: statusRemarks.trim(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Enquiry updated successfully');
      closeSheets();
    } catch (firestoreError) {
      handleFirestoreError(firestoreError, 'Failed to update enquiry');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSave = () => {
    if (!selectedEnquiry) {
      return;
    }

    if (isClosedStatus(selectedStatus)) {
      setConfirmState({
        open: true,
        onConfirm: async () => {
          setConfirmState({ open: false, onConfirm: null });
          await saveStatusUpdate();
        },
      });
      return;
    }

    saveStatusUpdate();
  };

  const handleAddNote = async () => {
    if (!selectedEnquiry) {
      return;
    }

    if (!noteText.trim()) {
      toast.error('Please write a note first');
      return;
    }

    setSaving(true);
    try {
      await updateEnquiry(selectedEnquiry.id, {
        remarks: noteText.trim(),
        lastNoteDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Note added successfully');
      closeSheets();
    } catch (firestoreError) {
      handleFirestoreError(firestoreError, 'Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-6">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-gray-900">Enquiries</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">All assigned enquiries with live status updates.</p>
      </div>

      <div className="overflow-x-auto px-4 pb-1">
        <div className="flex gap-3">
          <SummaryCard label="Total" value={summary.total} toneClass={SUMMARY_CARD_STYLES[0]} />
          <SummaryCard label="Open" value={summary.open} toneClass={SUMMARY_CARD_STYLES[1]} />
          <SummaryCard label="Closed" value={summary.closed} toneClass={SUMMARY_CARD_STYLES[2]} />
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
        {loading && Array.from({ length: 3 }).map((_, index) => <EnquiryCardSkeleton key={index} />)}

        {!loading && error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-semibold text-red-700">Could not load enquiries</p>
              <p className="mt-1 text-xs text-red-600">
                {error.message || 'Please check your internet connection and try again.'}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && filteredEnquiries.length === 0 && (
          <Card className="border-dashed border-gray-200 bg-[var(--bg-card)]">
            <CardContent className="flex flex-col items-center px-6 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                <Search className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-[var(--text-primary)]">No enquiries assigned</h2>
              <p className="mt-2 max-w-[260px] text-sm leading-6 text-[var(--text-secondary)]">
                Enquiries assigned by admin will appear here.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && filteredEnquiries.map((enquiry) => (
          <Card
            key={enquiry.id}
            className={enquiry.overdueDays > 0 && !enquiry.isClosed ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <Badge className="capitalize">
                  {enquiry.taskType || 'Enquiry'}
                </Badge>
                {getStatusBadge(enquiry.status)}
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-[var(--text-secondary)]">
                <p><span className="font-medium text-[var(--text-primary)]">Assigned:</span> {formatDate(enquiry.assignedDate || enquiry.createdAt)}</p>
                <p><span className="font-medium text-[var(--text-primary)]">Target:</span> {formatDate(enquiry.targetDate)}</p>
                {enquiry.overdueDays > 0 && !enquiry.isClosed && (
                  <p className="font-semibold text-red-600">
                    Overdue: {enquiry.overdueDays} day{enquiry.overdueDays === 1 ? '' : 's'}
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Remarks</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                  {enquiry.remarks || 'No remarks added yet.'}
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 flex-1"
                  onClick={() => openStatusSheet(enquiry)}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Update Status
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1"
                  onClick={() => openNoteSheet(enquiry)}
                >
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={statusSheetOpen} onOpenChange={setStatusSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Update Enquiry Status</SheetTitle>
          </SheetHeader>

          {selectedEnquiry && (
            <div className="space-y-5 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Enquiry</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {selectedEnquiry.customerName || selectedEnquiry.client || selectedEnquiry.taskType || 'Assigned enquiry'}
                </p>
              </div>

              <div className="space-y-3">
                <Label>Status</Label>
                <div className="space-y-2">
                  {ENQUIRY_STATUSES.map((statusOption) => (
                    <button
                      key={statusOption.value}
                      type="button"
                      onClick={() => setSelectedStatus(statusOption.value)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                        selectedStatus === statusOption.value
                          ? 'border-teal-300 bg-teal-50 text-teal-700'
                          : 'border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)]'
                      }`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full border ${
                          selectedStatus === statusOption.value
                            ? 'border-teal-600 bg-teal-600'
                            : 'border-gray-300'
                        }`}
                      />
                      <span className="text-sm font-medium">{statusOption.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enquiry-status-remarks">Remarks</Label>
                <textarea
                  id="enquiry-status-remarks"
                  rows={4}
                  value={statusRemarks}
                  onChange={(event) => setStatusRemarks(event.target.value)}
                  placeholder="Add a note about this update..."
                  className="flex min-h-[120px] w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <Button className="h-11 w-full" onClick={handleStatusSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Status'}
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

          {selectedEnquiry && (
            <div className="space-y-5 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Date</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enquiry-note">Note</Label>
                <textarea
                  id="enquiry-note"
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
        title="Close enquiry?"
        description="Are you sure? This will close the enquiry."
        confirmLabel="Yes, Close"
        loadingLabel="Closing..."
        isDeleting={saving}
      />
    </div>
  );
}
