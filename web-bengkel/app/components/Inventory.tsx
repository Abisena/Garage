'use client';

import React, { useMemo, useState } from 'react';
import { Package, AlertCircle } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function Inventory() {
  const { data } = usePortalData();
  const [search, setSearch] = useState('');
  const spareParts = data?.spare_parts || [];

  const { totalItems, lowStockCount, inventoryValue } = useMemo(() => {
    let lowStock = 0;
    let value = 0;
    spareParts.forEach((part) => {
      const stock = part.stock_qty || 0;
      const reorder = part.reorder_level || 0;
      const unitPrice = part.unit_price || 0;
      if (stock <= reorder && reorder > 0) {
        lowStock += 1;
      }
      value += stock * unitPrice;
    });
    return { totalItems: spareParts.length, lowStockCount: lowStock, inventoryValue: value };
  }, [spareParts]);

  const filteredParts = spareParts.filter((part) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      (part.part_code || '').toLowerCase().includes(query) ||
      (part.part_name || '').toLowerCase().includes(query) ||
      (part.category || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Spare Parts Inventory</h1>
            <p className="text-slate-600">Sinkron dengan data master Garage Spare Part</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 mb-2">Total Items</p>
                <h3 className="text-slate-900">{totalItems}</h3>
              </div>
              <div className="bg-blue-500 rounded-lg p-3">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 mb-2">Low Stock Items</p>
                <h3 className="text-slate-900">{lowStockCount}</h3>
              </div>
              <div className="bg-amber-500 rounded-lg p-3">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 mb-2">Total Value</p>
                <h3 className="text-slate-900">{currencyFormatter.format(inventoryValue)}</h3>
              </div>
              <div className="bg-emerald-500 rounded-lg p-3">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari kode, nama part, atau kategori"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-slate-700">Part Code</th>
                  <th className="px-6 py-4 text-left text-slate-700">Name</th>
                  <th className="px-6 py-4 text-left text-slate-700">Category</th>
                  <th className="px-6 py-4 text-left text-slate-700">Stock</th>
                  <th className="px-6 py-4 text-left text-slate-700">Price</th>
                  <th className="px-6 py-4 text-left text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredParts.map((part) => {
                  const stock = part.stock_qty || 0;
                  const reorder = part.reorder_level || 0;
                  const lowStock = reorder > 0 && stock <= reorder;
                  return (
                    <tr key={part.name} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-900">{part.part_code || part.name}</td>
                      <td className="px-6 py-4 text-slate-900">{part.part_name || '-'}</td>
                      <td className="px-6 py-4 text-slate-700">{part.category || '-'}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className={lowStock ? 'text-red-600' : 'text-slate-900'}>{stock} units</p>
                          {reorder > 0 && <p className="text-slate-500">Min: {reorder}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-900">{currencyFormatter.format(part.unit_price || 0)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full border ${
                            lowStock
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {lowStock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
