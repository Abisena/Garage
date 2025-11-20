import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  TrendingUp, 
  Users, 
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  FileText,
  Wrench,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import { Card } from './ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { frappeClient } from '../lib/frappeClient';

export function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [branches, setBranches] = useState([]);
  const [branchMetrics, setBranchMetrics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      setIsLoading(true);
      setError('');
      try {
        const bootstrap = await frappeClient.getPortalBootstrap();
        let availableBranches = Array.isArray(bootstrap?.branches) ? bootstrap.branches : [];

        if (availableBranches.length === 0 && bootstrap) {
          availableBranches = [{ name: bootstrap?.active_branch || 'Default Branch', branch_name: bootstrap?.active_branch }];
        }

        const branchResults = [];

        for (const branch of availableBranches) {
          const branchName = branch?.name || branch?.branch_name;
          if (!branchName) continue;

          const branchData = await frappeClient.getPortalBootstrap({ branch: branchName });
          branchResults.push({ branch, data: branchData });
        }

        const allOrders = branchResults.flatMap((result) =>
          Array.isArray(result.data?.service_orders) ? result.data.service_orders : []
        );

        const metrics = branchResults
          .map(({ branch, data }) => {
            const branchName = branch?.name || branch?.branch_name;
            const displayName = branch?.branch_name || branchName || 'Unknown Branch';
            const branchOrders = Array.isArray(data?.service_orders) ? data.service_orders : [];
            const payments = Array.isArray(data?.payment_entries) ? data.payment_entries : [];
            const completed = branchOrders.filter((o) => (o.status || '').toLowerCase() === 'completed').length;
            const active = branchOrders.filter((o) => !['completed', 'cancelled'].includes((o.status || '').toLowerCase())).length;
            const revenueFromTotals = data?.totals?.payments_total;
            const revenueFromPayments = payments.reduce(
              (sum, entry) => sum + (Number(entry?.paid_amount) || 0),
              0
            );
            const revenue = typeof revenueFromTotals === 'number' ? revenueFromTotals : revenueFromPayments;

            return {
              key: branchName || displayName,
              name: branchName || displayName,
              displayName,
              orders: branchOrders.length,
              payments: payments.length,
              completed,
              active,
              revenue,
            };
          })
          .filter((item) => item.name);

        if (!cancelled) {
          setBranches(availableBranches);
          setOrders(allOrders);
          setBranchMetrics(metrics);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        if (!cancelled) {
          setError('Gagal memuat data dashboard.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  const branchColors = {
    Jakarta: { primary: '#3b82f6', light: '#dbeafe', gradient: 'from-blue-500 to-blue-600' },
    Bandung: { primary: '#10b981', light: '#d1fae5', gradient: 'from-emerald-500 to-emerald-600' },
    Surabaya: { primary: '#f59e0b', light: '#fef3c7', gradient: 'from-amber-500 to-amber-600' }
  };

  const fallbackThemes = [
    { primary: '#0ea5e9', light: '#e0f2fe', gradient: 'from-sky-500 to-blue-600' },
    { primary: '#22c55e', light: '#dcfce7', gradient: 'from-emerald-500 to-green-600' },
    { primary: '#a855f7', light: '#f3e8ff', gradient: 'from-purple-500 to-violet-600' },
    { primary: '#f97316', light: '#ffedd5', gradient: 'from-orange-500 to-amber-600' },
  ];

  const getBranchTheme = (branchName, index) => {
    return branchColors[branchName] || fallbackThemes[index % fallbackThemes.length];
  };

  // Overall metrics
  const totalRevenue = branchMetrics.reduce((sum, branch) => sum + (Number(branch.revenue) || 0), 0);
  const totalOrders = orders.length;
  const paidOrderCount = branchMetrics.reduce((sum, branch) => sum + (Number(branch.payments) || 0), 0);
  const completedOrders = orders.filter(o => (o.status || '').toLowerCase() === 'completed').length;
  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes((o.status || '').toLowerCase())).length;

  // Branch comparison data for charts
  const branchData = branchMetrics.map(branch => ({
    name: branch.displayName,
    revenue: branch.revenue,
    orders: branch.orders,
    completed: branch.completed,
    active: branch.active
  }));

  // Status distribution
  const statusData = [
    { name: 'Draft', value: orders.filter(o => (o.status || '').toLowerCase() === 'draft').length, color: '#3b82f6' },
    { name: 'Inspection', value: orders.filter(o => (o.status || '').toLowerCase() === 'inspection').length, color: '#8b5cf6' },
    { name: 'Estimate', value: orders.filter(o => (o.status || '').toLowerCase() === 'estimate').length, color: '#ec4899' },
    { name: 'Awaiting Approval', value: orders.filter(o => (o.status || '').toLowerCase() === 'awaiting approval').length, color: '#f59e0b' },
    { name: 'Approved', value: orders.filter(o => (o.status || '').toLowerCase() === 'approved').length, color: '#10b981' },
    { name: 'Work In Progress', value: orders.filter(o => (o.status || '').toLowerCase() === 'work in progress').length, color: '#06b6d4' },
    { name: 'Awaiting QC', value: orders.filter(o => (o.status || '').toLowerCase() === 'awaiting qc').length, color: '#0ea5e9' },
    { name: 'Quality Check', value: orders.filter(o => (o.status || '').toLowerCase() === 'quality check').length, color: '#14b8a6' },
    { name: 'Completed', value: orders.filter(o => (o.status || '').toLowerCase() === 'completed').length, color: '#22c55e' },
  ].filter(item => item.value > 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount) => {
    if (amount >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(1)}M`;
    if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}jt`;
    if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(0)}rb`;
    return formatCurrency(amount);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {isLoading && (
          <div className="p-4 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl text-sm">
            Memuat data dashboard realtime...
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-900 mb-1">Manager Dashboard</h1>
            <p className="text-slate-600">Multi-Branch Performance Overview</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-sm">Period:</span>
            <div className="flex gap-2">
              {['today', 'week', 'month'].map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    selectedPeriod === period
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ==== SECTION 1: COMPANY OVERVIEW ==== */}
        <div>
          <div className="mb-4">
            <h2 className="text-slate-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
              Company Overview
            </h2>
            <p className="text-slate-500 text-sm ml-4">Key performance indicators across all branches</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Revenue */}
            <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+23%</span>
                  </div>
                </div>
                <p className="text-white/70 text-sm mb-1">Total Revenue</p>
                <p className="text-3xl mb-2" style={{ fontWeight: 700 }}>{formatCompactCurrency(totalRevenue)}</p>
                <p className="text-white/60 text-xs">From {paidOrderCount} paid orders</p>
              </div>
            </Card>

            {/* Total Orders */}
            <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+12%</span>
                  </div>
                </div>
                <p className="text-white/70 text-sm mb-1">Total Orders</p>
                <p className="text-3xl mb-2" style={{ fontWeight: 700 }}>{totalOrders}</p>
                <p className="text-white/60 text-xs">{completedOrders} completed · {activeOrders} active</p>
              </div>
            </Card>

            {/* Completion Rate */}
            <Card className="bg-gradient-to-br from-amber-600 to-amber-700 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+8%</span>
                  </div>
                </div>
                <p className="text-white/70 text-sm mb-1">Completion Rate</p>
                <p className="text-3xl mb-2" style={{ fontWeight: 700 }}>
                  {totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}%
                </p>
                <p className="text-white/60 text-xs">Avg. time: 3.5 days</p>
              </div>
            </Card>

            {/* Active Branches */}
            <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1 text-xs bg-emerald-400 text-white px-2.5 py-1 rounded-full">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Realtime</span>
                  </div>
                </div>
                <p className="text-white/70 text-sm mb-1">Active Branches</p>
                <p className="text-3xl mb-2" style={{ fontWeight: 700 }}>
                  {branchMetrics.length} / {branches.length || branchMetrics.length || 0}
                </p>
                <p className="text-white/60 text-xs">
                  {branchMetrics.length > 0 ? branchMetrics.map(b => b.displayName).join(' · ') : 'No branch data'}
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* ==== SECTION 2: BRANCH PERFORMANCE ==== */}
        <div>
          <div className="mb-4">
            <h2 className="text-slate-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-emerald-600 rounded-full"></div>
              Branch Performance
            </h2>
            <p className="text-slate-500 text-sm ml-4">Individual branch metrics and completion status</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {branchMetrics.map((branch, index) => {
              const colors = getBranchTheme(branch.name, index);

              return (
                <Card key={branch.key} className="overflow-hidden border border-slate-200 shadow-md hover:shadow-lg transition-all">
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${colors.gradient} text-white p-5`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-white/20 rounded-lg p-2">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg" style={{ fontWeight: 600 }}>{branch.displayName}</h3>
                          <p className="text-white/70 text-xs">Branch Office</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                      <p className="text-white/70 text-xs mb-1">Total Revenue</p>
                      <p className="text-2xl" style={{ fontWeight: 700 }}>
                        {formatCompactCurrency(branch.revenue)}
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 bg-white">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-slate-500 text-xs mb-1.5">Total Orders</p>
                        <p className="text-slate-900 text-2xl" style={{ fontWeight: 700 }}>{branch.orders}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500 text-xs mb-1.5">Active</p>
                        <p className="text-blue-600 text-2xl" style={{ fontWeight: 700 }}>{branch.active}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500 text-xs mb-1.5">Completed</p>
                        <p className="text-emerald-600 text-2xl" style={{ fontWeight: 700 }}>{branch.completed}</p>
                      </div>
                    </div>

                    {/* Progress Section */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600 text-sm">Completion Progress</span>
                        <span className="text-slate-900 text-sm" style={{ fontWeight: 600 }}>
                          {branch.orders > 0 ? Math.round((branch.completed / branch.orders) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-500`}
                          style={{ width: `${branch.orders > 0 ? (branch.completed / branch.orders) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ==== SECTION 3: ANALYTICS & INSIGHTS ==== */}
        <div>
          <div className="mb-4">
            <h2 className="text-slate-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
              Analytics & Insights
            </h2>
            <p className="text-slate-500 text-sm ml-4">Visual comparison and trend analysis</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Branch Revenue Comparison */}
            <Card className="lg:col-span-2 p-6 shadow-md border border-slate-200">
              <div className="mb-5">
                <h3 className="text-slate-900 flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span style={{ fontWeight: 600 }}>Revenue Comparison by Branch</span>
                </h3>
                <p className="text-slate-500 text-sm">Total revenue performance across all locations</p>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={branchData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    style={{ fontSize: '13px', fontWeight: 500 }} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => formatCompactCurrency(value)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '13px',
                      padding: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value) => formatCurrency(value)}
                    labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="#3b82f6" 
                    radius={[10, 10, 0, 0]} 
                    name="Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Process Flow Status */}
            <Card className="p-6 shadow-md border border-slate-200">
              <div className="mb-5">
                <h3 className="text-slate-900 flex items-center gap-2 mb-1">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <span style={{ fontWeight: 600 }}>Process Flow</span>
                </h3>
                <p className="text-slate-500 text-sm">Orders by stage</p>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '13px',
                      padding: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {statusData.slice(0, 9).map((status, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }}></div>
                    <span className="text-xs text-slate-600">{status.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Orders Comparison Chart */}
        <Card className="p-6 shadow-md border border-slate-200">
          <div className="mb-5">
            <h3 className="text-slate-900 flex items-center gap-2 mb-1">
              <Wrench className="w-5 h-5 text-purple-600" />
              <span style={{ fontWeight: 600 }}>Orders Overview by Branch</span>
            </h3>
            <p className="text-slate-500 text-sm">Comparison of total, active, and completed orders</p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={branchData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                style={{ fontSize: '13px', fontWeight: 500 }} 
              />
              <YAxis 
                stroke="#64748b" 
                style={{ fontSize: '12px' }} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '13px',
                  padding: '12px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
                labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }}
                iconType="circle"
              />
              <Bar dataKey="orders" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Total Orders" />
              <Bar dataKey="active" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Active Orders" />
              <Bar dataKey="completed" fill="#10b981" radius={[8, 8, 0, 0]} name="Completed Orders" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* ==== SECTION 4: QUICK INSIGHTS ==== */}
        <div>
          <div className="mb-4">
            <h2 className="text-slate-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-amber-600 rounded-full"></div>
              Quick Insights
            </h2>
            <p className="text-slate-500 text-sm ml-4">Important metrics that need attention</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="p-5 bg-white border-l-4 border-l-blue-600 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm mb-2">Avg Order Value</p>
                  <p className="text-slate-900 text-2xl mb-1" style={{ fontWeight: 700 }}>
                    {formatCompactCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)}
                  </p>
                  <p className="text-slate-500 text-xs">Per transaction</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-white border-l-4 border-l-emerald-600 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm mb-2">Pending Approvals</p>
                  <p className="text-slate-900 text-2xl mb-1" style={{ fontWeight: 700 }}>
                    {orders.filter(o => (o.status || '').toLowerCase() === 'awaiting approval').length}
                  </p>
                  <p className="text-slate-500 text-xs">Awaiting decision</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-white border-l-4 border-l-amber-600 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm mb-2">In Progress</p>
                  <p className="text-slate-900 text-2xl mb-1" style={{ fontWeight: 700 }}>
                    {orders.filter(o => (o.status || '').toLowerCase() === 'work in progress').length}
                  </p>
                  <p className="text-slate-500 text-xs">Active repairs</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <Wrench className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-white border-l-4 border-l-red-600 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm mb-2">Needs Attention</p>
                  <p className="text-slate-900 text-2xl mb-1" style={{ fontWeight: 700 }}>
                    {orders.filter(o => ['quality check', 'inspection', 'awaiting qc'].includes((o.status || '').toLowerCase())).length}
                  </p>
                  <p className="text-slate-500 text-xs">QC & Inspection</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}