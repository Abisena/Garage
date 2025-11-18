import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  DollarSign,
  Package,
  Trash2,
  Save,
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
  ShoppingCart,
  Receipt,
  Percent,
  X
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import { toast } from "sonner";

export function DirectSalesSparePart({ currentUser }) {
  const [sales, setSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showSparePartModal, setShowSparePartModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // New Sale Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [salesItems, setSalesItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // Dummy spare parts data
  const [spareParts] = useState([
    {
      id: 'SP001',
      partNumber: 'BRK-001-TYT',
      name: 'Brake Pad Front',
      category: 'Brakes',
      stock: 25,
      price: 350000,
      supplier: 'PT Genuine Parts',
      location: 'A-12',
      minStock: 10
    },
    {
      id: 'SP002',
      partNumber: 'OIL-FLT-002',
      name: 'Oil Filter',
      category: 'Filters',
      stock: 50,
      price: 75000,
      supplier: 'PT Auto Supply',
      location: 'B-05',
      minStock: 20
    },
    {
      id: 'SP003',
      partNumber: 'AIR-FLT-003',
      name: 'Air Filter',
      category: 'Filters',
      stock: 30,
      price: 125000,
      supplier: 'PT Auto Supply',
      location: 'B-06',
      minStock: 15
    },
    {
      id: 'SP004',
      partNumber: 'SPK-PLG-004',
      name: 'Spark Plug Set (4pcs)',
      category: 'Ignition',
      stock: 20,
      price: 280000,
      supplier: 'PT Genuine Parts',
      location: 'C-08',
      minStock: 10
    },
    {
      id: 'SP005',
      partNumber: 'BTR-001-TYT',
      name: 'Battery 12V 65Ah',
      category: 'Electrical',
      stock: 8,
      price: 1250000,
      supplier: 'PT Battery Indo',
      location: 'D-01',
      minStock: 5
    }
  ]);

  // Load sales from localStorage
  useEffect(() => {
    const savedSales = localStorage.getItem('directSales');
    if (savedSales) {
      setSales(JSON.parse(savedSales));
    }
  }, []);

  // Save sales to localStorage
  const saveSales = (updatedSales) => {
    setSales(updatedSales);
    localStorage.setItem('directSales', JSON.stringify(updatedSales));
  };

  const generateSalesNumber = () => {
    const branchCodes = {
      'Jakarta': 'JKT',
      'Bandung': 'BDG',
      'Surabaya': 'SBY'
    };
    const branchCode = branchCodes[currentUser.branch] || 'JKT';
    const count = sales.filter(s => s.salesNumber.startsWith(branchCode)).length + 1;
    return `${branchCode}-DS-${String(count).padStart(4, '0')}`;
  };

  const addSparePartToSale = (sparePart) => {
    const newItem = {
      id: `${Date.now()}-${sparePart.id}`,
      sparePart,
      quantity: 1,
      unitPrice: sparePart.price,
      discount: 0,
      discountType: 'percent',
      totalPrice: sparePart.price
    };
    setSalesItems([...salesItems, newItem]);
    setShowSparePartModal(false);
    toast.success(`${sparePart.name} ditambahkan ke penjualan`);
  };

  const updateItemQuantity = (itemId, quantity) => {
    if (quantity < 1) return;
    setSalesItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const discountAmount = item.discountType === 'percent' 
            ? (item.unitPrice * quantity * item.discount / 100)
            : item.discount;
          const totalPrice = (item.unitPrice * quantity) - discountAmount;
          return { ...item, quantity, totalPrice };
        }
        return item;
      })
    );
  };

  const updateItemDiscount = (itemId, discount, discountType) => {
    setSalesItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const discountAmount = discountType === 'percent' 
            ? (item.unitPrice * item.quantity * discount / 100)
            : discount;
          const totalPrice = (item.unitPrice * item.quantity) - discountAmount;
          return { ...item, discount, discountType, totalPrice };
        }
        return item;
      })
    );
  };

  const removeItemFromSale = (itemId) => {
    setSalesItems(items => items.filter(item => item.id !== itemId));
    toast.info('Item dihapus dari penjualan');
  };

  const calculateSubtotal = () => {
    return salesItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const calculateTotalDiscount = () => {
    return salesItems.reduce((sum, item) => {
      const discountAmount = item.discountType === 'percent'
        ? (item.unitPrice * item.quantity * item.discount / 100)
        : item.discount;
      return sum + discountAmount;
    }, 0);
  };

  const calculateDPP = () => {
    return Math.round((calculateSubtotal() - calculateTotalDiscount()) / 1.11);
  };

  const calculatePPN = () => {
    return (calculateSubtotal() - calculateTotalDiscount()) - calculateDPP();
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() - calculateTotalDiscount();
  };

  const handleCreateSale = () => {
    if (!customerName || !customerPhone) {
      toast.error('Nama dan telepon pelanggan harus diisi!');
      return;
    }

    if (salesItems.length === 0) {
      toast.error('Minimal satu sparepart harus ditambahkan!');
      return;
    }

    const newSale = {
      id: `DS-${Date.now()}`,
      salesNumber: generateSalesNumber(),
      date: new Date().toLocaleDateString('id-ID'),
      branch: currentUser.branch,
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      items: salesItems,
      subtotal: calculateSubtotal(),
      totalDiscount: calculateTotalDiscount(),
      dpp: calculateDPP(),
      ppn: calculatePPN(),
      grandTotal: calculateGrandTotal(),
      paymentMethod,
      paymentStatus: 'paid',
      notes: notes || undefined,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    saveSales([...sales, newSale]);
    toast.success(`Penjualan ${newSale.salesNumber} berhasil dibuat!`);
    resetForm();
    setShowNewSaleModal(false);
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setSalesItems([]);
    setPaymentMethod('cash');
    setNotes('');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.salesNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customerPhone.includes(searchQuery);

    const matchesStatus = filterStatus === 'all' || sale.paymentStatus === filterStatus;

    // Branch filter
    const matchesBranch = currentUser.role === 'administrator' || sale.branch === currentUser.branch;

    return matchesSearch && matchesStatus && matchesBranch;
  });

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Tunai',
      transfer: 'Transfer',
      card: 'Kartu',
      credit: 'Kredit'
    };
    return labels[method] || method;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-slate-900 flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            Direct Sales Sparepart
          </h1>
          <p className="text-slate-500 mt-2">
            Penjualan langsung sparepart tanpa work order • Cabang: {currentUser.branch}
          </p>
        </div>
        <Button onClick={() => setShowNewSaleModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Penjualan Baru
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500">Total Penjualan</p>
              <h3 className="text-slate-900 mt-1">{filteredSales.length}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500">Lunas</p>
              <h3 className="text-slate-900 mt-1">
                {filteredSales.filter(s => s.paymentStatus === 'paid').length}
              </h3>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500">Pending</p>
              <h3 className="text-slate-900 mt-1">
                {filteredSales.filter(s => s.paymentStatus === 'pending').length}
              </h3>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500">Total Revenue</p>
              <h3 className="text-slate-900 mt-1">
                {formatCurrency(filteredSales.reduce((sum, s) => sum + s.grandTotal, 0))}
              </h3>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Cari nomor penjualan, nama pelanggan, atau telepon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filter Status Pembayaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="paid">Lunas</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-slate-700">No. Penjualan</th>
                <th className="text-left px-6 py-4 text-slate-700">Tanggal</th>
                <th className="text-left px-6 py-4 text-slate-700">Pelanggan</th>
                <th className="text-left px-6 py-4 text-slate-700">Items</th>
                <th className="text-left px-6 py-4 text-slate-700">Total</th>
                <th className="text-left px-6 py-4 text-slate-700">Metode</th>
                <th className="text-left px-6 py-4 text-slate-700">Status</th>
                <th className="text-left px-6 py-4 text-slate-700">Cabang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Belum ada data penjualan</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-blue-600" />
                        <span className="text-slate-900">{sale.salesNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{sale.date}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-slate-900">{sale.customerName}</p>
                        <p className="text-slate-500">{sale.customerPhone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{sale.items.length} item(s)</td>
                    <td className="px-6 py-4 text-slate-900">{formatCurrency(sale.grandTotal)}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-slate-100">
                        {getPaymentMethodLabel(sale.paymentMethod)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getPaymentStatusColor(sale.paymentStatus)}>
                        {sale.paymentStatus.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{sale.branch}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sale Modal */}
      <Dialog open={showNewSaleModal} onOpenChange={setShowNewSaleModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-blue-600" />
              Penjualan Baru - Direct Sales Sparepart
            </DialogTitle>
            <DialogDescription>
              Buat transaksi penjualan sparepart langsung tanpa work order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Customer Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Informasi Pelanggan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="customerName">Nama Pelanggan *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama lengkap"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Telepon *</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email (Opsional)</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Daftar Sparepart
                </h3>
                <Button
                  onClick={() => setShowSparePartModal(true)}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Sparepart
                </Button>
              </div>

              {salesItems.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-500">Belum ada sparepart ditambahkan</p>
                  <p className="text-slate-400">Klik tombol "Tambah Sparepart" untuk memulai</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-slate-700">Sparepart</th>
                        <th className="text-left px-4 py-3 text-slate-700">Kode Part</th>
                        <th className="text-center px-4 py-3 text-slate-700">Qty</th>
                        <th className="text-right px-4 py-3 text-slate-700">Harga</th>
                        <th className="text-right px-4 py-3 text-slate-700">Diskon</th>
                        <th className="text-right px-4 py-3 text-slate-700">Subtotal</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {salesItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-slate-900">{item.sparePart.name}</td>
                          <td className="px-4 py-3 text-slate-600">{item.sparePart.partNumber}</td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value))}
                              className="w-20 text-center"
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                value={item.discount}
                                onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value), item.discountType)}
                                className="w-20 text-right"
                              />
                              <Select
                                value={item.discountType}
                                onValueChange={(value) => 
                                  updateItemDiscount(item.id, item.discount, value)
                                }
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percent">%</SelectItem>
                                  <SelectItem value="amount">Rp</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">
                            {formatCurrency(item.totalPrice)}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItemFromSale(item.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Summary */}
            {salesItems.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <div className="space-y-3">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal</span>
                    <span>{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Total Diskon</span>
                    <span className="text-red-600">- {formatCurrency(calculateTotalDiscount())}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>DPP (Dasar Pengenaan Pajak)</span>
                    <span>{formatCurrency(calculateDPP())}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>PPN 11%</span>
                    <span>{formatCurrency(calculatePPN())}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-3 flex justify-between text-slate-900">
                    <span>Grand Total</span>
                    <span>{formatCurrency(calculateGrandTotal())}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentMethod">Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Tunai</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="card">Kartu Debit/Kredit</SelectItem>
                    <SelectItem value="credit">Kredit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setShowNewSaleModal(false)}>
                Batal
              </Button>
              <Button
                onClick={handleCreateSale}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={salesItems.length === 0}
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan Penjualan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Spare Part Selection Modal */}
      <Dialog open={showSparePartModal} onOpenChange={setShowSparePartModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pilih Sparepart</DialogTitle>
            <DialogDescription>
              Pilih sparepart yang akan ditambahkan ke penjualan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {spareParts.map((part) => (
              <div
                key={part.id}
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                onClick={() => addSparePartToSale(part)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-slate-900">{part.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {part.category}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <p>Kode: {part.partNumber}</p>
                      <p>Stock: {part.stock} unit</p>
                      <p>Supplier: {part.supplier}</p>
                      <p>Lokasi: {part.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-600">{formatCurrency(part.price)}</p>
                    <Button size="sm" className="mt-2">
                      <Plus className="w-4 h-4 mr-1" />
                      Tambah
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}