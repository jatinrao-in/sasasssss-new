import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { arrayUnion, increment, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { ChevronDown, ChevronLeft, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePayments } from '../hooks/usePayments';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../lib/formatters';
import { logInfo } from '../lib/firestoreDebug';

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

function getPaymentStatusBadge(status) {
  if (status === 'received') return <Badge variant="success">Fully Received</Badge>;
  if (status === 'partial') return <Badge variant="warning">Partial</Badge>;
  return <Badge variant="destructive">Pending</Badge>;
}

function PaymentCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
        </div>
        <div className="mt-3 h-20 animate-pulse rounded-xl bg-gray-50" />
      </CardContent>
    </Card>
  );
}

function formatRecordedBy(entry) {
  return entry?.recordedBy || 'Team Member';
}

export default function PaymentsPage() {
  const navigate = useNavigate();
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
    if (!selectedPayment) {
      return;
    }

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
    <div className="pb-4">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center -ml-2 rounded-full transition-colors hover:bg-gray-100 active:bg-gray-200">
          <ChevronLeft className="h-6 w-6 text-[var(--text-primary)]" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Pending Payments</h1>
      </div>

      <div className="px-4 mb-4">
        <Card className="border-none bg-gradient-to-r from-teal-500 to-teal-600">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totals.assigned}</p>
              <p className="text-sm text-teal-100">Assigned Payments</p>
              <p className="text-xs text-teal-100/90">Net Pending: {formatCurrency(totals.totalPending)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 px-4">
        {loading ? Array.from({ length: 4 }).map((_, index) => <PaymentCardSkeleton key={index} />) : null}

        {!loading && myPayments.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">No payment records found.</p>
          </div>
        ) : null}

        {!loading && myPayments.map((payment) => (
          <Card key={payment.id} className="transition-shadow hover:shadow-card-hover">
            <CardContent className="p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-sm font-semibold text-gray-900">{payment.customerName}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {payment.invoiceNumber || 'No invoice'} | {formatDate(payment.invoiceDate)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Assigned: {formatDate(payment.assignedDate || payment.createdAt || payment.updatedAt)}
                  </p>
                </div>
                {getPaymentStatusBadge(payment.paymentStatus)}
              </div>

              <div className="mt-2 rounded-lg bg-gray-50 p-3">
                <p className="text-lg font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                <div className="rounded-lg bg-gray-50 p-2.5">
                  <span className="text-gray-400">Target</span>
                  <p className="font-medium text-gray-700">{formatDate(payment.targetPaymentDate)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2.5">
                  <span className="text-gray-400">Follow-up</span>
                  <p className="font-medium text-gray-700">{formatDate(payment.nextFollowupDate)}</p>
                </div>
                <div className="rounded-lg bg-green-50 p-2.5">
                  <span className="text-green-700">Total Paid</span>
                  <p className="font-semibold text-green-700">{formatCurrency(payment.totalPaid || 0)}</p>
                </div>
                <div className="rounded-lg bg-red-50 p-2.5">
                  <span className="text-red-600">Net Pending</span>
                  <p className="font-semibold text-red-600">{formatCurrency(payment.netPending || 0)}</p>
                </div>
              </div>

              {payment.overdueDays > 0 && payment.paymentStatus !== 'received' && (
                <p className="mt-2 text-xs font-medium text-red-500">Overdue: {payment.overdueDays} day{payment.overdueDays === 1 ? '' : 's'}</p>
              )}

              {payment.partialPayments?.length > 0 && (
                <div className="mt-3 rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Payment History</p>
                  <div className="mt-2 space-y-1.5">
                    {payment.partialPayments.map((entry, index) => (
                      <p key={`${payment.id}-partial-${index}`} className="text-sm text-gray-700">
                        {formatCurrency(entry.amount)} on {formatDate(entry.date)} ({formatRecordedBy(entry)})
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {payment.remarks && (
                <p className="mt-3 text-xs italic text-gray-400">"{payment.remarks}"</p>
              )}

              <Button variant="secondary" size="sm" className="mt-3 min-h-[40px] w-full" onClick={() => openUpdateSheet(payment)}>
                Update Status
              </Button>
            </CardContent>
          </Card>
        ))}
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
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Update Payment Status</SheetTitle>
          </SheetHeader>

          {selectedPayment && (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedPayment.customerName}</p>
                <p className="text-xs text-gray-500">{selectedPayment.invoiceNumber || 'No invoice number'}</p>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="relative">
                  <select
                    value={statusValue}
                    onChange={(event) => setStatusValue(event.target.value)}
                    className="flex h-12 w-full appearance-none rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-base text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="partial">Partial Payment Received</option>
                    <option value="received">Fully Received</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {statusValue === 'partial' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="partial-amount">Amount Received (Rs.)</Label>
                    <input
                      id="partial-amount"
                      type="number"
                      min="0"
                      value={partialAmount}
                      onChange={(event) => setPartialAmount(event.target.value)}
                      placeholder="Enter amount received"
                      className="flex h-12 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-base text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-remarks">Remarks</Label>
                    <textarea
                      id="payment-remarks"
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      className="flex min-h-[96px] w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Add remarks for this payment update"
                    />
                  </div>
                </>
              )}

              {statusValue === 'received' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="final-amount">Final Amount (Rs.)</Label>
                    <input
                      id="final-amount"
                      type="number"
                      min="0"
                      value={finalAmount}
                      onChange={(event) => setFinalAmount(event.target.value)}
                      placeholder="Enter final total received"
                      className="flex h-12 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-base text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="received-date">Payment Date</Label>
                    <input
                      id="received-date"
                      type="date"
                      value={receivedDate}
                      onChange={(event) => setReceivedDate(event.target.value)}
                      className="flex h-12 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-base text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="received-remarks">Remarks</Label>
                    <textarea
                      id="received-remarks"
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      className="flex min-h-[96px] w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Optional remarks"
                    />
                  </div>
                </>
              )}

              {statusValue === 'pending' && (
                <div className="space-y-2">
                  <Label htmlFor="pending-remarks">Remarks</Label>
                  <textarea
                    id="pending-remarks"
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    className="flex min-h-[96px] w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Optional remarks"
                  />
                </div>
              )}

              <Button className="min-h-[44px] w-full" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
