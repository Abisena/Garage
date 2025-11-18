import React, { useState, useEffect } from 'react';
import { Bell, LogOut, MapPin, User, Calendar, Clock } from 'lucide-react';

export function TopBar({ currentUser, onLogout }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(timer);
  }, []);

  // Format date in Indonesian
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

  // Format time with seconds
  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Date & Time */}
        <div className="flex items-center gap-6">
          {/* Date */}
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-medium">{formatDate(currentTime)}</span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-mono font-semibold">{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Right side - User info */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Branch Info */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
            <MapPin className="w-4 h-4 text-slate-600" />
            <span className="text-sm text-slate-700">
              {currentUser?.branch === 'all' ? 'All Branches' : currentUser?.branch}
            </span>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-slate-900">
                {currentUser?.displayName || 'Admin User'}
              </p>
              <p className="text-xs text-slate-600">
                {currentUser?.role === 'admin' ? 'Administrator' : 'Branch User'}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TopBar;