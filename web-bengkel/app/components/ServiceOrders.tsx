'use client';

import React, { useMemo, useState } from 'react';
import { Filter, Search, RefreshCcw } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';
import { Button } from './ui/button';

const statusLabels: Record<string, string> = {
  Draft: 'Draft',
  Inspection: 'Inspection',
  Estimate: 'Estimate',
  'Awaiting Approval': 'Awaiting Approval',
  Approved: 'Approved',
  'Work In Progress': 'Work In Progress',
  'Awaiting QC': 'Awaiting QC',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
};

const statusBadge: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
  Inspection: 'bg-amber-100 text-amber-700 border-amber-200',
  Estimate: 'bg-blue-100 text-blue-700 border-blue-200',
  Approved: 'bg-green-100 text-green-700 border-green-200',
  'Work In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Awaiting QC': 'bg-purple-100 text-purple-700 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export function ServiceOrders() {
  const { data, refresh } = usePortalData();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const serviceOrders = data?.service_orders || [];
  const customers = data?.customers || [];
  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((customer) => map.set(customer.name, customer.customer_name || customer.name));
    return map;
  }, [customers]);

  const statuses = useMemo(() => {
    const unique = new Set<string>();
    serviceOrders.forEach((order) => {
      if (order.status) {
        unique.add(order.status);
      }
    });
    return Array.from(unique.values());
  }, [serviceOrders]);

  const filteredOrders = serviceOrders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const query = search.toLowerCase();
    const matchesSearch = !query
      ? true
      : (order.name || '').toLowerCase().includes(query) ||
        (customerMap.get(order.customer || '') || '').toLowerCase().includes(query) ||
        (order.vehicle_plate || '').toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Service Orders</h1>
            <p className="text-slate-600">Daftar order servis yang tersimpan di Pravenya</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refresh()} className="flex items-center gap-2">
              <RefreshCcw className="w-4 h-4" /> Refresh Data
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status] || status}
                </option>
              ))}
            </select>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari order, customer, atau plat kendaraan"
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-slate-700">Order</th>
                <th className="px-4 py-3 text-left text-slate-700">Customer</th>
                <th className="px-4 py-3 text-left text-slate-700">Vehicle</th>
                <th className="px-4 py-3 text-left text-slate-700">Service Type</th>
                <th className="px-4 py-3 text-left text-slate-700">Status</th>
                <th className="px-4 py-3 text-left text-slate-700">Booking</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.name} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <p className="text-slate-900">{order.name}</p>
                    <p className="text-slate-500 text-sm">{order.branch || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900">{customerMap.get(order.customer || '') || order.customer}</p>
                    <p className="text-slate-500 text-sm">{order.customer_phone || order.customer_email || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900">{order.vehicle_plate || '-'}</p>
                    <p className="text-slate-500 text-sm">
                      {[order.vehicle_brand, order.vehicle_model, order.vehicle_year].filter(Boolean).join(' ')}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{order.service_order_type || '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-full border ${
                        statusBadge[order.status || ''] || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {order.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {order.service_booking_date
                      ? new Date(order.service_booking_date).toLocaleString('id-ID')
                      : '-'}
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
