import React from 'react';
import { Plus, AlertCircle, Package } from 'lucide-react';
import { Button } from './ui/button';

export function Inventory() {
  const parts = [
    {
      code: 'BRK-001',
      name: 'Brake Pad Set',
      category: 'Brakes',
      stock: 24,
      minStock: 10,
      price: 'Rp 450.000',
      supplier: 'PT Auto Parts Indonesia',
      status: 'In Stock'
    },
    {
      code: 'OIL-002',
      name: 'Engine Oil 5W-30',
      category: 'Lubricants',
      stock: 45,
      minStock: 20,
      price: 'Rp 180.000',
      supplier: 'CV Berkah Jaya',
      status: 'In Stock'
    },
    {
      code: 'FLT-003',
      name: 'Oil Filter',
      category: 'Filters',
      stock: 8,
      minStock: 15,
      price: 'Rp 75.000',
      supplier: 'PT Auto Parts Indonesia',
      status: 'Low Stock'
    },
    {
      code: 'BTR-004',
      name: 'Car Battery 12V',
      category: 'Electrical',
      stock: 12,
      minStock: 5,
      price: 'Rp 850.000',
      supplier: 'UD Maju Motor',
      status: 'In Stock'
    },
    {
      code: 'TYR-005',
      name: 'Tire 185/65R15',
      category: 'Tires',
      stock: 3,
      minStock: 8,
      price: 'Rp 650.000',
      supplier: 'CV Berkah Jaya',
      status: 'Low Stock'
    },
    {
      code: 'SPK-006',
      name: 'Spark Plug Set',
      category: 'Ignition',
      stock: 32,
      minStock: 12,
      price: 'Rp 120.000',
      supplier: 'PT Auto Parts Indonesia',
      status: 'In Stock'
    },
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Spare Parts Inventory</h1>
            <p className="text-slate-600">Manage stock levels and supplier information</p>
          </div>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Part
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 mb-2">Total Items</p>
                <h3 className="text-slate-900">124</h3>
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
                <h3 className="text-slate-900">8</h3>
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
                <h3 className="text-slate-900">Rp 45.2M</h3>
              </div>
              <div className="bg-emerald-500 rounded-lg p-3">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-slate-700">Part Code</th>
                  <th className="px-6 py-4 text-left text-slate-700">Name</th>
                  <th className="px-6 py-4 text-left text-slate-700">Category</th>
                  <th className="px-6 py-4 text-left text-slate-700">Stock</th>
                  <th className="px-6 py-4 text-left text-slate-700">Price</th>
                  <th className="px-6 py-4 text-left text-slate-700">Supplier</th>
                  <th className="px-6 py-4 text-left text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((part, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 text-slate-900">{part.code}</td>
                    <td className="px-6 py-4 text-slate-900">{part.name}</td>
                    <td className="px-6 py-4 text-slate-700">{part.category}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className={`${part.stock < part.minStock ? 'text-red-600' : 'text-slate-900'}`}>
                          {part.stock} units
                        </p>
                        <p className="text-slate-500">Min: {part.minStock}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-900">{part.price}</td>
                    <td className="px-6 py-4 text-slate-700">{part.supplier}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full border ${
                        part.status === 'Low Stock'
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}>
                        {part.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
