import { useState } from 'react';
import { Button } from './ui/button';
import { Wrench, LogIn, Loader2 } from 'lucide-react';
import { frappeClient } from '../lib/frappeClient';
import { determinePrimaryRole } from '../lib/roleUtils';

export function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ✅ CONSUME FRAPPE LOGIN API DI SINI
      const result = await frappeClient.login(username, password);

      if (result.success) {
        let roles = [];
        try {
          const payload = await frappeClient.getUserRoles();
          roles = Array.isArray(payload.roles) ? payload.roles : [];
        } catch (fetchError) {
          console.error('Failed to resolve user roles after login:', fetchError);
        }

        const userRole = determinePrimaryRole(roles, result.user.username);

        onLogin({
          username: result.user.username,
          displayName: result.user.full_name,
          role: userRole,
          roles,
          branch: 'all',
        });
      } else {
        setError(result.error || 'Login gagal. Periksa username dan password Anda.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan saat login. Pastikan Frappe backend berjalan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-white">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <Wrench className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">IMOGI Workshop</h1>
          <p className="text-center text-blue-100 text-sm">Sistem Manajemen Bengkel Multi Cabang</p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">
            Login To Your Branch
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </>
              )}
            </Button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Gunakan username dan password Frappe Anda.
              <br />
              Default: <code className="bg-blue-100 px-1 rounded">Administrator</code> / password Anda
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;