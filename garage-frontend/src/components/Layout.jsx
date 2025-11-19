import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function Layout({
  children,
  currentPage,
  setCurrentPage,
  currentUser,
  onLogout,
  availableBranches = [],
  onBranchChange,
}) {
  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        currentUser={currentUser} 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <TopBar
          currentUser={currentUser}
          onLogout={onLogout}
          branches={availableBranches}
          onBranchChange={onBranchChange}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;