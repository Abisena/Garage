import { useState } from 'react';
import { Button } from './ui/button';
import { Wrench, LogIn, MapPin } from 'lucide-react';

// Predefined users
const USERS = {
  admin: {
    password: 'admin123',
    user: {
      username: 'admin',
      role: 'admin',
      branch: 'all',
      displayName: 'Administrator',
      name: 'Ahmad Santoso',
      position: 'Administrator'
    }
  },
  jakarta: {
    password: 'jakarta123',
    user: {
      username: 'jakarta',
      role: 'branch',
      branch: 'Jakarta',
      displayName: 'Jakarta Branch',
      name: 'Budi Hartono',
      position: 'Kasir Jakarta'
    }
  },
  bandung: {
    password: 'bandung123',
    user: {
      username: 'bandung',
      role: 'branch',
      branch: 'Bandung',
      displayName: 'Bandung Branch',
      name: 'Siti Rahmawati',
      position: 'Kasir Bandung'
    }
  },
  surabaya: {
    password: 'surabaya123',
    user: {
      username: 'surabaya',
      role: 'branch',
      branch: 'Surabaya',
      displayName: 'Surabaya Branch',
      name: 'Eko Prasetyo',
      position: 'Kasir Surabaya'
    }
  }
};

export function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const userRecord = USERS[username.toLowerCase()];
    
    if (!userRecord) {
      setError('Username tidak ditemukan');
      return;
    }

    if (userRecord.password !== password) {
      setError('Password salah');
      return;
    }

    onLogin(userRecord.user);
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
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">Login to Your Branch</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
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
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
          </form>

          {/* Demo Accounts Info */}
          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Demo Accounts:
            </p>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Administrator:</span>
                <span className="font-mono text-slate-900">admin / admin123</span>
              </div>
              <div className="flex justify-between">
                <span>Jakarta Branch:</span>
                <span className="font-mono text-slate-900">jakarta / jakarta123</span>
              </div>
              <div className="flex justify-between">
                <span>Bandung Branch:</span>
                <span className="font-mono text-slate-900">bandung / bandung123</span>
              </div>
              <div className="flex justify-between">
                <span>Surabaya Branch:</span>
                <span className="font-mono text-slate-900">surabaya / surabaya123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export default juga untuk kemudahan import
export default Login;