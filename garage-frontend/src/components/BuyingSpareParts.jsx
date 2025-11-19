import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Search, Package, Trash2, FileText, CheckCircle, Clock, Printer, Edit2, Database, AlertCircle, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { ReceivePartDocument } from './ReceivePartDocument';

export function BuyingSparePartIntegrated({ currentUser }) {
  // Tab state
  const [activeTab, setActiveTab] = useState('po');
  
  // Master Parts state
  const [masterSpareParts, setMasterSpareParts] = useState([]);
  const [isAddingNewPart, setIsAddingNewPart] = useState(false);
  const [editingPartId, setEditingPartId] = useState(null);
  const [partFormData, setPartFormData] = useState({
    partName: '',
    partNumber: '',
    compatibleModels: [],
    category: '',
    unitPrice: 0,
    stock: 0,
    minStock: 10
  });
  const [partSearchQuery, setPartSearchQuery] = useState('');
  
  // PO state
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('list');
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [isPrinted, setIsPrinted] = useState(false);
  
  // Form state for adding items
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [showCustomPartForm, setShowCustomPartForm] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Multiple selection state
  const [selectedParts, setSelectedParts] = useState([]);

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
  
  // Receive document state
  const [showReceiveDocument, setShowReceiveDocument] = useState(false);
  const [selectedPOForReceive, setSelectedPOForReceive] = useState(null);
  
  // List of vendors
  const vendors = [
    'PT. Auto Parts Indonesia',
    'CV. Cahaya Motor',
    'PT. Surya Spare Parts',
    'UD. Maju Jaya',
    'PT. Prima Auto Parts'
  ];

  const vehicleModels = ['Avanza', 'Jazz', 'Xpander', 'CR-V', 'Fortuner', 'Innova', 'HRV', 'Brio'];
  const categories = ['Brake System', 'Engine', 'Transmission', 'Electrical', 'Accessories', 'Suspension', 'Body Parts'];

  useEffect(() => {
    loadMasterSpareParts();
    loadPurchaseOrders();
  }, []);

  // Initialize default master parts if empty
  useEffect(() => {
    const savedParts = localStorage.getItem('masterSpareParts');
    if (!savedParts || JSON.parse(savedParts).length === 0) {
      initializeDefaultParts();
    }
  }, []);

  const initializeDefaultParts = () => {
    const defaultParts = [
      // Toyota Avanza Parts
      { id: '1', partName: 'Brake Pad Front', partNumber: 'BP-TOY-AVZ-001', compatibleModels: ['Avanza'], category: 'Brake System', unitPrice: 450000, stock: 25, minStock: 10 },
      { id: '2', partName: 'Brake Pad Rear', partNumber: 'BP-TOY-AVZ-002', compatibleModels: ['Avanza'], category: 'Brake System', unitPrice: 350000, stock: 20, minStock: 10 },
      { id: '3', partName: 'Oil Filter', partNumber: 'OF-TOY-AVZ-001', compatibleModels: ['Avanza'], category: 'Engine', unitPrice: 85000, stock: 50, minStock: 20 },
      { id: '4', partName: 'Air Filter', partNumber: 'AF-TOY-AVZ-001', compatibleModels: ['Avanza'], category: 'Engine', unitPrice: 125000, stock: 35, minStock: 15 },
      { id: '5', partName: 'Spark Plug', partNumber: 'SP-TOY-AVZ-001', compatibleModels: ['Avanza'], category: 'Engine', unitPrice: 95000, stock: 60, minStock: 30 },
      
      // Honda Jazz Parts
      { id: '11', partName: 'Brake Pad Front', partNumber: 'BP-HON-JAZ-001', compatibleModels: ['Jazz'], category: 'Brake System', unitPrice: 520000, stock: 22, minStock: 10 },
      { id: '12', partName: 'Oil Filter', partNumber: 'OF-HON-JAZ-001', compatibleModels: ['Jazz'], category: 'Engine', unitPrice: 95000, stock: 45, minStock: 20 },
      { id: '13', partName: 'Air Filter', partNumber: 'AF-HON-JAZ-001', compatibleModels: ['Jazz'], category: 'Engine', unitPrice: 145000, stock: 32, minStock: 15 },
    ];
    
    setMasterSpareParts(defaultParts);
    localStorage.setItem('masterSpareParts', JSON.stringify(defaultParts));
  };

  const loadMasterSpareParts = () => {
    const savedParts = localStorage.getItem('masterSpareParts');
    if (savedParts) {
      setMasterSpareParts(JSON.parse(savedParts));
    }
  };

  const saveMasterSpareParts = (parts) => {
    setMasterSpareParts(parts);
    localStorage.setItem('masterSpareParts', JSON.stringify(parts));
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

  // Master Parts Functions
  const handleAddNewPart = () => {
    setIsAddingNewPart(true);
    setPartFormData({
      partName: '',
      partNumber: '',
      compatibleModels: [],
      category: '',
      unitPrice: 0,
      stock: 0,
      minStock: 10
    });
  };

  const handleEditPart = (part) => {
    setEditingPartId(part.id);
    setPartFormData(part);
  };

  const handleSavePart = () => {
    if (!partFormData.partName || !partFormData.partNumber || !partFormData.category) {
      alert('⚠️ Mohon lengkapi Part Name, Part Number, dan Category!');
      return;
    }

    if (isAddingNewPart) {
      const newPart = {
        id: Date.now().toString(),
        partName: partFormData.partName || '',
        partNumber: partFormData.partNumber || '',
        compatibleModels: partFormData.compatibleModels || [],
        category: partFormData.category || '',
        unitPrice: partFormData.unitPrice || 0,
        stock: partFormData.stock || 0,
        minStock: partFormData.minStock || 10
      };
      saveMasterSpareParts([...masterSpareParts, newPart]);
      alert('✅ Part baru berhasil ditambahkan!');
    } else if (editingPartId) {
      const updatedParts = masterSpareParts.map(part => 
        part.id === editingPartId ? { ...part, ...partFormData } : part
      );
      saveMasterSpareParts(updatedParts);
      alert('✅ Part berhasil diupdate!');
    }
    
    handleCancelPartForm();
  };

  const handleCancelPartForm = () => {
    setIsAddingNewPart(false);
    setEditingPartId(null);
    setPartFormData({
      partName: '',
      partNumber: '',
      compatibleModels: [],
      category: '',
      unitPrice: 0,
      stock: 0,
      minStock: 10
    });
  };

  const handleDeletePart = (id) => {
    if (confirm('🗑️ Yakin ingin menghapus part ini dari master?\n\nPerhatian: Part yang sudah digunakan dalam PO tidak akan terhapus dari PO tersebut.')) {
      saveMasterSpareParts(masterSpareParts.filter(part => part.id !== id));
      alert('✅ Part berhasil dihapus!');
    }
  };

  // Multiple selection functions
  const togglePartSelection = (part) => {
    const existingIndex = selectedParts.findIndex(sp => sp.part.id === part.id);
    if (existingIndex > -1) {
      // Remove from selection
      setSelectedParts(selectedParts.filter((_, idx) => idx !== existingIndex));
    } else {
      // Add to selection with default quantity 1
      setSelectedParts([...selectedParts, { part, quantity: 1 }]);
    }
  };

  const updatePartQuantity = (partId, newQuantity) => {
    setSelectedParts(selectedParts.map(sp => 
      sp.part.id === partId ? { ...sp, quantity: Math.max(1, newQuantity) } : sp
    ));
  };

  const isPartSelected = (partId) => {
    return selectedParts.some(sp => sp.part.id === partId);
  };

  const getPartQuantity = (partId) => {
    const selected = selectedParts.find(sp => sp.part.id === partId);
    return selected ? selected.quantity : 1;
  };

  const selectAllParts = (parts) => {
    const allParts = parts.map(part => ({ part, quantity: 1 }));
    setSelectedParts(allParts);
  };

  const clearAllSelections = () => {
    setSelectedParts([]);
  };

  // PO Functions (from original BuyingSparePart)
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

  const handleAddMultipleItems = () => {
    if (selectedParts.length === 0) {
      alert('⚠️ Pilih minimal 1 part!');
      return;
    }

    const newItems = selectedParts.map((sp, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      partNumber: sp.part.partNumber,
      partName: sp.part.partName,
      quantity: sp.quantity,
      unitPrice: sp.part.unitPrice,
      totalPrice: sp.part.unitPrice * sp.quantity
    }));

    setSelectedItems([...selectedItems, ...newItems]);
    setSelectedParts([]);
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
    const branchCode = currentUser.branch === 'Jakarta' ? 'JKT' : 
                      currentUser.branch === 'Bandung' ? 'BDG' : 
                      currentUser.branch === 'Surabaya' ? 'SBY' : 'HO';
    
    const branchPOs = purchaseOrders.filter(po => po.branch === (currentUser.branch === 'all' ? 'Head Office' : currentUser.branch));
    const orderNumber = (branchPOs.length + 1).toString().padStart(3, '0');
    return `${branchCode} - PO-${orderNumber}`;
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
      requestedBy: currentUser.displayName || currentUser.name,
      branch: currentUser.branch === 'all' ? 'Head Office' : currentUser.branch,
      vendor: selectedVendor,
      status: 'PRINTED',
      items: selectedItems,
      totalAmount: calculateTotalAmount(),
      isPrinted: true,
      printedDate: new Date().toISOString().split('T')[0]
    };

    setPreviewPO(newPO);
    setShowPOPreview(true);
  };

  const handleConfirmPrint = () => {
    if (!previewPO) return;

    const printContent = document.getElementById('print-content');
    const previewContent = document.getElementById('preview-content');
    
    if (printContent && previewContent) {
      printContent.innerHTML = previewContent.innerHTML;
    }

    setTimeout(() => {
      window.print();
    }, 100);

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
    if (po.payoutNumber) {
      alert(`⚠️ PO ini tidak bisa di-receive!\n\n🔒 PO sudah dibayar dengan nomor PAYOUT: ${po.payoutNumber}\n\n✓ Untuk PO yang sudah dibayar, tidak dapat di-cancel atau di-receive ulang.`);
      return;
    }

    // Show receive document instead of direct confirm
    setSelectedPOForReceive(po);
    setShowReceiveDocument(true);
  };

  const handleConfirmReceive = () => {
    if (!selectedPOForReceive) return;

    // Update PO status - PRESERVE PAYMENT DATA
    const updatedPOs = purchaseOrders.map(p => {
      if (p.id === selectedPOForReceive.id) {
        // IMPORTANT: Spread all existing data first to preserve payment fields
        return {
          ...p, // ✅ Preserve all existing fields including payment data
          status: 'RECEIVED',
          receivedDate: new Date().toISOString().split('T')[0]
          // Payment fields are preserved: paymentStatus, paymentMethod, paidAmount, 
          // paymentDate, invoiceNumber, receiptNumber, payoutNumber, cancelledBy, 
          // cancelledDate, cancelReason, cancelNotes
        };
      }
      return p;
    });
    savePurchaseOrders(updatedPOs);

    // Update stock in Master Spare Parts
    const updatedParts = masterSpareParts.map((part) => {
      const poItem = selectedPOForReceive.items.find(item => item.partNumber === part.partNumber);
      if (poItem) {
        return {
          ...part,
          stock: part.stock + poItem.quantity
        };
      }
      return part;
    });
    
    saveMasterSpareParts(updatedParts);

    // Close document modal
    setShowReceiveDocument(false);
    setSelectedPOForReceive(null);

    alert(`✅ Barang telah diterima!\n\n📦 Stok telah diupdate di Master Spare Parts.`);
  };

  const getStatusBadge = (status, payoutNumber) => {
    const badges = {
      DRAFT: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: Clock, label: 'Draft' },
      PRINTED: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Printer, label: 'Printed' },
      RECEIVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle, label: 'Received' }
    };
    const badge = badges[status];
    const Icon = badge.icon;
    
    return (
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 ${badge.bg} ${badge.text} border ${badge.border} rounded-full flex items-center gap-1 text-sm`}>
          <Icon className="w-4 h-4" />
          {badge.label}
        </span>
        {payoutNumber && (
          <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full flex items-center gap-1 text-sm">
            <AlertCircle className="w-3 h-3" />
            PAID: {payoutNumber}
          </span>
        )}
      </div>
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
    const numbers = value.replace(/[^\d]/g, '');
    if (!numbers) return '';
    const formatted = new Intl.NumberFormat('id-ID').format(parseInt(numbers));
    return `Rp ${formatted}`;
  };

  const parseRupiahInput = (value) => {
    const numbers = value.replace(/[^\d]/g, '');
    return numbers ? parseInt(numbers) : 0;
  };

  const filteredPOs = purchaseOrders.filter(po => {
    if (currentUser.role === 'branch' && currentUser.branch !== 'all') {
      if (po.branch !== currentUser.branch) return false;
    }

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
      return part.partName.toLowerCase().includes(query) || 
             part.partNumber.toLowerCase().includes(query) ||
             part.category.toLowerCase().includes(query) ||
             part.compatibleModels.some(model => model.toLowerCase().includes(query));
    }
    return true;
  });

  const stats = {
    draft: purchaseOrders.filter(po => po.status === 'DRAFT').length,
    printed: purchaseOrders.filter(po => po.status === 'PRINTED').length,
    received: purchaseOrders.filter(po => po.status === 'RECEIVED').length,
    totalParts: masterSpareParts.length,
    lowStock: masterSpareParts.filter(p => p.stock < p.minStock).length
  };

  // RENDER: If in create PO view
  if (view === 'create') {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
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
            <Button variant="outline" onClick={() => setView('list')}>
              Back to List
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* PO Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-800 mb-4">PO Information</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-slate-600 text-sm">Requested By</label>
                  <p className="text-slate-900">{currentUser.displayName || currentUser.name}</p>
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
                <h3 className="text-white">Purchase Items ({selectedItems.length} items)</h3>
                <Button
                  onClick={() => setShowPartSelector(true)}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item from Master
                </Button>
              </div>

              {selectedItems.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-2">Belum ada item. Klik "Add Item from Master" untuk menambahkan.</p>
                  <p className="text-slate-400 text-sm">💡 Tip: Pastikan Master Parts sudah terisi di tab "Master Parts"</p>
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
              <Button variant="outline" onClick={() => setView('list')}>
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
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-slate-900">Select Part from Master ({masterSpareParts.length} parts available)</h3>
                  <button
                    onClick={() => {
                      setShowPartSelector(false);
                      setSelectedPart(null);
                      setSelectedParts([]);
                      setQuantity(1);
                      setPartSearchQuery('');
                    }}
                    className="text-slate-400 hover:text-slate-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
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
                  {filteredParts.length > 0 && (
                    <>
                      <Button
                        onClick={() => selectAllParts(filteredParts)}
                        size="sm"
                        variant="outline"
                        className="whitespace-nowrap"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Select All
                      </Button>
                      {selectedParts.length > 0 && (
                        <Button
                          onClick={clearAllSelections}
                          size="sm"
                          variant="outline"
                          className="whitespace-nowrap"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Clear
                        </Button>
                      )}
                    </>
                  )}
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
                {masterSpareParts.length === 0 && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-700 text-sm">⚠️ Master Parts masih kosong. Silakan tambahkan di tab "Master Parts" terlebih dahulu.</p>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {masterSpareParts.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 mb-4">Belum ada master spare parts</p>
                    <p className="text-slate-600 text-sm">Klik tab "Master Parts" di atas untuk menambahkan data master</p>
                  </div>
                ) : filteredParts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500 mb-2">Part "{partSearchQuery}" tidak ditemukan di master</p>
                    <p className="text-slate-600 text-sm">Coba kata kunci lain atau klik "Custom Part" untuk input manual</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredParts.map(part => {
                      const isSelected = isPartSelected(part.id);
                      const partQty = getPartQuantity(part.id);
                      
                      return (
                        <div
                          key={part.id}
                          className={`border rounded-lg p-3 transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-sm'
                              : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
                          }`}
                          onClick={() => togglePartSelection(part)}
                        >
                          {/* Single Row: Checkbox | Part Name | Qty | Part Number | Stock | Category | Price */}
                          <div className="flex items-center gap-4">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                togglePartSelection(part);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
                            />

                            {/* Part Name */}
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-900 font-medium truncate">{part.partName}</p>
                            </div>

                            {/* Quantity Control with +/- buttons - Show only when selected */}
                            {isSelected ? (
                              <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updatePartQuantity(part.id, partQty - 1);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-700 rounded border border-slate-300 transition-colors"
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  value={partQty}
                                  onChange={(e) => {
                                    const inputValue = e.target.value;
                                    // Allow empty string or numbers only
                                    if (inputValue === '' || /^\d+$/.test(inputValue)) {
                                      const val = inputValue === '' ? 1 : parseInt(inputValue);
                                      updatePartQuantity(part.id, val);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // Ensure minimum value of 1 on blur
                                    if (e.target.value === '' || parseInt(e.target.value) < 1) {
                                      updatePartQuantity(part.id, 1);
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-14 px-2 py-1 text-sm text-center border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updatePartQuantity(part.id, partQty + 1);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-700 rounded border border-slate-300 transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <div className="w-28 flex-shrink-0"></div>
                            )}

                            {/* Part Number */}
                            <div className="flex-shrink-0">
                              <span className="text-slate-600 text-sm font-mono px-2 py-1 bg-slate-100 rounded whitespace-nowrap">
                                {part.partNumber}
                              </span>
                            </div>

                            {/* Stock */}
                            <div className={`flex-shrink-0 flex items-center gap-1 text-sm ${
                              part.stock < part.minStock ? 'text-red-600' : 'text-slate-600'
                            }`}>
                              <Package className="w-3.5 h-3.5" />
                              <span className="font-medium">{part.stock}</span> pcs
                              {part.stock < part.minStock && (
                                <span className="ml-1 text-xs">⚠️</span>
                              )}
                            </div>

                            {/* Category */}
                            <div className="flex-shrink-0 text-sm text-slate-600 whitespace-nowrap">
                              {part.category}
                            </div>

                            {/* Price */}
                            <div className="flex-shrink-0 text-right min-w-[100px]">
                              <p className="text-blue-600 font-semibold">{formatCurrency(part.unitPrice)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer - Multiple Selection Summary */}
              <div className="px-6 py-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {selectedParts.length > 0 ? (
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                          {selectedParts.length} part{selectedParts.length > 1 ? 's' : ''} selected
                        </div>
                        <div className="h-6 w-px bg-slate-300"></div>
                        <div className="text-sm">
                          <span className="text-slate-600">Total Items: </span>
                          <span className="font-semibold text-slate-900">
                            {selectedParts.reduce((sum, sp) => sum + sp.quantity, 0)} pcs
                          </span>
                        </div>
                        <div className="h-6 w-px bg-slate-300"></div>
                        <div className="text-sm">
                          <span className="text-slate-600">Total Amount: </span>
                          <span className="font-bold text-blue-600 text-base">
                            {formatCurrency(selectedParts.reduce((sum, sp) => sum + (sp.part.unitPrice * sp.quantity), 0))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>Pilih part dengan mencentang checkbox di atas</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowPartSelector(false);
                        setSelectedParts([]);
                        setPartSearchQuery('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddMultipleItems}
                      disabled={selectedParts.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add {selectedParts.length > 0 ? `(${selectedParts.length}) ` : ''}to PO
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Part Form Modal */}
        {showCustomPartForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-900">Add Custom Part (One-time)</h3>
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
                <p className="text-slate-600 text-sm mt-1">Tambahkan part yang tidak ada di master (untuk one-time purchase)</p>
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
                        onFocus={() => {
                          if (customUnitPrice === 0) setCustomUnitPriceDisplay('');
                        }}
                        onBlur={() => {
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

              <div className="p-8">
                <div className="bg-white border-2 border-slate-300 rounded-lg p-8 shadow-inner print-document" id="preview-content">
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

                  <div className="mb-6">
                    <p className="text-slate-600 text-sm mb-1">Vendor:</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-slate-900">{previewPO.vendor}</p>
                    </div>
                  </div>

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

  // RENDER: Main list view with tabs
  return (
    <div className="h-screen flex flex-col bg-slate-50">
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
              <p className="text-slate-600">Kelola pembelian spare parts & master data</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setActiveTab('po')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'po'
                ? 'bg-green-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Purchase Orders
            </div>
          </button>
          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'master'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Master Parts
            </div>
          </button>

          {/* Action Buttons */}
          {activeTab === 'po' && (
            <Button
              onClick={handleCreateNewPO}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New PO
            </Button>
          )}
          {activeTab === 'master' && (
            <Button
              onClick={handleAddNewPart}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Part
            </Button>
          )}
        </div>

        {/* Stats */}
        {activeTab === 'po' ? (
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
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-blue-700 text-sm">Total Parts</p>
              <p className="text-blue-900 text-2xl">{stats.totalParts}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-red-700 text-sm">Low Stock</p>
              <p className="text-red-900 text-2xl">{stats.lowStock}</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'po' ? "Search by PO Number, Vendor, or Part..." : "Search by Part Name, Number, Category..."}
            value={activeTab === 'po' ? searchQuery : partSearchQuery}
            onChange={(e) => activeTab === 'po' ? setSearchQuery(e.target.value) : setPartSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'po' ? (
          // Purchase Orders List
          filteredPOs.length === 0 ? (
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
                        {getStatusBadge(po.status, po.payoutNumber)}
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
                          {po.status === 'PRINTED' && !po.payoutNumber && (
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
                          {po.payoutNumber && (
                            <span className="text-red-600 text-sm whitespace-nowrap flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Paid & Locked
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          // Master Parts List
          <div>
            {filteredParts.length === 0 && masterSpareParts.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-700 mb-2">No Master Parts</h3>
                <p className="text-slate-500 mb-4">Belum ada master spare parts. Klik "Add New Part" untuk menambahkan.</p>
                <Button onClick={initializeDefaultParts} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Initialize with Default Parts
                </Button>
              </div>
            ) : filteredParts.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-700 mb-2">No Results</h3>
                <p className="text-slate-500">Tidak ada part yang cocok dengan pencarian "{partSearchQuery}"</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-slate-700">Part Number</th>
                      <th className="px-6 py-4 text-left text-slate-700">Part Name</th>
                      <th className="px-6 py-4 text-left text-slate-700">Category</th>
                      <th className="px-6 py-4 text-left text-slate-700">Compatible Models</th>
                      <th className="px-6 py-4 text-right text-slate-700">Unit Price</th>
                      <th className="px-6 py-4 text-center text-slate-700">Stock</th>
                      <th className="px-6 py-4 text-center text-slate-700">Min Stock</th>
                      <th className="px-6 py-4 text-center text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParts.map((part) => (
                      <tr key={part.id} className={`border-t border-slate-100 hover:bg-slate-50 ${part.stock < part.minStock ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4">
                          <span className="font-mono text-slate-900">{part.partNumber}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-900">{part.partName}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                            {part.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          <div className="truncate max-w-[150px]" title={part.compatibleModels.join(', ')}>
                            {part.compatibleModels.join(', ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-900">{formatCurrency(part.unitPrice)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`${part.stock < part.minStock ? 'text-red-600' : 'text-slate-900'}`}>
                            {part.stock}
                            {part.stock < part.minStock && ' ⚠️'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-700">{part.minStock}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditPart(part)}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeletePart(part.id)}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Master Part Form Modal */}
      {(isAddingNewPart || editingPartId) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-900">{isAddingNewPart ? 'Add New Part' : 'Edit Part'}</h3>
                <button
                  onClick={handleCancelPartForm}
                  className="text-slate-400 hover:text-slate-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 text-sm mb-1 block">Part Number *</label>
                  <input
                    type="text"
                    value={partFormData.partNumber || ''}
                    onChange={(e) => setPartFormData({ ...partFormData, partNumber: e.target.value })}
                    placeholder="BP-TOY-AVZ-001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 text-sm mb-1 block">Part Name *</label>
                  <input
                    type="text"
                    value={partFormData.partName || ''}
                    onChange={(e) => setPartFormData({ ...partFormData, partName: e.target.value })}
                    placeholder="Brake Pad Front"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 text-sm mb-1 block">Category *</label>
                <select
                  value={partFormData.category || ''}
                  onChange={(e) => setPartFormData({ ...partFormData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 text-sm mb-1 block">Compatible Models</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {vehicleModels.map(model => (
                    <label key={model} className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={partFormData.compatibleModels?.includes(model) || false}
                        onChange={(e) => {
                          const current = partFormData.compatibleModels || [];
                          if (e.target.checked) {
                            setPartFormData({ ...partFormData, compatibleModels: [...current, model] });
                          } else {
                            setPartFormData({ ...partFormData, compatibleModels: current.filter(m => m !== model) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{model}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-700 text-sm mb-1 block">Unit Price *</label>
                  <input
                    type="number"
                    value={partFormData.unitPrice || 0}
                    onChange={(e) => setPartFormData({ ...partFormData, unitPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 text-sm mb-1 block">Stock</label>
                  <input
                    type="number"
                    value={partFormData.stock || 0}
                    onChange={(e) => setPartFormData({ ...partFormData, stock: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 text-sm mb-1 block">Min Stock</label>
                  <input
                    type="number"
                    value={partFormData.minStock || 10}
                    onChange={(e) => setPartFormData({ ...partFormData, minStock: parseInt(e.target.value) || 10 })}
                    placeholder="10"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
              <Button variant="outline" onClick={handleCancelPartForm}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSavePart} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="w-4 h-4 mr-2" />
                Save Part
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PO Detail Modal */}
      {showDetailModal && selectedPOForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
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

            <div className="p-8">
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
                    <div className="mt-1">{getStatusBadge(selectedPOForDetail.status, selectedPOForDetail.payoutNumber)}</div>
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
                  {selectedPOForDetail.payoutNumber && (
                    <div>
                      <p className="text-slate-600 text-sm">Payment Status</p>
                      <p className="text-red-600">PAID - {selectedPOForDetail.payoutNumber}</p>
                    </div>
                  )}
                </div>
              </div>

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

      {/* Receive Document Modal */}
      {showReceiveDocument && selectedPOForReceive && (
        <ReceivePartDocument
          poNumber={selectedPOForReceive.poNumber}
          vendor={selectedPOForReceive.vendor}
          orderDate={selectedPOForReceive.orderDate}
          receiveDate={new Date().toISOString().split('T')[0]}
          receivedBy={currentUser.displayName}
          branch={selectedPOForReceive.branch}
          items={selectedPOForReceive.items.map(item => ({
            partNumber: item.partNumber,
            partName: item.partName,
            quantityOrdered: item.quantity,
            quantityReceived: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            condition: 'good'
          }))}
          totalAmount={selectedPOForReceive.totalAmount}
          onClose={() => {
            setShowReceiveDocument(false);
            setSelectedPOForReceive(null);
          }}
          onConfirm={handleConfirmReceive}
        />
      )}
    </div>
  );
}