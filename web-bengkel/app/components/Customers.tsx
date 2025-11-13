'use client';

import React from 'react';
import { Plus, Search, Phone, Mail } from 'lucide-react';
import { Button } from './ui/button';

export function Customers() {
  const customers = [
    {
      name: 'Budi Santoso',
      email: 'budi.santoso@email.com',
      phone: '+62 812-3456-7890',
      vehicle: 'Toyota Avanza 2020',
      plate: 'B 1234 XYZ',
      visits: 5,
      lastVisit: '11 Nov 2025'
    },
    {
      name: 'Siti Rahayu',
      email: 'siti.rahayu@email.com',
      phone: '+62 813-4567-8901',
      vehicle: 'Honda Jazz 2019',
      plate: 'B 5678 ABC',
      visits: 8,
      lastVisit: '11 Nov 2025'
    },
    {
      name: 'Ahmad Yani',
      email: 'ahmad.yani@email.com',
      phone: '+62 814-5678-9012',
      vehicle: 'Suzuki Ertiga 2021',
      plate: 'B 9012 DEF',
      visits: 3,
      lastVisit: '10 Nov 2025'
    },
    {
      name: 'Dewi Lestari',
      email: 'dewi.lestari@email.com',
      phone: '+62 815-6789-0123',
      vehicle: 'Mitsubishi Xpander 2022',
      plate: 'B 3456 GHI',
      visits: 2,
      lastVisit: '10 Nov 2025'
    },
    {
      name: 'Rudi Hartono',
      email: 'rudi.hartono@email.com',
      phone: '+62 816-7890-1234',
      vehicle: 'Daihatsu Xenia 2018',
      plate: 'B 7890 JKL',
      visits: 12,
      lastVisit: '09 Nov 2025'
    },
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Customers</h1>
            <p className="text-slate-600">Manage customer information and history</p>
          </div>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email, or plate number..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer, index) => (
            <div key={index} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="space-y-4">
                {/* Customer Info */}
                <div>
                  <h3 className="text-slate-900 mb-1">{customer.name}</h3>
                  <p className="text-slate-600">{customer.vehicle}</p>
                  <p className="text-slate-500">{customer.plate}</p>
                </div>

                {/* Contact */}
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

                {/* Stats */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-slate-500">Total Visits</p>
                    <p className="text-slate-900">{customer.visits}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">Last Visit</p>
                    <p className="text-slate-900">{customer.lastVisit}</p>
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
