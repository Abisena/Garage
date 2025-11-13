'use client';

import React from 'react';
import { Bell, Calendar, LogOut, MapPin, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  currentUser: {
    username: string;
    role: 'admin' | 'branch';
    branch: 'all' | 'Jakarta' | 'Bandung' | 'Surabaya';
    displayName: string;
  };
  onLogout: () => void;
}

export function Header({ currentUser, onLogout }: HeaderProps) {
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Right Section */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Date */}
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-5 h-5" />
            <span>{today}</span>
          </div>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Info */}
          <div className="flex items-center gap-2 text-slate-600">
            <UserIcon className="w-5 h-5" />
            <span>{currentUser.displayName}</span>
          </div>

          {/* Branch */}
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-5 h-5" />
            <span>{currentUser.branch}</span>
          </div>

          {/* Logout */}
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" onClick={onLogout}>
            <LogOut className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>
    </header>
  );
}