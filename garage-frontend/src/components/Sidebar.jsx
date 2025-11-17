import { LayoutDashboard, ClipboardList, Search, Wrench, Package, DollarSign, UserCheck, Phone, BarChart3 } from 'lucide-react';

export function Sidebar({ currentUser, currentPage, onPageChange }) {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: null },
    { id: 'registration', icon: ClipboardList, label: 'Customer Registration', badge: '1' },
    { id: 'inspection', icon: Search, label: 'Inspection & Diagnosis', badge: '2' },
    { id: 'orders', icon: Wrench, label: 'Repair Orders', badge: '3' },
    { id: 'spareparts', icon: Package, label: 'Spare Parts', badge: '4' },
    { id: 'workshop', icon: Wrench, label: 'Repair & QC', badge: '5-6' },
    { id: 'payment', icon: DollarSign, label: 'Payment', badge: '7' },
    { id: 'handover', icon: UserCheck, label: 'Vehicle Handover', badge: '8' },
    { id: 'followup', icon: Phone, label: 'Follow-up', badge: '9' },
    { id: 'reports', icon: BarChart3, label: 'Reports', badge: null },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen">
      {/* Logo */}
      <div className="px-6 py-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">IMOGI</h1>
            <h2 className="text-lg font-semibold">Workshop</h2>
          </div>
        </div>
        <p className="text-sm text-slate-400 ml-13">Management System</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${
                isActive ? 'bg-blue-500' : 'bg-slate-700'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              {item.badge && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-sm font-bold">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Admin User</p>
            <p className="text-xs text-slate-400 truncate">
              {currentUser?.username || 'admin'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;