import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeftRight, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRgp } from '../hooks/useRgp';
import { formatDate } from '../lib/formatters';

export default function RgpPage() {
  const { userData } = useAuth();
  const { rgp, loading } = useRgp(userData?.uid);
  const [filter, setFilter] = useState('All');

  const filteredRgp = rgp.filter(item => {
    if (filter === 'All') return true;
    if (filter === 'Open') return item.status === 'open';
    if (filter === 'Closed') return item.status === 'closed';
    return true;
  });

  const getStatusBadge = (status) => {
    if (status === 'closed') return <Badge variant="success">Closed</Badge>;
    return <Badge variant="warning">Open</Badge>;
  };

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-gray-900">RGP & Challans</h1>
      </div>

      <div className="px-4 mb-4">
        <div className="flex p-1 bg-gray-100 rounded-lg">
          {['All', 'Open', 'Closed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3">
        {loading ? Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex justify-between mb-3">
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-12 animate-pulse" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-3 animate-pulse" />
              <div className="h-10 bg-gray-50 rounded-lg w-full animate-pulse" />
            </CardContent>
          </Card>
        )) : filteredRgp.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No entries assigned to you.</p>
          </div>
        ) : filteredRgp.map(item => (
          <Card key={item.id} className="hover:shadow-card-hover transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <Badge variant={item.type === 'challan' ? 'secondary' : 'default'} className="uppercase text-[10px]">
                  {item.type || 'RGP'}
                </Badge>
                {getStatusBadge(item.status)}
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="font-semibold text-sm text-gray-900">{item.docNumber}</span>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-[10px] uppercase">From</span>
                    <span className="font-medium text-gray-700">{item.fromCompany || 'N/A'}</span>
                  </div>
                  <ArrowLeftRight className="h-3 w-3 text-gray-300 flex-shrink-0" />
                  <div className="flex flex-col text-right">
                    <span className="text-gray-400 text-[10px] uppercase">To</span>
                    <span className="font-medium text-gray-700">{item.toCompany || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 text-xs text-gray-400">
                Date: {item.date ? formatDate(item.date) : 'Unknown'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
