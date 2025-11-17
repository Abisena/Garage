import { useState, useEffect } from 'react'
import { frappeClient } from './lib/frappeClient'
import { Login } from './components/Login'

function App() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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

  // Fetch customers when user is logged in
  useEffect(() => {
    if (!currentUser) return

    async function fetchCustomers() {
      try {
        setLoading(true)
        setError(null)
        const data = await frappeClient.listGarageCustomers()
        setCustomers(data)
      } catch (err) {
        console.error('Error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [currentUser])

  const handleLogin = (user) => {
    setCurrentUser(user)
    localStorage.setItem('currentUser', JSON.stringify(user))
    // ❌ HAPUS redirect ke Frappe
  }

  const handleLogout = async () => {
    // Logout dari Frappe
    await frappeClient.logout()
    
    // Clear local state
    setCurrentUser(null)
    localStorage.removeItem('currentUser')
    setCustomers([])
  }

  // If not logged in, show login page
  if (!currentUser) {
    return <Login onLogin={handleLogin} />
  }

  // If logged in, show customer list
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Garage Portal</h1>
            <p className="text-gray-600 mt-1">React + Vite + Frappe</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Welcome, <strong>{currentUser.displayName}</strong></p>
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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Daftar Customer</h2>
          
          {loading && <p className="text-center py-8 text-gray-600">Loading...</p>}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
              <h3 className="font-semibold mb-2">Error</h3>
              <p>{error}</p>
            </div>
          )}
          
          {!loading && !error && customers.length === 0 && (
            <p className="text-center py-8 text-gray-500">Belum ada customer</p>
          )}
          
          {!loading && !error && customers.length > 0 && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{customer.name}</td>
                    <td className="px-6 py-4 text-sm">{customer.customer_name}</td>
                    <td className="px-6 py-4 text-sm">{customer.customer_type || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}

export default App