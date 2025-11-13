'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePortalData } from '../context/PortalDataContext';

const monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'short' });
const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function RevenueChart() {
  const { data } = usePortalData();

  const chartData = useMemo(() => {
    const invoices = data?.sales_invoices || [];
    const buckets = new Map<string, { label: string; value: number }>();

    invoices.forEach((invoice) => {
      if (!invoice.invoice_date || !invoice.total_amount) {
        return;
      }
      const date = new Date(invoice.invoice_date);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = `${monthFormatter.format(date)} ${String(date.getFullYear()).slice(-2)}`;
      const bucket = buckets.get(key) || { label, value: 0 };
      bucket.value += invoice.total_amount || 0;
      buckets.set(key, bucket);
    });

    return Array.from(buckets.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .slice(-6)
      .map(([, bucket]) => ({ month: bucket.label, revenue: Math.round(bucket.value / 1_000_000) }));
  }, [data?.sales_invoices]);

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200">
      <div className="mb-6">
        <h3 className="text-slate-800 mb-1">Revenue Overview</h3>
        <p className="text-slate-600">Rekap invoice per bulan (dalam juta Rupiah)</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" stroke="#64748b" />
          <YAxis stroke="#64748b" tickFormatter={(value) => `${value}M`} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value: number) => [currencyFormatter.format(value * 1_000_000), 'Revenue']}
          />
          <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
