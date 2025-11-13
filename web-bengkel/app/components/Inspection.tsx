'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Clock4, RefreshCcw, Search } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';
import { Button } from './ui/button';
import { PortalServiceOrder } from '../../lib/types';

const INSPECTION_STATUSES = new Set(['Draft', 'Inspection', 'Estimate', 'Awaiting Approval']);

const statusBadges: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
  Inspection: 'bg-amber-100 text-amber-700 border-amber-200',
  Estimate: 'bg-blue-100 text-blue-700 border-blue-200',
  'Awaiting Approval': 'bg-purple-100 text-purple-700 border-purple-200',
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const numberFormatter = new Intl.NumberFormat('id-ID');

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

export function Inspection() {
  const { data, refresh } = usePortalData();
  const [search, setSearch] = useState('');

  const inspectionOrders = useMemo(() => {
    const orders = (data?.service_orders || []).filter((order) => INSPECTION_STATUSES.has(order.status || ''));
    if (!search) {
      return orders;
    }
    const query = search.toLowerCase();
    return orders.filter((order) => {
      const customer = (order.customer_name || order.customer || '').toLowerCase();
      const vehicle = (order.vehicle_plate || order.vehicle_model || '').toLowerCase();
      return (
        (order.name || '').toLowerCase().includes(query) ||
        customer.includes(query) ||
        vehicle.includes(query)
      );
    });
  }, [data?.service_orders, search]);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const activeOrderId = useMemo(() => {
    if (selectedOrderId && inspectionOrders.some((order) => order.name === selectedOrderId)) {
      return selectedOrderId;
    }
    return inspectionOrders[0]?.name || null;
  }, [inspectionOrders, selectedOrderId]);

  const selectedOrder: PortalServiceOrder | null = useMemo(() => {
    if (!activeOrderId) {
      return null;
    }
    return inspectionOrders.find((order) => order.name === activeOrderId) || null;
  }, [activeOrderId, inspectionOrders]);

  const stats = useMemo(() => {
    const waiting = inspectionOrders.filter((order) => (order.status || '') === 'Draft').length;
    const scheduled = inspectionOrders.filter((order) => (order.status || '') === 'Inspection').length;
    const estimating = inspectionOrders.filter((order) => (order.status || '') === 'Estimate').length;
    const awaitingApproval = inspectionOrders.filter((order) => (order.status || '') === 'Awaiting Approval').length;
    return [
      { label: 'Waiting Intake', value: waiting, icon: ClipboardList, color: 'text-slate-700', bg: 'bg-slate-100' },
      { label: 'In Inspection', value: scheduled, icon: Clock4, color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: 'Estimating', value: estimating, icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Awaiting Approval', value: awaitingApproval, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];
  }, [inspectionOrders]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Inspection & Diagnosis</h1>
            <p className="text-slate-600">Pantau antrean service order yang sedang menunggu inspeksi teknis.</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
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
                    <th className="px-4 py-3 text-left text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left text-slate-700">Booking</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectionOrders.map((order) => (
                    <tr
                      key={order.name}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                        activeOrderId === order.name ? 'bg-slate-50' : ''
                      }`}
                      onClick={() => setSelectedOrderId(order.name)}
                    >
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
                          {[order.vehicle_brand, order.vehicle_model, order.vehicle_year].filter(Boolean).join(' ')}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-3 py-1 rounded-full border ${
                            statusBadges[order.status || ''] || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {order.status || 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(order.service_booking_date)}</td>
                    </tr>
                  ))}
                  {inspectionOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        Tidak ada order yang menunggu inspeksi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            {selectedOrder ? (
              <div className="space-y-4">
                <div>
                  <p className="text-slate-500 text-sm mb-1">Selected Order</p>
                  <h3 className="text-slate-900">{selectedOrder.name}</h3>
                  <p className="text-slate-600">{selectedOrder.service_order_type || 'General Service'}</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <p className="text-slate-500 text-sm">Customer</p>
                    <p className="text-slate-900">{selectedOrder.customer_name || selectedOrder.customer || '-'}</p>
                    <p className="text-slate-500 text-sm">{selectedOrder.customer_phone || selectedOrder.customer_email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Vehicle</p>
                    <p className="text-slate-900">{selectedOrder.vehicle_plate || '-'}</p>
                    <p className="text-slate-500 text-sm">
                      {[selectedOrder.vehicle_brand, selectedOrder.vehicle_model, selectedOrder.vehicle_year]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Branch</p>
                    <p className="text-slate-900">{selectedOrder.branch || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Booking Time</p>
                    <p className="text-slate-900">{formatDate(selectedOrder.service_booking_date)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-slate-500 text-sm mb-2">Customer Notes</p>
                  <p className="text-slate-800 bg-slate-50 rounded-lg p-4 border border-slate-200">
                    {selectedOrder.service_notes || 'Tidak ada catatan tambahan dari customer.'}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 text-sm mb-2">Inspection Summary</p>
                  <p className="text-slate-800 bg-slate-50 rounded-lg p-4 border border-slate-200">
                    {selectedOrder.inspection_summary || 'Belum ada hasil inspeksi yang dicatat.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-sm">Priority</p>
                    <p className="text-slate-900">{selectedOrder.priority || 'Normal'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Booking Channel</p>
                    <p className="text-slate-900">{selectedOrder.booking_channel || 'Walk-In'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Pilih order pada tabel untuk melihat detail inspeksi.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
