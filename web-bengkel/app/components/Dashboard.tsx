'use client';

import React, { useMemo } from 'react';
import { StatCard } from './StatCard';
import { RecentOrders } from './RecentOrders';
import { RevenueChart } from './RevenueChart';
import { ServiceStatus } from './ServiceStatus';
import { ClipboardList, Users, TrendingUp, Wrench } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';

const numberFormatter = new Intl.NumberFormat('id-ID');
const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function Dashboard() {
  const { data } = usePortalData();
  const serviceOrders = data?.service_orders || [];
  const customers = data?.customers || [];

  const stats = useMemo(() => {
    const activeOrders = serviceOrders.filter(
      (order) => order.status && !['Completed', 'Cancelled'].includes(order.status),
    ).length;
    const completedOrders = serviceOrders.filter((order) => order.status === 'Completed').length;
    const revenue = data?.totals?.invoice_total || 0;

    return [
      {
        title: 'Active Orders',
        value: numberFormatter.format(activeOrders),
        icon: ClipboardList,
        color: 'bg-blue-500',
      },
      {
        title: 'Total Customers',
        value: numberFormatter.format(customers.length),
        icon: Users,
        color: 'bg-emerald-500',
      },
      {
        title: 'Monthly Revenue',
        value: currencyFormatter.format(revenue),
        icon: TrendingUp,
        color: 'bg-amber-500',
      },
      {
        title: 'Services Completed',
        value: numberFormatter.format(completedOrders),
        icon: Wrench,
        color: 'bg-purple-500',
      },
    ];
  }, [customers.length, data?.totals?.invoice_total, serviceOrders]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-slate-800 mb-1">Dashboard</h1>
          <p className="text-slate-600">Snapshot real-time aktivitas bengkel.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <div>
            <ServiceStatus />
          </div>
        </div>

        <RecentOrders />
      </div>
    </div>
  );
}
