import React, { useCallback, useEffect, useState } from 'react';
import { Package, Search, RefreshCcw } from 'lucide-react';
import { Button } from './ui/button';
import { frappeClient } from '../lib/frappeClient';

export function SpareParts() {
  const [spareParts, setSpareParts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalParts: 0,
    lowStock: 0,
    categories: 0,
    totalValue: 0,
  });

  const isLowStock = useCallback((part) => {
    const stockQty = Number(part?.stock_qty ?? part?.actual_qty) || 0;
    const reorderLevel = Number(part?.safety_stock ?? part?.reorder_level);

    if (Number.isFinite(reorderLevel) && reorderLevel > 0) {
      return stockQty <= reorderLevel;
    }

    return stockQty <= 0;
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  };

  const loadSpareParts = useCallback(async (cancelledRef) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await frappeClient.listSpareParts();
      const parts = Array.isArray(response?.spare_parts) ? response.spare_parts : [];

      if (cancelledRef?.current) return;

      setSpareParts(parts);

      const totalParts = Number(response?.total_count) || parts.length;
      const lowStockCount = Number(response?.low_stock_count) || parts.filter(isLowStock).length;
      const categories = new Set(parts.map((p) => p.item_group).filter(Boolean)).size;
      const totalValue = parts.reduce(
        (sum, part) => sum + (Number(part?.stock_qty || part?.actual_qty || 0) * (Number(part?.valuation_rate || part?.standard_rate || 0))),
        0,
      );

      setStats({
        totalParts,
        lowStock: lowStockCount,
        categories,
        totalValue,
      });
    } catch (err) {
      console.error('Failed to load spare parts from ERPNext Item master', err);
      if (!cancelledRef?.current) {
        setError('Gagal memuat data spare part dari master Item ERPNext. Pastikan sesi login masih aktif.');
        setSpareParts([]);
        setStats({ totalParts: 0, lowStock: 0, categories: 0, totalValue: 0 });
      }
    } finally {
      if (!cancelledRef?.current) {
        setIsLoading(false);
      }
    }
  }, [isLowStock]);

  useEffect(() => {
    const cancelledRef = { current: false };

    loadSpareParts(cancelledRef);

    return () => {
      cancelledRef.current = true;
    };
  }, [loadSpareParts]);

  const filteredParts = spareParts.filter((part) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return [part.item_name, part.item_code, part.item_group, part.brand]
      .map((value) => (value || '').toString().toLowerCase())
      .some((value) => value.includes(query));
  });

  const getStatusBadge = (part) => {
    const lowStock = isLowStock(part);
    const status = (part?.disabled ? 'Inactive' : part?.status || 'Active').toLowerCase();

    if (lowStock) {
      return <span className="inline-block px-3 py-1 rounded-full text-xs bg-amber-100 text-amber-800">Low Stock</span>;
    }

    if (status === 'inactive') {
      return <span className="inline-block px-3 py-1 rounded-full text-xs bg-slate-200 text-slate-700">Inactive</span>;
    }

    return <span className="inline-block px-3 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">Active</span>;
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Master Spare Parts</h1>
            <p className="text-slate-600">Data diambil langsung dari ERPNext Item</p>
          </div>
          <Button onClick={() => loadSpareParts()} className="bg-blue-500 hover:bg-blue-600 text-white" disabled={isLoading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Total Parts</p>
                <p className="text-slate-900 text-2xl">{stats.totalParts}</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Low Stock</p>
                <p className="text-slate-900 text-2xl">{stats.lowStock}</p>
              </div>
              <div className="bg-amber-100 rounded-lg p-3">
                <Package className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Categories</p>
                <p className="text-slate-900 text-2xl">{stats.categories}</p>
              </div>
              <div className="bg-emerald-100 rounded-lg p-3">
                <Package className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Total Value</p>
                <p className="text-slate-900 text-lg">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="bg-slate-100 rounded-lg p-3">
                <Package className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama item, kode, kategori, atau brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Parts Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-slate-700">Part Name</th>
                  <th className="text-left px-6 py-4 text-slate-700">Item Code</th>
                  <th className="text-left px-6 py-4 text-slate-700">Category</th>
                  <th className="text-left px-6 py-4 text-slate-700">Brand</th>
                  <th className="text-right px-6 py-4 text-slate-700">Unit Price</th>
                  <th className="text-center px-6 py-4 text-slate-700">Stock</th>
                  <th className="text-center px-6 py-4 text-slate-700">Reorder Level</th>
                  <th className="text-center px-6 py-4 text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-6 text-center text-slate-500">
                      Memuat data spare part...
                    </td>
                  </tr>
                )}

                {!isLoading && filteredParts.map((part) => (
                  <tr key={part.name || part.item_code} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-900">{part.item_name || part.item_code}</td>
                    <td className="px-6 py-4 text-slate-700">{part.item_code || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                        {part.item_group || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{part.brand || '-'}</td>
                    <td className="px-6 py-4 text-right text-slate-900">{formatCurrency(part.standard_rate || part.valuation_rate)}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded ${
                          isLowStock(part) ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {Number(part.stock_qty ?? part.actual_qty) || 0}
                      </span>
                      {Number(part.total_reserved_qty ?? part.reserved_qty) ? (
                        <p className="text-xs text-slate-500 mt-1">Reserved: {Number(part.total_reserved_qty ?? part.reserved_qty) || 0}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700">{Number(part.safety_stock ?? part.reorder_level) || 0}</td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(part)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredParts.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p>Tidak ada spare part yang cocok</p>
              <p className="text-sm mt-1">Coba sesuaikan kata kunci pencarian</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
