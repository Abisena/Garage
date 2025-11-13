'use client';

import React from 'react';
import { Bell, Calendar, LogOut, MapPin, User as UserIcon } from 'lucide-react';
import { User } from '../page';
import { usePortalData } from '../context/PortalDataContext';

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
}

export function Header({ currentUser, onLogout }: HeaderProps) {
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const { data, activeBranch, setActiveBranch, loading } = usePortalData();

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-5 h-5" />
            <span>{today}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-5 h-5" />
            <select
              className="border border-slate-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={activeBranch || ''}
              onChange={(event) => setActiveBranch(event.target.value || undefined)}
              disabled={loading}
            >
              {!data?.branches?.length && <option value="">Select Branch</option>}
              {data?.branches?.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.branch_name || branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <UserIcon className="w-5 h-5" />
            <span>{currentUser.fullName}</span>
          </div>

          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" onClick={onLogout}>
            <LogOut className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>
    </header>
  );
}
