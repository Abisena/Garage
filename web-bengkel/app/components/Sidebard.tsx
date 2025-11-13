'use client';

import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Search,
  FileText,
  Package,
  Wrench,
  CreditCard,
  Car,
  MessageCircle,
  BarChart3,
  Settings,
  GitBranch,
} from 'lucide-react';
import { User } from '../page';
import { usePortalData } from '../context/PortalDataContext';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  currentUser: User;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'divider-1' },
  { id: 'registration', label: 'Customer Registration', icon: ClipboardList, step: '1', navKey: 'intake' },
  { id: 'inspection', label: 'Inspection & Diagnosis', icon: Search, step: '2', navKey: 'service' },
  { id: 'orders', label: 'Repair Orders', icon: FileText, step: '3', navKey: 'service' },
  { id: 'sparepartsrequest', label: 'Spare Parts Request', icon: Package, step: '4', navKey: 'sparepart' },
  { id: 'workshop', label: 'Repair & QC', icon: Wrench, step: '5-6', navKey: 'service' },
  { id: 'payment', label: 'Payment', icon: CreditCard, step: '7', navKey: 'finance' },
  { id: 'handover', label: 'Vehicle Handover', icon: Car, step: '8', navKey: 'service' },
  { id: 'followup', label: 'Follow-up', icon: MessageCircle, step: '9', navKey: 'service' },
  { id: 'divider-2' },
  { id: 'spareparts', label: 'Master Spare Parts', icon: Package, navKey: 'sparepart' },
  { id: 'process', label: 'Business Process Flow', icon: GitBranch, navKey: 'insight' },
  { id: 'reports', label: 'Reports', icon: BarChart3, navKey: 'insight' },
  { id: 'settings', label: 'Log History', icon: Settings, navKey: 'log-history' },
];

export function Sidebar({ currentPage, setCurrentPage, currentUser }: SidebarProps) {
  const { allowedNavKeys } = usePortalData();

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 h-screen">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 rounded-lg p-2">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-white">AutoCare</h2>
            <p className="text-slate-400 text-sm">Workshop Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            if (item.id === 'divider-1' || item.id === 'divider-2') {
              return <li key={item.id} className="border-t border-slate-800 my-4" />;
            }

            const Icon = item.icon!;
            const isActive = currentPage === item.id;
            const allowed = !item.navKey || allowedNavKeys.has(item.navKey);

            return (
              <li key={item.id}>
                <button
                  onClick={() => allowed && setCurrentPage(item.id)}
                  disabled={!allowed}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : allowed
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {item.step && (
                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">{item.step}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center uppercase">
            <span className="text-slate-300 text-sm">
              {currentUser.fullName
                .split(' ')
                .map((word) => word[0])
                .join('')
                .slice(0, 2)}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-white text-sm">{currentUser.fullName}</p>
            <p className="text-slate-400 text-xs truncate">{currentUser.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
