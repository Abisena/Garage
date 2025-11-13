'use client';

import React, { useMemo } from 'react';
import { usePortalData } from '../context/PortalDataContext';

const statusColorMap: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Work In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
  Inspection: 'bg-amber-100 text-amber-700 border-amber-200',
  'Awaiting Approval': 'bg-amber-100 text-amber-700 border-amber-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export function RecentOrders() {
  const { data } = usePortalData();
  const customers = data?.customers || [];
  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((customer) => map.set(customer.name, customer.customer_name || customer.name));
    return map;
  }, [customers]);

  const recentOrders = useMemo(() => {
    const orders = data?.service_orders || [];
    return [...orders]
      .sort((a, b) => {
        const dateA = a.service_booking_date ? new Date(a.service_booking_date).getTime() : 0;
        const dateB = b.service_booking_date ? new Date(b.service_booking_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [data?.service_orders]);

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-slate-800 mb-1">Recent Service Orders</h3>
        <p className="text-slate-600">Update terbaru dari order servis</p>
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
            {recentOrders.map((order) => (
              <tr key={order.name} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-900">{order.name}</td>
                <td className="px-6 py-4 text-slate-700">{customerMap.get(order.customer || '') || order.customer}</td>
                <td className="px-6 py-4 text-slate-700">
                  {order.vehicle_brand || order.vehicle_model ? `${order.vehicle_brand || ''} ${order.vehicle_model || ''}` : '-'}
                </td>
                <td className="px-6 py-4 text-slate-700">{order.vehicle_plate || '-'}</td>
                <td className="px-6 py-4 text-slate-700">{order.service_order_type || '-'}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full border ${
                      statusColorMap[order.status || ''] || 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {order.status || 'Unknown'}
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
