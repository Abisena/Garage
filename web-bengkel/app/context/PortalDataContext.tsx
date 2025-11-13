'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchPortalBootstrap, fetchPortalNavigation } from '../../lib/api';
import { PortalBootstrap, PortalBootstrapFilters, PortalNavigationItem } from '../../lib/types';

interface PortalDataContextValue {
  data: PortalBootstrap | null;
  loading: boolean;
  error?: string;
  refresh: (filters?: PortalBootstrapFilters) => Promise<void>;
  activeBranch?: string;
  setActiveBranch: (branch?: string) => void;
  navItems: PortalNavigationItem[];
  allowedNavKeys: Set<string>;
}

const PortalDataContext = createContext<PortalDataContextValue | undefined>(undefined);

export function PortalDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PortalBootstrap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [branchPreference, setBranchPreference] = useState<string | undefined>(undefined);
  const [activeBranch, setActiveBranchState] = useState<string | undefined>(undefined);
  const [navItems, setNavItems] = useState<PortalNavigationItem[]>([]);

  const loadNavigation = useCallback(async () => {
    try {
      const items = await fetchPortalNavigation();
      setNavItems(items);
    } catch (err) {
      console.error('Failed to load navigation', err);
    }
  }, []);

  useEffect(() => {
    loadNavigation();
  }, [loadNavigation]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem('portalBranch');
    if (stored) {
      setBranchPreference(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (branchPreference) {
      window.localStorage.setItem('portalBranch', branchPreference);
    } else {
      window.localStorage.removeItem('portalBranch');
    }
  }, [branchPreference]);

  const fetchData = useCallback(
    async (filters?: PortalBootstrapFilters) => {
      setLoading(true);
      setError(undefined);
      try {
        const payload: PortalBootstrapFilters = {
          ...(branchPreference ? { branch: branchPreference } : {}),
          ...(filters || {}),
        };
        const response = await fetchPortalBootstrap(payload);
        setData(response);
        const nextBranch = filters?.branch || branchPreference || response.active_branch;
        setActiveBranchState(nextBranch);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Gagal memuat data portal');
      } finally {
        setLoading(false);
      }
    },
    [branchPreference],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(
    async (filters?: PortalBootstrapFilters) => {
      await fetchData(filters);
    },
    [fetchData],
  );

  const handleBranchChange = useCallback(
    (branch?: string) => {
      setBranchPreference(branch);
      setActiveBranchState(branch);
      fetchData({ branch });
    },
    [fetchData],
  );

  const allowedNavKeys = useMemo(() => {
    return new Set(navItems.filter((item) => item.allowed !== false).map((item) => item.key));
  }, [navItems]);

  const value: PortalDataContextValue = {
    data,
    loading,
    error,
    refresh,
    activeBranch,
    setActiveBranch: handleBranchChange,
    navItems,
    allowedNavKeys,
  };

  return <PortalDataContext.Provider value={value}>{children}</PortalDataContext.Provider>;
}

export function usePortalData(): PortalDataContextValue {
  const context = useContext(PortalDataContext);
  if (!context) {
    throw new Error('usePortalData must be used within a PortalDataProvider');
  }
  return context;
}
