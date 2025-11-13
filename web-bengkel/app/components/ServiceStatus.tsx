'use client';

import React, { useMemo } from 'react';
import { Clock, Wrench, CheckCircle, AlertCircle } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';

export function ServiceStatus() {
  const { data } = usePortalData();
  const serviceOrders = data?.service_orders || [];
  const statusSummary = data?.status_summary?.service_orders || {};

  const stats = useMemo(() => {
    const waitingStatuses = new Set(['Draft', 'Inspection', 'Estimate', 'Awaiting Approval']);
    const progressStatuses = new Set(['Work In Progress', 'Approved', 'Awaiting QC']);

    const waiting = serviceOrders.filter((order) => waitingStatuses.has(order.status || '')).length;
    const inProgress = serviceOrders.filter((order) => progressStatuses.has(order.status || '')).length;
    const completed = statusSummary['Completed'] || 0;
    const urgent = serviceOrders.filter((order) => {
      const priority = (order.priority || '').toLowerCase();
      return priority === 'urgent' || priority === 'emergency';
    }).length;

    return [
      { label: 'Waiting', count: waiting, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
      { label: 'In Progress', count: inProgress, icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-50' },
      { label: 'Completed', count: completed, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
      { label: 'Urgent', count: urgent, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
    ];
  }, [serviceOrders, statusSummary]);

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 h-full">
      <div className="mb-6">
        <h3 className="text-slate-800 mb-1">Service Status</h3>
        <p className="text-slate-600">Distribusi status order servis saat ini</p>
      </div>
      <div className="space-y-4">
        {stats.map((status, index) => {
          const Icon = status.icon;
          return (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`${status.bg} rounded-lg p-2`}>
                  <Icon className={`w-5 h-5 ${status.color}`} />
                </div>
                <span className="text-slate-700">{status.label}</span>
              </div>
              <span className="text-slate-900">{status.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
