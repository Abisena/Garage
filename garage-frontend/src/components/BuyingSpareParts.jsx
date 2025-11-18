import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Search, Package, Trash2, FileText, CheckCircle, Clock, Printer, Edit2 } from 'lucide-react';
import { Button } from './ui/button';

export function BuyingSparePart({ currentUser }) {
  const [masterSpareParts, setMasterSpareParts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [partSearchQuery, setPartSearchQuery] = useState('');
  const [view, setView] = useState('list');
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [isPrinted, setIsPrinted] = useState(false);
  
  // Form state for adding items
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [showCustomPartForm, setShowCustomPartForm] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Custom part form state
  const [customPartNumber, setCustomPartNumber] = useState('');
  const [customPartName, setCustomPartName] = useState('');
  const [customUnitPrice, setCustomUnitPrice] = useState(0);
  const [customUnitPriceDisplay, setCustomUnitPriceDisplay] = useState('');
  const [customQuantity, setCustomQuantity] = useState(1);

  // Preview state
  const [showPOPreview, setShowPOPreview] = useState(false);
  const [previewPO, setPreviewPO] = useState(null);

  // View detail state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPOForDetail, setSelectedPOForDetail] = useState(null);
  
  // List of vendors
  const vendors = [
    'PT. Auto Parts Indonesia',
    'CV. Cahaya Motor',
    'PT. Surya Spare Parts',
    'UD. Maju Jaya',
    'PT. Prima Auto Parts'
  ];

  useEffect(() => {
    loadMasterSpareParts();
    loadPurchaseOrders();
  }, []);

  const loadMasterSpareParts = () => {
    const savedParts = localStorage.getItem('masterSpareParts');
    if (savedParts) {
      setMasterSpareParts(JSON.parse(savedParts));
    }
  };

  const loadPurchaseOrders = () => {
    const savedPOs = localStorage.getItem('purchaseOrders');
    if (savedPOs) {
      setPurchaseOrders(JSON.parse(savedPOs));
    }
  };

  const savePurchaseOrders = (pos) => {
    setPurchaseOrders(pos);
    localStorage.setItem('purchaseOrders', JSON.stringify(pos));
  };

  const handleCreateNewPO = () => {
    setView('create');
    setSelectedItems([]);
    setSelectedVendor('');
    setIsPrinted(false);
  };

  const handleAddItem = () => {
    if (!selectedPart || quantity <= 0) {
      alert('⚠️ Pilih part dan masukkan quantity yang valid!');
      return;
    }

    const newItem = {
      id: `item-${Date.now()}`,
      partNumber: selectedPart.partNumber,
      partName: selectedPart.partName,
      quantity: quantity,
      unitPrice: selectedPart.unitPrice,
      totalPrice: selectedPart.unitPrice * quantity
    };

    setSelectedItems([...selectedItems, newItem]);
    setSelectedPart(null);
    setQuantity(1);
    setPartSearchQuery('');
    setShowPartSelector(false);
  };

  const handleAddCustomItem = () => {
    if (!customPartNumber || !customPartName || customUnitPrice <= 0 || customQuantity <= 0) {
      alert('⚠️ Masukkan semua detail part dengan benar!');
      return;
    }

    const newItem = {
      id: `item-${Date.now()}`,
      partNumber: customPartNumber,
      partName: customPartName,
      quantity: customQuantity,
      unitPrice: customUnitPrice,
      totalPrice: customUnitPrice * customQuantity
    };

    setSelectedItems([...selectedItems, newItem]);
    setCustomPartNumber('');
    setCustomPartName('');
    setCustomUnitPrice(0);
    setCustomUnitPriceDisplay('');
    setCustomQuantity(1);
    setShowCustomPartForm(false);
  };

  const handleRemoveItem = (id) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  const handleUpdateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) return;
    
    setSelectedItems(selectedItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantity: newQuantity,
          totalPrice: item.unitPrice * newQuantity
        };
      }
      return item;
    }));
  };

  const calculateTotalAmount = () => {
    return selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const generatePONumber = () => {
    const existingPOs = purchaseOrders.length;
    const orderNumber = (existingPOs + 1).toString().padStart(3, '0');
    return `Part Order - ${orderNumber}`;
  };

  const handlePrintPO = () => {
    if (selectedItems.length === 0) {
      alert('⚠️ Tambahkan minimal 1 item ke Purchase Order!');
      return;
    }

    if (!selectedVendor) {
      alert('⚠️ Pilih vendor terlebih dahulu!');
      return;
    }

    const poNumber = generatePONumber();

    const newPO = {
      id: `po-${Date.now()}`,
      poNumber,
      orderDate: new Date().toISOString().split('T')[0],
      orderTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      requestedBy: currentUser.displayName,
      branch: currentUser.branch === 'all' ? 'Head Office' : currentUser.branch,
      vendor: selectedVendor,
      status: 'PRINTED',
      items: selectedItems,
      totalAmount: calculateTotalAmount(),
      isPrinted: true,
      printedDate: new Date().toISOString().split('T')[0]
    };

    // Show preview instead of immediately saving
    setPreviewPO(newPO);
    setShowPOPreview(true);
  };

  const handleConfirmPrint = () => {
    if (!previewPO) return;

    // Populate print content
    const printContent = document.getElementById('print-content');
    const previewContent = document.getElementById('preview-content');
    
    if (printContent && previewContent) {
      printContent.innerHTML = previewContent.innerHTML;
    }

    // Small delay to ensure content is populated
    setTimeout(() => {
      window.print();
    }, 100);

    // After print, save to database
    setTimeout(() => {
      const updatedPOs = [...purchaseOrders, previewPO];
      savePurchaseOrders(updatedPOs);
      
      setShowPOPreview(false);
      setPreviewPO(null);
      
      alert(`✅ Dokumen PO berhasil dicetak!\n\nNomor: ${previewPO.poNumber}\nVendor: ${previewPO.vendor}\n\n📄 Dokumen siap untuk dikirim ke supplier.`);
      setView('list');
      setSelectedItems([]);
      setSelectedVendor('');
    }, 500);
  };

  const handleReceivePO = (po) => {
    // PROTEKSI: Cek apakah sudah ada payoutNumber (sudah dibayar)
    if (po.payoutNumber) {
      alert(`⚠️ PO ini tidak bisa di-receive!\\n\\n🔒 PO sudah dibayar dengan nomor PAYOUT: ${po.payoutNumber}\\n\\n✓ Untuk PO yang sudah dibayar, tidak dapat di-cancel atau di-receive ulang.`);
      return;
    }

    if (!confirm(`📦 Konfirmasi penerimaan barang untuk ${po.poNumber}?\\n\\nStok akan ditambahkan ke Master Spare Parts.`)) {
      return;
    }

    // Update PO status
    const updatedPOs = purchaseOrders.map(p => {
      if (p.id === po.id) {
        return {
          ...p,
          status: 'RECEIVED',
          receivedDate: new Date().toISOString().split('T')[0]
        };
      }
      return p;
    });
    savePurchaseOrders(updatedPOs);

    // Update stock in Master Spare Parts - REALTIME UPDATE
    const savedParts = localStorage.getItem('masterSpareParts');
    if (savedParts) {
      const parts = JSON.parse(savedParts);
      const updatedParts = parts.map((part) => {
        const poItem = po.items.find(item => item.partNumber === part.partNumber);
        if (poItem) {
          return {
            ...part,
            stock: part.stock + poItem.quantity
          };
        }
        return part;
      });
      
      // Save to localStorage
      localStorage.setItem('masterSpareParts', JSON.stringify(updatedParts));
      
      // Update state immediately for realtime update
      setMasterSpareParts(updatedParts);
    }

    alert(`✅ Barang telah diterima!\n\n📦 Stok telah diupdate di Master Spare Parts.`);
  };

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: Clock, label: 'Draft' },
      PRINTED: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Printer, label: 'Printed' },
      RECEIVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle, label: 'Received' }
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} border ${badge.border} rounded-full flex items-center gap-1 text-sm`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatRupiahInput = (value) => {
    // Remove all non-numeric characters except comma and dot
    const numbers = value.replace(/[^\d]/g, '');
    
    if (!numbers) return '';
    
    // Format with thousand separators
    const formatted = new Intl.NumberFormat('id-ID').format(parseInt(numbers));
    return `Rp ${formatted}`;
  };

  const parseRupiahInput = (value) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/[^\d]/g, '');
    return numbers ? parseInt(numbers) : 0;
  };

  const filteredPOs = purchaseOrders.filter(po => {
    // Filter by branch
    if (currentUser.role === 'branch' && currentUser.branch !== 'all') {
      if (po.branch !== currentUser.branch) return false;
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        po.poNumber.toLowerCase().includes(query) ||
        po.requestedBy.toLowerCase().includes(query) ||
        po.vendor.toLowerCase().includes(query) ||
        po.items.some(item => 
          item.partName.toLowerCase().includes(query) ||
          item.partNumber.toLowerCase().includes(query)
        )
      );
    }
    return true;
  });

  const filteredParts = masterSpareParts.filter(part => {
    if (partSearchQuery) {
      const query = partSearchQuery.toLowerCase();
      return part.partName.toLowerCase().includes(query) || part.partNumber.toLowerCase().includes(query);
    }
    return true;
  });

  const stats = {
    draft: purchaseOrders.filter(po => po.status === 'DRAFT').length,
    printed: purchaseOrders.filter(po => po.status === 'PRINTED').length,
    received: purchaseOrders.filter(po => po.status === 'RECEIVED').length
  };

  // CREATE/EDIT VIEW
  if (view === 'create') {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-slate-800">Create Purchase Order</h1>
                <p className="text-slate-600">Buat PO untuk pembelian spare parts</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setView('list')}
            >
              Back to List
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* PO Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-800 mb-4">PO Information</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-slate-600 text-sm">Requested By</label>
                  <p className="text-slate-900">{currentUser.displayName}</p>
                </div>
                <div>
                  <label className="text-slate-600 text-sm">Branch</label>
                  <p className="text-slate-900">{currentUser.branch === 'all' ? 'Head Office' : currentUser.branch}</p>
                </div>
                <div>
                  <label className="text-slate-600 text-sm">Order Date</label>
                  <p className="text-slate-900">{new Date().toLocaleDateString('id-ID')}</p>
                </div>
                <div>
                  <label className="text-slate-600 text-sm block mb-1">Vendor *</label>
                  <select
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  >
                    <option value="">Pilih Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor} value={vendor}>{vendor}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4 flex items-center justify-between">
                <h3 className="text-white">Purchase Items</h3>
                <Button
                  onClick={() => setShowPartSelector(true)}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {selectedItems.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Belum ada item. Klik "Add Item" untuk menambahkan.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-slate-700 text-sm">No</th>
                        <th className="px-4 py-3 text-left text-slate-700 text-sm">Part Number</th>
                        <th className="px-4 py-3 text-left text-slate-700 text-sm">Part Name</th>
                        <th className="px-4 py-3 text-center text-slate-700 text-sm">Quantity</th>
                        <th className="px-4 py-3 text-right text-slate-700 text-sm">Unit Price</th>
                        <th className="px-4 py-3 text-right text-slate-700 text-sm">Total Price</th>
                        <th className="px-4 py-3 text-center text-slate-700 text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((item, index) => (
                        <tr key={item.id} className="border-t border-slate-200">
                          <td className="px-4 py-4 text-slate-900 text-sm">{index + 1}</td>
                          <td className="px-4 py-4 text-slate-900 text-sm font-mono">{item.partNumber}</td>
                          <td className="px-4 py-4 text-slate-900 text-sm">{item.partName}</td>
                          <td className="px-4 py-4 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 text-center border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                            />
                          </td>
                          <td className="px-4 py-4 text-right text-slate-900 text-sm">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-4 text-right text-slate-900 text-sm">{formatCurrency(item.totalPrice)}</td>
                          <td className="px-4 py-4 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-300 bg-slate-50">
                        <td colSpan={5} className="px-4 py-4 text-right text-slate-700">
                          <strong>TOTAL AMOUNT:</strong>
                        </td>
                        <td className="px-4 py-4 text-right text-slate-900">
                          <strong>{formatCurrency(calculateTotalAmount())}</strong>
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setView('list')}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePrintPO}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={selectedItems.length === 0 || !selectedVendor}
              >
                <Printer className="w-4 h-4 mr-2" />
                Cetak Dokumen PO
              </Button>
            </div>
          </div>
        </div>

        {/* Part Selector Modal */}
        {showPartSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-slate-900">Select Part</h3>
                  <button
                    onClick={() => {
                      setShowPartSelector(false);
                      setSelectedPart(null);
                      setQuantity(1);
                      setPartSearchQuery('');
                    }}
                    className="text-slate-400 hover:text-slate-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                {/* Search Parts */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nama atau kode part dari master..."
                      value={partSearchQuery}
                      onChange={(e) => setPartSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      setShowPartSelector(false);
                      setShowCustomPartForm(true);
                    }}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Custom Part
                  </Button>
                </div>
                <p className="text-slate-500 text-xs mt-2">💡 Gunakan "Custom Part" untuk pembelian one-time yang tidak perlu stocking</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {masterSpareParts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 mb-4">Belum ada master spare parts</p>
                    <p className="text-slate-600 text-sm">Klik tombol "Custom Part" di atas untuk menambahkan part manual</p>
                  </div>
                ) : filteredParts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500 mb-2">Part "{partSearchQuery}" tidak ditemukan di master</p>
                    <p className="text-slate-600 text-sm">Klik tombol "Custom Part" di atas untuk menambahkan part manual</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredParts.map(part => (
                      <div
                        key={part.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedPart?.id === part.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-300'
                        }`}
                        onClick={() => setSelectedPart(part)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-slate-900">{part.partName}</p>
                            <p className="text-slate-600 text-sm font-mono">{part.partNumber}</p>
                            <p className="text-slate-500 text-sm mt-1">
                              Stock: {part.stock} pcs | Category: {part.category}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-900">{formatCurrency(part.unitPrice)}</p>
                            {part.stock < part.minStock && (
                              <span className="text-xs text-red-600">⚠️ Low Stock</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedPart && (
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="text-slate-700 text-sm mb-1 block">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <Button
                      onClick={handleAddItem}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to PO
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Part Form Modal */}
        {showCustomPartForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-900">Add Custom Part</h3>
                  <button
                    onClick={() => {
                      setShowCustomPartForm(false);
                      setCustomPartNumber('');
                      setCustomPartName('');
                      setCustomUnitPrice(0);
                      setCustomUnitPriceDisplay('');
                      setCustomQuantity(1);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <p className="text-slate-600 text-sm mt-1">Tambahkan part yang tidak ada di master data</p>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-700 text-sm mb-1 block">Part Number *</label>
                    <input
                      type="text"
                      value={customPartNumber}
                      onChange={(e) => setCustomPartNumber(e.target.value)}
                      placeholder="Contoh: BP-CUST-001"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 text-sm mb-1 block">Part Name *</label>
                    <input
                      type="text"
                      value={customPartName}
                      onChange={(e) => setCustomPartName(e.target.value)}
                      placeholder="Contoh: Brake Pad Custom Model"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-700 text-sm mb-1 block">Unit Price *</label>
                      <input
                        type="text"
                        value={customUnitPriceDisplay}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const parsedValue = parseRupiahInput(inputValue);
                          setCustomUnitPrice(parsedValue);
                          setCustomUnitPriceDisplay(formatRupiahInput(inputValue));
                        }}
                        onFocus={(e) => {
                          // When focus, if empty show empty, otherwise show current
                          if (customUnitPrice === 0) {
                            setCustomUnitPriceDisplay('');
                          }
                        }}
                        onBlur={(e) => {
                          // When blur, format the final value
                          if (customUnitPrice > 0) {
                            setCustomUnitPriceDisplay(formatRupiahInput(customUnitPrice.toString()));
                          } else {
                            setCustomUnitPriceDisplay('');
                          }
                        }}
                        placeholder="Rp 0"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 text-sm mb-1 block">Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        value={customQuantity}
                        onChange={(e) => setCustomQuantity(parseInt(e.target.value) || 1)}
                        placeholder="1"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCustomPartForm(false);
                    setCustomPartNumber('');
                    setCustomPartName('');
                    setCustomUnitPrice(0);
                    setCustomUnitPriceDisplay('');
                    setCustomQuantity(1);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCustomItem}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to PO
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* PO Preview Modal */}
        {showPOPreview && previewPO && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between no-print">
                <div>
                  <h3 className="text-slate-900">Preview Dokumen PO</h3>
                  <p className="text-slate-600 text-sm mt-1">Review dokumen sebelum dicetak dan dikirim ke vendor</p>
                </div>
                <button
                  onClick={() => {
                    setShowPOPreview(false);
                    setPreviewPO(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Document Preview */}
              <div className="p-8">
                {/* Document Container with Print-like styling */}
                <div className="bg-white border-2 border-slate-300 rounded-lg p-8 shadow-inner print-document" id="preview-content">
                  {/* Header - IMOGI Workshop Branding */}
                  <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-800">
                    <div>
                      <h1 className="text-3xl text-slate-900 mb-1">IMOGI Workshop</h1>
                      <p className="text-slate-600 text-sm">{previewPO.branch}</p>
                    </div>
                    <div className="text-right">
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block mb-2">
                        <p className="text-xs">Form Pembelian Part</p>
                      </div>
                      <p className="text-slate-900 text-xl">{previewPO.poNumber}</p>
                      <p className="text-slate-600 text-sm">{new Date(previewPO.orderDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>

                  {/* Vendor Info */}
                  <div className="mb-6">
                    <p className="text-slate-600 text-sm mb-1">Vendor:</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-slate-900">{previewPO.vendor}</p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="mb-6">
                    <div className="border border-slate-300 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-700 text-white">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm">No</th>
                            <th className="px-4 py-3 text-left text-sm">Part Number</th>
                            <th className="px-4 py-3 text-left text-sm">Nama Part</th>
                            <th className="px-4 py-3 text-center text-sm">Qty</th>
                            <th className="px-4 py-3 text-right text-sm">Harga Satuan</th>
                            <th className="px-4 py-3 text-right text-sm">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {previewPO.items.map((item, index) => (
                            <tr key={item.id} className="border-t border-slate-200">
                              <td className="px-4 py-3 text-slate-700">{index + 1}</td>
                              <td className="px-4 py-3 text-slate-900 font-mono text-sm">{item.partNumber}</td>
                              <td className="px-4 py-3 text-slate-900">{item.partName}</td>
                              <td className="px-4 py-3 text-center text-slate-900">{item.quantity}</td>
                              <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(item.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 border-t-2 border-slate-300">
                            <td colSpan={5} className="px-4 py-4 text-right text-slate-900">
                              <strong>TOTAL AMOUNT</strong>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <strong className="text-blue-700 text-lg">{formatCurrency(previewPO.totalAmount)}</strong>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-slate-300 pt-6 mt-8">
                    <div className="flex justify-end">
                      <div className="text-center">
                        <p className="text-slate-600 text-sm mb-12">Hormat kami,</p>
                        <div className="border-t border-slate-400 pt-2 min-w-[200px]">
                          <p className="text-slate-900">{previewPO.requestedBy}</p>
                          <p className="text-slate-600 text-sm">{previewPO.branch}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPOPreview(false);
                    setPreviewPO(null);
                  }}
                >
                  ← Kembali Edit
                </Button>
                <Button
                  onClick={handleConfirmPrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Cetak & Kirim ke Vendor
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Hidden Print Section */}
      <div id="print-content" className="hidden print:block"></div>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-slate-800">Buying Spare Parts</h1>
              <p className="text-slate-600">Kelola pembelian spare parts dari supplier</p>
            </div>
          </div>
          <Button
            onClick={handleCreateNewPO}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New PO
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-slate-600 text-sm">Draft</p>
            <p className="text-slate-900 text-2xl">{stats.draft}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-blue-700 text-sm">Printed</p>
            <p className="text-blue-900 text-2xl">{stats.printed}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
            <p className="text-emerald-700 text-sm">Received</p>
            <p className="text-emerald-900 text-2xl">{stats.received}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by PO Number, Vendor, or Part..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredPOs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-slate-700 mb-2">No Purchase Orders</h3>
            <p className="text-slate-500">Belum ada Purchase Order yang dibuat. Klik tombol "Create New PO" di atas untuk membuat PO baru.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-slate-700">PO Number</th>
                  <th className="px-6 py-4 text-left text-slate-700">Order Date</th>
                  <th className="px-6 py-4 text-left text-slate-700">Vendor</th>
                  <th className="px-6 py-4 text-left text-slate-700">Part Name</th>
                  <th className="px-6 py-4 text-left text-slate-700">Requested By</th>
                  <th className="px-6 py-4 text-left text-slate-700">Branch</th>
                  <th className="px-6 py-4 text-center text-slate-700">Qty</th>
                  <th className="px-6 py-4 text-right text-slate-700">Total Amount</th>
                  <th className="px-6 py-4 text-center text-slate-700">Status</th>
                  <th className="px-6 py-4 text-center text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPOs.map((po) => (
                  <tr key={po.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className="text-blue-600 truncate block">{po.poNumber}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{po.orderDate}</td>
                    <td className="px-6 py-4 text-slate-700">
                      <div className="truncate max-w-[150px]" title={po.vendor}>{po.vendor}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <div className="truncate max-w-[200px]" title={po.items.map(item => item.partName).join(', ')}>
                        {po.items.length > 0 ? po.items[0].partName : '-'}
                        {po.items.length > 1 && ` +${po.items.length - 1} lainnya`}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <div className="truncate max-w-[120px]" title={po.requestedBy}>{po.requestedBy}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 rounded-full text-sm bg-slate-100 text-slate-700 whitespace-nowrap">
                        {po.branch}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700 whitespace-nowrap">
                      {po.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-900 whitespace-nowrap">{formatCurrency(po.totalAmount)}</td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(po.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        {(po.status === 'PRINTED' || po.status === 'RECEIVED') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPOForDetail(po);
                              setShowDetailModal(true);
                            }}
                            className="border-blue-300 text-blue-600 hover:bg-blue-50 whitespace-nowrap"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View Detail
                          </Button>
                        )}
                        {po.status === 'PRINTED' && (
                          <Button
                            size="sm"
                            onClick={() => handleReceivePO(po)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white whitespace-nowrap"
                          >
                            <Package className="w-3 h-3 mr-1" />
                            Receive Part
                          </Button>
                        )}
                        {po.status === 'RECEIVED' && (
                          <span className="text-emerald-600 text-sm whitespace-nowrap">✓ Completed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedPOForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-slate-900">Purchase Order Detail</h3>
                <p className="text-slate-600 text-sm mt-1">{selectedPOForDetail.poNumber}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPOForDetail(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Document Content */}
            <div className="p-8">
              {/* PO Info */}
              <div className="bg-slate-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-slate-600 text-sm">PO Number</p>
                    <p className="text-slate-900">{selectedPOForDetail.poNumber}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">Order Date</p>
                    <p className="text-slate-900">{new Date(selectedPOForDetail.orderDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedPOForDetail.status)}</div>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">Vendor</p>
                    <p className="text-slate-900">{selectedPOForDetail.vendor}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">Requested By</p>
                    <p className="text-slate-900">{selectedPOForDetail.requestedBy}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">Branch</p>
                    <p className="text-slate-900">{selectedPOForDetail.branch}</p>
                  </div>
                  {selectedPOForDetail.printedDate && (
                    <div>
                      <p className="text-slate-600 text-sm">Printed Date</p>
                      <p className="text-slate-900">{new Date(selectedPOForDetail.printedDate).toLocaleDateString('id-ID')}</p>
                    </div>
                  )}
                  {selectedPOForDetail.receivedDate && (
                    <div>
                      <p className="text-slate-600 text-sm">Received Date</p>
                      <p className="text-slate-900 text-emerald-600">{new Date(selectedPOForDetail.receivedDate).toLocaleDateString('id-ID')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <h4 className="text-slate-800 mb-3">Items</h4>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-700 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm">No</th>
                        <th className="px-4 py-3 text-left text-sm">Part Number</th>
                        <th className="px-4 py-3 text-left text-sm">Part Name</th>
                        <th className="px-4 py-3 text-center text-sm">Qty</th>
                        <th className="px-4 py-3 text-right text-sm">Unit Price</th>
                        <th className="px-4 py-3 text-right text-sm">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {selectedPOForDetail.items.map((item, index) => (
                        <tr key={item.id} className="border-t border-slate-200">
                          <td className="px-4 py-3 text-slate-700">{index + 1}</td>
                          <td className="px-4 py-3 text-slate-900 font-mono text-sm">{item.partNumber}</td>
                          <td className="px-4 py-3 text-slate-900">{item.partName}</td>
                          <td className="px-4 py-3 text-center text-slate-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 border-t-2 border-slate-300">
                        <td colSpan={5} className="px-4 py-4 text-right text-slate-900">
                          <strong>TOTAL AMOUNT</strong>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <strong className="text-blue-700 text-lg">{formatCurrency(selectedPOForDetail.totalAmount)}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPOForDetail(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}