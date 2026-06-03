import React, { useState, useEffect } from 'react';
import { Bell, LogOut, MapPin, User, Calendar, Clock, ChevronDown, Menu } from 'lucide-react';

export function TopBar({ currentUser, onLogout, branches = [], onBranchChange, onToggleSidebar }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const isAdmin = (currentUser?.role === 'admin') || ((currentUser?.username || '').toLowerCase() === 'administrator');
  const activeBranchValue = currentUser?.branch || 'all';

  const handleBranchSelect = (event) => {
    const value = event.target.value;
    if (onBranchChange) {
      onBranchChange(value);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName}, ${day} ${month} ${year}`;
  };

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {onToggleSidebar && (
            <button
              type="button"
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors lg:hidden"
              onClick={onToggleSidebar}
              aria-label="Buka atau tutup menu navigasi"
              aria-expanded="false"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="w-5 h-5 text-slate-500" aria-hidden="true" />
            <time className="text-sm font-medium" dateTime={currentTime.toISOString().split('T')[0]}>
              {formatDate(currentTime)}
            </time>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="w-5 h-5 text-slate-500" aria-hidden="true" />
            <time className="text-sm font-mono font-semibold" dateTime={currentTime.toISOString()}>
              {formatTime(currentTime)}
            </time>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <button
            type="button"
            className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Notifikasi (belum ada notifikasi baru)"
          >
            <Bell className="w-5 h-5 text-slate-600" aria-hidden="true" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></span>
          </button>

          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <MapPin className="w-4 h-4 text-slate-600" aria-hidden="true" />
            {isAdmin ? (
              <div className="relative">
                <label htmlFor="branch-select" className="sr-only">Pilih cabang</label>
                <select
                  id="branch-select"
                  value={activeBranchValue}
                  onChange={handleBranchSelect}
                  className="appearance-none bg-transparent pr-6 text-sm text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Branches</option>
                  {branches
                    .filter((branch) => branch?.name)
                    .map((branch) => (
                      <option key={branch.name} value={branch.name}>
                        {branch.branch_name || branch.name}
                      </option>
                    ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>
            ) : (
              <span className="text-sm text-slate-700">
                {currentUser?.branch === 'all' ? 'All Branches' : currentUser?.branch}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center" aria-hidden="true">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-slate-900">
                {currentUser?.displayName || 'Admin User'}
              </p>
              <p className="text-xs text-slate-600">
                {isAdmin ? 'Administrator' : `Cabang ${currentUser?.branch || '-'}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            aria-label="Keluar dari sistem"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TopBar;
