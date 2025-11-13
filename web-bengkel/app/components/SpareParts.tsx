'use client';

import React, { useMemo, useState } from 'react';
import { Search, Package } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function SpareParts() {
  const { data } = usePortalData();
  const [search, setSearch] = useState('');
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const parts = useMemo(() => data?.spare_parts || [], [data?.spare_parts]);

  const filteredParts = parts.filter((part) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      (part.part_code || '').toLowerCase().includes(query) ||
      (part.part_name || '').toLowerCase().includes(query) ||
      (part.brand || '').toLowerCase().includes(query) ||
      (part.category || '').toLowerCase().includes(query)
    );
  });

  const activePart = filteredParts.find((part) => part.name === selectedPart) || filteredParts[0];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Master Spare Parts</h1>
            <p className="text-slate-600">Data referensi untuk permintaan sparepart & procurement</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari kode, nama, brand, atau kategori part"
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 lg:col-span-2 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-slate-700">Code</th>
                  <th className="px-4 py-3 text-left text-slate-700">Name</th>
                  <th className="px-4 py-3 text-left text-slate-700">Brand</th>
                  <th className="px-4 py-3 text-left text-slate-700">Stock</th>
                  <th className="px-4 py-3 text-left text-slate-700">Price</th>
                </tr>
              </thead>
              <tbody>
                {filteredParts.map((part) => (
                  <tr
                    key={part.name}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                      activePart?.name === part.name ? 'bg-slate-50' : ''
                    }`}
                    onClick={() => setSelectedPart(part.name)}
                  >
                    <td className="px-4 py-3 text-slate-900">{part.part_code || part.name}</td>
                    <td className="px-4 py-3 text-slate-900">{part.part_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{part.brand || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{part.stock_qty || 0}</td>
                    <td className="px-4 py-3 text-slate-900">{currencyFormatter.format(part.unit_price || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            {activePart ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-700 w-12 h-12 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">{activePart.part_code || activePart.name}</p>
                    <h3 className="text-slate-900">{activePart.part_name || '-'}</h3>
                  </div>
                </div>

                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Brand</dt>
                    <dd className="text-slate-900">{activePart.brand || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Category</dt>
                    <dd className="text-slate-900">{activePart.category || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Stock Qty</dt>
                    <dd className="text-slate-900">{activePart.stock_qty || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Reserved Qty</dt>
                    <dd className="text-slate-900">{activePart.reserved_qty || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Reorder Level</dt>
                    <dd className="text-slate-900">{activePart.reorder_level || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Unit Price</dt>
                    <dd className="text-slate-900">{currencyFormatter.format(activePart.unit_price || 0)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Warehouse</dt>
                    <dd className="text-slate-900">{activePart.warehouse || activePart.default_warehouse || '-'}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Tidak ada data sparepart untuk ditampilkan.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
