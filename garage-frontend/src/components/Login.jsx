import React, { useState } from 'react';
import { Button } from './ui/button';
import { Wrench, LogIn, MapPin, Eye, EyeOff, Shield, Loader2 } from 'lucide-react';
import { frappeClient } from '../lib/frappeClient';
import { determinePrimaryRole } from '../lib/roleUtils';

export function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <main className="w-full max-w-6xl grid md:grid-cols-2 shadow-2xl rounded-2xl overflow-hidden bg-white">
        
        <section className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 p-12 text-white relative overflow-hidden" aria-labelledby="login-brand-title">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
            <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            {/* Logo & Company Name */}
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-3 border border-blue-400/30">
                <Wrench className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <h1 id="login-brand-title" className="text-2xl">IMOGI WORKSHOP</h1>
                <p className="text-slate-300 text-sm">Sistem Manajemen Bengkel Multi-Cabang</p>
              </div>
            </div>

            <h2 className="text-3xl mb-4">
              Kelola Bisnis Bengkel Anda dengan Mudah
            </h2>

            <p className="text-slate-300 mb-10 leading-relaxed">
              Sistem terintegrasi untuk mengelola operasional bengkel dengan fitur procurement, HR, payroll, asset management, dan approval workflow dari 3 cabang kami.
            </p>

            {/* Branch Locations */}
            <div>
              <p className="text-sm text-slate-400 mb-4 uppercase tracking-wider">CABANG KAMI</p>
              <div className="grid grid-cols-2 gap-3">
                {['Jakarta', 'Bandung', 'Surabaya'].map((city) => (
                  <div
                    key={city}
                    className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center gap-2 hover:bg-white/20 transition-all cursor-pointer border border-white/10 hover:border-blue-400/30"
                  >
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">{city}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-white/10">
              <p className="text-xs text-slate-400 text-center">
                © 2024 IMOGI WORKSHOP. All rights reserved.
              </p>
            </div>
          </div>
        </section>

        <section className="p-12 flex flex-col justify-center" aria-labelledby="login-form-title">
          <div className="mb-8">
            <h2 id="login-form-title" className="text-3xl text-slate-800 mb-2">Selamat Datang</h2>
            <p className="text-slate-500">Login untuk mengakses sistem</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" aria-describedby={error ? 'login-error' : undefined}>
            <div>
              <label htmlFor="login-username" className="block text-slate-700 mb-2 text-sm">Username</label>
              <div className="relative">
                <input
                  id="login-username"
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-slate-700 mb-2 text-sm">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  disabled={loading}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label htmlFor="remember-me" className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input id="remember-me" type="checkbox" className="rounded" disabled={loading} />
                <span>Ingat saya</span>
              </label>
              <span className="text-blue-600 text-sm">Hubungi admin untuk reset password</span>
            </div>

            {error && (
              <div id="login-error" role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
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
        </section>

      </main>
    </div>
  );
}