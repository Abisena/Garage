import { useState, useEffect } from 'react'
import { frappeClient } from './lib/frappeClient'
import './App.css'

function App() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoading(true)
        setError(null)
        
        console.log('Fetching customers...') // Debug
        const data = await frappeClient.listGarageCustomers()
        console.log('Customers:', data) // Debug
        
        setCustomers(data)
      } catch (err) {
        console.error('Error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [])

  return (
    <div className="App">
      <header>
        <h1>Garage Web Portal</h1>
        <p>Frontend menggunakan React + Vite. Backend menggunakan Frappe Framework.</p>
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
                <li>✅ Cek port Frappe (biasanya 8000, bukan 8005)</li>
                <li>✅ Cek CORS settings di <code>site_config.json</code></li>
                <li>✅ Restart Frappe: <code>bench restart</code></li>
              </ol>
              <p>API URL: <code>{import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000'}</code></p>
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