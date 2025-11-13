'use client';

import React, { useMemo, useState } from 'react';
import { Search, Phone, Mail } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';

export function Customers() {
  const { data } = usePortalData();
  const [search, setSearch] = useState('');

  const customerWithVehicles = useMemo(() => {
    const vehiclesByCustomer = new Map<string, { vehicle: string; plate: string }>();
    (data?.vehicles || []).forEach((vehicle) => {
      if (!vehicle.customer) {
        return;
      }
      const label = [vehicle.brand, vehicle.model, vehicle.vehicle_year].filter(Boolean).join(' ');
      vehiclesByCustomer.set(vehicle.customer, {
        vehicle: label || 'Kendaraan terdaftar',
        plate: vehicle.license_plate || '-',
      });
    });

    return (data?.customers || []).map((customer) => {
      const info = vehiclesByCustomer.get(customer.name);
      return {
        id: customer.name,
        name: customer.customer_name || customer.name,
        email: customer.email || '-',
        phone: customer.phone || '-',
        vehicle: info?.vehicle || '—',
        plate: info?.plate || '—',
        branch: customer.branch || '-',
        visits: '-',
        lastVisit: '-',
      };
    });
  }, [data?.customers, data?.vehicles]);

  const filteredCustomers = customerWithVehicles.filter((customer) => {
    const query = search.toLowerCase();
    if (!query) return true;
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.plate.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Customers</h1>
            <p className="text-slate-600">Data pelanggan yang tersimpan di Pravenya</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, telepon, email, atau nomor polisi..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div>
                  <h3 className="text-slate-900 mb-1">{customer.name}</h3>
                  <p className="text-slate-600">{customer.vehicle}</p>
                  <p className="text-slate-500">{customer.plate}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span>{customer.phone}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-500">Cabang</p>
                    <p className="text-slate-900">{customer.branch}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">Kunjungan</p>
                    <p className="text-slate-900">{customer.visits}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
