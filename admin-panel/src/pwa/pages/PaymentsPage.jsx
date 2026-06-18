import React, { useEffect, useMemo, useState } from 'react';
import { arrayUnion, increment, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { ChevronDown, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePayments } from '../hooks/usePayments';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../lib/formatters';
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

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

const cardPress = (el, pressed) => {
  if (pressed) {
    el.style.boxShadow = 'none';
    el.style.transform = 'translate(4px,4px)';
  } else {
    el.style.boxShadow = '4px 4px 0px #3E362E';
    el.style.transform = '';
  }
};

export default function PaymentsPage() {
  const { userData, currentUser } = useAuth();
  const toast = useToast();
  const { payments, loading, updateStatus } = usePayments(userData?.uid);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [statusValue, setStatusValue] = useState('pending');
  const [partialAmount, setPartialAmount] = useState('');
  const [finalAmount, setFinalAmount] = useState('');
  const [receivedDate, setReceivedDate] = useState(getTodayInputDate());
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const myPayments = payments;

  useEffect(() => {
    logInfo('PaymentsPage', 'Render state:', {
      uid: userData?.uid || null,
      payments: myPayments.length,
      loading,
    });
  }, [loading, myPayments.length, userData?.uid]);

  const resetSheet = () => {
    setSheetOpen(false);
    setSelectedPayment(null);
    setStatusValue('pending');
    setPartialAmount('');
    setFinalAmount('');
    setReceivedDate(getTodayInputDate());
    setRemarks('');
  };

  const totals = useMemo(() => ({
    assigned: myPayments.length,
    totalPending: myPayments.reduce((sum, payment) => sum + Number(payment.netPending || 0), 0),
  }), [myPayments]);

  const openUpdateSheet = (payment) => {
    setSelectedPayment(payment);
    setStatusValue(payment.paymentStatus || 'pending');
    setPartialAmount('');
    setFinalAmount(String(payment.finalAmount || payment.amount || payment.totalPaid || 0));
    setReceivedDate(
      payment.receivedDate?.toDate?.()?.toISOString?.().slice(0, 10)
      || (payment.receivedDate ? new Date(payment.receivedDate).toISOString().slice(0, 10) : getTodayInputDate()),
    );
    setRemarks(payment.remarks || '');
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!selectedPayment) return;

    const paymentAmount = Number(selectedPayment.amount || 0);
    const currentTotalPaid = Number(selectedPayment.totalPaid || 0);

    setSaving(true);
    try {
      if (statusValue === 'partial') {
        const enteredAmount = Number(partialAmount);
        if (!enteredAmount || enteredAmount <= 0) {
          toast.error('Enter a valid partial amount');
          return;
        }
        const nextTotalPaid = currentTotalPaid + enteredAmount;
        if (paymentAmount > 0 && nextTotalPaid >= paymentAmount) {
          toast.error('Use Fully Received when the full amount is collected');
          return;
        }
        const nextPending = Math.max(0, paymentAmount - nextTotalPaid);
        await updateStatus(selectedPayment.id, {
          paymentStatus: 'partial',
          partialPayments: arrayUnion({
            amount: enteredAmount,
            date: new Date(),
            remarks: remarks.trim(),
            recordedBy: currentUser?.name || currentUser?.displayName || userData?.name || 'Team Member',
          }),
          totalPaid: increment(enteredAmount),
          netPending: nextPending,
          netPendingAmount: nextPending,
          remarks: remarks.trim(),
          updatedAt: serverTimestamp(),
        });
      } else if (statusValue === 'received') {
        const enteredAmount = Number(finalAmount);
        if (!enteredAmount || enteredAmount <= 0) {
          toast.error('Enter the final amount received');
          return;
        }
        if (enteredAmount < currentTotalPaid) {
          toast.error('Final amount cannot be less than the amount already received');
          return;
        }
        await updateStatus(selectedPayment.id, {
          paymentStatus: 'received',
          finalAmount: enteredAmount,
          totalPaid: enteredAmount,
          receivedDate: Timestamp.fromDate(new Date(`${receivedDate}T00:00:00`)),
          netPending: 0,
          netPendingAmount: 0,
          remarks: remarks.trim(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateStatus(selectedPayment.id, {
          paymentStatus: 'pending',
          remarks: remarks.trim(),
          updatedAt: serverTimestamp(),
        });
      }

      toast.success('Payment updated successfully');
      resetSheet();
    } catch (err) {
      if (err?.code === 'permission-denied') {
        toast.error('Permission denied. Contact admin.');
      } else {
        toast.error(`Failed: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="pb-8 font-sans min-h-screen text-slate-800 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #FAF6EE 0%, #EAE4D9 100%)' }}
    >
      <ActionLoader visible={saving} message="Updating payment…" />
      {/* Background Waves */}
      <svg className="absolute bottom-0 left-0 right-0 w-full h-[240px] pointer-events-none z-0 overflow-hidden opacity-40" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pmtWave1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DFD8CC" />
            <stop offset="100%" stopColor="#D5CDBE" />
          </linearGradient>
          <linearGradient id="pmtWave2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EFECE4" />
            <stop offset="100%" stopColor="#E4DEC3" />
          </linearGradient>
        </defs>
        <path d="M0,280 C150,280 200,200 420,200 C640,200 700,320 1020,320 C1220,320 1350,220 1440,200 L1440,320 L0,320 Z" fill="url(#pmtWave1)" />
        <path d="M0,120 C100,120 100,260 320,260 C520,260 720,220 920,220 C1120,220 1220,320 1440,320 L1440,320 L0,320 Z" fill="url(#pmtWave2)" />
      </svg>

      <div className="relative z-10">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FAF6EE] border border-[#DFD5C6] rounded-xl flex items-center justify-center text-[#A68F6D] shadow-sm">
            <CreditCard className="h-5 w-5" />
          </div>
          <h1 className="text-[20px] font-black text-slate-800 tracking-tight">Pending Payments</h1>
        </div>

        {/* Summary Banner */}
        <div className="px-4 mb-5">
          <div className="bg-[#3E362E] rounded-2xl p-4 flex items-center gap-4 shadow-md">
            <div className="w-12 h-12 bg-[#FAF6EE]/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-black text-white leading-none">{totals.assigned}</p>
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mt-0.5">Assigned Payments</p>
              <p className="text-xs text-white/80 font-bold mt-1">Net Pending: {formatCurrency(totals.totalPending)}</p>
            </div>
          </div>
        </div>

        {/* Payment Card List */}
        <div className="space-y-3.5 px-4 pb-24">
          {loading && Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-[#F2ECE1] rounded-lg animate-pulse" style={{ border: '2px solid #3E362E', boxShadow: '4px 4px 0px #3E362E', height: '180px' }} />
          ))}

          {!loading && myPayments.length === 0 && (
            <div className="text-center py-16 bg-[#F2ECE1] rounded-lg p-6 flex flex-col items-center" style={{ border: '2px solid #3E362E', boxShadow: '4px 4px 0px #3E362E' }}>
              <div className="h-16 w-16 bg-[#E5DFD3] rounded-full flex items-center justify-center mb-4 shadow-inner" style={{ border: '1.5px solid #DFD5C6' }}>
                <CreditCard className="h-8 w-8 text-slate-405" />
              </div>
              <p className="text-slate-800 font-extrabold text-sm">No payment records found</p>
              <p className="text-slate-500 text-[11px] mt-1.5 font-bold">Payments assigned by admin will appear here.</p>
            </div>
          )}

          {!loading && myPayments.map((payment) => (
            <div 
              key={payment.id} 
              className="bg-[#F2ECE1] rounded-lg p-5 space-y-3 cursor-pointer"
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
              onClick={() => openUpdateSheet(payment)}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-800 truncate">{payment.customerName}</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    {payment.invoiceNumber || 'No invoice'} · {formatDate(payment.invoiceDate)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Assigned: {formatDate(payment.assignedDate || payment.createdAt || payment.updatedAt)}
                  </p>
                </div>
                {/* Status Badge */}
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex-shrink-0 border ${
                  payment.paymentStatus === 'received' 
                    ? 'bg-[#EEF1E9] text-[#3B4731] border-[#C5D5B8]'
                    : payment.paymentStatus === 'partial'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-[#FBEAE9] text-red-700 border-[#E9C3C1]'
                }`}>
                  {payment.paymentStatus === 'received' ? 'Received' : payment.paymentStatus === 'partial' ? 'Partial' : 'Pending'}
                </span>
              </div>

              {/* Amount Block */}
              <div className="bg-[#FAF6EE] border border-[#DFD5C6] rounded-xl p-3">
                <p className="text-xl font-black text-slate-800">{formatCurrency(payment.amount)}</p>
              </div>

              {/* Date Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-[#FAF6EE] border border-[#DFD5C6] p-2.5">
                  <span className="text-slate-400 text-[9px] uppercase font-bold block">Target</span>
                  <p className="font-bold text-slate-700 mt-0.5">{formatDate(payment.targetPaymentDate)}</p>
                </div>
                <div className="rounded-xl bg-[#FAF6EE] border border-[#DFD5C6] p-2.5">
                  <span className="text-slate-400 text-[9px] uppercase font-bold block">Follow-up</span>
                  <p className="font-bold text-slate-700 mt-0.5">{formatDate(payment.nextFollowupDate)}</p>
                </div>
                <div className="rounded-xl bg-[#EEF1E9] border border-[#C5D5B8] p-2.5">
                  <span className="text-[#3B4731] text-[9px] uppercase font-bold block">Total Paid</span>
                  <p className="font-bold text-[#3B4731] mt-0.5">{formatCurrency(payment.totalPaid || 0)}</p>
                </div>
                <div className="rounded-xl bg-[#FBEAE9] border border-[#E9C3C1] p-2.5">
                  <span className="text-red-500 text-[9px] uppercase font-bold block">Net Pending</span>
                  <p className="font-bold text-red-700 mt-0.5">{formatCurrency(payment.netPending || 0)}</p>
                </div>
              </div>

              {payment.overdueDays > 0 && payment.paymentStatus !== 'received' && (
                <p className="text-[11px] font-black text-red-600 bg-[#FBEAE9] border border-[#E9C3C1] px-3 py-1.5 rounded-lg">
                  ⚠ Overdue by {payment.overdueDays} day{payment.overdueDays === 1 ? '' : 's'}
                </p>
              )}

              {payment.partialPayments?.length > 0 && (
                <div className="bg-[#FAF6EE] border border-[#DFD5C6] rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Payment History</p>
                  {payment.partialPayments.map((entry, index) => (
                    <p key={`${payment.id}-partial-${index}`} className="text-xs text-slate-700 font-medium">
                      {formatCurrency(entry.amount)} on {formatDate(entry.date)} ({formatRecordedBy(entry)})
                    </p>
                  ))}
                </div>
              )}

              {payment.remarks && (
                <p className="text-[11px] italic text-slate-400">"{payment.remarks}"</p>
              )}

              <button 
                className="w-full py-2.5 text-[11px] font-black rounded"
                style={{
                  border: '1.5px solid #3E362E',
                  color: '#3E362E',
                  background: '#FAF6EE',
                  boxShadow: '2.5px 2.5px 0px #3E362E',
                }}
                onClick={() => openUpdateSheet(payment)}
              >
                Update Status
              </button>
            </div>
          ))}
        </div>
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetSheet();
            return;
          }
          setSheetOpen(true);
        }}
      >
        <SheetContent className="bg-[#F2ECE1] border-t border-[#DFD5C6] text-slate-800 rounded-t-[28px] p-6 pb-8">
          <SheetHeader className="pb-4 border-b border-[#DFD5C6]">
            <SheetTitle className="text-base font-black text-slate-800 text-left">Update Payment Status</SheetTitle>
          </SheetHeader>

          {selectedPayment && (
            <div className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar pr-1">
              <div>
                <p className="text-sm font-black text-slate-800">{selectedPayment.customerName}</p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{selectedPayment.invoiceNumber || 'No invoice number'}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Assigned: {formatDate(selectedPayment.assignedDate || selectedPayment.createdAt || selectedPayment.updatedAt)}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</p>
                <div className="relative">
                  <select
                    value={statusValue}
                    onChange={(event) => setStatusValue(event.target.value)}
                    className="flex h-12 w-full appearance-none rounded-xl border border-[#DFD5C6] bg-[#FAF6EE] px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A68F6D]"
                  >
                    <option value="pending">Pending</option>
                    <option value="partial">Partial Payment Received</option>
                    <option value="received">Fully Received</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {statusValue === 'partial' && (
                <>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount Received (Rs.)</p>
                    <input
                      id="partial-amount"
                      type="number"
                      min="0"
                      value={partialAmount}
                      onChange={(event) => setPartialAmount(event.target.value)}
                      placeholder="Enter amount received"
                      className="flex h-12 w-full rounded-xl border border-[#DFD5C6] bg-[#FAF6EE] px-4 py-3 text-base text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A68F6D]"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Remarks</p>
                    <textarea
                      id="payment-remarks"
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      className="flex min-h-[96px] w-full rounded-xl border border-[#DFD5C6] bg-[#FAF6EE] px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A68F6D] resize-none"
                      placeholder="Add remarks for this payment update"
                    />
                  </div>
                </>
              )}

              {statusValue === 'received' && (
                <>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Final Amount (Rs.)</p>
                    <input
                      id="final-amount"
                      type="number"
                      min="0"
                      value={finalAmount}
                      onChange={(event) => setFinalAmount(event.target.value)}
                      placeholder="Enter final total received"
                      className="flex h-12 w-full rounded-xl border border-[#DFD5C6] bg-[#FAF6EE] px-4 py-3 text-base text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A68F6D]"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Date</p>
                    <input
                      id="received-date"
                      type="date"
                      value={receivedDate}
                      onChange={(event) => setReceivedDate(event.target.value)}
                      className="flex h-12 w-full rounded-xl border border-[#DFD5C6] bg-[#FAF6EE] px-4 py-3 text-base text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A68F6D]"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Remarks</p>
                    <textarea
                      id="received-remarks"
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      className="flex min-h-[96px] w-full rounded-xl border border-[#DFD5C6] bg-[#FAF6EE] px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A68F6D] resize-none"
                      placeholder="Optional remarks"
                    />
                  </div>
                </>
              )}

              {statusValue === 'pending' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Remarks</p>
                  <textarea
                    id="pending-remarks"
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    className="flex min-h-[96px] w-full rounded-xl border border-[#DFD5C6] bg-[#FAF6EE] px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A68F6D] resize-none"
                    placeholder="Optional remarks"
                  />
                </div>
              )}

              <button 
                className="h-11 w-full bg-[#3E362E] text-white font-bold rounded-xl text-sm active:scale-[0.98] transition-all cursor-pointer border-none disabled:opacity-50"
                onClick={handleSave} 
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
