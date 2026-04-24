import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Search, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEnquiries } from '../hooks/useEnquiries';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/formatters';

export default function EnquiriesPage() {
 const { userData } = useAuth();
 const toast = useToast();
 const { enquiries, loading, markClosed } = useEnquiries(userData?.uid);
 const [activeTab, setActiveTab] = useState('all');

 // Already filtered by uid from the hook
 const myEnquiries = enquiries;
 const openEnquiries = myEnquiries.filter(e => e.status !== 'closed');

 const filtered = myEnquiries.filter(e => {
 if (activeTab === 'all') return true;
 if (activeTab === 'open') return e.status === 'open';
 if (activeTab === 'closed') return e.status === 'closed';
 if (activeTab === 'overdue') return e.status === 'overdue';
 return true;
 });

 const handleClose = async (id) => {
 try { await markClosed(id); toast.success('Enquiry closed!'); }
 catch (err) { toast.error('Failed: ' + err.message); }
 };

 const getStatusBadge = (enq) => {
 if (enq.status === 'closed') return <Badge variant="success">Closed</Badge>;
 if (enq.status === 'overdue') return <Badge variant="destructive">Overdue</Badge>;
 return <Badge variant="default">Open</Badge>;
 };

 return (
 <div className="pb-4">
 <div className="px-4 pt-4 pb-3"><h1 className="text-lg font-bold text-gray-900">Open Enquiries</h1></div>
 <div className="px-4 mb-4">
 <Card className="bg-gradient-to-r from-teal-500 to-teal-600 border-none">
 <CardContent className="p-4 flex items-center gap-3">
 <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center"><Search className="h-5 w-5 text-white" /></div>
 <div><p className="text-2xl font-bold text-white">{openEnquiries.length}</p><p className="text-sm text-teal-100">My Open Enquiries</p></div>
 </CardContent>
 </Card>
 </div>
 <div className="px-4 mb-3">
 <Tabs value={activeTab} onValueChange={setActiveTab}>
 <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="open">Open</TabsTrigger><TabsTrigger value="closed">Closed</TabsTrigger><TabsTrigger value="overdue">Overdue</TabsTrigger></TabsList>
 </Tabs>
 </div>
 <div className="px-4 space-y-3">
  {loading ? Array(4).fill(0).map((_, i) => (
  <Card key={i}><CardContent className="p-4"><div className="h-4 bg-gray-200 rounded-lg animate-pulse w-3/4 mb-2" /><div className="h-3 bg-gray-100 rounded animate-pulse w-1/2 mb-3" /><div className="flex gap-2"><div className="h-5 w-14 bg-gray-200 rounded-full animate-pulse" /><div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" /></div></CardContent></Card>
 )) : filtered.length === 0 ? (
 <div className="text-center py-12"><p className="text-gray-400 text-sm">No enquiries found</p></div>
 ) : filtered.map(enq => (
 <Card key={enq.id} className="hover:shadow-card-hover transition-shadow">
 <CardContent className="p-4">
 <div className="flex items-start justify-between mb-2">
 <div className="flex-1 min-w-0 mr-2"><p className="font-semibold text-sm text-gray-900">{enq.client || enq.taskType}</p></div>
 <Badge variant="secondary">{enq.taskType}</Badge>
 </div>
 <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
 <span>Assigned: {formatDate(enq.assignedDate)}</span>
 <span>Target: {formatDate(enq.targetDate)}</span>
 </div>
 {enq.nextFollowupDate && <p className="text-xs text-[var(--text-muted)] mt-1.5">Next Follow-up: {formatDate(enq.nextFollowupDate)}</p>}
 {enq.overdueDays > 0 && <p className="text-xs text-red-500 font-medium mt-1.5">⚠ {enq.overdueDays} days overdue</p>}
 <div className="flex items-center justify-between mt-3">
 {getStatusBadge(enq)}
 {enq.status !== 'closed' && <Button variant="secondary" size="sm" className="min-h-[36px]" onClick={() => handleClose(enq.id)}><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Mark Closed</Button>}
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 </div>
 );
}

