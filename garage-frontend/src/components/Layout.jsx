import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function Layout({
  children,
  currentPage,
  onNavigate,
  currentUser,
  onLogout,
  availableBranches = [],
  onBranchChange,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    if (typeof window === 'undefined') {
      return undefined;
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Lewati ke konten utama
      </a>
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:flex-shrink-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          currentUser={currentUser}
          currentPage={currentPage}
          onNavigate={(page) => {
            onNavigate(page);
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              closeSidebar();
            }
          }}
          isMobileMenuOpen={isSidebarOpen}
          onMobileMenuClose={closeSidebar}
        />
      </div>

      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={closeSidebar}
          aria-label="Close sidebar overlay"
        >
          <span className="sr-only">Close sidebar</span>
        </button>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header role="banner">
          <TopBar
          currentUser={currentUser}
          onLogout={onLogout}
          branches={availableBranches}
          onBranchChange={onBranchChange}
          onToggleSidebar={toggleSidebar}
          />
        </header>

        <main id="main-content" className="flex-1 overflow-auto bg-slate-50" tabIndex={-1}>
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;