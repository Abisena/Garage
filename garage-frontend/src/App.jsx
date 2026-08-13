import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { frappeClient } from './lib/frappeClient'
import { determinePrimaryRole, buildRoleSet, hasRoleInGroup, ROLE_GROUPS } from './lib/roleUtils'
import { clearStoredUser, persistCurrentUser, restoreCurrentUser } from "./utils/simpleStorage"
import { deferNonCritical, cancelDeferred } from './utils/defer'
import { Layout } from './components/Layout'
import { PageMeta } from './components/PageMeta'
import { LoadingScreen, PageLoader } from './components/LoadingScreen'
import { refreshWorkOrdersFromBackend } from './lib/workOrdersStorage'
import {
  Dashboard,
  Registration,
  Inspection,
  ServiceOrders,
  SpareParts,
  SparePartsRequest,
  BuyingSparePartIntegrated,
  DirectSalesSparePart,
  TransferStock,
  Workshop,
  Payment,
  PaymentList,
  Handover,
  FollowUp,
  Report,
  ProcessFlow,
  BusinessProcessFlowDiagram,
} from './routes/lazyPages'

const Login = lazy(() => import('./components/Login').then((m) => ({ default: m.Login })))

const PAGE_ROLES = {
  dashboard: ['admin', 'sparepart', 'serviceAdvisor', 'foreman', 'mechanic', 'cashier', 'receptionist', 'qualityManager', 'finance'],
  registration: ['admin', 'receptionist'],
  inspection: ['serviceAdvisor', 'mechanic'],
  orders: ['serviceAdvisor', 'mechanic'],
  inventory: ['sparepart'],
  spareparts: ['sparepart'],
  sparepartsrequest: ['sparepart'],
  buyingsparepart: ['sparepart'],
  directsales: ['sparepart'],
  workshop: ['serviceAdvisor', 'qualityManager', 'foreman'],
  paymentprocess: ['cashier', 'finance'],
  paymentlist: ['cashier', 'finance'],
  handover: ['admin', 'cashier'],
  followup: ['admin', 'serviceAdvisor', 'receptionist'],
  reports: ['admin'],
  transferstock: ['sparepart'],
  process: ['admin', 'serviceAdvisor', 'foreman', 'mechanic', 'sparepart', 'cashier', 'receptionist', 'qualityManager', 'finance'],
  processdiagram: ['admin', 'serviceAdvisor', 'foreman', 'mechanic', 'sparepart', 'cashier', 'receptionist', 'qualityManager', 'finance'],
};

const PAGE_PATHS = {
  dashboard: '/dashboard',
  registration: '/registration',
  inspection: '/inspection',
  orders: '/orders',
  inventory: '/inventory',
  spareparts: '/spare-parts',
  sparepartsrequest: '/spare-parts/request',
  buyingsparepart: '/spare-parts/buying',
  directsales: '/spare-parts/direct-sales',
  workshop: '/workshop',
  paymentprocess: '/payment/process',
  paymentlist: '/payment/list',
  handover: '/handover',
  followup: '/follow-up',
  reports: '/reports',
  transferstock: '/spare-parts/transfer-stock',
  process: '/process-flow',
  processdiagram: '/business-process-flow',
};

const DEFAULT_PAGE = 'dashboard';

const normalizePath = (path) => {
  if (!path) return '/';
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
};

