'use client';  // Add this line at the top of Home.tsx

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebard';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ProcessFlow } from './components/ProcessFlow';
import { ServiceOrders } from './components/ServiceOrders';
import { Customers } from './components/Customers';
import { Inventory } from './components/Inventory';
import { SpareParts } from './components/SpareParts';
import { SparePartsRequest } from './components/SparePartsRequest';
import { Registration } from './components/Registration';
import { Inspection } from './components/Inspection';
import { Workshop } from './components/Workshop';
import { Payment } from './components/Payment';
import { Handover } from './components/Handover';
import { FollowUp } from './components/FollowUp';
import { Login, User } from './components/Login';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setCurrentPage('dashboard');
  };

  // If not logged in, show login page
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'registration':
        return <Registration currentUser={currentUser} />;
      case 'inspection':
        return <Inspection />;
      case 'orders':
        return <ServiceOrders />;
      case 'inventory':
        return <Inventory />;
      case 'spareparts':
        return <SpareParts />;
      case 'sparepartsrequest':
        return <SparePartsRequest currentUser={currentUser} />;
      case 'workshop':
        return <Workshop />;
      case 'payment':
        return <Payment />;
      case 'handover':
        return <Handover />;
      case 'followup':
        return <FollowUp />;
      case 'process':
        return <ProcessFlow />;
      case 'customers':
        return <Customers />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="flex-1 flex flex-col ml-64">
        <Header currentUser={currentUser} onLogout={handleLogout} />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}