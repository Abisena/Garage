import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Search,
  FileText,
  Package,
  Wrench,
  CheckCircle,
  CreditCard,
  Car,
  MessageCircle,
  BarChart3,
  Settings,
  GitBranch
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export function Sidebar({ currentPage, setCurrentPage }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'divider-1' },
    { 
      id: 'registration', 
      label: 'Customer Registration', 
      icon: ClipboardList,
      step: '1'
    },
    { 
      id: 'inspection', 
      label: 'Inspection & Diagnosis', 
      icon: Search,
      step: '2'
    },
    { 
      id: 'orders', 
      label: 'Repair Orders', 
      icon: FileText,
      step: '3'
    },
    { 
      id: 'sparepartsrequest', 
      label: 'Spare Parts Request', 
      icon: Package,
      step: '4'
    },
    { 
      id: 'workshop', 
      label: 'Repair & QC', 
      icon: Wrench,
      step: '5-6'
    },
    { 
      id: 'payment', 
      label: 'Payment', 
      icon: CreditCard,
      step: '7'
    },
    { 
      id: 'handover', 
      label: 'Vehicle Handover', 
      icon: Car,
      step: '8'
    },
    { 
      id: 'followup', 
      label: 'Follow-up', 
      icon: MessageCircle,
      step: '9'
    },
    { id: 'divider-2' },
    { id: 'spareparts', label: 'Master Spare Parts', icon: Package },
    { id: 'process', label: 'Business Process Flow', icon: GitBranch },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 rounded-lg p-2">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-white">AutoCare</h2>
            <p className="text-slate-400">Workshop Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            if (item.id === 'divider-1' || item.id === 'divider-2') {
              return <li key={item.id} className="border-t border-slate-800 my-4"></li>;
            }
            
            const Icon = item.icon!;
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {item.step && (
                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">
                      {item.step}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
            <span className="text-slate-300">AD</span>
          </div>
          <div className="flex-1">
            <p className="text-white">Admin User</p>
            <p className="text-slate-400">admin@autocare.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}