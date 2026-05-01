import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, FileText, MessageSquarePlus, Save } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Label } from '../components/ui/label';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import { useRgp } from '../hooks/useRgp';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/formatters';
import { logInfo } from '../lib/firestoreDebug';
import { compressImage, uploadToImgbb } from '../lib/imageUtils';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'rgp', label: 'RGP' },
  { value: 'challan', label: 'Challan' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'return_initiated', label: 'Return Initiated' },
  { value: 'closed', label: 'Closed' },
];

const DOCUMENT_STEPS = [
  'Document Sent',
  'Acknowledgment Received',
  'Return Initiated',
  'Closed',
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

  if (status === 'return_initiated') {
    return <Badge variant="warning">Return Initiated</Badge>;
  }

  if (status === 'in_progress') {
    return <Badge className="border-sky-200 bg-sky-100 text-sky-700">In Progress</Badge>;
  }

  return <Badge variant="default">{humanizeStatus(status)}</Badge>;
}

function SummaryCard({ label, value, accentClass }) {
  return (
    <Card className={`min-w-[150px] border-none bg-gradient-to-br ${accentClass} shadow-lg`}>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">{label}</p>
        <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

function RgpCardSkeleton() {
  return (
    <Card className="border-gray-100">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
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

function ProgressSteps({ currentStep }) {
  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {DOCUMENT_STEPS.map((step, index) => {
        const isCompleted = currentStep > index;
        const isCurrent = currentStep === index;

        return (
          <div key={step} className="text-center">
            <div
              className={`mx-auto h-2.5 w-full rounded-full ${
                isCompleted || isCurrent ? 'bg-teal-500' : 'bg-gray-200'
              } ${isCurrent ? 'ring-2 ring-teal-100' : ''}`}
            />
            <p className={`mt-2 text-[10px] leading-4 ${
              isCompleted || isCurrent ? 'font-semibold text-teal-700' : 'text-gray-400'
            }`}>
              {step}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function RgpPage() {
  const { userData } = useAuth();
  const toast = useToast();
  const {
    rgp,
    loading,
    error,
    updateRgp,
  } = useRgp(userData?.uid);

  const [activeTab, setActiveTab] = useState('all');
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [remarkSheetOpen, setRemarkSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('open');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [remarkText, setRemarkText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, onConfirm: null });

  const handleImageUpload = async (event, item) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingItemId(item.id);
    try {
      const compressedBlob = await compressImage(file);
      const url = await uploadToImgbb(compressedBlob);
      
      await updateRgp(item.id, { challanImageUrl: url, updatedAt: serverTimestamp() });
      toast.success('Photo uploaded successfully!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploadingItemId(null);
      event.target.value = ''; // reset input
    }
  };

  const summary = useMemo(() => ({
    openRgp: rgp.filter((item) => item.type === 'rgp' && !item.isClosed).length,
    openChallan: rgp.filter((item) => item.type === 'challan' && !item.isClosed).length,
    closed: rgp.filter((item) => item.isClosed).length,
  }), [rgp]);

  const filteredItems = useMemo(() => rgp.filter((item) => {
    if (activeTab === 'rgp') {
      return item.type === 'rgp';
    }

    if (activeTab === 'challan') {
      return item.type === 'challan';
    }

    if (activeTab === 'open') {
      return !item.isClosed;
    }

    if (activeTab === 'closed') {
      return item.isClosed;
    }

    return true;
  }), [activeTab, rgp]);

  useEffect(() => {
    logInfo('RgpPage', 'Render state:', {
      uid: userData?.uid || null,
      rgp: rgp.length,
      filtered: filteredItems.length,
      activeTab,
      loading,
      error: error?.code || null,
    });
  }, [activeTab, error?.code, filteredItems.length, loading, rgp.length, userData?.uid]);

  const resetSheets = () => {
    setStatusSheetOpen(false);
    setRemarkSheetOpen(false);
    setSelectedItem(null);
    setSelectedStatus('open');
    setStatusRemarks('');
    setRemarkText('');
  };

  const handleFirestoreError = (firestoreError, fallbackMessage) => {
    if (firestoreError?.code === 'permission-denied') {
      toast.error('Permission denied. Contact admin.');
      return;
    }

    toast.error(fallbackMessage || firestoreError?.message || 'Update failed');
  };

  const openStatusSheet = (item) => {
    setSelectedItem(item);
    setSelectedStatus(item.status || 'open');
    setStatusRemarks(item.remarks || '');
    setStatusSheetOpen(true);
  };

  const openRemarkSheet = (item) => {
    setSelectedItem(item);
    setRemarkText('');
    setRemarkSheetOpen(true);
  };

  const saveStatusUpdate = async () => {
    if (!selectedItem) {
      return;
    }

    const nextStep = STATUS_OPTIONS.findIndex((option) => option.value === selectedStatus);

    setSaving(true);
    try {
      await updateRgp(selectedItem.id, {
        status: selectedStatus,
        remarks: statusRemarks.trim(),
        docStep: nextStep >= 0 ? nextStep : selectedItem.docStep || 0,
        updatedAt: serverTimestamp(),
      });
      toast.success('RGP/Challan updated successfully');
      resetSheets();
    } catch (firestoreError) {
      handleFirestoreError(firestoreError, 'Failed to update RGP/Challan');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSave = () => {
    if (selectedStatus === 'closed') {
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

  const handleAddRemark = async () => {
    if (!selectedItem) {
      return;
    }

    if (!remarkText.trim()) {
      toast.error('Please write a remark first');
      return;
    }

    setSaving(true);
    try {
      await updateRgp(selectedItem.id, {
        remarks: remarkText.trim(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Remark added successfully');
      resetSheets();
    } catch (firestoreError) {
      handleFirestoreError(firestoreError, 'Failed to add remark');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-6">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-gray-900">RGP / Challan</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Track all assigned RGP and challan documents in real time.</p>
      </div>

      <div className="overflow-x-auto px-4 pb-1">
        <div className="flex gap-3">
          <SummaryCard label="Open RGP" value={summary.openRgp} accentClass="from-teal-500 to-teal-600" />
          <SummaryCard label="Open Challan" value={summary.openChallan} accentClass="from-sky-500 to-blue-600" />
          <SummaryCard label="Total Closed" value={summary.closed} accentClass="from-emerald-500 to-green-600" />
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
        {loading && Array.from({ length: 3 }).map((_, index) => <RgpCardSkeleton key={index} />)}

        {!loading && error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-semibold text-red-700">Could not load RGP records</p>
              <p className="mt-1 text-xs text-red-600">
                {error.message || 'Please check your internet connection and try again.'}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <Card className="border-dashed border-gray-200 bg-[var(--bg-card)]">
            <CardContent className="flex flex-col items-center px-6 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                <ArrowLeftRight className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-[var(--text-primary)]">No RGP or challan assigned</h2>
              <p className="mt-2 max-w-[260px] text-sm leading-6 text-[var(--text-secondary)]">
                Documents assigned by admin will appear here.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && filteredItems.map((item) => {
          const documentNumber = item.docNumber || item.challanNumber || item.referenceNumber || item.id;
          const fromCompany = item.fromCompany || item.companyName || 'Not set';
          const toCompany = item.toCompany || item.destinationCompany || item.assignedToName || 'Not set';
          
          const entryDate = item.date?.toDate?.() || item.sentDate?.toDate?.() || new Date(item.date || item.sentDate || item.createdAt);
          let openDays = item.openDays;
          if (openDays === undefined) {
             const today = new Date();
             openDays = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
             if (isNaN(openDays)) openDays = 0;
          }

          const steps = [
            'Document Sent',
            'Acknowledgment Received', 
            'Return Initiated',
            'Closed'
          ];

          const getStepIndex = (status) => {
            const map = {
              'open': 0,
              'acknowledged': 1,
              'in_progress': 1, // fallback
              'return_initiated': 2,
              'closed': 3
            };
            return map[status] || 0;
          };

          const currentStep = getStepIndex(item.status);

          return (
            <div key={item.id} style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border-primary)',
              marginBottom: '12px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {/* Header */}
              <div style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-primary)'
              }}>
                <span style={{
                  background: item.type === 'challan' ? '#F3E8FF' : '#DBEAFE',
                  color: item.type === 'challan' ? '#7C3AED' : '#1D4ED8',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {item.type === 'challan' ? 'Challan' : 'RGP'}
                </span>
                <span style={{
                  background: item.isClosed ? '#F1F5F9' : '#DCFCE7',
                  color: item.isClosed ? '#475569' : '#16A34A',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {item.isClosed ? 'Closed' : 'Open'}
                </span>
              </div>

              {/* Body */}
              <div style={{ padding: '16px' }}>
                
                {/* Doc Number + Date */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <div>
                    <p style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '2px'
                    }}>
                      Document No.
                    </p>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}>
                      {documentNumber || 'N/A'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '2px'
                    }}>
                      Date
                    </p>
                    <p style={{
                      fontSize: '14px',
                      color: 'var(--text-primary)'
                    }}>
                      {entryDate instanceof Date && !isNaN(entryDate) ? entryDate.toLocaleDateString(
                        'en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }
                      ) : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* From → To */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)'
                      }}>
                        From
                      </p>
                      <p style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        {fromCompany}
                      </p>
                    </div>
                    <span style={{
                      color: 'var(--accent-primary)',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}>
                      →
                    </span>
                    <div style={{ 
                      flex: 1, 
                      textAlign: 'right' 
                    }}>
                      <p style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)'
                      }}>
                        To
                      </p>
                      <p style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        {toCompany}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div style={{
                  marginBottom: '12px'
                }}>
                  <p style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Description
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: item.description ? 'var(--text-primary)' : 'var(--text-muted)',
                    lineHeight: '1.5',
                    background: 'var(--bg-secondary)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    borderLeft: item.description ? '3px solid var(--accent-primary)' : '3px solid var(--border-primary)',
                    fontStyle: item.description ? 'normal' : 'italic'
                  }}>
                    {item.description || 'No description added'}
                  </p>
                </div>

                {/* Uploaded Image Preview */}
                {item.challanImageUrl && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Attachment
                    </p>
                    <a href={item.challanImageUrl} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                      <img src={item.challanImageUrl} alt="Challan" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
                    </a>
                  </div>
                )}

                {/* Progress Steps */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '16px',
                  overflowX: 'auto'
                }}>
                  {steps.map((step, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      flex: index < steps.length - 1 ? 1 : 0
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: index <= currentStep
                            ? 'var(--accent-primary)'
                            : 'var(--bg-secondary)',
                          border: '2px solid',
                          borderColor: index <= currentStep
                            ? 'var(--accent-primary)'
                            : 'var(--border-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 4px',
                          fontSize: '12px',
                          color: index <= currentStep
                            ? 'white'
                            : 'var(--text-muted)'
                        }}>
                          {index < currentStep ? '✓' : index + 1}
                        </div>
                        <p style={{
                          fontSize: '9px',
                          color: index <= currentStep
                            ? 'var(--accent-primary)'
                            : 'var(--text-muted)',
                          width: '60px',
                          textAlign: 'center',
                          fontWeight: index === currentStep
                            ? '600' : '400'
                        }}>
                          {step}
                        </p>
                      </div>
                      {index < steps.length - 1 && (
                        <div style={{
                          flex: 1,
                          height: '2px',
                          background: index < currentStep
                            ? 'var(--accent-primary)'
                            : 'var(--border-primary)',
                          marginBottom: '20px'
                        }} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Open Since */}
                {!item.isClosed && (
                  <div style={{
                    marginBottom: '12px'
                  }}>
                    <p style={{
                      fontSize: '13px',
                      color: openDays > 15 
                        ? '#DC2626' : 'var(--text-secondary)',
                      fontWeight: openDays > 15 
                        ? '600' : '400'
                    }}>
                      Open since: {openDays} days
                      {openDays > 15 && ' - Action Required!'}
                    </p>
                  </div>
                )}

                {/* Remarks */}
                {item.remarks && (
                  <div style={{
                    marginBottom: '12px'
                  }}>
                    <p style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '4px'
                    }}>
                      Remarks
                    </p>
                    <p style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic'
                    }}>
                      {item.remarks}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {!item.isClosed && (
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '4px'
                  }}>
                    <label style={{
                      flex: 1,
                      padding: '10px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: uploadingItemId === item.id ? 0.5 : 1
                    }}>
                      {uploadingItemId === item.id ? 'Uploading...' : 'Upload Photo'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={(e) => handleImageUpload(e, item)}
                        style={{ display: 'none' }}
                        disabled={uploadingItemId === item.id}
                      />
                    </label>
                    <button
                      onClick={() => openStatusSheet(item)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Update Status
                    </button>
                    <button
                      onClick={() => openRemarkSheet(item)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Add Remark
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={statusSheetOpen} onOpenChange={setStatusSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Update RGP/Challan Status</SheetTitle>
          </SheetHeader>

          {selectedItem && (
            <div className="space-y-5 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Document</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {selectedItem.docNumber || selectedItem.challanNumber || selectedItem.referenceNumber || selectedItem.id}
                </p>
              </div>

              <div className="space-y-3">
                <Label>Status</Label>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((statusOption) => (
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
                <Label htmlFor="rgp-status-remarks">Remarks</Label>
                <textarea
                  id="rgp-status-remarks"
                  rows={4}
                  value={statusRemarks}
                  onChange={(event) => setStatusRemarks(event.target.value)}
                  placeholder="Add remarks for this status update..."
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

      <Sheet open={remarkSheetOpen} onOpenChange={setRemarkSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Remark</SheetTitle>
          </SheetHeader>

          {selectedItem && (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label htmlFor="rgp-remark">Remark</Label>
                <textarea
                  id="rgp-remark"
                  rows={4}
                  value={remarkText}
                  onChange={(event) => setRemarkText(event.target.value)}
                  placeholder="Write your remark here..."
                  className="flex min-h-[120px] w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <Button className="h-11 w-full" onClick={handleAddRemark} disabled={saving}>
                {saving ? 'Saving...' : 'Save Remark'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <DeleteConfirmDialog
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, onConfirm: null })}
        onConfirm={() => confirmState.onConfirm?.()}
        title="Close document?"
        description="Mark this as closed?"
        confirmLabel="Yes, Close"
        loadingLabel="Closing..."
        isDeleting={saving}
      />
    </div>
  );
}
