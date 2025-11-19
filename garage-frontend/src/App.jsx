import { useState, useEffect } from 'react'
import { frappeClient } from './lib/frappeClient'
import { determinePrimaryRole } from './lib/roleUtils'
import { Login } from './components/Login'
import { Registration } from './components/Registration'
import { Inspection } from './components/Inspection'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { Dashboard } from './components/Dashboard'
import { ServiceOrders } from './components/ServiceOrders'
import { SpareParts } from './components/SpareParts'
import { SparePartsRequest } from './components/SparePartsRequest'
import { Layout } from './components/Layout'
import { BuyingSparePart } from './components/BuyingSpareParts'
import { DirectSalesSparePart } from './components/DirectSaleSpareParts'
import { Workshop } from './components/Workshop'
import { Payment } from './components/Payment'
import { Handover } from './components/Handover'
import { FollowUp } from './components/FollowUp'
import { Report } from './components/Report'

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser')
    if (!savedUser) return null

    try {
      return JSON.parse(savedUser)
    } catch (err) {
      console.error('Failed to restore session:', err)
      localStorage.removeItem('currentUser')
      return null
    }
  })
  const [currentPage, setCurrentPage] = useState('registration')
  const [availableBranches, setAvailableBranches] = useState([])

  // Resolve default branch for the logged in user from Pravenya (Frappe)
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
              localStorage.setItem('currentUser', JSON.stringify(updatedUser))
              return updatedUser
            })
          }
        }
      } catch (err) {
        console.error('Failed to resolve branch', err)
      }
    }

    resolveBranch()

    return () => {
      cancelled = true
    }
  }, [currentUser?.username])

  const handleLogin = (user) => {
    const resolvedRoles = Array.isArray(user.roles) ? user.roles : []
    const hydratedUser = {
      ...user,
      branch: user.branch || 'Jakarta',
      roles: resolvedRoles,
      role: user.role || determinePrimaryRole(resolvedRoles, user.username),
    }
    setCurrentUser(hydratedUser)
    localStorage.setItem('currentUser', JSON.stringify(hydratedUser))
  }

  useEffect(() => {
    if (!currentUser || (Array.isArray(currentUser.roles) && currentUser.roles.length)) {
      return
    }

    let cancelled = false

    const hydrateRoles = async () => {
      try {
        const payload = await frappeClient.getUserRoles()
        const roles = Array.isArray(payload.roles) ? payload.roles : []

        if (!cancelled && roles.length) {
          setCurrentUser((prev) => {
            if (!prev) return prev
            const updatedUser = {
              ...prev,
              roles,
              role: determinePrimaryRole(roles, prev.username),
            }
            localStorage.setItem('currentUser', JSON.stringify(updatedUser))
            return updatedUser
          })
        }
      } catch (err) {
        console.error('Failed to hydrate user roles', err)
      }
    }

    hydrateRoles()

    return () => {
      cancelled = true
    }
  }, [currentUser])

  const handleBranchChange = (branchName) => {
    setCurrentUser((prev) => {
      if (!prev) return prev
      const updatedUser = { ...prev, branch: branchName }
      localStorage.setItem('currentUser', JSON.stringify(updatedUser))
      return updatedUser
    })
  }

  const handleLogout = async () => {
    await frappeClient.logout()
    setCurrentUser(null)
    localStorage.removeItem('currentUser')
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'registration':
        return <Registration currentUser={currentUser} />
      case 'inspection':
        return <Inspection />
      case 'orders':
        return <ServiceOrders currentUser={currentUser} />
      case 'inventory':
          return <div className="p-8"><h2 className="text-2xl font-bold">Iventory</h2></div>
      case 'spareparts':
        return <SpareParts/>
      case 'sparepartsrequest':
        return <SparePartsRequest currentUser={currentUser} />;
      case 'buyingsparepart':
        return <BuyingSparePart currentUser={currentUser} />;
      case 'directsales':
        return <DirectSalesSparePart currentUser={currentUser} />;
      case 'workshop':
        return <Workshop currentUser={currentUser} />;
      case 'payment':
        return <Payment currentUser={currentUser} />;
      case 'handover':
        return <Handover />;
      case 'followup':
        return <FollowUp/>
      case 'reports':
        return <Report currentUser={currentUser} />;
      default:
        return <Registration currentUser={currentUser} />
    }
  }

  return (
    <Layout
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      currentUser={currentUser}
      onLogout={handleLogout}
      availableBranches={availableBranches}
      onBranchChange={handleBranchChange}
    >
      {renderPage()}
    </Layout>
  );
}

export default App
