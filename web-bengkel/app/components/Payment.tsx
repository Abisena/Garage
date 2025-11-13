'use client';

import React from 'react';
import { CreditCard, DollarSign, FileText, Printer } from 'lucide-react';
import { Button } from './ui/button';

export function Payment() {
  const pendingPayments = [
    {
      orderId: 'ORD-002',
      customer: 'Siti Rahayu',
      vehicle: 'Honda Jazz 2019',
      plate: 'B 5678 ABC',
      services: [
        { name: 'Brake Pad Replacement', price: 450000 },
        { name: 'Brake Fluid Change', price: 150000 },
        { name: 'Labor', price: 200000 }
      ],
      parts: 600000,
      labor: 200000,
      subtotal: 800000,
      tax: 80000,
      total: 880000,
      status: 'Ready for Payment'
    }
  ];

  const recentPayments = [
    {
      id: 'PAY-001',
      orderId: 'ORD-001',
      customer: 'Budi Santoso',
      amount: 2500000,
      method: 'Transfer',
      time: '14:30'
    },
    {
      id: 'PAY-002',
      orderId: 'ORD-003',
      customer: 'Ahmad Yani',
      amount: 500000,
      method: 'Cash',
      time: '13:15'
    }
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-emerald-500 rounded-lg p-2">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-slate-800">Payment & Invoicing</h1>
                <p className="text-slate-600">Step 7: Process payments and generate invoices</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            {pendingPayments.map((payment, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200">
                {/* Invoice Header */}
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-slate-900 mb-1">Invoice - {payment.orderId}</h3>
                      <p className="text-slate-600">{payment.customer}</p>
                      <p className="text-slate-500">{payment.vehicle} - {payment.plate}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full border bg-amber-100 text-amber-700 border-amber-200">
                      {payment.status}
                    </span>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="p-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 text-slate-700">Description</th>
                        <th className="text-right py-3 text-slate-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payment.services.map((service, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-3 text-slate-700">{service.name}</td>
                          <td className="py-3 text-slate-900 text-right">
                            Rp {service.price.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-b border-slate-200">
                        <td className="py-3 text-slate-900">Subtotal</td>
                        <td className="py-3 text-slate-900 text-right">
                          Rp {payment.subtotal.toLocaleString('id-ID')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 text-slate-700">Tax (10%)</td>
                        <td className="py-3 text-slate-700 text-right">
                          Rp {payment.tax.toLocaleString('id-ID')}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-4">
                          <span className="text-slate-900">Total</span>
                        </td>
                        <td className="py-4 text-right">
                          <span className="text-slate-900">
                            Rp {payment.total.toLocaleString('id-ID')}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Payment Method */}
                <div className="p-6 border-t border-slate-200 bg-slate-50">
                  <h4 className="text-slate-800 mb-4">Payment Method</h4>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <button className="p-4 border-2 border-blue-500 bg-blue-50 rounded-lg">
                      <CreditCard className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                      <span className="text-slate-900">Cash</span>
                    </button>
                    <button className="p-4 border-2 border-slate-200 hover:border-slate-300 rounded-lg">
                      <DollarSign className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                      <span className="text-slate-700">Transfer</span>
                    </button>
                    <button className="p-4 border-2 border-slate-200 hover:border-slate-300 rounded-lg">
                      <CreditCard className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                      <span className="text-slate-700">Debit Card</span>
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="block text-slate-700 mb-2">Amount Received</label>
                    <input
                      type="text"
                      placeholder="Rp 0"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Process Payment
                    </Button>
                    <Button variant="outline" className="border-slate-300">
                      <Printer className="w-4 h-4 mr-2" />
                      Print Invoice
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Today's Revenue */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-800 mb-4">Today's Revenue</h3>
              <div className="text-center py-6">
                <p className="text-slate-600 mb-2">Total</p>
                <h2 className="text-emerald-600 mb-4">Rp 8.5M</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Cash</span>
                    <span className="text-slate-900">Rp 3.2M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Transfer</span>
                    <span className="text-slate-900">Rp 4.1M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Card</span>
                    <span className="text-slate-900">Rp 1.2M</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Payments */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-800 mb-4">Recent Payments</h3>
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-900">{payment.customer}</span>
                      <span className="text-slate-500">{payment.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{payment.orderId}</span>
                      <span className="text-emerald-600">
                        Rp {(payment.amount / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    <span className="text-slate-500 text-xs">{payment.method}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
