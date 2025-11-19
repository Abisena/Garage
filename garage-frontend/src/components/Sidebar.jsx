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
  GitBranch,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import { buildRoleSet, hasRoleInGroup, isUserPrivileged, SPECIALIST_ROLE_GROUPS } from '../lib/roleUtils';

const MENU_ROLE_RULES = {
  registration: ['admin'],
  inspection: ['serviceAdvisor', 'foreman'],
  orders: ['serviceAdvisor'],
  workshop: ['serviceAdvisor', 'foreman', 'mechanic'],
  'spareparts-menu': ['sparepart'],
  sparepartsrequest: ['sparepart'],
  buyingsparepart: ['sparepart'],
  directsales: ['sparepart'],
  spareparts: ['sparepart'],
};

const ALWAYS_VISIBLE_MENUS = new Set(['dashboard']);

export function Sidebar({ currentPage, setCurrentPage, currentUser }) {
  const [expandedMenus, setExpandedMenus] = React.useState(['spareparts-menu']);
  const roleSet = React.useMemo(() => buildRoleSet(currentUser?.roles || []), [currentUser?.roles]);
  const isPrivilegedUser = React.useMemo(() => isUserPrivileged(currentUser, roleSet), [currentUser, roleSet]);

  const hasRoleGroup = React.useCallback((groupName) => {
    return hasRoleInGroup(roleSet, groupName);
  }, [roleSet]);

  const hasSpecialistRole = React.useMemo(() => {
    return SPECIALIST_ROLE_GROUPS.some((group) => hasRoleGroup(group));
  }, [hasRoleGroup]);

  const canViewMenu = React.useCallback((menuId) => {
    if (isPrivilegedUser) {
      return true;
    }

    if (ALWAYS_VISIBLE_MENUS.has(menuId)) {
      return true;
    }

    const allowedGroups = MENU_ROLE_RULES[menuId];
    if (allowedGroups && allowedGroups.length > 0) {
      return allowedGroups.some((group) => hasRoleGroup(group));
    }

    if (hasSpecialistRole) {
      return false;
    }

    return true;
  }, [hasRoleGroup, hasSpecialistRole, isPrivilegedUser]);

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

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
      id: 'spareparts-menu',
      label: 'Spare Parts',
      icon: Package,
      step: '4',
      isExpandable: true,
      subItems: [
        { id: 'sparepartsrequest', label: 'Spare Parts Request', icon: Package },
        { id: 'buyingsparepart', label: 'Buying Spare Part', icon: ShoppingCart },
        { id: 'directsales', label: 'Direct Sales Sparepart', icon: DollarSign },
        { id: 'spareparts', label: 'Master Spare Parts', icon: Package }
      ]
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
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'divider-2' },
    { id: 'process', label: 'Business Process Flow', icon: GitBranch },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Get user initials for avatar
  const getUserInitials = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'AD';
  };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 rounded-lg p-2">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold">IMOGI Workshop</h2>
            <p className="text-slate-400 text-xs">Management System</p>
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

            if (!canViewMenu(item.id)) {
              return null;
            }
            
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const isExpanded = expandedMenus.includes(item.id);
            
            // Check if any submenu is active
            const hasActiveSubItem = item.subItems?.some(sub => currentPage === sub.id);

            return (
              <li key={item.id}>
                {item.isExpandable ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                        hasActiveSubItem
                          ? 'bg-slate-800 text-white'
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
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && item.subItems && (
                      <ul className="mt-1 space-y-1 ml-4 pl-4 border-l border-slate-700">
                        {item.subItems.map(subItem => {
                          if (!canViewMenu(subItem.id)) {
                            return null;
                          }
                          const SubIcon = subItem.icon;
                          const isSubActive = currentPage === subItem.id;
                          return (
                            <li key={subItem.id}>
                              <button
                                onClick={() => setCurrentPage(subItem.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                                  isSubActive
                                    ? 'bg-blue-500 text-white'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <SubIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 text-left">{subItem.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                ) : (
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
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-slate-300 text-sm font-semibold">{getUserInitials()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">{currentUser?.displayName || 'Admin User'}</p>
            <p className="text-slate-400 text-xs truncate" title={currentUser?.email || 'admin@example.com'}>
              {currentUser?.email}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;