function extractRolesFromResponse(response) {
  if (Array.isArray(response)) return response;
  if (response && Array.isArray(response.roles)) return response.roles;
  if (response?.message && Array.isArray(response.message.roles)) return response.message.roles;
  if (response?.message && Array.isArray(response.message)) return response.message;
  return [];
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentUser, setCurrentUser] = useState(null)
  const [availableBranches, setAvailableBranches] = useState([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [isRestoringSession, setIsRestoringSession] = useState(true)

  useEffect(() => {
    let cancelled = false

    const hydrateSession = async () => {
      const restored = await restoreCurrentUser()
      if (!cancelled && restored) {
        setCurrentUser(restored)
      }
      if (!cancelled) {
        setIsRestoringSession(false)
      }
    }

    hydrateSession()

    return () => {
      cancelled = true
    }
  }, [])

  const activePage = useMemo(() => {
    const normalizedPath = normalizePath(location.pathname)
    const entry = Object.entries(PAGE_PATHS).find(([, path]) => path === normalizedPath)
    return entry ? entry[0] : DEFAULT_PAGE
  }, [location.pathname])

  const hasPageAccess = (page, user) => {
    if (!user) return false;

    const allowedRoleGroups = PAGE_ROLES[page];
    if (!allowedRoleGroups) return false;

    if (!Array.isArray(user.roles) || user.roles.length === 0) {
      return false;
    }

    const userRoleSet = buildRoleSet(user.roles);

    if (user.username && user.username.toLowerCase() === 'administrator') {
      return true;
    }

    return allowedRoleGroups.some((roleGroup) => hasRoleInGroup(userRoleSet, roleGroup));
  };

  useEffect(() => {
    if (!currentUser?.username) return;
    if (Array.isArray(currentUser.roles) && currentUser.roles.length > 0) return;

    setIsLoadingRoles(true)

    let cancelled = false

    const forceLoadRoles = async () => {
      try {
        const response = await frappeClient.getUserRoles()
        const roles = extractRolesFromResponse(response)

        if (!cancelled && roles.length > 0) {
          setCurrentUser((prev) => {
            if (!prev) return prev

            const updatedUser = {
              ...prev,
              roles,
              role: determinePrimaryRole(roles, prev.username),
            }

            persistCurrentUser(updatedUser)
            return updatedUser
          })
        }
      } catch (err) {
        console.error('Failed to fetch roles:', err)
      } finally {
        if (!cancelled) {
          setIsLoadingRoles(false)
        }
      }
    }

    const timer = setTimeout(forceLoadRoles, 100)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [currentUser?.username])

  useEffect(() => {
    if (!currentUser?.username) return

    let cancelled = false

    const refreshWorkOrders = async () => {
      const branchValue =
        currentUser?.branch && currentUser.branch !== 'all'
          ? currentUser.branch
          : undefined
      try {
        await refreshWorkOrdersFromBackend({ branch: branchValue })
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to refresh work orders from backend:', error)
        }
      }
    }

    const deferredId = deferNonCritical(() => {
      if (!cancelled) {
        void refreshWorkOrders()
      }
    })

    return () => {
      cancelled = true
      cancelDeferred(deferredId)
    }
  }, [currentUser?.username, currentUser?.branch])

  useEffect(() => {
    if (!currentUser?.username) return

    let cancelled = false

    async function resolveBranch() {
      try {
        const bootstrap = await frappeClient.getPortalBootstrap()
        const activeBranch = bootstrap?.active_branch
        const branches = Array.isArray(bootstrap?.branches) ? bootstrap.branches : []

        if (!cancelled) {
          setAvailableBranches(branches)
          if (activeBranch) {
            setCurrentUser((prev) => {
              if (!prev) return prev
              const updatedUser = { ...prev, branch: activeBranch }
              persistCurrentUser(updatedUser)
              return updatedUser
            })
          }
        }
      } catch (err) {
        console.error('Failed to resolve branch', err)
      }
    }

    const deferredId = deferNonCritical(() => {
      if (!cancelled) {
        void resolveBranch()
      }
    })

    return () => {
      cancelled = true
      cancelDeferred(deferredId)
    }
  }, [currentUser?.username])

  const handleLogin = async (user) => {
    setIsLoadingRoles(true)

    let roles = Array.isArray(user.roles) ? user.roles : []

    if (roles.length === 0) {
      try {
        const response = await frappeClient.getUserRoles()
        roles = extractRolesFromResponse(response)
      } catch (err) {
        console.error('Failed to fetch roles during login:', err)
      }
    }

    const hydratedUser = {
      ...user,
      branch: user.branch || 'Jakarta',
      roles,
      role: determinePrimaryRole(roles, user.username),
    }

    setCurrentUser(hydratedUser)
    persistCurrentUser(hydratedUser)
    setIsLoadingRoles(false)
  }

  const handleBranchChange = (branchName) => {
    setCurrentUser((prev) => {
      if (!prev) return prev
      const updatedUser = { ...prev, branch: branchName }
      persistCurrentUser(updatedUser)
      return updatedUser
    })
  }

  const handleLogout = async () => {
    await frappeClient.logout()
    setCurrentUser(null)
    clearStoredUser()
  }

  const handleNavigate = (pageId) => {
    const targetPath = PAGE_PATHS[pageId] || PAGE_PATHS[DEFAULT_PAGE]
    navigate(targetPath)
  }

  useEffect(() => {
    if (!currentUser || isRestoringSession) return

    const normalizedPath = normalizePath(location.pathname)
    const knownPaths = Object.values(PAGE_PATHS)
    if (!knownPaths.includes(normalizedPath)) {
      navigate(PAGE_PATHS[DEFAULT_PAGE], { replace: true })
    }
  }, [currentUser, isRestoringSession, location.pathname, navigate])

  if (isRestoringSession) {
    return <LoadingScreen message="Memulihkan sesi aman..." />
  }

  if (!currentUser) {
    return (
      <>
        <PageMeta pageId="login" />
        <Suspense fallback={<LoadingScreen message="Memuat halaman login..." />}>
          <Login onLogin={handleLogin} />
        </Suspense>
      </>
    )
  }

  if (isLoadingRoles || (!currentUser.roles || currentUser.roles.length === 0)) {
    return <LoadingScreen message="Memuat hak akses pengguna..." />
  }

  const AccessDenied = ({ pageId }) => {
    const userRoleSet = buildRoleSet(currentUser.roles);
    const detectedRoles = [];

    Object.keys(ROLE_GROUPS).forEach(groupName => {
      if (hasRoleInGroup(userRoleSet, groupName)) {
        detectedRoles.push(groupName);
      }
    });

    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-slate-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center border border-red-200" role="alert">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
          <p className="text-slate-600 mb-4">
            Anda tidak memiliki akses ke halaman <strong>{pageId}</strong>
          </p>
          <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
            <p className="text-slate-500 text-sm mb-2">
              <strong>Username:</strong> {currentUser.username}
            </p>
            <p className="text-slate-500 text-sm mb-2">
              <strong>Primary Role:</strong> <span className="font-semibold text-slate-700">{currentUser.role || 'Unknown'}</span>
            </p>
            <p className="text-slate-500 text-sm mb-2">
              <strong>Detected Groups:</strong> <span className="font-semibold text-blue-600">{detectedRoles.length > 0 ? detectedRoles.join(', ') : 'None'}</span>
            </p>
            <p className="text-slate-500 text-sm">
              <strong>All Roles:</strong> <span className="text-slate-700">{currentUser.roles?.length > 0 ? currentUser.roles.join(', ') : 'None'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  };

  const renderPage = (pageId) => {
    switch (pageId) {
      case 'process':
        return <ProcessFlow currentUser={currentUser} />;
      case 'processdiagram':
        return <BusinessProcessFlowDiagram currentUser={currentUser} />;
      case 'dashboard':
        return <Dashboard />
      case 'registration':
        return <Registration currentUser={currentUser} />
      case 'inspection':
        return <Inspection currentUser={currentUser} />
      case 'orders':
        return <ServiceOrders currentUser={currentUser} />
      case 'inventory':
        return <div className="p-8"><h2 className="text-2xl font-bold">Inventory</h2></div>
      case 'spareparts':
        return <SpareParts/>
      case 'sparepartsrequest':
        return <SparePartsRequest currentUser={currentUser} />;
      case 'buyingsparepart':
        return <BuyingSparePartIntegrated currentUser={currentUser} />;
      case 'transferstock':
        return <TransferStock currentUser={currentUser} />;
      case 'directsales':
        return <DirectSalesSparePart currentUser={currentUser} />;
      case 'workshop':
        return <Workshop currentUser={currentUser} />;
      case 'paymentprocess':
        return <Payment currentUser={currentUser} />;
      case 'paymentlist':
        return <PaymentList currentUser={currentUser} />;
      case 'handover':
        return <Handover currentUser={currentUser} />;
      case 'followup':
        return <FollowUp/>
      case 'reports':
        return <Report currentUser={currentUser} />;
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout
      currentPage={activePage}
      onNavigate={handleNavigate}
      currentUser={currentUser}
      onLogout={handleLogout}
      availableBranches={availableBranches}
      onBranchChange={handleBranchChange}
    >
      <PageMeta pageId={activePage} />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to={PAGE_PATHS[DEFAULT_PAGE]} replace />} />
          {Object.entries(PAGE_PATHS).map(([pageId, path]) => (
            <Route
              key={pageId}
              path={path}
              element={hasPageAccess(pageId, currentUser) ? renderPage(pageId) : <AccessDenied pageId={pageId} />}
            />
          ))}
          <Route path="*" element={<Navigate to={PAGE_PATHS[DEFAULT_PAGE]} replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App
