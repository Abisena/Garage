'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function RevenueChart() {
  const data = [
    { month: 'Jan', revenue: 32 },
    { month: 'Feb', revenue: 38 },
    { month: 'Mar', revenue: 35 },
    { month: 'Apr', revenue: 42 },
    { month: 'May', revenue: 39 },
    { month: 'Jun', revenue: 45 },
  ];

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200">
      <div className="mb-6">
        <h3 className="text-slate-800 mb-1">Revenue Overview</h3>
        <p className="text-slate-600">Monthly revenue in million Rupiah</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: 'none', 
              borderRadius: '8px',
              color: '#fff'
            }}
            formatter={(value) => [`Rp ${value}M`, 'Revenue']}
          />
          <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
