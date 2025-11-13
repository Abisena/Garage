'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Wrench, LogIn } from 'lucide-react';

interface LoginProps {
  onLogin: (credentials: { username: string; password: string }) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export function Login({ onLogin, loading, error }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | undefined>(undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(undefined);
    try {
      await onLogin({ username, password });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login gagal.');
    }
  };

  const activeError = localError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-white">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <Wrench className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-center mb-2">AutoCare Workshop</h1>
          <p className="text-center text-blue-100 text-sm">Sistem Manajemen Bengkel Multi Cabang</p>
        </div>

        <div className="p-8">
          <h2 className="text-slate-800 mb-6 text-center">Masuk ke Pravenya</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-700 mb-2">Username / Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="contoh: advisor@cabang.id"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {activeError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {activeError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3"
              disabled={loading}
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? 'Memproses…' : 'Login'}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
            Gunakan akun Pravenya yang memiliki akses ke portal bengkel.
          </div>
        </div>
      </div>
    </div>
  );
}
