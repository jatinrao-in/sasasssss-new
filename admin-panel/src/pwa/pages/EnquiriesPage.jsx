import React, { useEffect, useMemo, useState } from 'react';
import { Search, Save, MessageSquarePlus, Plus, Phone, User, Calendar, Clock, ClipboardList, AlertTriangle, Building, CheckCircle, Loader2, Check, TrendingUp, Briefcase, MoreHorizontal } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Label } from '../components/ui/label';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import { useEnquiries } from '../hooks/useEnquiries';
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

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
  { key: 'overdue', label: 'Overdue' },
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
    return <Badge className="border-[var(--color-info)] bg-[var(--color-info-bg)] text-[var(--color-info)]">Quoted</Badge>;
  }

  if (normalizedStatus === 'in_progress') {
    return <Badge variant="warning">In Progress</Badge>;
  }

  if (normalizedStatus === 'on_hold') {
    return <Badge className="border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">On Hold</Badge>;
  }

  return <Badge variant="default">{humanizeStatus(normalizedStatus)}</Badge>;
}

function EnquiryCardSkeleton() {
  return (
    <div 
      className="rounded-2xl animate-pulse p-[18px] space-y-4"
      style={{
        background: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="w-10 h-10 rounded-[12px] bg-black/5 flex-shrink-0" />
        <div className="h-6 bg-black/5 rounded-lg w-1/2 animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-black/5" />
      </div>
      <div className="flex gap-2">
        <div className="h-7 w-20 rounded-full bg-black/5" />
        <div className="h-7 w-24 rounded-full bg-black/5" />
      </div>
      <hr className="border-t border-black/5 my-2" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-black/5" />
          <div className="space-y-1">
            <div className="h-3 w-10 bg-black/5 rounded" />
            <div className="h-4 w-16 bg-black/5 rounded" />
          </div>
        </div>
        <div className="w-[38px] h-[38px] rounded-full bg-black/5" />
      </div>
    </div>
  );
}

export default function EnquiriesPage() {
  const { userData } = useAuth();
  const toast = useToast();
  const {
    enquiries,
    loading,
    error,
    addEnquiry,
    updateEnquiry,
  } = useEnquiries();

  const [activeTab, setActiveTab] = useState('all');
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('open');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, onConfirm: null });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Add Enquiry form states
  const [newCustName, setNewCustName] = useState('');
  const [newCompName, setNewCompName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');

  const summary = useMemo(() => ({
    total: enquiries.length,
    open: enquiries.filter((item) => !item.isClosed).length,
    closed: enquiries.filter((item) => item.isClosed).length,
    overdue: enquiries.filter((item) => !item.isClosed && item.overdueDays > 0).length,
  }), [enquiries]);

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((item) => {
      // 1. Tab filter
      if (activeTab === 'open') {
        if (item.isClosed) return false;
      } else if (activeTab === 'closed') {
        if (!item.isClosed) return false;
      } else if (activeTab === 'overdue') {
        if (item.isClosed || !(item.overdueDays > 0)) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const company = (item.companyName || '').toLowerCase();
        const customer = (item.customerName || '').toLowerCase();
        const contact = (item.contactPerson || '').toLowerCase();
        const phone = (item.contactPhone || item.phone || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const remarks = (item.remarks || '').toLowerCase();

        return (
          company.includes(q) ||
          customer.includes(q) ||
          contact.includes(q) ||
          phone.includes(q) ||
          desc.includes(q) ||
          remarks.includes(q)
        );
      }

      return true;
    });
  }, [activeTab, enquiries, searchQuery]);
  const cardPress = (el, pressed) => {
    if (pressed) {
      el.style.transform = 'scale(0.975)';
      el.style.opacity = '0.9';
    } else {
      el.style.transform = '';
      el.style.opacity = '';
    }
  };

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
    setAddSheetOpen(false);
    setSelectedEnquiry(null);
    setSelectedStatus('open');
    setStatusRemarks('');
    setNoteText('');
    setNewCustName('');
    setNewCompName('');
    setNewCustPhone('');
    setNewCustNotes('');
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

  const handleAddEnquirySubmit = async (e) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      toast.error('Customer Name and Phone are required.');
      return;
    }

    setSaving(true);
    try {
      await addEnquiry({
        customerName: newCustName.trim(),
        companyName: newCompName.trim(),
        phone: newCustPhone.trim(),
        notes: newCustNotes.trim(),
        assignedTo: userData?.uid || '',
      });
      toast.success('Enquiry created successfully');
      closeSheets();
    } catch (firestoreError) {
      handleFirestoreError(firestoreError, 'Failed to create enquiry');
    } finally {
      setSaving(false);
    }
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
    <div 
      className="pb-8 font-sans min-h-screen text-slate-800 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #F4F6F9 0%, #E2E8F0 100%)',
      }}
    >
      <ActionLoader visible={saving} message="Saving…" />
      {/* Background Gradient Mesh with iOS Blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-300/30 blur-[100px]" />
        <div className="absolute top-[20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-purple-300/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[10%] w-[60%] h-[60%] rounded-full bg-pink-300/30 blur-[110px]" />
      </div>

      <div className="relative z-10">
        {/* Header Redesign */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/40 border border-white/50 rounded-xl flex items-center justify-center text-blue-500 shadow-sm backdrop-blur-md">
              <ClipboardList className="h-5 w-5" />
            </div>
            <h1 className="text-[20px] font-black text-slate-800 tracking-tight">Enquiries</h1>
          </div>
          <button
            onClick={() => setAddSheetOpen(true)}
            className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all border-none cursor-pointer"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="px-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search company, contact, details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-8 rounded-xl border border-white/50 bg-white/45 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 shadow-sm transition-all backdrop-blur-md"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-700 font-black p-1 text-[11px]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── TAB BAR ─────────────────────────────────────────────── */}
        <div className="px-4 mb-4">
          <div className="flex p-1 rounded-xl bg-black/5">
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const counts = {
                all: summary.total,
                open: summary.open,
                closed: summary.closed,
                overdue: summary.overdue,
              };
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold transition-all duration-200 active:scale-[0.97] rounded-lg"
                  style={{
                    background: isActive ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
                    color: isActive ? '#1F2937' : '#6B7280',
                    boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    backdropFilter: isActive ? 'blur(4px)' : 'none',
                  }}
                >
                  {tab.label}
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-black"
                    style={{
                      background: isActive ? '#1F2937' : 'rgba(0,0,0,0.06)',
                      color: isActive ? '#FFFFFF' : '#6B7280',
                    }}
                  >
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Flat Card List */}
        <div className="px-4 space-y-3.5 pb-24">
          {loading && Array.from({ length: 3 }).map((_, index) => <EnquiryCardSkeleton key={index} />)}

          {!loading && error && (
            <Card className="border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-semibold">Could not load enquiries</p>
                <p className="mt-1 text-xs opacity-90">
                  {error.message || 'Please check your internet connection and try again.'}
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && filteredEnquiries.length === 0 && (
            <div className="text-center py-16 bg-[#F2ECE1] backdrop-blur-sm border border-[#DFD5C6] rounded-lg p-6 shadow-sm flex flex-col items-center animate-fade-in">
              <div className="h-16 w-16 bg-[#E5DFD3] text-slate-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <Search className="h-8 w-8 text-slate-600" />
              </div>
              <p className="text-slate-800 font-extrabold text-sm">No enquiries in this category</p>
              <p className="text-slate-500 text-[11px] mt-1.5">You have no enquiries marked as "{activeTab === 'closed' ? 'Closed' : activeTab === 'open' ? 'Open' : activeTab === 'overdue' ? 'Overdue' : 'All'}".</p>
            </div>
          )}

          {!loading && !error && filteredEnquiries.map((enquiry) => {
            const isClosed = enquiry.isClosed;
            const isOverdue = enquiry.overdueDays > 0 && !isClosed;

            return (
              <div
                key={enquiry.id}
                className="rounded-2xl overflow-hidden cursor-pointer"
                style={{
                  background: 'rgba(255, 255, 255, 0.65)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.03)',
                  transition: 'transform 120ms, opacity 120ms',
                }}
                onMouseDown={e => cardPress(e.currentTarget, true)}
                onMouseUp={e => cardPress(e.currentTarget, false)}
                onMouseLeave={e => cardPress(e.currentTarget, false)}
                onTouchStart={e => cardPress(e.currentTarget, true)}
                onTouchEnd={e => cardPress(e.currentTarget, false)}
                onClick={() => {
                  setSelectedEnquiry(enquiry);
                  setActionSheetOpen(true);
                }}
              >
                <div className="p-[18px] flex flex-col justify-between h-full">
                  {/* Top Section */}
                  <div className="space-y-2">
                    {/* Top Row: Icon, Title, Action Menu */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-white/50 text-slate-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Building className="h-5 w-5" />
                      </div>
                      <h3 className="text-slate-800 text-[18px] md:text-[20px] font-bold tracking-tight flex-1 ml-1 leading-snug truncate">
                        {enquiry.companyName || enquiry.customerName || 'N/A'}
                      </h3>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEnquiry(enquiry);
                          setActionSheetOpen(true);
                        }}
                        className="w-[36px] h-[36px] rounded-full flex items-center justify-center active:scale-90 bg-black/5 hover:bg-black/10 transition-all cursor-pointer flex-shrink-0"
                      >
                        <MoreHorizontal className="h-5 w-5 text-slate-600" />
                      </button>
                    </div>

                    {/* Tags / Badges */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pl-0.5 py-1.5 w-full">
                      {/* Status Badge */}
                      {isClosed ? (
                        <span className="h-7 px-2.5 rounded-full inline-flex items-center text-[9px] font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase flex-shrink-0">
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center mr-1 flex-shrink-0">
                            <Check className="h-2 w-2 stroke-[4px]" />
                          </span>
                          {enquiry.status || 'CLOSED'}
                        </span>
                      ) : isOverdue ? (
                        <span className="h-7 px-2.5 rounded-full inline-flex items-center text-[9px] font-bold tracking-wider bg-rose-50 text-rose-700 border border-rose-100 uppercase flex-shrink-0">
                          <AlertTriangle className="h-3 w-3 mr-1 text-rose-500 flex-shrink-0" />
                          OVERDUE
                        </span>
                      ) : (
                        <span className="h-7 px-2.5 rounded-full inline-flex items-center text-[9px] font-bold tracking-wider bg-blue-50 text-blue-700 border border-blue-100 uppercase flex-shrink-0">
                          <Clock className="h-3 w-3 mr-1 text-blue-500 flex-shrink-0" />
                          {enquiry.status || 'OPEN'}
                        </span>
                      )}

                      {/* On Track Badge */}
                      {!isClosed && (
                        <span className="h-7 px-2.5 rounded-full inline-flex items-center text-[9px] font-bold tracking-wider bg-sky-50 text-sky-700 border border-sky-100 uppercase flex-shrink-0">
                          <TrendingUp className="h-3 w-3 mr-1 text-sky-600 flex-shrink-0" />
                          ON TRACK
                        </span>
                      )}

                      {/* Contact Phone Badge */}
                      {(enquiry.contactPhone || enquiry.phone) ? (
                        <a 
                          href={`tel:${enquiry.contactPhone || enquiry.phone}`} 
                          onClick={(e) => e.stopPropagation()}
                          className="h-7 px-2.5 rounded-full inline-flex items-center text-[9px] font-bold tracking-wider bg-black/5 text-slate-700 border border-transparent uppercase max-w-[180px] active:scale-95 transition-all hover:bg-black/10 flex-shrink-0"
                        >
                          <Phone className="h-3 w-3 mr-1 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{enquiry.contactPhone || enquiry.phone}</span>
                        </a>
                      ) : (
                        <span className="h-7 px-2.5 rounded-full inline-flex items-center text-[9px] font-bold tracking-wider bg-black/5 text-slate-700 border border-transparent uppercase max-w-[180px] flex-shrink-0">
                          <Briefcase className="h-3 w-3 mr-1 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{enquiry.taskType || 'ENQUIRY'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Section */}
                  <div className="space-y-2">
                    {/* Divider Line */}
                    <hr className="border-t border-black/5 my-0" />

                    {/* Footer Row */}
                    <div className="flex items-center justify-between pl-0.5">
                      {/* Target Date block */}
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-[10px] bg-black/5 text-slate-500 flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex flex-col justify-center">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">
                            Target / Assigned Date
                          </span>
                          <span className="text-xs font-bold text-slate-700 leading-none">
                            {formatDate(enquiry.targetDate)} <span className="text-slate-300 font-normal">|</span> <span className="text-[10px] text-slate-550 font-normal">{formatDate(enquiry.assignedDate || enquiry.createdAt)}</span>
                          </span>
                        </div>
                      </div>

                      {/* User Avatar */}
                      <div className="w-[38px] h-[38px] rounded-full bg-slate-800 text-white border border-white/50 flex items-center justify-center text-[10px] font-bold shadow-sm flex-shrink-0" title={enquiry.assignedToName || userData?.name || 'Assigned User'}>
                        {getInitials(enquiry.assignedToName || userData?.name)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>      <Sheet open={actionSheetOpen} onOpenChange={setActionSheetOpen}>
        <SheetContent className="bg-[#F2ECE1] border-t border-[#DFD5C6] text-slate-800 rounded-t-[28px] p-6 pb-8">
          <SheetHeader className="pb-4 border-b border-[#DFD5C6]">
            <SheetTitle className="text-slate-850 font-black text-left flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Enquiry Details</span>
              <span className="text-base font-bold text-slate-800 truncate mt-1">
                {selectedEnquiry?.companyName || selectedEnquiry?.customerName || 'N/A'}
              </span>
            </SheetTitle>
          </SheetHeader>
          
          {selectedEnquiry && (
            <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar text-left">
              {/* Contact Person */}
              {selectedEnquiry.contactPerson && (
                <div>
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Contact Person</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedEnquiry.contactPerson}</p>
                </div>
              )}

              {/* Contact Phone */}
              {(selectedEnquiry.contactPhone || selectedEnquiry.phone) && (
                <div>
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Phone</p>
                  <a 
                    href={`tel:${selectedEnquiry.contactPhone || selectedEnquiry.phone}`} 
                    className="text-sm font-black text-[var(--color-primary)] hover:underline inline-flex items-center gap-1.5 mt-0.5 active:scale-95 transition-all"
                  >
                    <Phone className="h-4 w-4 text-[#A68F6D]" />
                    {selectedEnquiry.contactPhone || selectedEnquiry.phone}
                  </a>
                </div>
              )}

              {/* Dates Grid */}
              <div className="grid grid-cols-2 gap-3.5 bg-[#FAF6EE] border border-[#DFD5C6]/40 p-3 rounded-xl">
                <div>
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Target Date</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{formatDate(selectedEnquiry.targetDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Assigned Date</p>
                  <p className="text-xs font-bold text-slate-850 mt-0.5">{formatDate(selectedEnquiry.assignedDate || selectedEnquiry.createdAt)}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Activity Description</p>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed mt-1 whitespace-pre-wrap bg-[#FAF6EE] border border-[#DFD5C6]/40 p-3 rounded-xl">
                  {selectedEnquiry.description || 'No description provided'}
                </p>
              </div>

              {/* Latest Remarks */}
              <div>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Latest Remarks</p>
                <p className="text-xs text-slate-700 font-medium leading-relaxed mt-1 whitespace-pre-wrap bg-[#FAF6EE] border border-[#DFD5C6]/40 p-3 rounded-xl">
                  {selectedEnquiry.remarks || 'No remarks added yet.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 border-[#DFD5C6] bg-transparent text-slate-755 hover:bg-[#FAF6EE] text-xs font-bold rounded-xl active:scale-[0.98] transition-all cursor-pointer"
                  onClick={() => {
                    setActionSheetOpen(false);
                    // Open status sheet with small delay to avoid focus clash
                    setTimeout(() => {
                      setSelectedStatus(selectedEnquiry.status || 'open');
                      setStatusRemarks('');
                      setStatusSheetOpen(true);
                    }, 150);
                  }}
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  Update Status
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 border-[#DFD5C6] bg-transparent text-slate-755 hover:bg-[#FAF6EE] text-xs font-bold rounded-xl active:scale-[0.98] transition-all cursor-pointer"
                  onClick={() => {
                    setActionSheetOpen(false);
                    setTimeout(() => {
                      setNoteText('');
                      setNoteSheetOpen(true);
                    }, 150);
                  }}
                >
                  <MessageSquarePlus className="mr-1.5 h-4 w-4" />
                  Add Note
                </Button>
              </div>

              {/* Close Button */}
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

      <Sheet open={statusSheetOpen} onOpenChange={setStatusSheetOpen}>
        <SheetContent className="bg-[#F2ECE1] border-t border-[#DFD5C6] text-slate-800 rounded-t-[28px] p-6 pb-8">
          <SheetHeader>
            <SheetTitle className="text-slate-800 font-bold">Update Enquiry Status</SheetTitle>
          </SheetHeader>

          {selectedEnquiry && (
            <div className="space-y-4.5 mt-4 text-slate-600">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Enquiry</p>
                <p className="text-sm font-semibold text-slate-800">
                  {selectedEnquiry.companyName || selectedEnquiry.customerName || selectedEnquiry.taskType || 'Assigned enquiry'}
                </p>
              </div>

              <div className="space-y-2.5">
                <Label className="text-slate-650 font-semibold text-xs">Status</Label>
                <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                  {ENQUIRY_STATUSES.map((statusOption) => (
                    <button
                      key={statusOption.value}
                      type="button"
                      onClick={() => setSelectedStatus(statusOption.value)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98] cursor-pointer ${
                        selectedStatus === statusOption.value
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold'
                          : 'border-[#DFD5C6] bg-transparent text-slate-755'
                      }`}
                    >
                      <span
                        className={`h-3 w-3 rounded-full border flex-shrink-0 ${
                          selectedStatus === statusOption.value
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                            : 'border-slate-350 bg-transparent'
                        }`}
                      />
                      <span className="text-[11px] leading-none">{statusOption.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enquiry-status-remarks" className="text-slate-650 font-semibold text-xs">Remarks</Label>
                <textarea
                  id="enquiry-status-remarks"
                  rows={3}
                  value={statusRemarks}
                  onChange={(event) => setStatusRemarks(event.target.value)}
                  placeholder="Add a note about this update..."
                  className="w-full min-h-[90px] p-3 text-sm border border-[#DFD5C6] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[#FAF6EE] text-slate-800 placeholder-slate-400"
                />
              </div>

              <Button className="w-full min-h-[44px] bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white border-none rounded-xl font-bold shadow-md mt-2" onClick={handleStatusSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Status'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={noteSheetOpen} onOpenChange={setNoteSheetOpen}>
        <SheetContent className="bg-[#F2ECE1] border-t border-[#DFD5C6] text-slate-800 rounded-t-[28px] p-6 pb-8">
          <SheetHeader>
            <SheetTitle className="text-slate-800 font-bold">Add Note</SheetTitle>
          </SheetHeader>

          {selectedEnquiry && (
            <div className="space-y-4.5 mt-4 text-slate-600">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Date</p>
                <p className="text-sm font-semibold text-slate-800">
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enquiry-note" className="text-slate-650 font-semibold text-xs">Note</Label>
                <textarea
                  id="enquiry-note"
                  rows={3}
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Write your note here..."
                  className="w-full min-h-[90px] p-3 text-sm border border-[#DFD5C6] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[#FAF6EE] text-slate-800 placeholder-slate-400"
                />
              </div>

              <Button className="w-full min-h-[44px] bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white border-none rounded-xl font-bold shadow-md mt-2" onClick={handleAddNote} disabled={saving}>
                {saving ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent className="bg-[#F2ECE1] border-t border-[#DFD5C6] text-slate-800 rounded-t-[28px] p-6 pb-8">
          <SheetHeader>
            <SheetTitle className="text-slate-800 font-bold">Add New Enquiry</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleAddEnquirySubmit} className="space-y-4 mt-4 text-slate-600">
            <div>
              <Label htmlFor="new-cust-name" className="text-slate-650 font-semibold text-xs block mb-1">Customer Name *</Label>
              <input
                id="new-cust-name"
                type="text"
                required
                placeholder="e.g. John Doe"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFD5C6] focus:outline-none focus:ring-1 focus:ring-[#A68F6D] bg-[#FAF6EE] text-xs text-slate-800 shadow-sm"
              />
            </div>

            <div>
              <Label htmlFor="new-comp-name" className="text-slate-650 font-semibold text-xs block mb-1">Company Name</Label>
              <input
                id="new-comp-name"
                type="text"
                placeholder="e.g. Saya Industries"
                value={newCompName}
                onChange={(e) => setNewCompName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFD5C6] focus:outline-none focus:ring-1 focus:ring-[#A68F6D] bg-[#FAF6EE] text-xs text-slate-800 shadow-sm"
              />
            </div>

            <div>
              <Label htmlFor="new-cust-phone" className="text-slate-650 font-semibold text-xs block mb-1">Contact Phone *</Label>
              <input
                id="new-cust-phone"
                type="tel"
                required
                placeholder="e.g. +91 99999 99999"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFD5C6] focus:outline-none focus:ring-1 focus:ring-[#A68F6D] bg-[#FAF6EE] text-xs text-slate-800 shadow-sm"
              />
            </div>

            <div>
              <Label htmlFor="new-cust-notes" className="text-slate-650 font-semibold text-xs block mb-1">Requirements / Notes</Label>
              <textarea
                id="new-cust-notes"
                rows={3}
                placeholder="e.g. Enquiry about standard parts inventory..."
                value={newCustNotes}
                onChange={(e) => setNewCustNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFD5C6] focus:outline-none focus:ring-1 focus:ring-[#A68F6D] bg-[#FAF6EE] text-xs text-slate-800 resize-none shadow-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full min-h-[44px] bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white border-none rounded-xl font-bold shadow-md mt-2 flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Creating Enquiry...</span>
                </>
              ) : (
                'Create Enquiry'
              )}
            </Button>
          </form>
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
