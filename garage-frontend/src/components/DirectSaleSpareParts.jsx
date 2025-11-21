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
  X,
  ArrowLeft,
  Printer,
  AlertCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
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
import { toast } from 'sonner';

export function DirectSalesSparePart({ currentUser, onNavigateToPayment }) {
  const [sales, setSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewSaleForm, setShowNewSaleForm] = useState(false);
  const [showSparePartModal, setShowSparePartModal] = useState(false);
  const [showFormPartModal, setShowFormPartModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // New Sale Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [salesItems, setSalesItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // Multi-select sparepart state
  const [selectedSpareParts, setSelectedSpareParts] = useState({});
  const [sparePartSearch, setSparePartSearch] = useState('');

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
      paymentStatus: 'pending',
      notes: notes || undefined,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    saveSales([...sales, newSale]);
    toast.success(`Penjualan ${newSale.salesNumber} berhasil dibuat!`);
    resetForm();
    setShowNewSaleForm(false);
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

  const handlePrintDocument = (sale) => {
    // Generate document number format: BranchCode-SELL-Number
    const branchCodes = {
      'Jakarta': 'JKT',
      'Bandung': 'BDG',
      'Surabaya': 'SBY'
    };
    const branchCode = branchCodes[sale.branch] || 'JKT';
    const sellNumber = sale.salesNumber.split('-')[2] || '0001'; // Get the number part
    const documentNumber = `${branchCode}-SELL-${sellNumber}`;
    
    // Simple alert for now - you can implement actual PDF generation here
    toast.success(`Mencetak Dokumen: ${documentNumber}`);
    console.log('Print Document:', {
      documentNumber,
      sale
    });
  };

  const handleShowFormPart = (sale) => {
    setSelectedSale(sale);
    setShowFormPartModal(true);
  };

  const generateDocumentNumber = (sale) => {
    const branchCodes = {
      'Jakarta': 'JKT',
      'Bandung': 'BDG',
      'Surabaya': 'SBY'
    };
    const branchCode = branchCodes[sale.branch] || 'JKT';
    const sellNumber = sale.salesNumber.split('-')[2] || '0001';
    return `${branchCode}-SELL-${sellNumber}`;
  };

  // Multi-select functions
  const toggleSparePartSelection = (partId) => {
    setSelectedSpareParts(prev => {
      const newSelection = { ...prev };
      if (newSelection[partId]) {
        delete newSelection[partId];
      } else {
        newSelection[partId] = 1; // Default quantity 1
      }
      return newSelection;
    });
  };

  const updateSelectedQuantity = (partId, quantity) => {
    if (quantity < 1) return;
    setSelectedSpareParts(prev => ({
      ...prev,
      [partId]: quantity
    }));
  };

  const addSelectedPartsToSale = () => {
    const selectedIds = Object.keys(selectedSpareParts);
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal satu sparepart!');
      return;
    }

    const newItems = selectedIds.map(partId => {
      const sparePart = spareParts.find(p => p.id === partId);
      const quantity = selectedSpareParts[partId];
      return {
        id: `${Date.now()}-${partId}`,
        sparePart,
        quantity,
        unitPrice: sparePart.price,
        discount: 0,
        discountType: 'percent',
        totalPrice: sparePart.price * quantity
      };
    });

    setSalesItems([...salesItems, ...newItems]);
    setSelectedSpareParts({});
    setSparePartSearch('');
    setShowSparePartModal(false);
    toast.success(`${selectedIds.length} sparepart berhasil ditambahkan!`);
  };

  const filteredSpareParts = spareParts.filter(part =>
    part.name.toLowerCase().includes(sparePartSearch.toLowerCase()) ||
    part.partNumber.toLowerCase().includes(sparePartSearch.toLowerCase()) ||
    part.category.toLowerCase().includes(sparePartSearch.toLowerCase())
  );

  // Render full-page form
  if (showNewSaleForm) {
    return (
      <>
        {/* NEW SALE FULL PAGE FORM */}
        <div className="fixed inset-0 bg-slate-50 z-40 overflow-auto">
          {/* Header - Full Width */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-8 py-5 shadow-xl sticky top-0 z-10">
            <div className="flex items-center justify-between max-w-[1800px] mx-auto">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNewSaleForm(false);
                    resetForm();
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white h-11 w-11 p-0 rounded-xl"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Penjualan Baru - Direct Sales Sparepart</h2>
                  <p className="text-blue-100">Transaksi penjualan langsung • Cabang: {currentUser.branch} • Kasir: {currentUser.name}</p>
                </div>
              </div>
              <div className="bg-white/20 rounded-xl px-6 py-3 backdrop-blur-sm">
                <div className="text-blue-100">Tanggal</div>
                <div className="text-xl font-bold">{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
          </div>

          {/* Content - Wide Layout */}
          <div className="max-w-[1800px] mx-auto p-8">
            <div className="grid grid-cols-12 gap-8">
              {/* FULL WIDTH FORM */}
              <div className="col-span-12 space-y-6">
                {/* Customer Information */}
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-600 p-3 rounded-xl">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 text-lg">Data Pelanggan</h3>
                        <p className="text-slate-600">Informasi pelanggan untuk transaksi</p>
                      </div>
                      <span className="bg-red-100 text-red-700 text-sm px-3 py-1.5 rounded-full font-semibold">* Wajib</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <Label htmlFor="customerName" className="flex items-center gap-2 mb-2 font-semibold text-slate-700">
                          <User className="w-4 h-4 text-blue-600" />
                          Nama Pelanggan *
                        </Label>
                        <Input
                          id="customerName"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Masukkan nama lengkap"
                          className="h-12 text-base border-slate-300"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customerPhone" className="flex items-center gap-2 mb-2 font-semibold text-slate-700">
                          <Phone className="w-4 h-4 text-blue-600" />
                          Nomor Telepon *
                        </Label>
                        <Input
                          id="customerPhone"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="08xxxxxxxxxx"
                          className="h-12 text-base border-slate-300"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customerEmail" className="flex items-center gap-2 mb-2 font-semibold text-slate-700">
                          <Mail className="w-4 h-4 text-slate-400" />
                          Email (Opsional)
                        </Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="h-12 text-base border-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100">
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-600 p-3 rounded-xl">
                          <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">Daftar Item Penjualan</h3>
                          <p className="text-slate-600">Sparepart yang akan dijual</p>
                        </div>
                        {salesItems.length > 0 && (
                          <Badge className="bg-emerald-600 text-white border-0 px-3 py-1">
                            {salesItems.length} Item
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={() => setShowSparePartModal(true)}
                        size="lg"
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-12"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Tambah Sparepart
                      </Button>
                    </div>
                  </div>

                  <div className="p-6">
                    {salesItems.length === 0 ? (
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center py-20">
                        <div className="bg-slate-200 w-24 h-24 rounded-full flex items-center justify-center mb-4">
                          <Package className="w-12 h-12 text-slate-400" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-700 mb-2">Belum Ada Item</h4>
                        <p className="text-slate-500">Klik tombol "Tambah Sparepart" di atas untuk memulai transaksi</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                          <table className="w-full">
                            <thead className="bg-gradient-to-r from-slate-700 to-slate-600 text-white sticky top-0 z-10">
                              <tr>
                                <th className="text-left px-3 py-2.5 font-bold text-xs">NO</th>
                                <th className="text-left px-3 py-2.5 font-bold text-xs">NAMA SPAREPART</th>
                                <th className="text-left px-3 py-2.5 font-bold text-xs">KODE</th>
                                <th className="text-center px-3 py-2.5 font-bold text-xs">STOK</th>
                                <th className="text-center px-3 py-2.5 font-bold text-xs">QTY</th>
                                <th className="text-right px-3 py-2.5 font-bold text-xs">HARGA</th>
                                <th className="text-center px-3 py-2.5 font-bold text-xs">DISKON</th>
                                <th className="text-right px-3 py-2.5 font-bold text-xs">SUBTOTAL</th>
                                <th className="text-center px-3 py-2.5 font-bold text-xs">AKSI</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {salesItems.map((item, index) => {
                                const rowClassName = `hover:bg-emerald-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`;
                                return (
                                <tr key={item.id} className={rowClassName}>
                                  <td className="px-3 py-2.5">
                                    <div className="bg-blue-100 text-blue-700 font-bold w-7 h-7 rounded-lg flex items-center justify-center text-xs">
                                      {index + 1}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <div className="bg-emerald-100 p-1.5 rounded-lg">
                                        <Package className="w-4 h-4 text-emerald-600" />
                                      </div>
                                      <div>
                                        <p className="text-slate-900 font-bold text-xs">{item.sparePart.name}</p>
                                        <p className="text-slate-500 text-xs">{item.sparePart.category}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="font-mono text-slate-700 bg-slate-200 px-2 py-1 rounded text-xs">
                                      {item.sparePart.partNumber}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span className={`font-bold text-xs ${item.sparePart.stock < item.sparePart.minStock ? 'text-red-600' : 'text-emerald-600'}`}>
                                      {item.sparePart.stock}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <Input
                                      type="number"
                                      min="1"
                                      max={item.sparePart.stock}
                                      value={item.quantity}
                                      onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value))}
                                      className="w-16 h-8 text-center font-bold border-blue-200 text-xs"
                                    />
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    <span className="text-slate-900 font-semibold text-xs">
                                      {formatCurrency(item.unitPrice)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Input
                                        type="number"
                                        min="0"
                                        value={item.discount}
                                        onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value), item.discountType)}
                                        className="w-14 h-8 text-right border-amber-200 text-xs"
                                      />
                                      <Select
                                        value={item.discountType}
                                        onValueChange={(value) => 
                                          updateItemDiscount(item.id, item.discount, value)
                                        }
                                      >
                                        <SelectTrigger className="w-14 h-8 border-amber-200 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="percent">
                                            <div className="flex items-center gap-1">
                                              <Percent className="w-3 h-3" />%
                                            </div>
                                          </SelectItem>
                                          <SelectItem value="amount">Rp</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    <span className="text-emerald-600 font-bold text-xs">
                                      {formatCurrency(item.totalPrice)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeItemFromSale(item.id)}
                                      className="text-red-600 hover:bg-red-100 h-7 w-7 p-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </td>
                                </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons - Save & Cancel */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-end gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowNewSaleForm(false);
                        resetForm();
                      }}
                      className="h-12 px-8 border-2 border-slate-300 hover:bg-slate-100"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Batal
                    </Button>
                    <Button
                      onClick={handleCreateSale}
                      className="h-12 px-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg font-bold"
                      disabled={salesItems.length === 0 || !customerName || !customerPhone}
                    >
                      <Save className="w-5 h-5 mr-2" />
                      Simpan Penjualan
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spare Part Selection Modal - Exact Layout Spec: 900×650px */}
        <Dialog open={showSparePartModal} onOpenChange={(open) => {
          setShowSparePartModal(open);
          if (!open) {
            setSelectedSpareParts({});
            setSparePartSearch('');
          }
        }}>
          <DialogContent className="!max-w-5xl w-full h-[650px] p-6 flex flex-col gap-6">
            <DialogHeader className="sr-only">
              <DialogTitle>Pilih Sparepart</DialogTitle>
              <DialogDescription>
                Pilih item yang ingin ditambahkan ke penjualan
              </DialogDescription>
            </DialogHeader>

            {/* Header Section */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[20px] font-bold text-slate-900">Pilih Sparepart</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Pilih item yang ingin ditambahkan ke penjualan
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSparePartModal(false);
                  setSelectedSpareParts({});
                  setSparePartSearch('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar - 100% width, min-width 840px, height 48px */}
            <div className="relative min-w-[840px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Cari nama part, kode, kategori, atau supplier..."
                value={sparePartSearch}
                onChange={(e) => setSparePartSearch(e.target.value)}
                className="h-12 pl-12 w-full"
              />
            </div>

            {/* Scrollable List Area - Height 460px, Gap 8px */}
            <div className="h-[460px] overflow-y-auto flex flex-col gap-2">
              {filteredSpareParts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Package className="w-12 h-12 mb-3 text-slate-300" />
                  <p className="text-sm">Tidak ada sparepart ditemukan</p>
                </div>
              ) : (
                filteredSpareParts.map((part) => {
                  const isSelected = !!selectedSpareParts[part.id];
                  const isLowStock = part.stock < part.minStock;

                  return (
                    <div
                      key={part.id}
                      className={`h-16 w-full flex items-center px-4 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                      onClick={(e) => {
                        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                          toggleSparePartSelection(part.id);
                        }
                      }}
                    >
                      {/* Checkbox - Width: 24px */}
                      <div className="w-6 flex-shrink-0 mr-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSparePartSelection(part.id)}
                          className="w-5 h-5"
                        />
                      </div>

                      {/* Part Name - Width: 240px */}
                      <div className="w-[240px] flex-shrink-0 mr-3">
                        <span className="font-bold text-slate-900 truncate block">{part.name}</span>
                      </div>

                      {/* Category - Width: 90px */}
                      <div className="w-[90px] flex-shrink-0 mr-3">
                        <Badge className="bg-blue-100 text-blue-700 border-0 px-2 py-0.5 text-xs">
                          {part.category}
                        </Badge>
                      </div>

                      {/* Part Code - Width: 100px */}
                      <div className="w-[100px] flex-shrink-0 mr-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {part.partNumber}
                        </Badge>
                      </div>

                      {/* Quantity Controls - Width: 120px */}
                      <div className="w-[120px] flex items-center gap-1 flex-shrink-0 mr-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            const currentQty = selectedSpareParts[part.id] || 1;
                            if (currentQty > 1) {
                              updateSelectedQuantity(part.id, currentQty - 1);
                            }
                          }}
                          disabled={!isSelected}
                          className="w-7 h-7 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          −
                        </button>
                        <Input
                          type="number"
                          min="1"
                          max={part.stock}
                          value={isSelected ? selectedSpareParts[part.id] : 1}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateSelectedQuantity(part.id, parseInt(e.target.value) || 1);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          disabled={!isSelected}
                          className="w-10 h-7 text-center text-sm px-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                        <button
                          onClick={() => {
                            const currentQty = selectedSpareParts[part.id] || 1;
                            if (currentQty < part.stock) {
                              updateSelectedQuantity(part.id, currentQty + 1);
                            }
                          }}
                          disabled={!isSelected}
                          className="w-7 h-7 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>

                      {/* Stock Tag + Location Tag - Width: 180px */}
                      <div className="w-[180px] flex items-center gap-2 flex-shrink-0 mr-3">
                        <Badge className={`px-2 py-0.5 text-xs ${
                          isLowStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          Stok: {part.stock}
                        </Badge>
                        <Badge className="bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs">
                          {part.location}
                        </Badge>
                      </div>

                      {/* Price Tag - Width: 100px */}
                      <div className="w-[100px] flex-shrink-0">
                        <Badge className="bg-blue-600 text-white px-3 py-1 text-sm">
                          {formatCurrency(part.price)}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer - Sticky Bottom, Height 80px */}
            <div className="h-20 border-t flex items-center justify-between px-4 -mx-6 -mb-6 bg-slate-50">
              <div className="text-sm text-slate-600">
                {Object.keys(selectedSpareParts).length > 0 ? (
                  <span>
                    <span className="font-bold text-emerald-600">{Object.keys(selectedSpareParts).length} item</span> dipilih
                  </span>
                ) : (
                  <span>Pilih minimal 1 sparepart untuk melanjutkan</span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSparePartModal(false);
                    setSelectedSpareParts({});
                    setSparePartSearch('');
                  }}
                  className="h-10"
                >
                  Batal
                </Button>
                <Button
                  onClick={addSelectedPartsToSale}
                  disabled={Object.keys(selectedSpareParts).length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-10"
                >
                  Tambahkan ke Penjualan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Render list view
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
        <Button onClick={() => setShowNewSaleForm(true)} className="bg-blue-600 hover:bg-blue-700 h-12 px-6 text-base">
          <Plus className="w-5 h-5 mr-2" />
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
              className="pl-10 h-12"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-12">
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
                <th className="text-left px-6 py-4 text-slate-700">Sales Number</th>
                <th className="text-left px-6 py-4 text-slate-700">Date</th>
                <th className="text-left px-6 py-4 text-slate-700">Customer</th>
                <th className="text-center px-6 py-4 text-slate-700">Qty</th>
                <th className="text-left px-6 py-4 text-slate-700">Status</th>
                <th className="text-left px-6 py-4 text-slate-700">Total</th>
                <th className="text-left px-6 py-4 text-slate-700">Branch</th>
                <th className="text-center px-6 py-4 text-slate-700">Action</th>
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
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 font-semibold">
                        {sale.items.length}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getPaymentStatusColor(sale.paymentStatus)}>
                        {sale.paymentStatus.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-semibold">{formatCurrency(sale.grandTotal)}</td>
                    <td className="px-6 py-4 text-slate-700">{sale.branch}</td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        size="sm"
                        onClick={() => handleShowFormPart(sale)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Form Part
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Part Modal - STYLE SAMA DENGAN PaymentNotaModal */}
      {showFormPartModal && selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-slate-800 text-xl">Pesanan Part</h3>
              <button onClick={() => setShowFormPartModal(false)} className="text-slate-600 hover:bg-slate-200 rounded-lg p-2 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-8">
              <div className="max-w-3xl mx-auto bg-white border-2 border-slate-300 rounded-lg p-8">
                {/* Header Nota */}
                <div className="border-b-2 border-slate-800 pb-4 mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-slate-900 text-3xl mb-2">PESANAN PART</h1>
                      <p className="text-slate-600">Workshop Management System</p>
                      <p className="text-slate-600">Cabang {selectedSale.branch}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-800 font-semibold font-mono text-3xl mb-2">{generateDocumentNumber(selectedSale)}</p>
                      <div className="text-sm space-y-1">
                        <div className="flex gap-2 justify-end">
                          <p className="text-slate-600">No. Sales:</p>
                          <p className="text-slate-900 font-semibold font-mono">{selectedSale.salesNumber}</p>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <p className="text-slate-600">Tanggal:</p>
                          <p className="text-slate-900 font-semibold">{selectedSale.date}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Pelanggan Only */}
                <div className="mb-6 text-sm">
                  <div className="border border-slate-300 rounded-lg p-4">
                    <h3 className="text-slate-800 font-semibold mb-3 pb-2 border-b border-slate-300">DATA PELANGGAN</h3>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <p className="text-slate-600 text-xs">Nama:</p>
                        <p className="text-slate-900 font-semibold">{selectedSale.customerName}</p>
                      </div>
                      <div className="flex gap-2">
                        <p className="text-slate-600 text-xs">Telepon:</p>
                        <p className="text-slate-900 font-semibold">{selectedSale.customerPhone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabel Sparepart */}
                {selectedSale.items && selectedSale.items.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-slate-800 font-semibold mb-3">DAFTAR SPAREPART</h3>
                    <table className="w-full border-2 border-slate-300">
                      <thead>
                        <tr className="bg-slate-200 border-b-2 border-slate-300">
                          <th className="px-3 py-2 text-left text-xs text-slate-700 border-r border-slate-300">KODE PART</th>
                          <th className="px-3 py-2 text-left text-xs text-slate-700 border-r border-slate-300">NAMA BARANG</th>
                          <th className="px-3 py-2 text-center text-xs text-slate-700 border-r border-slate-300">QTY</th>
                          <th className="px-3 py-2 text-right text-xs text-slate-700 border-r border-slate-300">HARGA</th>
                          <th className="px-3 py-2 text-right text-xs text-slate-700 border-r border-slate-300">DISKON</th>
                          <th className="px-3 py-2 text-right text-xs text-slate-700">JUMLAH</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.items.map((item, index) => (
                          <tr key={item.id} className={`border-b border-slate-300 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                            <td className="px-3 py-2 text-xs font-mono text-slate-700 border-r border-slate-300">{item.sparePart.partNumber}</td>
                            <td className="px-3 py-2 text-xs text-slate-800 border-r border-slate-300">{item.sparePart.name}</td>
                            <td className="px-3 py-2 text-xs text-center text-slate-700 border-r border-slate-300">{item.quantity}</td>
                            <td className="px-3 py-2 text-xs text-right text-slate-700 border-r border-slate-300">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-3 py-2 text-xs text-right text-amber-600 border-r border-slate-300">
                              {item.discountType === 'percent' 
                                ? `${item.discount}%` 
                                : formatCurrency(item.discount)
                              }
                            </td>
                            <td className="px-3 py-2 text-xs text-right text-slate-900 font-semibold">{formatCurrency(item.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Total Pembayaran */}
                <div className="border-t-2 border-slate-800 pt-4 mt-6">
                  <div className="flex justify-between items-start">
                    {/* TTD Petugas Part - Sebelah Kiri */}
                    <div className="text-center text-sm w-64 mt-8">
                      <p className="text-slate-600 mb-16">Petugas Part</p>
                      <div className="border-t-2 border-slate-400 pt-2">
                        <p className="font-semibold text-slate-900">{selectedSale.createdBy}</p>
                      </div>
                    </div>

                    {/* Summary Total - Sebelah Kanan */}
                    <div className="w-80">
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Sub Total:</span>
                          <span className="text-slate-900">{formatCurrency(selectedSale.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-amber-600">
                          <span>Diskon:</span>
                          <span className="font-semibold">-{formatCurrency(selectedSale.totalDiscount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">DPP (Dasar Pengenaan Pajak):</span>
                          <span className="text-slate-900">{formatCurrency(selectedSale.dpp)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">PPN 11%:</span>
                          <span className="text-slate-900">{formatCurrency(selectedSale.ppn)}</span>
                        </div>
                      </div>
                      <div className="border-t-2 border-slate-800 pt-3 flex justify-between items-center bg-slate-100 px-4 py-3 rounded">
                        <span className="text-slate-900 font-bold text-lg">TOTAL:</span>
                        <span className="text-slate-900 font-bold text-2xl">{formatCurrency(selectedSale.grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowFormPartModal(false)}
                className="px-6"
              >
                <X className="w-4 h-4 mr-2" />
                Tutup
              </Button>
              <Button 
                onClick={() => {
                  // Print the document
                  window.print();
                  
                  // Convert DirectSale to format compatible with Payment
                  const paymentData = {
                    type: 'directsales',
                    id: selectedSale.id,
                    salesNumber: selectedSale.salesNumber,
                    documentNumber: generateDocumentNumber(selectedSale),
                    date: selectedSale.date,
                    branch: selectedSale.branch,
                    customerName: selectedSale.customerName,
                    customerPhone: selectedSale.customerPhone,
                    items: selectedSale.items.map(item => ({
                      id: item.id,
                      name: item.sparePart.name,
                      partNumber: item.sparePart.partNumber,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                      discount: item.discount,
                      discountType: item.discountType,
                      totalPrice: item.totalPrice
                    })),
                    subtotal: selectedSale.subtotal,
                    totalDiscount: selectedSale.totalDiscount,
                    dpp: selectedSale.dpp,
                    ppn: selectedSale.ppn,
                    grandTotal: selectedSale.grandTotal,
                    paymentStatus: selectedSale.paymentStatus,
                    createdBy: selectedSale.createdBy
                  };
                  
                  // Store in localStorage for Payment component
                  localStorage.setItem('pendingDirectSalesPayment', JSON.stringify(paymentData));
                  
                  toast.success(`Dokumen ${generateDocumentNumber(selectedSale)} dicetak dan dikirim ke Payment Process!`);
                  
                  // Close modal but stay in Direct Sales UI
                  setShowFormPartModal(false);
                }}
                className="px-6 bg-gradient-to-r from-blue-600 to-indigo-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Cetak PDF
              </Button>
            </div>
          </div>
          
          {/* Print Styles for A5 Landscape */}
          <style>{`
            @media print {
              @page {
                size: A5 landscape;
                margin: 10mm;
              }
              
              body * {
                visibility: hidden;
              }
              
              .max-w-3xl, .max-w-3xl * {
                visibility: visible;
              }
              
              .max-w-3xl {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                max-width: 100%;
                padding: 0;
                margin: 0;
                border: none;
                box-shadow: none;
              }
              
              /* Hide modal overlay and buttons */
              .fixed.inset-0.bg-black {
                display: none !important;
              }
              
              .p-6.border-t {
                display: none !important;
              }
              
              .bg-slate-50.text-slate-800 {
                display: none !important;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}