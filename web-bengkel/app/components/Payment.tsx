'use client';

import React, { useMemo } from 'react';
import { CreditCard, DollarSign, FileText, RefreshCcw, TrendingUp } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';
import { Button } from './ui/button';

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

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

export function Payment() {
  const { data, refresh } = usePortalData();

  const openInvoices = data?.open_invoices?.length ? data.open_invoices : data?.sales_invoices || [];
  const paymentEntries = useMemo(() => {
    const entries = [...(data?.payment_entries || [])];
    return entries
      .sort((a, b) => {
        const dateA = a.payment_date ? new Date(a.payment_date).getTime() : 0;
        const dateB = b.payment_date ? new Date(b.payment_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 8);
  }, [data?.payment_entries]);

  const stats = [
    {
      label: 'Invoice Issued',
      value: currencyFormatter.format(data?.totals?.invoice_total || 0),
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Outstanding',
      value: currencyFormatter.format(data?.totals?.outstanding_total || 0),
      icon: CreditCard,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Payments Collected',
      value: currencyFormatter.format(data?.totals?.payments_total || 0),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Payment & Invoicing</h1>
            <p className="text-slate-600">Sinkron langsung dengan Sales Invoice dan Payment Entry di Pravenya.</p>
          </div>
          <Button variant="outline" onClick={() => refresh()} className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" /> Refresh Data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-xl p-5 border border-slate-200 flex items-center gap-3">
                <div className={`${stat.bg} rounded-lg p-3`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-slate-500 text-sm">{stat.label}</p>
                  <p className="text-slate-900 text-xl">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-slate-800">Outstanding Invoices</h3>
                <p className="text-slate-500 text-sm">{openInvoices.length} invoice perlu ditindaklanjuti</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-sm">Total Outstanding</p>
                <p className="text-slate-900 text-lg">{currencyFormatter.format(data?.totals?.outstanding_total || 0)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-slate-700">Invoice</th>
                    <th className="px-4 py-3 text-left text-slate-700">Customer</th>
                    <th className="px-4 py-3 text-left text-slate-700">Amount</th>
                    <th className="px-4 py-3 text-left text-slate-700">Outstanding</th>
                    <th className="px-4 py-3 text-left text-slate-700">Due Date</th>
                    <th className="px-4 py-3 text-left text-slate-700">Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {openInvoices.map((invoice) => (
                    <tr key={invoice.name} className="border-b border-slate-100">
                      <td className="px-4 py-3">
                        <p className="text-slate-900">{invoice.name}</p>
                        <p className="text-slate-500 text-sm">{invoice.status || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-900">{invoice.customer || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-900">{currencyFormatter.format(invoice.total_amount || 0)}</td>
                      <td className="px-4 py-3 text-amber-600 font-medium">
                        {currencyFormatter.format(invoice.outstanding_amount || 0)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(invoice.due_date)}</td>
                      <td className="px-4 py-3 text-slate-700">{invoice.branch || invoice.branch_code || '-'}</td>
                    </tr>
                  ))}
                  {openInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        Semua invoice sudah terbayar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-800 mb-4">Recent Payments</h3>
              <div className="space-y-4">
                {paymentEntries.map((payment) => (
                  <div key={payment.name} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-slate-900">{payment.customer || '-'}</p>
                        <p className="text-slate-500 text-sm">{payment.mode_of_payment || 'Transfer'}</p>
                      </div>
                      <span className="text-slate-600 text-sm">{formatDate(payment.payment_date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-slate-600">{payment.name}</p>
                      <p className="text-slate-900">{currencyFormatter.format(payment.paid_amount || 0)}</p>
                    </div>
                  </div>
                ))}
                {paymentEntries.length === 0 && (
                  <p className="text-slate-500 text-sm">Belum ada pembayaran yang tercatat.</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-blue-900 font-medium">Collection Tips</p>
                  <p className="text-blue-700 text-sm">Utamakan follow-up invoice yang melewati due date.</p>
                </div>
              </div>
              <ul className="text-blue-900 text-sm space-y-2">
                <li>• Hubungi customer 1 hari sebelum jatuh tempo.</li>
                <li>• Gunakan Payment Entry untuk mencatat DP dan pelunasan.</li>
                <li>• Terbitkan Receipt Document setelah pembayaran diterima.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
