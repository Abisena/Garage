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
  DollarSign,
  X,
  Users,
  Clock,
  CalendarClock,
  CalendarX,
  Wallet,
  Database,
  ArrowRightLeft,
  ClipboardCheck,
  BookOpen,
  Calculator,
  TrendingUp,
  Workflow
} from 'lucide-react';

// Helper function to get approval pending counts
const getApprovalCounts = (currentUserDisplayName) => {
  try {
    const purchases = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
    
    const supervisorCount = purchases.filter((po) => 
      po.status === 'PENDING_APPROVAL' && 
      po.totalAmount < 1000000 &&
      po.requestedBy !== currentUserDisplayName
    ).length;
    
    const managerCount = purchases.filter((po) => 
      po.status === 'PENDING_APPROVAL' && 
      po.totalAmount >= 1000000 &&
      po.totalAmount < 10000000 &&
      po.requestedBy !== currentUserDisplayName
    ).length;
    
    const direkturCount = purchases.filter((po) => 
      po.status === 'PENDING_APPROVAL' && 
      po.totalAmount >= 10000000 &&
      po.requestedBy !== currentUserDisplayName
    ).length;
    
    return { supervisorCount, managerCount, direkturCount };
  } catch {
    return { supervisorCount: 0, managerCount: 0, direkturCount: 0 };
  }
};

