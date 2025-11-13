'use client';

import React from 'react';
import { Clock, Wrench, CheckCircle, AlertCircle } from 'lucide-react';

export function ServiceStatus() {
  const statuses = [
    { label: 'Waiting', count: 8, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'In Progress', count: 12, icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Completed', count: 4, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Urgent', count: 3, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
  ];

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 h-full">
      <div className="mb-6">
        <h3 className="text-slate-800 mb-1">Service Status</h3>
        <p className="text-slate-600">Current service breakdown</p>
      </div>
      <div className="space-y-4">
        {statuses.map((status, index) => {
          const Icon = status.icon;
          return (
            <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
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
