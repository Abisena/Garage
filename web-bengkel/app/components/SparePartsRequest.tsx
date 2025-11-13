'use client';

import React, { useMemo, useState } from 'react';
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';
import { updateSparePartRequestStatus } from '../../lib/api';

const statusColor: Record<string, string> = {
  Requested: 'bg-amber-100 text-amber-700 border-amber-200',
  Issued: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-100 text-red-700 border-red-200',
  Cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function SparePartsRequest() {
  const { data, refresh } = usePortalData();
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const requests = useMemo(() => data?.spare_part_requests || [], [data?.spare_part_requests]);

  const filteredRequests = requests.filter((request) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      (request.parent || '').toLowerCase().includes(query) ||
      (request.item_name || '').toLowerCase().includes(query) ||
      (request.customer || '').toLowerCase().includes(query) ||
      (request.vehicle || '').toLowerCase().includes(query)
    );
  });

  const handleAction = async (name: string, action: string) => {
    setUpdating(name);
    try {
      await updateSparePartRequestStatus(name, action);
      await refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Spare Part Requests</h1>
            <p className="text-slate-600">Permintaan part yang berasal dari service order aktif</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari berdasarkan order, part, customer, atau plat"
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-slate-700">Order</th>
                <th className="px-4 py-3 text-left text-slate-700">Part</th>
                <th className="px-4 py-3 text-left text-slate-700">Qty</th>
                <th className="px-4 py-3 text-left text-slate-700">Technicians</th>
                <th className="px-4 py-3 text-left text-slate-700">Status</th>
                <th className="px-4 py-3 text-left text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.name} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <p className="text-slate-900">{request.parent}</p>
                    <p className="text-slate-500 text-sm">{request.customer || request.vehicle}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900">{request.item_name}</p>
                    <p className="text-slate-500 text-sm">{request.item_code}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-900">{request.qty}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {(request.technicians || []).map((tech) => (
                      <p key={tech.technician}>{tech.technician_name}</p>
                    )) || <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-full border ${
                        statusColor[request.stock_status || ''] || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {request.stock_status || 'Requested'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-sm flex items-center gap-1"
                        onClick={() => handleAction(request.name, 'approve')}
                        disabled={updating === request.name}
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-1"
                        onClick={() => handleAction(request.name, 'reject')}
                        disabled={updating === request.name}
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm flex items-center gap-1"
                        onClick={() => handleAction(request.name, 'cancel')}
                        disabled={updating === request.name}
                      >
                        <Clock className="w-4 h-4" /> Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
