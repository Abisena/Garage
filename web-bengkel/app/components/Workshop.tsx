'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock4, RefreshCcw, Search, Wrench } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';
import { Button } from './ui/button';

const ACTIVE_STATUSES = new Set(['Approved', 'Work In Progress', 'Awaiting QC']);
const STATUS_COLORS: Record<string, string> = {
  Approved: 'bg-blue-100 text-blue-700 border-blue-200',
  'Work In Progress': 'bg-amber-100 text-amber-700 border-amber-200',
  'Awaiting QC': 'bg-purple-100 text-purple-700 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const numberFormatter = new Intl.NumberFormat('id-ID');

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }
  try {
    return new Date(value).toLocaleString('id-ID');
  } catch {
    return value;
  }
}

export function Workshop() {
  const { data, refresh } = usePortalData();
  const [search, setSearch] = useState('');

  const requestsByOrder = useMemo(() => {
    const map = new Map<string, { pending: number; issued: number }>();
    (data?.spare_part_requests || []).forEach((request) => {
      if (!request.parent) {
        return;
      }
      const entry = map.get(request.parent) || { pending: 0, issued: 0 };
      if ((request.stock_status || '').toLowerCase() === 'issued') {
        entry.issued += 1;
      } else {
        entry.pending += 1;
      }
      map.set(request.parent, entry);
    });
    return map;
  }, [data?.spare_part_requests]);

  const workshopOrders = useMemo(() => {
    const orders = (data?.service_orders || []).filter((order) => ACTIVE_STATUSES.has(order.status || ''));
    if (!search) {
      return orders;
    }
    const query = search.toLowerCase();
    return orders.filter((order) => {
      return (
        (order.name || '').toLowerCase().includes(query) ||
        (order.customer_name || order.customer || '').toLowerCase().includes(query) ||
        (order.vehicle_plate || '').toLowerCase().includes(query)
      );
    });
  }, [data?.service_orders, search]);

  const stats = useMemo(() => {
    const approved = workshopOrders.filter((order) => (order.status || '') === 'Approved').length;
    const inProgress = workshopOrders.filter((order) => (order.status || '') === 'Work In Progress').length;
    const awaitingQC = workshopOrders.filter((order) => (order.status || '') === 'Awaiting QC').length;
    const partsPending = workshopOrders.filter((order) => {
      const entry = requestsByOrder.get(order.name);
      return entry ? entry.pending > 0 : false;
    }).length;
    return [
      { label: 'Approved Jobs', value: approved, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'In Progress', value: inProgress, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: 'Awaiting QC', value: awaitingQC, icon: Clock4, color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: 'Waiting Parts', value: partsPending, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    ];
  }, [requestsByOrder, workshopOrders]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Workshop & QC</h1>
            <p className="text-slate-600">Monitor progres pekerjaan teknisi beserta status QC terbaru.</p>
          </div>
          <Button variant="outline" onClick={() => refresh()} className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" /> Refresh Data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-3">
                <div className={`${stat.bg} rounded-lg p-3`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-slate-500 text-sm">{stat.label}</p>
                  <p className="text-slate-900 text-xl">{numberFormatter.format(stat.value)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
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
                <th className="px-4 py-3 text-left text-slate-700">Work Status</th>
                <th className="px-4 py-3 text-left text-slate-700">QC</th>
                <th className="px-4 py-3 text-left text-slate-700">Parts</th>
                <th className="px-4 py-3 text-left text-slate-700">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {workshopOrders.map((order) => {
                const requestInfo = requestsByOrder.get(order.name) || { pending: 0, issued: 0 };
                return (
                  <tr key={order.name} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{order.name}</p>
                      <p className="text-slate-500 text-sm">{order.branch || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{order.customer_name || order.customer || '-'}</p>
                      <p className="text-slate-500 text-sm">{order.customer_phone || order.customer_email || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{order.vehicle_plate || '-'}</p>
                      <p className="text-slate-500 text-sm">
                        {[order.vehicle_brand, order.vehicle_model].filter(Boolean).join(' ') || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-full border ${
                          STATUS_COLORS[order.status || ''] || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {order.status || '-'}
                      </span>
                      <p className="text-slate-500 text-xs mt-1">Job Card: {order.job_card_status || '-'}</p>
                      <p className="text-slate-500 text-xs">Work Order: {order.work_order_status || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{order.qc_status || '-'}</p>
                      <p className="text-slate-500 text-xs">Delivery: {formatDate(order.estimated_delivery_date)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">Pending: {requestInfo.pending}</p>
                      <p className="text-slate-500 text-xs">Issued: {requestInfo.issued}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <p>Booking: {formatDate(order.service_booking_date)}</p>
                      <p className="text-slate-500 text-xs">Est. Delivery: {formatDate(order.estimated_delivery_date)}</p>
                    </td>
                  </tr>
                );
              })}
              {workshopOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Tidak ada pekerjaan bengkel aktif untuk ditampilkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
