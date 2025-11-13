'use client';

import React, { useEffect, useState } from 'react';
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
import { Login } from './components/Login';
import { PortalDataProvider } from './context/PortalDataContext';
import { fetchSessionUser, loginPortal, logoutPortal } from '../lib/api';
import { PortalUserProfile } from '../lib/types';

export type User = PortalUserProfile;

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const handleLogin = async ({ username, password }: { username: string; password: string }) => {
    setLoginLoading(true);
    setLoginError(undefined);
    try {
      await loginPortal({ username, password });
      const profile = await fetchSessionUser();
      setCurrentUser(profile);
      localStorage.setItem('currentUser', JSON.stringify(profile));
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login gagal, periksa kembali kredensial Anda.');
      throw error;
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutPortal();
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setCurrentPage('dashboard');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} loading={loginLoading} error={loginError} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'registration':
        return <Registration />;
      case 'inspection':
        return <Inspection />;
      case 'orders':
        return <ServiceOrders />;
      case 'inventory':
        return <Inventory />;
      case 'spareparts':
        return <SpareParts />;
      case 'sparepartsrequest':
        return <SparePartsRequest />;
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
    <PortalDataProvider>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} currentUser={currentUser} />
        <div className="flex-1 flex flex-col ml-64">
          <Header currentUser={currentUser} onLogout={handleLogout} />
          <main className="flex-1 overflow-auto">{renderPage()}</main>
        </div>
      </div>
    </PortalDataProvider>
  );
}