export function Sidebar({ currentPage, onNavigate, isMobileMenuOpen = false, onMobileMenuClose, currentUser }) {
  const [expandedMenus, setExpandedMenus] = React.useState(['master-menu']);
  const [approvalCounts, setApprovalCounts] = React.useState({ supervisorCount: 0, managerCount: 0, direkturCount: 0 });

  // Update approval counts when component mounts or currentPage changes
  React.useEffect(() => {
    if (currentUser) {
      const counts = getApprovalCounts(currentUser.displayName);
      setApprovalCounts(counts);
    }
  }, [currentUser, currentPage]);

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleMenuClick = (pageId) => {
    if (onNavigate) {
      onNavigate(pageId);
    }

    // Close mobile menu after selection
    if (onMobileMenuClose) {
      onMobileMenuClose();
    }
  };

  const menuItems = [
    { id: 'process', label: 'Business Process Flow', icon: GitBranch },
    { id: 'processdiagram', label: 'Process Flow Diagram', icon: Workflow },
    { id: 'divider-dashboard' },
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
        { id: 'directsales', label: 'Direct Sales Sparepart', icon: DollarSign },
        { id: 'transferstock', label: 'Transfer Stock', icon: ArrowRightLeft }
      ]
    },
    { 
      id: 'workshop', 
      label: 'Repair & QC', 
      icon: Wrench,
      step: '5-6'
    },
    { 
      id: 'payment-menu', 
      label: 'Payment', 
      icon: CreditCard,
      step: '7',
      isExpandable: true,
      subItems: [
        { id: 'paymentprocess', label: 'Payment Process', icon: CreditCard },
        { id: 'paymentlist', label: 'Payment List', icon: FileText }
      ]
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
    { 
      id: 'master-menu',
      label: 'Master Data',
      icon: Database,
      isExpandable: true,
      subItems: [
        { id: 'servicetypes', label: 'Service Type & Flat Rate', icon: Wrench },
        { id: 'masterproducts', label: 'Master Products', icon: Package },
        { id: 'spareparts', label: 'Master Spare Parts', icon: Package },
        { id: 'customers', label: 'Customers', icon: Users }
      ]
    },
    { id: 'divider-3' },
    { 
      id: 'purchase-menu',
      label: 'Purchase Management',
      icon: ShoppingCart,
      isExpandable: true,
      subItems: [
        { id: 'purchaseguide', label: 'Purchase Guide', icon: BookOpen },
        { id: 'purchasemanagement', label: 'Purchase Orders', icon: ShoppingCart },
        { id: 'supervisorapproval', label: 'Supervisor Approval', icon: CheckCircle, badge: approvalCounts.supervisorCount },
        { id: 'managerapproval', label: 'Manager Approval', icon: CheckCircle, badge: approvalCounts.managerCount },
        { id: 'direkturapproval', label: 'Direktur Approval', icon: CheckCircle, badge: approvalCounts.direkturCount }
      ]
    },
    { id: 'divider-purchase' },
    { 
      id: 'asset-menu',
      label: 'Asset Management',
      icon: Package,
      isExpandable: true,
      subItems: [
        { id: 'assetmanagement', label: 'Asset Register', icon: Package },
        { id: 'assetguide', label: 'Asset Guide', icon: BookOpen }
      ]
    },
    { id: 'divider-4' },
    { 
      id: 'hr-menu',
      label: 'HR Management',
      icon: Users,
      isExpandable: true,
      subItems: [
        { id: 'employees', label: 'Master Data Karyawan', icon: Users },
        { id: 'attendance', label: 'My Attendance', icon: Clock },
        { id: 'attendancelist', label: 'Attendance Records', icon: ClipboardCheck },
        { id: 'overtime', label: 'Overtime', icon: CalendarClock },
        { id: 'leave', label: 'Cuti', icon: CalendarX },
        { 
          id: 'payroll-menu', 
          label: 'Payroll', 
          icon: Wallet,
          isExpandable: true,
          subItems: [
            { id: 'payrollguide', label: 'Payroll Guide', icon: BookOpen },
            { id: 'salary', label: 'Salary Components', icon: Database },
            { id: 'salarystructure', label: 'Salary Structure', icon: Calculator },
            { id: 'payrolladjustments', label: 'Payroll Adjustments', icon: ClipboardCheck },
            { id: 'payroll', label: 'Payroll Management', icon: Wallet }
          ]
        }
      ]
    },
    { id: 'divider-5' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay - ONLY on mobile when menu is open */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onMobileMenuClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 h-screen z-50
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:relative
      `}>
        {/* Close Button - Mobile Only */}
        <button
          onClick={onMobileMenuClose}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-lg transition-colors z-10"
          aria-label="Close Menu"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>

        {/* Logo */}
        <div className="p-6 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 rounded-lg p-2">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-white">IMOGI Workshop</h2>
              <p className="text-slate-400 text-sm">Management System</p>
            </div>
          </div>
        </div>

        {/* Navigation with Custom Scrollbar */}
        <nav className="flex-1 p-4 overflow-y-auto scrollbar-custom">
          <style jsx>{`
            .scrollbar-custom::-webkit-scrollbar {
              width: 6px;
            }
            
            .scrollbar-custom::-webkit-scrollbar-track {
              background: rgba(15, 23, 42, 0.3);
              border-radius: 10px;
            }
            
            .scrollbar-custom::-webkit-scrollbar-thumb {
              background: rgba(148, 163, 184, 0.3);
              border-radius: 10px;
              transition: background 0.2s;
            }
            
            .scrollbar-custom::-webkit-scrollbar-thumb:hover {
              background: rgba(148, 163, 184, 0.5);
            }
            
            .scrollbar-custom::-webkit-scrollbar-thumb:active {
              background: rgba(148, 163, 184, 0.7);
            }
            
            /* Firefox */
            .scrollbar-custom {
              scrollbar-width: thin;
              scrollbar-color: rgba(148, 163, 184, 0.3) rgba(15, 23, 42, 0.3);
            }
          `}</style>
          
          <ul className="space-y-1">
            {menuItems.map((item) => {
              if (item.id === 'divider-dashboard' || item.id === 'divider-1' || item.id === 'divider-2' || item.id === 'divider-3' || item.id === 'divider-4' || item.id === 'divider-purchase' || item.id === 'divider-5') {
                return <li key={item.id} className="border-t border-slate-800 my-4"></li>;
              }
              
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              const isExpanded = expandedMenus.includes(item.id);
              
              // Check if any submenu is active (including nested)
              const hasActiveSubItem = item.subItems?.some(sub => {
                if (currentPage === sub.id) return true;
                // Check nested subItems
                if (sub.subItems) {
                  return sub.subItems.some(nested => currentPage === nested.id);
                }
                return false;
              });

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
                            const SubIcon = subItem.icon;
                            const isSubActive = currentPage === subItem.id;
                            const isSubExpanded = expandedMenus.includes(subItem.id);
                            
                            // Check if any nested submenu is active
                            const hasActiveNestedItem = subItem.subItems?.some(nested => currentPage === nested.id);
                            
                            return (
                              <li key={subItem.id}>
                                {subItem.isExpandable ? (
                                  <>
                                    <button
                                      onClick={() => toggleMenu(subItem.id)}
                                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                                        hasActiveNestedItem
                                          ? 'bg-slate-800 text-white'
                                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                      }`}
                                    >
                                      <SubIcon className="w-4 h-4 flex-shrink-0" />
                                      <span className="flex-1 text-left">{subItem.label}</span>
                                      {isSubExpanded ? (
                                        <ChevronDown className="w-3 h-3 flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                      )}
                                    </button>
                                    {isSubExpanded && subItem.subItems && (
                                      <ul className="mt-1 space-y-1 ml-4 pl-3 border-l border-slate-700">
                                        {subItem.subItems.map(nestedItem => {
                                          const NestedIcon = nestedItem.icon;
                                          const isNestedActive = currentPage === nestedItem.id;
                                          return (
                                            <li key={nestedItem.id}>
                                              <button
                                                onClick={() => handleMenuClick(nestedItem.id)}
                                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                                                  isNestedActive
                                                    ? 'bg-blue-500 text-white'
                                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                }`}
                                              >
                                                <NestedIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span className="flex-1 text-left">{nestedItem.label}</span>
                                              </button>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    )}
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleMenuClick(subItem.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                                      isSubActive
                                        ? 'bg-blue-500 text-white'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                                  >
                                    <SubIcon className="w-4 h-4 flex-shrink-0" />
                                    <span className="flex-1 text-left">{subItem.label}</span>
                                    {subItem.badge !== undefined && subItem.badge > 0 && (
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        isSubActive
                                          ? 'bg-white text-blue-600'
                                          : 'bg-orange-500 text-white'
                                      }`}>
                                        {subItem.badge}
                                      </span>
                                    )}
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => handleMenuClick(item.id)}
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
        <div className="p-4 border-t border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
              <span className="text-slate-300">AD</span>
            </div>
            <div className="flex-1">
              <p className="text-white">Admin User</p>
              <p className="text-slate-400 text-xs">imogiofficial@cao-group.co.id</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}