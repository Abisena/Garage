'use client';

import React, { useMemo } from 'react';
import { Car, Key, RefreshCcw } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';
import { Button } from './ui/button';

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

function daysSince(dateValue?: string | null) {
  if (!dateValue) {
    return null;
  }
  try {
    const now = new Date();
    const target = new Date(dateValue);
    return Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export function Handover() {
  const { data, refresh } = usePortalData();
  const serviceOrders = data?.service_orders || [];

  const readyOrders = useMemo(() => {
    return serviceOrders.filter((order) => (order.status || '') === 'Completed' && !order.actual_delivery_date);
  }, [serviceOrders]);

  const deliveredOrders = useMemo(() => {
    return serviceOrders
      .filter((order) => order.status === 'Completed' && order.actual_delivery_date)
      .sort((a, b) => {
        const dateA = a.actual_delivery_date ? new Date(a.actual_delivery_date).getTime() : 0;
        const dateB = b.actual_delivery_date ? new Date(b.actual_delivery_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [serviceOrders]);

  const stats = useMemo(() => {
    const today = new Date();
    const todayDeliveries = deliveredOrders.filter((order) => {
      if (!order.actual_delivery_date) {
        return false;
      }
      const delivered = new Date(order.actual_delivery_date);
      return delivered.toDateString() === today.toDateString();
    }).length;
    const completedThisWeek = deliveredOrders.filter((order) => {
      const diff = daysSince(order.actual_delivery_date);
      return diff !== null && diff <= 7;
    }).length;
    return [
      { label: 'Ready for Pickup', value: readyOrders.length },
      { label: 'Delivered Today', value: todayDeliveries },
      { label: 'Delivered (7d)', value: completedThisWeek },
    ];
  }, [deliveredOrders, readyOrders.length]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Vehicle Handover</h1>
            <p className="text-slate-600">Pastikan kendaraan yang sudah selesai servis segera diserahkan ke customer.</p>
          </div>
          <Button variant="outline" onClick={() => refresh()} className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" /> Refresh Data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-200 text-center">
              <p className="text-slate-500 text-sm mb-1">{stat.label}</p>
              <p className="text-slate-900 text-2xl">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-slate-800">Ready for Handover</h3>
                  <p className="text-slate-500 text-sm">{readyOrders.length} kendaraan menunggu diambil customer</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refresh()}>
                  <Key className="w-4 h-4 mr-1" /> Update
                </Button>
              </div>
              <div className="divide-y divide-slate-200">
                {readyOrders.map((order) => (
                  <div key={order.name} className="p-6 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-slate-900 mb-1">{order.name}</h4>
                        <p className="text-slate-600">{order.customer_name || order.customer || '-'}</p>
                        <p className="text-slate-500 text-sm">{order.customer_phone || order.customer_email || '-'}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 text-sm">
                        Completed
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                      <div>
                        <p className="text-slate-500 text-xs">Vehicle</p>
                        <p className="text-slate-900">{order.vehicle_plate || '-'}</p>
                        <p>{[order.vehicle_brand, order.vehicle_model].filter(Boolean).join(' ')}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Estimated Delivery</p>
                        <p className="text-slate-900">{formatDate(order.estimated_delivery_date)}</p>
                        <p>Priority: {order.priority || 'Normal'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">QC Status</p>
                      <p className="text-slate-900">{order.qc_status || 'Belum QC'}</p>
                    </div>
                  </div>
                ))}
                {readyOrders.length === 0 && (
                  <div className="p-6 text-center text-slate-500">Tidak ada kendaraan yang menunggu handover.</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-800 mb-4">Recent Deliveries</h3>
              <div className="space-y-4">
                {deliveredOrders.map((order) => (
                  <div key={order.name} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-slate-900">{order.customer_name || order.customer || '-'}</p>
                        <p className="text-slate-500 text-sm">{order.vehicle_plate || '-'}</p>
                      </div>
                      <span className="text-slate-600 text-sm">{formatDate(order.actual_delivery_date)}</span>
                    </div>
                    <p className="text-slate-600 text-sm">{order.service_order_type || 'General Service'}</p>
                  </div>
                ))}
                {deliveredOrders.length === 0 && <p className="text-slate-500 text-sm">Belum ada handover terbaru.</p>}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Car className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-blue-900 font-medium">Checklist Reminder</p>
                  <p className="text-blue-700 text-sm">Gunakan daftar berikut sebelum menyerahkan kendaraan.</p>
                </div>
              </div>
              <ul className="text-blue-900 text-sm space-y-2">
                <li>• Pastikan pembayaran sudah dilunasi.</li>
                <li>• Jelaskan perbaikan yang dilakukan dan rekomendasi berikutnya.</li>
                <li>• Serahkan dokumen invoice & receipt ke customer.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
