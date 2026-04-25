import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { CreditCard, ChevronDown, ChevronLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePayments } from '../hooks/usePayments';
import { useToast } from '../hooks/useToast';
import { formatDate, formatCurrency } from '../lib/formatters';

export default function PaymentsPage() {
 const navigate = useNavigate();
 const { userData } = useAuth();
 const toast = useToast();
 const { payments, loading, updateStatus } = usePayments(userData?.uid);
 const [sheetOpen, setSheetOpen] = useState(false);
 const [selectedPayment, setSelectedPayment] = useState(null);
 const [statusValue, setStatusValue] = useState('pending');
 const [remarks, setRemarks] = useState('');
 const [saving, setSaving] = useState(false);

 // Already filtered by uid from the hook
 const myPayments = payments;

 const openUpdateSheet = (payment) => { setSelectedPayment(payment); setStatusValue(payment.paymentStatus || 'pending'); setRemarks(payment.remarks || ''); setSheetOpen(true); };

 const handleSave = async () => {
 if (!selectedPayment) return;
 setSaving(true);
 try { await updateStatus(selectedPayment.id, statusValue, remarks); toast.success('Status updated!'); setSheetOpen(false); }
 catch (err) { toast.error('Failed: ' + err.message); }
 finally { setSaving(false); }
 };

 const getStatusBadge = (status) => {
 if (status === 'received') return <Badge variant="success">Received</Badge>;
 if (status === 'partial') return <Badge variant="warning">Partial</Badge>;
 return <Badge variant="destructive">Pending</Badge>;
 };

 return (
 <div className="pb-4">
 <div className="px-4 pt-4 pb-3 flex items-center gap-3">
   <button onClick={() => navigate(-1)} className="h-10 w-10 flex items-center justify-center -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">
     <ChevronLeft className="h-6 w-6 text-[var(--text-primary)]" />
   </button>
   <h1 className="text-lg font-bold text-gray-900">Pending Payments</h1>
 </div>
 <div className="px-4 mb-4">
 <Card className="bg-gradient-to-r from-teal-500 to-teal-600 border-none">
 <CardContent className="p-4 flex items-center gap-3">
 <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center"><CreditCard className="h-5 w-5 text-white" /></div>
 <div><p className="text-2xl font-bold text-white">{myPayments.length}</p><p className="text-sm text-teal-100">Assigned Payments</p></div>
 </CardContent>
 </Card>
 </div>
 <div className="px-4 space-y-3">
  {loading ? Array(4).fill(0).map((_, i) => (
  <Card key={i}><CardContent className="p-4"><div className="h-4 bg-gray-200 rounded-lg animate-pulse w-3/4 mb-2" /><div className="h-3 bg-gray-100 rounded animate-pulse w-1/2 mb-3" /><div className="h-10 bg-gray-200 rounded-xl animate-pulse w-full" /></CardContent></Card>
 )) : myPayments.length === 0 ? (
 <div className="text-center py-12"><p className="text-gray-400 text-sm">No payment records found.</p></div>
 ) : myPayments.map(pay => (
 <Card key={pay.id} className="hover:shadow-card-hover transition-shadow">
 <CardContent className="p-4">
 <div className="flex items-start justify-between mb-2">
 <div className="flex-1 min-w-0 mr-2"><p className="font-semibold text-sm text-gray-900">{pay.customerName}</p><p className="text-xs text-[var(--text-muted)] mt-0.5">{pay.invoiceNumber} · {formatDate(pay.invoiceDate)}</p></div>
 {getStatusBadge(pay.paymentStatus)}
 </div>
 <div className="bg-gray-50 rounded-lg p-2.5 mt-2"><p className="text-lg font-bold text-gray-900">{formatCurrency(pay.amount)}</p></div>
 <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)] mt-2.5">
 <div><span className="text-gray-400">Target</span><p className="font-medium text-gray-700">{formatDate(pay.targetPaymentDate)}</p></div>
 <div><span className="text-gray-400">Follow-up</span><p className="font-medium text-gray-700">{formatDate(pay.nextFollowupDate)}</p></div>
 </div>
 {pay.overdueDays > 0 && <p className="text-xs text-red-500 font-medium mt-2">⚠ {pay.overdueDays} days overdue</p>}
 {pay.remarks && <p className="text-xs text-gray-400 mt-2 italic">"{pay.remarks}"</p>}
 <Button variant="secondary" size="sm" className="w-full mt-3 min-h-[40px]" onClick={() => openUpdateSheet(pay)}>Update Status</Button>
 </CardContent>
 </Card>
 ))}
 </div>

 <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
 <SheetContent><SheetHeader><SheetTitle>Update Payment Status</SheetTitle></SheetHeader>
 {selectedPayment && (
 <div className="mt-3 space-y-4">
 <div><p className="text-sm font-medium text-gray-900">{selectedPayment.customerName}</p><p className="text-xs text-gray-500">{selectedPayment.invoiceNumber}</p></div>
 <div className="space-y-2"><Label>Status</Label>
 <div className="relative">
 <select value={statusValue} onChange={e => setStatusValue(e.target.value)} className="flex h-12 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-base text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500">
 <option value="pending">Pending</option><option value="received">Received</option><option value="partial">Partial</option>
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
 </div>
 </div>
 <div className="space-y-2">
 <Label htmlFor="remarks">Remarks</Label>
 <textarea
 id="remarks"
 value={remarks}
 onChange={(event) => setRemarks(event.target.value)}
 className="flex min-h-[96px] w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500"
 placeholder="Add remarks for this payment update"
 />
 </div>
 <Button className="w-full min-h-[44px]" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
 </div>
 )}
 </SheetContent>
 </Sheet>
 </div>
 );
}

