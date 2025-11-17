import { useState, useEffect } from 'react'
import { frappeClient } from './lib/frappeClient'
import { Login } from './components/Login'
import './App.css'

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
        
        console.log('Fetching customers...')
        const data = await frappeClient.listGarageCustomers()
        console.log('Customers:', data)
        
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
  }

  const handleLogout = () => {
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
    <div className="App">
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Garage Web Portal</h1>
            <p>Frontend menggunakan React + Vite. Backend menggunakan Frappe Framework.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p>Welcome, <strong>{currentUser.displayName}</strong></p>
            <p className="muted">{currentUser.branch}</p>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="card">
          <h2>Daftar Customer</h2>
          
          {loading && (
            <div className="loading">
              <p>⏳ Loading...</p>
            </div>
          )}
          
          {error && (
            <div className="error">
              <h3>❌ Error: Failed to fetch data</h3>
              <p>{error}</p>
              <hr />
              <h4>Troubleshooting:</h4>
              <ol>
                <li>✅ Pastikan Frappe backend sudah berjalan: <code>cd ~/bengkel-dev && bench start</code></li>
                <li>✅ Cek port Frappe (biasanya 8000 atau 8005)</li>
                <li>✅ Cek CORS settings di <code>site_config.json</code></li>
                <li>✅ Restart Frappe: <code>bench restart</code></li>
              </ol>
              <p>API URL: <code>{import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8005'}</code></p>
            </div>
          )}
          
          {!loading && !error && customers.length === 0 && (
            <p className="muted">📝 Belum ada data customer. Tambahkan customer di Frappe dulu.</p>
          )}
          
          {!loading && !error && customers.length > 0 && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.name}>
                      <td>{customer.name}</td>
                      <td>{customer.customer_name}</td>
                      <td>{customer.customer_type || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App