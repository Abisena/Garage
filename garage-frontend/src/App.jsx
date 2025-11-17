import { useState, useEffect } from 'react'
import { frappeClient } from './lib/frappeClient'
import { Login } from './components/Login'
import { Registration } from './components/Registration'
import { Inspection } from './components/Inspection'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('registration')

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser))
      } catch (err) {
        console.error('Failed to restore session:', err)
        localStorage.removeItem('currentUser')
      }
    }
  }, [])

  // Resolve default branch for the logged in user from Pravenya (Frappe)
  useEffect(() => {
    if (!currentUser?.username) return

    let cancelled = false

    async function resolveBranch() {
      try {
        const bootstrap = await frappeClient.getPortalBootstrap()
        const activeBranch = bootstrap?.active_branch

        if (!cancelled && activeBranch) {
          setCurrentUser((prev) => {
            if (!prev) return prev
            const updatedUser = { ...prev, branch: activeBranch }
            localStorage.setItem('currentUser', JSON.stringify(updatedUser))
            return updatedUser
          })
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
    const hydratedUser = {
      ...user,
      branch: user.branch || 'Jakarta',
    }
    setCurrentUser(hydratedUser)
    localStorage.setItem('currentUser', JSON.stringify(hydratedUser))
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
        return <div className="p-8"><h2 className="text-2xl font-bold">Dashboard</h2></div>
      case 'registration':
        return <Registration currentUser={currentUser} />
      case 'inspection':
        return <Inspection />
      case 'orders':
        return <div className="p-8"><h2 className="text-2xl font-bold">Repair Orders</h2></div>
      case 'spareparts':
        return <div className="p-8"><h2 className="text-2xl font-bold">Spare Parts</h2></div>
      case 'workshop':
        return <div className="p-8"><h2 className="text-2xl font-bold">Repair & QC</h2></div>
      case 'payment':
        return <div className="p-8"><h2 className="text-2xl font-bold">Payment</h2></div>
      case 'handover':
        return <div className="p-8"><h2 className="text-2xl font-bold">Vehicle Handover</h2></div>
      case 'followup':
        return <div className="p-8"><h2 className="text-2xl font-bold">Follow-up</h2></div>
      case 'reports':
        return <div className="p-8"><h2 className="text-2xl font-bold">Reports</h2></div>
      default:
        return <Registration currentUser={currentUser} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar 
        currentUser={currentUser} 
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* TopBar */}
        <TopBar 
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App