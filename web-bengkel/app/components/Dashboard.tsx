'use client';

import React from 'react';
import { StatCard } from './StatCard';
import { RecentOrders } from './RecentOrders';
import { RevenueChart } from './RevenueChart';
import { ServiceStatus } from './ServiceStatus';
import { 
  ClipboardList, 
  Users, 
  TrendingUp, 
  Wrench 
} from 'lucide-react';

export function Dashboard() {
  const stats = [
    {
      title: 'Active Orders',
      value: '24',
      change: '+12%',
      trend: 'up' as const,
      icon: ClipboardList,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Customers',
      value: '1,234',
      change: '+8%',
      trend: 'up' as const,
      icon: Users,
      color: 'bg-emerald-500'
    },
    {
      title: 'Monthly Revenue',
      value: 'Rp 45.2M',
      change: '+23%',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'bg-amber-500'
    },
    {
      title: 'Services Completed',
      value: '156',
      change: '+18%',
      trend: 'up' as const,
      icon: Wrench,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Title */}
        <div>
          <h1 className="text-slate-800 mb-1">Dashboard</h1>
          <p className="text-slate-600">Welcome back! Here's what's happening today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <div>
            <ServiceStatus />
          </div>
        </div>

        {/* Recent Orders */}
        <RecentOrders />
      </div>
    </div>
  );
}
