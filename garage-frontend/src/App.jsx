import { useState, useEffect } from 'react'
import { frappeClient } from './lib/frappeClient'
import { Login } from './components/Login'
import { Registration } from './components/Registration'

function App() {
  const [currentUser, setCurrentUser] = useState(null)

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
      branch: user.branch || 'all',
    }
    setCurrentUser(hydratedUser)
    localStorage.setItem('currentUser', JSON.stringify(hydratedUser))
  }

  const handleLogout = async () => {
    // Logout dari Frappe
    await frappeClient.logout()

    // Clear local state
    setCurrentUser(null)
    localStorage.removeItem('currentUser')
  }

  // If not logged in, show login page
  if (!currentUser) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Garage Portal</h1>
            <p className="text-gray-600 mt-1">Pravenya Integration</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-sm text-gray-600">
              Welcome, <strong>{currentUser.displayName}</strong>
            </p>
            <p className="text-xs text-gray-500">
              Branch: <strong>{currentUser.branch || 'Not set'}</strong>
            </p>
            <button
              onClick={handleLogout}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Registration currentUser={currentUser} />
      </main>
    </div>
  )
}

export default App