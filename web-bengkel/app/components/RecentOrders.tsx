'use client';
  
import React from 'react';
import { Badge } from './ui/badge';

export function RecentOrders() {
  const orders = [
    {
      id: 'ORD-001',
      customer: 'Budi Santoso',
      vehicle: 'Toyota Avanza 2020',
      plate: 'B 1234 XYZ',
      service: 'Engine Service',
      status: 'In Progress',
      statusColor: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    {
      id: 'ORD-002',
      customer: 'Siti Rahayu',
      vehicle: 'Honda Jazz 2019',
      plate: 'B 5678 ABC',
      service: 'Brake Replacement',
      status: 'Completed',
      statusColor: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    },
    {
      id: 'ORD-003',
      customer: 'Ahmad Yani',
      vehicle: 'Suzuki Ertiga 2021',
      plate: 'B 9012 DEF',
      service: 'Oil Change',
      status: 'Waiting',
      statusColor: 'bg-amber-100 text-amber-700 border-amber-200'
    },
    {
      id: 'ORD-004',
      customer: 'Dewi Lestari',
      vehicle: 'Mitsubishi Xpander 2022',
      plate: 'B 3456 GHI',
      service: 'Transmission Repair',
      status: 'Urgent',
      statusColor: 'bg-red-100 text-red-700 border-red-200'
    },
    {
      id: 'ORD-005',
      customer: 'Rudi Hartono',
      vehicle: 'Daihatsu Xenia 2018',
      plate: 'B 7890 JKL',
      service: 'AC Service',
      status: 'In Progress',
      statusColor: 'bg-blue-100 text-blue-700 border-blue-200'
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-slate-800 mb-1">Recent Service Orders</h3>
        <p className="text-slate-600">Latest service requests and their status</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-left text-slate-700">Order ID</th>
              <th className="px-6 py-3 text-left text-slate-700">Customer</th>
              <th className="px-6 py-3 text-left text-slate-700">Vehicle</th>
              <th className="px-6 py-3 text-left text-slate-700">Plate Number</th>
              <th className="px-6 py-3 text-left text-slate-700">Service</th>
              <th className="px-6 py-3 text-left text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-900">{order.id}</td>
                <td className="px-6 py-4 text-slate-700">{order.customer}</td>
                <td className="px-6 py-4 text-slate-700">{order.vehicle}</td>
                <td className="px-6 py-4 text-slate-700">{order.plate}</td>
                <td className="px-6 py-4 text-slate-700">{order.service}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full border ${order.statusColor}`}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
