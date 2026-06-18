import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, FileText, MessageSquarePlus, Save, Camera, Image as ImageIcon } from 'lucide-react';
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
import { logInfo } from '../lib/firestoreDebug';
import { compressImage, uploadToImgbb } from '../lib/imageUtils';
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

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'rgp', label: 'RGP' },
  { key: 'challan', label: 'Challan' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
];

const cardPress = (el, pressed) => {
  if (pressed) {
    el.style.boxShadow = 'none';
    el.style.transform = 'translate(4px,4px)';
  } else {
    el.style.boxShadow = '4px 4px 0px #3E362E';
    el.style.transform = '';
  }
};

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
    return <Badge className="border-[var(--color-info)] bg-[var(--color-info-bg)] text-[var(--color-info)]">In Progress</Badge>;
  }

  return <Badge variant="default">{humanizeStatus(status)}</Badge>;
}

function SummaryCard({ label, value, toneClass }) {
  const isLight = toneClass === 'light';

  return (
    <div className={`min-w-[100px] flex-1 summary-tile ${toneClass}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-[var(--color-text-secondary)]' : 'text-white/75'}`}>{label}</p>
      <p className="mt-1 text-2xl font-bold font-heading">{value}</p>
    </div>
  );
}

function RgpCardSkeleton() {
  return (
    <div
      className="rounded-lg overflow-hidden animate-pulse p-5 space-y-4"
      style={{
        background: '#F2ECE1',
        border: '2px solid #3E362E',
        boxShadow: '4px 4px 0px #3E362E',
      }}
    >
      <div className="flex justify-between items-center gap-3">
        <div className="h-6 w-16 bg-[#E8E1D5] rounded-full" />
        <div className="h-6 w-16 bg-[#E8E1D5] rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-1/3 bg-[#E8E1D5] rounded" />
        <div className="h-3 w-1/2 bg-[#E8E1D5] rounded" />
      </div>
      <div className="h-12 bg-[#FAF6EE] border border-[#DFD5C6] rounded-xl" />
      <div className="h-10 bg-[#FAF6EE] border border-[#DFD5C6] rounded-xl" />
    </div>
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
                isCompleted || isCurrent ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
              } ${isCurrent ? 'ring-2 ring-[var(--color-primary-light)]' : ''}`}
            />
            <p className={`mt-2 text-[10px] leading-4 ${
              isCompleted || isCurrent ? 'font-semibold text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
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
  const { currentUser } = useAuth();
  const toast = useToast();
  const {
    rgp,
    loading,
    error,
    updateRgp,
  } = useRgp(currentUser?.uid);

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

  // Remark image upload state
  const [selectedRemarkImage, setSelectedRemarkImage] = useState(null);
  const [remarkImagePreview, setRemarkImagePreview] = useState(null);
  const [remarkImageUploading, setRemarkImageUploading] = useState(false);
  const [remarkImageUrl, setRemarkImageUrl] = useState(null);

  const handleImageUpload = async (event, item) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingItemId(item.id);
    try {
      toast.success('Compressing and uploading...');
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const compressedBlob = await compressImage(files[i]);
        const url = await uploadToImgbb(compressedBlob);
        if (url) uploadedUrls.push(url);
      }
      
      const existingUrls = item.challanImageUrls || (item.challanImageUrl ? [item.challanImageUrl] : []);
      const newUrls = [...existingUrls, ...uploadedUrls];

      await updateRgp(item.id, { challanImageUrls: newUrls, challanImageUrl: newUrls[0] || '', updatedAt: serverTimestamp() });
      toast.success(`${uploadedUrls.length} photo(s) uploaded successfully!`);
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
      uid: currentUser?.uid || null,
      rgp: rgp.length,
      filtered: filteredItems.length,
      activeTab,
      loading,
      error: error?.code || null,
    });
  }, [activeTab, error?.code, filteredItems.length, loading, rgp.length, currentUser?.uid]);

  const resetSheets = () => {
    setStatusSheetOpen(false);
    setRemarkSheetOpen(false);
    setSelectedItem(null);
    setSelectedStatus('open');
    setStatusRemarks('');
    setRemarkText('');
    setSelectedRemarkImage(null);
    setRemarkImagePreview(null);
    setRemarkImageUrl(null);
  };

  const handleRemarkImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large. Max 5MB allowed.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed.');
      return;
    }
    setSelectedRemarkImage(file);
    setRemarkImageUrl(null); // reset any previously uploaded URL
    const reader = new FileReader();
    reader.onload = (ev) => setRemarkImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemarkImageUpload = async () => {
    if (!selectedRemarkImage) return;
    setRemarkImageUploading(true);
    try {
      const compressedBlob = await compressImage(selectedRemarkImage);
      const url = await uploadToImgbb(compressedBlob);
      setRemarkImageUrl(url);
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setRemarkImageUploading(false);
    }
  };

  const handleFirestoreError = (firestoreError, fallbackMessage) => {
    console.error('RGP update error:', firestoreError?.code, firestoreError?.message);
    toast.error('Failed: ' + (firestoreError?.code || 'unknown') + ' - ' + (firestoreError?.message || fallbackMessage));
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
    if (!selectedItem) return;

    if (!currentUser?.uid) {
      toast.error('Please login again');
      return;
    }

    if (!remarkText.trim() && !remarkImageUrl) {
      toast.error('Add a remark or upload an image');
      return;
    }

    if (selectedRemarkImage && !remarkImageUrl) {
      toast.error('Please upload the selected image first');
      return;
    }

    setSaving(true);
    try {
      await updateRgp(selectedItem.id, {
        remarks: remarkText.trim() || selectedItem.remarks || '',
        imageUrl: remarkImageUrl || selectedItem.imageUrl || null,
        lastRemarkBy: currentUser.name || currentUser.displayName || currentUser.email,
        lastRemarkDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Remark saved successfully');
      resetSheets();
    } catch (firestoreError) {
      handleFirestoreError(firestoreError, 'Failed to add remark');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="pb-8 font-sans min-h-screen text-slate-800 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #FAF6EE 0%, #EAE4D9 100%)' }}
    >
      <ActionLoader visible={saving} message="Saving…" />
      {/* Background Waves */}
      <svg className="absolute bottom-0 left-0 right-0 w-full h-[240px] pointer-events-none z-0 overflow-hidden opacity-40" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rgpWave1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DFD8CC" />
            <stop offset="100%" stopColor="#D5CDBE" />
          </linearGradient>
          <linearGradient id="rgpWave2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EFECE4" />
            <stop offset="100%" stopColor="#E4DEC3" />
          </linearGradient>
        </defs>
        <path d="M0,280 C150,280 200,200 420,200 C640,200 700,320 1020,320 C1220,320 1350,220 1440,200 L1440,320 L0,320 Z" fill="url(#rgpWave1)" />
        <path d="M0,120 C100,120 100,260 320,260 C520,260 720,220 920,220 C1120,220 1220,320 1440,320 L1440,320 L0,320 Z" fill="url(#rgpWave2)" />
      </svg>

      <div className="relative z-10">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FAF6EE] border border-[#DFD5C6] rounded-xl flex items-center justify-center text-[#A68F6D] shadow-sm">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[20px] font-black text-slate-800 tracking-tight leading-none">RGP / Challan</h1>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Track all assigned RGP and challan documents</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="px-4 mb-4 grid grid-cols-3 gap-2">
          <div className="bg-[#3E362E] rounded-2xl p-3 flex flex-col items-center shadow-sm">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-white/60">Open RGP</p>
            <p className="text-xl font-black text-white mt-0.5">{summary.openRgp}</p>
          </div>
          <div className="bg-[#F2ECE1] border border-[#DFD5C6] rounded-2xl p-3 flex flex-col items-center shadow-sm">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Open Challan</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{summary.openChallan}</p>
          </div>
          <div className="bg-[#EEF1E9] border border-[#DFD5C6] rounded-2xl p-3 flex flex-col items-center shadow-sm">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Closed</p>
            <p className="text-xl font-black text-[#3B4731] mt-0.5">{summary.closed}</p>
          </div>
        </div>

        {/* ── TAB BAR ─────────────────────────────────────────────── */}
        <div className="px-4 mb-4">
          <div className="flex p-1 rounded-xl overflow-x-auto no-scrollbar" style={{ background: '#E8E1D5' }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const counts = {
                all: rgp.length,
                rgp: rgp.filter(item => item.type === 'rgp').length,
                challan: rgp.filter(item => item.type === 'challan').length,
                open: rgp.filter(item => !item.isClosed).length,
                closed: rgp.filter(item => item.isClosed).length,
              };
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] font-bold transition-all duration-200 active:scale-[0.97] rounded-lg whitespace-nowrap"
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

        <div className="space-y-4 px-4 pb-24">
          {loading && Array.from({ length: 3 }).map((_, index) => <RgpCardSkeleton key={index} />)}

          {!loading && error && (
            <div className="bg-[#FBEAE9] border-2 border-red-600 rounded-lg p-4 text-center">
              <p className="text-sm font-bold text-red-700">Could not load RGP records</p>
              <p className="mt-1 text-xs text-red-600">{error.message || 'Please check your connection.'}</p>
            </div>
          )}

          {!loading && !error && filteredItems.length === 0 && (
            <div className="text-center py-16 bg-[#F2ECE1] rounded-lg p-6 flex flex-col items-center" style={{ border: '2px solid #3E362E', boxShadow: '4px 4px 0px #3E362E' }}>
              <div className="h-16 w-16 bg-[#E5DFD3] rounded-full flex items-center justify-center mb-4 shadow-inner" style={{ border: '1.5px solid #3E362E' }}>
                <ArrowLeftRight className="h-8 w-8 text-slate-600" />
              </div>
              <p className="text-slate-800 font-extrabold text-sm">No RGP or challan assigned</p>
              <p className="text-slate-500 text-[11px] mt-1.5 font-bold">Documents assigned by admin will appear here.</p>
            </div>
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
            <div 
              key={item.id} 
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
            >
              {/* Header */}
              <div className="px-5 py-3.5 flex justify-between items-center border-b-2 border-[#3E362E] bg-[#FAF6EE]">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border-2 border-[#3E362E] ${
                  item.type === 'challan' 
                    ? 'bg-[#E8F0FE] text-blue-800' 
                    : 'bg-[#FAF6EE] text-[#A68F6D]'
                }`}>
                  {item.type === 'challan' ? 'Challan' : 'RGP'}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border-2 border-[#3E362E] ${
                  item.isClosed 
                    ? 'bg-[#EEF1E9] text-[#3B4731]' 
                    : 'bg-[#FBEAE9] text-[#7A3634]'
                }`}>
                  {item.isClosed ? 'Closed' : 'Open'}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                
                {/* Doc Number + Date */}
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Document No.
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {documentNumber || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Date
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
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

                {/* Assigned Date */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Assigned Date
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatDate(item.assignedDate || item.createdAt || item.updatedAt)}
                  </p>
                </div>

                {/* From → To */}
                <div className="bg-[#FAF6EE] rounded-xl p-3 flex items-center gap-3" style={{ border: '1.5px solid #3E362E' }}>
                  <div className="flex-1">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">From</p>
                    <p className="text-sm font-semibold text-slate-800">{fromCompany}</p>
                  </div>
                  <span className="text-[#3E362E] font-black text-lg">→</span>
                  <div className="flex-1 text-right">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">To</p>
                    <p className="text-sm font-semibold text-slate-800">{toCompany}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Description
                  </p>
                  <p 
                    className={`text-sm leading-relaxed ${item.description ? 'text-slate-800 normal-case' : 'text-slate-400 italic'} bg-[#FAF6EE] p-3 rounded-lg`}
                    style={{ border: '2px solid #3E362E', borderLeftWidth: '5px' }}
                  >
                    {item.description || 'No description added'}
                  </p>
                </div>

                {/* Uploaded Image Preview */}
                {(item.challanImageUrls?.length > 0 || item.challanImageUrl) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Attachments
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                      {(item.challanImageUrls || [item.challanImageUrl]).filter(Boolean).map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="flex-shrink-0 rounded-xl overflow-hidden w-16 h-16 hover:opacity-90 transition-opacity" style={{ border: '1.5px solid #3E362E' }}>
                          <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress Steps */}
                <div className="flex items-center gap-1 overflow-x-auto py-2 no-scrollbar">
                  {steps.map((step, index) => {
                    const isPassed = index < currentStep;
                    const isCurrent = index === currentStep;
                    const isCompleted = index <= currentStep;
                    
                    return (
                      <div key={index} className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                        <div className="text-center flex flex-col items-center">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all"
                            style={{
                              border: '2px solid #3E362E',
                              background: isCurrent ? '#3E362E' : isPassed ? '#3B4731' : '#FAF6EE',
                              color: isCurrent ? '#FAF6EE' : isPassed ? '#FAF6EE' : '#A8998A',
                            }}
                          >
                            {isPassed ? '✓' : index + 1}
                          </div>
                          <p 
                            className="text-[9px] mt-1 text-center font-bold w-14 truncate"
                            style={{
                              color: isCompleted ? '#3E362E' : '#A8998A'
                            }}
                          >
                            {step}
                          </p>
                        </div>
                        {index < steps.length - 1 && (
                          <div 
                            className="flex-1 h-[2px] min-w-[20px] mb-4"
                            style={{
                              background: isPassed ? '#3B4731' : '#DFD5C6'
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Open Since */}
                {!item.isClosed && (
                  <div>
                    <p className={`text-xs font-bold ${openDays > 15 ? 'text-red-600' : 'text-slate-500'}`}>
                      Open since: {openDays} days
                      {openDays > 15 && ' - Action Required!'}
                    </p>
                  </div>
                )}

                {/* Remarks */}
                {item.remarks && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Remarks
                    </p>
                    <p 
                      className="text-xs text-slate-600 italic bg-[#FAF6EE] p-2.5 rounded-lg"
                      style={{ border: '1.5px solid #3E362E' }}
                    >
                      {item.remarks}
                    </p>
                  </div>
                )}

                {/* Member-attached remark image */}
                {item.imageUrl && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Attached Image
                    </p>
                    <a href={item.imageUrl} target="_blank" rel="noreferrer" className="block relative group rounded-xl overflow-hidden" style={{ border: '2px solid #3E362E' }}>
                      <img
                        src={item.imageUrl}
                        alt="Attached"
                        className="w-full max-h-40 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-3 py-1.5 text-[10px] text-white backdrop-blur-sm">
                        Tap to view full image
                      </div>
                    </a>
                  </div>
                )}

                {/* Action Buttons */}
                {!item.isClosed && (
                  <div className="flex flex-col gap-2 pt-2 border-t-2 border-[#3E362E]">
                    {/* Top row: Status and Remark */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openStatusSheet(item)}
                        className="flex-1 h-10 text-xs font-black rounded-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        style={{
                          border: '2px solid #3E362E',
                          background: '#3E362E',
                          color: '#FAF6EE',
                          boxShadow: '2px 2px 0px #3E362E',
                        }}
                      >
                        Update Status
                      </button>
                      <button
                        onClick={() => openRemarkSheet(item)}
                        className="flex-1 h-10 text-xs font-black rounded-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        style={{
                          border: '2px solid #3E362E',
                          background: '#FAF6EE',
                          color: '#3E362E',
                          boxShadow: '2px 2px 0px #3E362E',
                        }}
                      >
                        Add Remark
                      </button>
                    </div>

                    {/* Bottom row: Camera & Gallery */}
                    <div className="flex gap-2">
                      <label 
                        className={`flex-1 h-10 text-xs font-black rounded-lg cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                          uploadingItemId === item.id ? 'opacity-50 pointer-events-none' : ''
                        }`}
                        style={{
                          border: '2px solid #3E362E',
                          background: '#FAF6EE',
                          color: '#3E362E',
                          boxShadow: '2px 2px 0px #3E362E',
                        }}
                      >
                        {uploadingItemId === item.id ? (
                          '...'
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5 text-[#A68F6D]" /> Camera
                          </>
                        )}
                        <input 
                          type="file" accept="image/*" capture="environment" multiple
                          onChange={(e) => handleImageUpload(e, item)}
                          className="hidden" disabled={uploadingItemId === item.id}
                        />
                      </label>
                      <label 
                        className={`flex-1 h-10 text-xs font-black rounded-lg cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                          uploadingItemId === item.id ? 'opacity-50 pointer-events-none' : ''
                        }`}
                        style={{
                          border: '2px solid #3E362E',
                          background: '#FAF6EE',
                          color: '#3E362E',
                          boxShadow: '2px 2px 0px #3E362E',
                        }}
                      >
                        {uploadingItemId === item.id ? (
                          'Uploading...'
                        ) : (
                          <>
                            <ImageIcon className="w-3.5 h-3.5 text-[#A68F6D]" /> Gallery
                          </>
                        )}
                        <input 
                          type="file" accept="image/*" multiple
                          onChange={(e) => handleImageUpload(e, item)}
                          className="hidden" disabled={uploadingItemId === item.id}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>  {/* end relative z-10 */}

      <Sheet open={statusSheetOpen} onOpenChange={setStatusSheetOpen}>
        <SheetContent className="bg-[#F2ECE1] border-t border-[#DFD5C6] text-slate-800 rounded-t-[28px] p-6 pb-8">
          <SheetHeader className="pb-4 border-b border-[#DFD5C6]">
            <SheetTitle className="text-base font-black text-slate-800 text-left">Update RGP/Challan Status</SheetTitle>
          </SheetHeader>

          {selectedItem && (
            <div className="space-y-5 py-2 text-[var(--color-text-primary)]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">Document</p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
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
                          ? 'border-[#A68F6D] bg-[#F2ECE1] text-[#3E362E]'
                          : 'border-[#DFD5C6] bg-[#FAF6EE] text-slate-700'
                      }`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full border ${
                          selectedStatus === statusOption.value
                            ? 'border-[#A68F6D] bg-[#A68F6D]'
                            : 'border-[#DFD5C6] bg-transparent'
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
                  className="flex min-h-[120px] w-full rounded-lg border border-[#DFD5C6] bg-[#FAF6EE] px-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
        <SheetContent className="bg-[#F2ECE1] border-t border-[#DFD5C6] text-slate-800 rounded-t-[28px] p-6 pb-8">
          <SheetHeader>
            <SheetTitle className="text-slate-805">Add Remark</SheetTitle>
          </SheetHeader>

          {selectedItem && (
            <div className="space-y-4 py-2 text-[var(--color-text-primary)]">
              {/* Text Remark */}
              <div className="space-y-2">
                <Label htmlFor="rgp-remark">Remark</Label>
                <textarea
                  id="rgp-remark"
                  rows={3}
                  value={remarkText}
                  onChange={(event) => setRemarkText(event.target.value)}
                  placeholder="Write your remark here..."
                  className="flex min-h-[90px] w-full rounded-lg border border-[#DFD5C6] bg-[#FAF6EE] px-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label style={{ display: 'block' }}>
                  Attach Image <span style={{ fontWeight: '400', color: 'var(--color-text-muted)' }}>(Optional · Max 5MB)</span>
                </Label>

                {/* Drop zone — only shown when no image selected */}
                {!remarkImagePreview && (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 dashed border-[#DFD5C6] rounded-xl cursor-pointer text-slate-700 text-sm bg-[#FAF6EE] hover:bg-[#EAE4D9]/80 transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleRemarkImageSelect}
                      className="hidden"
                    />
                    <Camera className="w-4 h-4 text-[var(--color-primary)]" /> Tap to attach image / take photo
                  </label>
                )}

                {/* Preview + upload/success */}
                {remarkImagePreview && (
                  <div className="relative">
                    <img
                      src={remarkImagePreview}
                      alt="Preview"
                      className="w-full max-h-48 object-cover rounded-xl border border-[#DFD5C6]"
                    />
                    {/* Remove button */}
                    <button
                      onClick={() => {
                        setSelectedRemarkImage(null);
                        setRemarkImagePreview(null);
                        setRemarkImageUrl(null);
                      }}
                      className="absolute top-2 right-2 bg-[var(--color-danger)] text-white border-none rounded-full w-7 h-7 cursor-pointer text-xs flex items-center justify-center font-bold"
                    >
                      ✕
                    </button>

                    {/* Upload button — only while not yet uploaded */}
                    {!remarkImageUrl && (
                      <Button
                        onClick={handleRemarkImageUpload}
                        disabled={remarkImageUploading}
                        className="w-full mt-2"
                      >
                        {remarkImageUploading ? 'Uploading...' : 'Upload Image to Cloud'}
                      </Button>
                    )}

                    {/* Success badge */}
                    {remarkImageUrl && (
                      <div className="mt-2 p-2 px-3 bg-[var(--color-success-bg)] border border-[#DFD5C6] rounded-lg text-[var(--color-success)] text-sm font-semibold">
                        ✓ Image uploaded successfully!
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                className="h-11 w-full mt-2"
                onClick={handleAddRemark}
                disabled={saving || remarkImageUploading || (selectedRemarkImage && !remarkImageUrl)}
              >
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
