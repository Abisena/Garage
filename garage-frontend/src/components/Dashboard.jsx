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

export function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    const savedOrders = localStorage.getItem('workOrders');
    if (savedOrders) {
      const parsedOrders = JSON.parse(savedOrders);
      // If no orders or very few orders, use demo data
      if (parsedOrders.length < 5) {
        const demoData = generateDemoData();
        setOrders(demoData);
        // Save demo data to localStorage
        localStorage.setItem('workOrders', JSON.stringify(demoData));
      } else {
        setOrders(parsedOrders);
      }
    } else {
      // No data at all, use demo data
      const demoData = generateDemoData();
      setOrders(demoData);
      // Save demo data to localStorage
      localStorage.setItem('workOrders', JSON.stringify(demoData));
    }
  };

  const generateDemoData = () => {
    const branches = ['Jakarta', 'Bandung', 'Surabaya'];
    const statuses = ['registration', 'inspection', 'estimation', 'approval', 'repair', 'quality-check', 'payment', 'handover', 'completed'];
    const customers = [
      'Budi Santoso', 'Siti Aminah', 'Rudi Hartono', 'Ani Wijaya', 'Agus Setiawan',
      'Dewi Lestari', 'Hendra Gunawan', 'Maya Sari', 'Eko Prasetyo', 'Rina Wati',
      'Bambang Susilo', 'Lina Marlina', 'Dedi Kurniawan', 'Sri Mulyani', 'Yanto Wijaya',
      'Putri Amelia', 'Joko Widodo', 'Ratna Sari', 'Arif Rahman', 'Lia Kusuma'
    ];
    const vehicles = [
      { brand: 'Toyota', model: 'Avanza' },
      { brand: 'Honda', model: 'Civic' },
      { brand: 'Suzuki', model: 'Ertiga' },
      { brand: 'Daihatsu', model: 'Xenia' },
      { brand: 'Mitsubishi', model: 'Pajero' },
      { brand: 'Nissan', model: 'Grand Livina' },
      { brand: 'Toyota', model: 'Fortuner' },
      { brand: 'Honda', model: 'CR-V' },
      { brand: 'Mazda', model: 'CX-5' },
      { brand: 'Toyota', model: 'Innova' }
    ];

    const demoOrders = [];
    
    // Generate 45 demo orders (15 per branch)
    branches.forEach((branch, branchIdx) => {
      for (let i = 0; i < 15; i++) {
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
        const randomVehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
        const isCompleted = randomStatus === 'completed' || Math.random() > 0.6;
        const isPaid = isCompleted || Math.random() > 0.5;
        
        // Generate spare parts
        const numParts = Math.floor(Math.random() * 4) + 1;
        const spareParts = Array.from({ length: numParts }, (_, idx) => ({
          price: Math.floor(Math.random() * 2000000) + 100000,
          quantity: Math.floor(Math.random() * 3) + 1
        }));

        const laborCost = Math.floor(Math.random() * 1500000) + 300000;
        
        // Random date in last 30 days
        const daysAgo = Math.floor(Math.random() * 30);
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - daysAgo);

        const orderNum = String(branchIdx * 15 + i + 1).padStart(3, '0');
        const branchCode = branch === 'Jakarta' ? 'JKT' : branch === 'Bandung' ? 'BDG' : 'SBY';

        demoOrders.push({
          id: `demo-${branchCode}-${orderNum}`,
          orderId: `${branchCode}-${orderNum}`,
          customerName: randomCustomer,
          branch: branch,
          status: isCompleted ? 'completed' : randomStatus,
          date: orderDate.toISOString(),
          spareParts: spareParts,
          laborCost: laborCost,
          paymentStatus: isPaid ? 'paid' : Math.random() > 0.5 ? 'pending' : 'partial'
        });
      }
    });

    return demoOrders;
  };

  // Calculate metrics
  const calculateGrandTotal = (order) => {
    const partsTotal = order.spareParts?.reduce((sum, part) => sum + (part.price * part.quantity), 0) || 0;
    const labor = order.laborCost || 0;
    return partsTotal + labor;
  };

  const getBranchMetrics = (branch) => {
    const branchOrders = orders.filter(o => o.branch === branch);
    const completed = branchOrders.filter(o => o.status === 'completed').length;
    const active = branchOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
    const revenue = branchOrders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + calculateGrandTotal(o), 0);
    
    return { total: branchOrders.length, completed, active, revenue };
  };

  const branches = ['Jakarta', 'Bandung', 'Surabaya'];
  const branchColors = {
    Jakarta: { primary: '#3b82f6', light: '#dbeafe', gradient: 'from-blue-500 to-blue-600' },
    Bandung: { primary: '#10b981', light: '#d1fae5', gradient: 'from-emerald-500 to-emerald-600' },
    Surabaya: { primary: '#f59e0b', light: '#fef3c7', gradient: 'from-amber-500 to-amber-600' }
  };

  // Overall metrics
  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + calculateGrandTotal(o), 0);
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;

  // Branch comparison data for charts
  const branchData = branches.map(branch => {
    const metrics = getBranchMetrics(branch);
    return {
      name: branch,
      revenue: metrics.revenue,
      orders: metrics.total,
      completed: metrics.completed,
      active: metrics.active
    };
  });

  // Status distribution
  const statusData = [
    { name: 'Registration', value: orders.filter(o => o.status === 'registration').length, color: '#3b82f6' },
    { name: 'Inspection', value: orders.filter(o => o.status === 'inspection').length, color: '#8b5cf6' },
    { name: 'Estimation', value: orders.filter(o => o.status === 'estimation').length, color: '#ec4899' },
    { name: 'Approval', value: orders.filter(o => o.status === 'approval').length, color: '#f59e0b' },
    { name: 'Repair', value: orders.filter(o => o.status === 'repair').length, color: '#10b981' },
    { name: 'Quality Check', value: orders.filter(o => o.status === 'quality-check').length, color: '#06b6d4' },
    { name: 'Payment', value: orders.filter(o => o.status === 'payment').length, color: '#f97316' },
    { name: 'Handover', value: orders.filter(o => o.status === 'handover').length, color: '#14b8a6' },
    { name: 'Completed', value: orders.filter(o => o.status === 'completed').length, color: '#22c55e' },
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
                <p className="text-white/60 text-xs">From {orders.filter(o => o.paymentStatus === 'paid').length} paid orders</p>
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
                    <span>All Active</span>
                  </div>
                </div>
                <p className="text-white/70 text-sm mb-1">Active Branches</p>
                <p className="text-3xl mb-2" style={{ fontWeight: 700 }}>3 / 3</p>
                <p className="text-white/60 text-xs">JKT · BDG · SBY</p>
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
            {branches.map(branch => {
              const metrics = getBranchMetrics(branch);
              const colors = branchColors[branch];
              
              return (
                <Card key={branch} className="overflow-hidden border border-slate-200 shadow-md hover:shadow-lg transition-all">
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${colors.gradient} text-white p-5`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-white/20 rounded-lg p-2">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg" style={{ fontWeight: 600 }}>{branch}</h3>
                          <p className="text-white/70 text-xs">Branch Office</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                      <p className="text-white/70 text-xs mb-1">Total Revenue</p>
                      <p className="text-2xl" style={{ fontWeight: 700 }}>
                        {formatCompactCurrency(metrics.revenue)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Body */}
                  <div className="p-5 bg-white">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-slate-500 text-xs mb-1.5">Total Orders</p>
                        <p className="text-slate-900 text-2xl" style={{ fontWeight: 700 }}>{metrics.total}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500 text-xs mb-1.5">Active</p>
                        <p className="text-blue-600 text-2xl" style={{ fontWeight: 700 }}>{metrics.active}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500 text-xs mb-1.5">Completed</p>
                        <p className="text-emerald-600 text-2xl" style={{ fontWeight: 700 }}>{metrics.completed}</p>
                      </div>
                    </div>
                    
                    {/* Progress Section */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600 text-sm">Completion Progress</span>
                        <span className="text-slate-900 text-sm" style={{ fontWeight: 600 }}>
                          {metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-500`}
                          style={{ width: `${metrics.total > 0 ? (metrics.completed / metrics.total) * 100 : 0}%` }}
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
                    {orders.filter(o => o.status === 'approval').length}
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
                    {orders.filter(o => o.status === 'repair').length}
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
                    {orders.filter(o => o.status === 'quality-check' || o.status === 'inspection').length}
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