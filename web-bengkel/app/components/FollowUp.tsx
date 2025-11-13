'use client';

import React, { useMemo } from 'react';
import { Mail, MessageCircle, Phone, RefreshCcw, Star } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';
import { Button } from './ui/button';

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
}

function daysSince(dateValue?: string | null) {
  if (!dateValue) {
    return Infinity;
  }
  try {
    const now = new Date();
    const target = new Date(dateValue);
    return Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return Infinity;
  }
}

export function FollowUp() {
  const { data, refresh } = usePortalData();
  const completedOrders = useMemo(() => {
    return (data?.service_orders || []).filter((order) => order.status === 'Completed' && order.actual_delivery_date);
  }, [data?.service_orders]);

  const pendingFollowUps = useMemo(() => {
    return completedOrders
      .map((order) => ({ ...order, daysSince: daysSince(order.actual_delivery_date) }))
      .filter((order) => order.daysSince <= 7)
      .sort((a, b) => a.daysSince - b.daysSince)
      .slice(0, 6);
  }, [completedOrders]);

  const stats = useMemo(() => {
    const dueToday = pendingFollowUps.filter((order) => order.daysSince <= 1).length;
    const overdue = pendingFollowUps.filter((order) => order.daysSince >= 5).length;
    const totalCompleted = completedOrders.length;
    return [
      { label: 'Follow-ups (7d)', value: pendingFollowUps.length },
      { label: 'Due Today', value: dueToday },
      { label: 'Overdue', value: overdue },
      { label: 'Total Deliveries', value: totalCompleted },
    ];
  }, [completedOrders.length, pendingFollowUps]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Customer Follow-up</h1>
            <p className="text-slate-600">Kontak kembali customer setelah kendaraan diserahkan.</p>
          </div>
          <Button variant="outline" onClick={() => refresh()} className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" /> Refresh Data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-200 text-center">
              <p className="text-slate-500 text-sm mb-1">{stat.label}</p>
              <p className="text-slate-900 text-2xl">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-slate-800">Pending Follow-ups</h3>
              <p className="text-slate-500 text-sm">Prioritaskan customer yang baru menerima kendaraan.</p>
            </div>
            <div className="divide-y divide-slate-200">
              {pendingFollowUps.map((order) => (
                <div key={order.name} className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-slate-900 mb-1">{order.customer_name || order.customer || '-'}</h4>
                      <p className="text-slate-600">{order.vehicle_plate || '-'}</p>
                      <p className="text-slate-500 text-sm">Order: {order.name}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200 text-sm">
                      {order.daysSince} hari lalu
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Kontak</p>
                      <p className="text-slate-900">{order.customer_phone || '-'}</p>
                      <p className="text-slate-500">{order.customer_email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Service</p>
                      <p className="text-slate-900">{order.service_order_type || 'General Service'}</p>
                      <p className="text-slate-500">Delivery: {formatDate(order.actual_delivery_date)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="bg-blue-500 hover:bg-blue-600 text-white flex-1">
                      <Phone className="w-4 h-4 mr-2" /> Call
                    </Button>
                    <Button variant="outline" className="flex-1 border-slate-300">
                      <Mail className="w-4 h-4 mr-2" /> Email
                    </Button>
                    <Button variant="outline" className="flex-1 border-slate-300">
                      <MessageCircle className="w-4 h-4 mr-2" /> SMS
                    </Button>
                  </div>
                </div>
              ))}
              {pendingFollowUps.length === 0 && (
                <div className="p-6 text-center text-slate-500">Tidak ada follow-up yang jatuh tempo.</div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-800 mb-4">Recent Deliveries</h3>
              <div className="space-y-4">
                {completedOrders.slice(0, 4).map((order) => (
                  <div key={order.name} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-900">{order.customer_name || order.customer || '-'}</p>
                        <p className="text-slate-500 text-sm">{order.vehicle_plate || '-'}</p>
                      </div>
                      <span className="text-slate-500 text-sm">{formatDate(order.actual_delivery_date)}</span>
                    </div>
                    <p className="text-slate-600 text-sm">{order.service_order_type || 'General Service'}</p>
                  </div>
                ))}
                {completedOrders.length === 0 && <p className="text-slate-500 text-sm">Belum ada data penyerahan.</p>}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Star className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-blue-900 font-medium">Follow-up Tips</p>
                  <p className="text-blue-700 text-sm">Kumpulkan feedback dalam 24 jam setelah handover.</p>
                </div>
              </div>
              <ul className="text-blue-900 text-sm space-y-2">
                <li>• Ucapkan terima kasih dan tanyakan pengalaman servis.</li>
                <li>• Catat keluhan untuk tindak lanjut tim terkait.</li>
                <li>• Ajak customer booking servis berikutnya.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
