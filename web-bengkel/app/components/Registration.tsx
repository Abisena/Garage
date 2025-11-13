'use client';

import React, { useMemo, useState } from 'react';
import { Car, User, ClipboardList, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { usePortalData } from '../context/PortalDataContext';
import { registerCustomerVehicle } from '../../lib/api';

const defaultForm = {
  customer_name: '',
  phone: '',
  email: '',
  license_plate: '',
  brand: '',
  model: '',
  vehicle_year: '',
  service_order_type: '',
  service_notes: '',
  service_bundle: '',
};

export function Registration() {
  const { data, activeBranch, refresh } = usePortalData();
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recentOrders = useMemo(() => {
    const orders = data?.service_orders || [];
    return [...orders]
      .sort((a, b) => {
        const dateA = a.service_booking_date ? new Date(a.service_booking_date).getTime() : 0;
        const dateB = b.service_booking_date ? new Date(b.service_booking_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 6);
  }, [data?.service_orders]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      await registerCustomerVehicle({
        ...form,
        branch: activeBranch,
        intake_type: 'Walk-In',
        service_booking_date: new Date().toISOString(),
      });
      setMessage('Registrasi berhasil disimpan. Service order baru telah dibuat.');
      setForm(defaultForm);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan registrasi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-slate-800 mb-1">Customer Registration</h1>
          <p className="text-slate-600">Form intake untuk membuat service order baru</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 lg:col-span-2" onSubmit={handleSubmit}>
            <div>
              <h3 className="text-slate-700 mb-4 flex items-center gap-2">
                <Car className="w-5 h-5" /> Vehicle Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-2">License Plate *</label>
                  <input
                    type="text"
                    value={form.license_plate}
                    onChange={(event) => handleChange('license_plate', event.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-2">Brand *</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(event) => handleChange('brand', event.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-2">Model *</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(event) => handleChange('model', event.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-2">Year</label>
                  <input
                    type="text"
                    value={form.vehicle_year}
                    onChange={(event) => handleChange('vehicle_year', event.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-slate-700 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" /> Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-2">Customer Name *</label>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(event) => handleChange('customer_name', event.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => handleChange('phone', event.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => handleChange('email', event.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-slate-700 mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5" /> Service Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-2">Service Type *</label>
                  <input
                    type="text"
                    value={form.service_order_type}
                    onChange={(event) => handleChange('service_order_type', event.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-2">Service Bundle</label>
                  <select
                    value={form.service_bundle}
                    onChange={(event) => handleChange('service_bundle', event.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">Custom</option>
                    {(data?.service_bundles || []).map((bundle) => (
                      <option key={bundle.name} value={bundle.name}>
                        {bundle.bundle_name || bundle.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-slate-700 mb-2">Customer Complaint / Notes</label>
                <textarea
                  value={form.service_notes}
                  onChange={(event) => handleChange('service_notes', event.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  rows={3}
                />
              </div>
            </div>

            {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{message}</div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

            <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit Registration
            </Button>
          </form>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-slate-800 mb-4">Recent Registrations</h3>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.name} className="border border-slate-200 rounded-lg p-4">
                  <p className="text-slate-900 font-medium">{order.name}</p>
                  <p className="text-slate-600 text-sm">
                    {order.vehicle_plate || '-'} · {order.service_order_type || '-'}
                  </p>
                  <p className="text-slate-500 text-sm">{order.status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
