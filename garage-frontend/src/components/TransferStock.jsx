import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ArrowRightLeft, 
  Building2, 
  Search, 
  Plus, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Truck,
  Eye,
  Filter,
  Calendar,
  User,
  FileText,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  PackageCheck,
  X,
  Printer
} from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { 
  loadMasterSpareParts, 
  saveMasterSpareParts, 
  getBranchStock, 
  processTransferStock
} from '../utils/stockUtils';

export function TransferStock({ currentUser }) {
  const [transfers, setTransfers] = useState([]);
  const [masterParts, setMasterParts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [previewTransfer, setPreviewTransfer] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [activeTab, setActiveTab] = useState('my-requests');

  // Form states
  const [senderBranch, setSenderBranch] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  const branches = ['Jakarta', 'Bandung', 'Surabaya'];

  useEffect(() => {
    loadTransfers();
    loadMasterPartsData();
  }, []);

  const loadMasterPartsData = () => {
    const parts = loadMasterSpareParts();
    setMasterParts(parts);
  };

  const loadTransfers = () => {
    const saved = localStorage.getItem('transferStock');
    if (saved) {
      setTransfers(JSON.parse(saved));
    }
  };

  const saveTransfers = (data) => {
    localStorage.setItem('transferStock', JSON.stringify(data));
    setTransfers(data);
  };

  const generateTransferRequestNumber = (branch) => {
    const branchCode = branch === 'Jakarta' ? 'JKT' : branch === 'Bandung' ? 'BDG' : 'SBY';
    const existingNumbers = transfers
      .filter(t => t.requesterBranch === branch)
      .map(t => {
        const match = t.transferRequestNumber.match(/TR-[A-Z]+-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `TR-${branchCode}-${String(nextNumber).padStart(3, '0')}`;
  };

  const generateTransferSendNumber = (branch) => {
    const branchCode = branch === 'Jakarta' ? 'JKT' : branch === 'Bandung' ? 'BDG' : 'SBY';
    const existingNumbers = transfers
      .filter(t => t.senderBranch === branch && t.transferSendNumber)
      .map(t => {
        const match = t.transferSendNumber.match(/TS-[A-Z]+-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `TS-${branchCode}-${String(nextNumber).padStart(3, '0')}`;
  };

  const handleCreateRequest = () => {
    if (!senderBranch) {
      toast.error('Please select sender branch');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    const now = new Date();
    const newTransfer = {
      id: `TRF-${Date.now()}`,
      transferRequestNumber: generateTransferRequestNumber(currentUser.branch),
      requesterBranch: currentUser.branch,
      senderBranch,
      requestedBy: currentUser.name,
      requestedByUID: currentUser.username,
      requestDate: now.toLocaleDateString('id-ID'),
      requestTime: now.toLocaleTimeString('id-ID'),
      items: selectedItems,
      totalAmount: selectedItems.reduce((sum, item) => sum + item.totalPrice, 0),
      status: 'requested',
      requestNotes
    };

    // Show print preview first
    setPreviewTransfer(newTransfer);
    setShowPrintPreview(true);
    setShowCreateModal(false);
  };

  const handleConfirmCreate = () => {
    if (!previewTransfer) return;

    const updated = [...transfers, previewTransfer];
    saveTransfers(updated);
    toast.success('Transfer request created successfully!');
    
    // Reset form
    setSenderBranch('');
    setRequestNotes('');
    setSelectedItems([]);
    setShowPrintPreview(false);
    setPreviewTransfer(null);
  };

  const handlePrintDocument = () => {
    window.print();
  };

  const handleApprove = (transfer) => {
    const updated = transfers.map(t => {
      if (t.id === transfer.id) {
        return {
          ...t,
          status: 'approved',
          transferSendNumber: generateTransferSendNumber(t.senderBranch),
          approvedBy: currentUser.name,
          approvedByUID: currentUser.username,
          approvedDate: new Date().toLocaleDateString('id-ID')
        };
      }
      return t;
    });
    saveTransfers(updated);
    toast.success('Transfer request approved!');
    setShowDetailModal(false);
  };

  const handleSend = (transfer) => {
    const updated = transfers.map(t => {
      if (t.id === transfer.id) {
        return {
          ...t,
          status: 'in-transit',
          sentBy: currentUser.name,
          sentByUID: currentUser.username,
          sentDate: new Date().toLocaleDateString('id-ID')
        };
      }
      return t;
    });
    saveTransfers(updated);
    toast.success('Items sent! Now in-transit to ' + transfer.requesterBranch);
    setShowDetailModal(false);
  };

  const handleReceive = (transfer) => {
    console.log('📥 Starting handleReceive for transfer:', transfer.transferRequestNumber);
    
    // Process stock transfer
    const itemsToTransfer = transfer.items.map(item => ({
      partNumber: item.partNumber,
      quantity: item.quantity
    }));

    console.log('📦 Items to transfer:', itemsToTransfer);
    console.log('🏢 From:', transfer.senderBranch, '→ To:', transfer.requesterBranch);
    console.log('📊 Current masterParts count:', masterParts.length);

    const result = processTransferStock(
      masterParts,
      itemsToTransfer,
      transfer.senderBranch,
      transfer.requesterBranch
    );

    if (!result.success) {
      console.error('❌ Transfer failed:', result.errors);
      toast.error(`Failed to process stock transfer: ${result.errors.join(', ')}`);
      return;
    }

    console.log('💾 Saving updated parts to localStorage...');
    // Update master spare parts
    saveMasterSpareParts(result.updatedParts);
    setMasterParts(result.updatedParts);
    
    // Verify save
    const savedCheck = localStorage.getItem('masterSpareParts');
    if (savedCheck) {
      const parsed = JSON.parse(savedCheck);
      console.log('✅ Verified save - localStorage has', parsed.length, 'parts');
      
      // Find and log the specific part that was transferred
      const firstItem = itemsToTransfer[0];
      const verifyPart = parsed.find((p) => p.partNumber === firstItem.partNumber);
      if (verifyPart) {
        console.log(`✅ Verified ${firstItem.partNumber} stock:`, verifyPart.stockByBranch);
      }
    }

    // Update transfer status
    const updated = transfers.map(t => {
      if (t.id === transfer.id) {
        return {
          ...t,
          status: 'received',
          receivedBy: currentUser.name,
          receivedByUID: currentUser.username,
          receivedDate: new Date().toLocaleDateString('id-ID')
        };
      }
      return t;
    });
    saveTransfers(updated);
    
    console.log('🎉 Transfer completed and saved!');
    toast.success('Items received successfully! Stock updated.');
    setShowDetailModal(false);
  };

  const handleReject = (transfer, reason) => {
    const updated = transfers.map(t => {
      if (t.id === transfer.id) {
        return {
          ...t,
          status: 'rejected',
          rejectionReason: reason,
          approvedBy: currentUser.name,
          approvedByUID: currentUser.username,
          approvedDate: new Date().toLocaleDateString('id-ID')
        };
      }
      return t;
    });
    saveTransfers(updated);
    toast.error('Transfer request rejected');
    setShowDetailModal(false);
  };

  const addItem = (part) => {
    const quantity = 1;
    const newItem = {
      id: `ITM-${Date.now()}`,
      partNumber: part.partNumber,
      partName: part.partName,
      quantity,
      unitPrice: part.unitPrice,
      totalPrice: part.unitPrice * quantity
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  const updateItemQuantity = (id, quantity) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantity,
          totalPrice: item.unitPrice * quantity
        };
      }
      return item;
    }));
  };

  const removeItem = (id) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = 
      transfer.transferRequestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transfer.transferSendNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      transfer.requesterBranch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.senderBranch.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || transfer.status === filterStatus;
    const matchesBranch = filterBranch === 'all' || 
      transfer.requesterBranch === filterBranch || 
      transfer.senderBranch === filterBranch;

    // Tab filtering
    if (activeTab === 'my-requests') {
      return matchesSearch && matchesStatus && matchesBranch && 
        transfer.requesterBranch === currentUser.branch;
    } else if (activeTab === 'incoming') {
      return matchesSearch && matchesStatus && matchesBranch && 
        transfer.senderBranch === currentUser.branch;
    } else {
      return matchesSearch && matchesStatus && matchesBranch;
    }
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      requested: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
      'in-transit': { bg: 'bg-purple-100', text: 'text-purple-700', icon: Truck },
      received: { bg: 'bg-green-100', text: 'text-green-700', icon: PackageCheck },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
      </span>
    );
  };

  const stats = {
    requested: transfers.filter(t => t.status === 'requested').length,
    inTransit: transfers.filter(t => t.status === 'in-transit').length,
    received: transfers.filter(t => t.status === 'received').length,
    total: transfers.length
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Transfer Stock</h1>
            <p className="text-slate-600">Manage stock transfers between branches</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Transfer Request
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-yellow-600" />
              <span className="text-yellow-600 text-xs">Pending</span>
            </div>
            <p className="text-3xl text-yellow-900 mb-1">{stats.requested}</p>
            <p className="text-yellow-700 text-sm">Requested</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <Truck className="w-8 h-8 text-purple-600" />
              <span className="text-purple-600 text-xs">Active</span>
            </div>
            <p className="text-3xl text-purple-900 mb-1">{stats.inTransit}</p>
            <p className="text-purple-700 text-sm">In-Transit</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <PackageCheck className="w-8 h-8 text-green-600" />
              <span className="text-green-600 text-xs">Complete</span>
            </div>
            <p className="text-3xl text-green-900 mb-1">{stats.received}</p>
            <p className="text-green-700 text-sm">Received</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <ArrowRightLeft className="w-8 h-8 text-blue-600" />
              <span className="text-blue-600 text-xs">Total</span>
            </div>
            <p className="text-3xl text-blue-900 mb-1">{stats.total}</p>
            <p className="text-blue-700 text-sm">All Transfers</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('my-requests')}
              className={`flex-1 px-6 py-4 text-sm transition-colors ${
                activeTab === 'my-requests'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                My Requests
              </div>
            </button>
            <button
              onClick={() => setActiveTab('incoming')}
              className={`flex-1 px-6 py-4 text-sm transition-colors ${
                activeTab === 'incoming'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Package className="w-4 h-4" />
                Incoming Requests
              </div>
            </button>
            {currentUser.role === 'Administrator' && (
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 px-6 py-4 text-sm transition-colors ${
                  activeTab === 'all'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <ArrowRightLeft className="w-4 h-4" />
                  All Transfers
                </div>
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by transfer number, branch..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="requested">Requested</option>
                <option value="approved">Approved</option>
                <option value="in-transit">In-Transit</option>
                <option value="received">Received</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
              >
                <option value="all">All Branches</option>
                {branches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfer List */}
          <div className="overflow-x-auto">
            {filteredTransfers.length > 0 ? (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-slate-600">Request Number</th>
                    <th className="px-4 py-3 text-left text-xs text-slate-600">Send Number</th>
                    <th className="px-4 py-3 text-left text-xs text-slate-600">From → To</th>
                    <th className="px-4 py-3 text-left text-xs text-slate-600">Requested By</th>
                    <th className="px-4 py-3 text-left text-xs text-slate-600">Date</th>
                    <th className="px-4 py-3 text-right text-xs text-slate-600">Items</th>
                    <th className="px-4 py-3 text-center text-xs text-slate-600">Status</th>
                    <th className="px-4 py-3 text-center text-xs text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransfers.map((transfer) => (
                    <tr
                      key={transfer.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedTransfer(transfer);
                        setShowDetailModal(true);
                      }}
                    >
                      <td className="px-4 py-3 font-mono text-sm text-slate-900">
                        {transfer.transferRequestNumber}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-slate-700">
                        {transfer.transferSendNumber || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700">{transfer.senderBranch}</span>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-900">{transfer.requesterBranch}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className="text-slate-900">{transfer.requestedBy}</p>
                          <p className="text-slate-500 text-xs">{transfer.requestedByUID}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {transfer.requestDate}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 text-right">
                        {transfer.items.length} items
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(transfer.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:bg-blue-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransfer(transfer);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-16 text-slate-500">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 text-lg mb-2">No transfer requests found</p>
                <p className="text-sm">Create a new transfer request to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Transfer Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-slate-800">New Transfer Request</h2>
                  <p className="text-slate-600 text-sm">Request stock transfer from another branch</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                {/* Branch Selection */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-slate-700 mb-2">From Branch (Sender)</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={senderBranch}
                      onChange={(e) => setSenderBranch(e.target.value)}
                    >
                      <option value="">Select sender branch...</option>
                      {branches.filter(b => b !== currentUser.branch).map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 mb-2">To Branch (Requester)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
                      value={currentUser.branch}
                      disabled
                    />
                  </div>
                </div>

                {/* Available Parts */}
                {senderBranch && (
                  <div>
                    <label className="block text-sm text-slate-700 mb-2">Available Parts from {senderBranch}</label>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs text-slate-600">Part Number</th>
                            <th className="px-4 py-2 text-left text-xs text-slate-600">Part Name</th>
                            <th className="px-4 py-2 text-right text-xs text-slate-600">Stock</th>
                            <th className="px-4 py-2 text-right text-xs text-slate-600">Unit Price</th>
                            <th className="px-4 py-2 text-center text-xs text-slate-600">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {masterParts.map(part => {
                            const stockAvailable = getBranchStock(part, senderBranch);
                            return (
                              <tr key={part.partNumber} className="hover:bg-slate-50">
                                <td className="px-4 py-2 text-sm font-mono">{part.partNumber}</td>
                                <td className="px-4 py-2 text-sm">{part.partName}</td>
                                <td className="px-4 py-2 text-sm text-right">
                                  <span className={stockAvailable === 0 ? 'text-red-600' : 'text-slate-900'}>
                                    {stockAvailable}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm text-right">
                                  Rp {part.unitPrice.toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addItem(part)}
                                    disabled={selectedItems.some(i => i.partNumber === part.partNumber) || stockAvailable === 0}
                                  >
                                    <Plus className="w-4 h-4" />
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

                {/* Selected Items */}
                {selectedItems.length > 0 && (
                  <div>
                    <label className="block text-sm text-slate-700 mb-2">Selected Items</label>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-blue-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs text-slate-600">Part Number</th>
                            <th className="px-4 py-2 text-left text-xs text-slate-600">Part Name</th>
                            <th className="px-4 py-2 text-right text-xs text-slate-600">Unit Price</th>
                            <th className="px-4 py-2 text-center text-xs text-slate-600">Quantity</th>
                            <th className="px-4 py-2 text-right text-xs text-slate-600">Total</th>
                            <th className="px-4 py-2 text-center text-xs text-slate-600">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedItems.map(item => (
                            <tr key={item.id}>
                              <td className="px-4 py-2 text-sm font-mono">{item.partNumber}</td>
                              <td className="px-4 py-2 text-sm">{item.partName}</td>
                              <td className="px-4 py-2 text-sm text-right">
                                Rp {item.unitPrice.toLocaleString('id-ID')}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                  className="w-20 px-2 py-1 border border-slate-300 rounded text-center"
                                />
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-blue-600">
                                Rp {item.totalPrice.toLocaleString('id-ID')}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => removeItem(item.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50">
                            <td colSpan={4} className="px-4 py-2 text-right text-slate-700">
                              Total Amount:
                            </td>
                            <td className="px-4 py-2 text-right text-blue-600">
                              Rp {selectedItems.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString('id-ID')}
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm text-slate-700 mb-2">Request Notes (Optional)</label>
                  <textarea
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add any notes for this transfer request..."
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRequest}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={!senderBranch || selectedItems.length === 0}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Create Request
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Print Preview Modal */}
        {showPrintPreview && previewTransfer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-white mb-2">Transfer Details</h2>
                    <div className="flex items-center gap-3">
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                        {previewTransfer.transferRequestNumber}
                      </span>
                      {previewTransfer.transferSendNumber && (
                        <>
                          <ArrowRight className="w-4 h-4" />
                          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                            {previewTransfer.transferSendNumber}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => setShowPrintPreview(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Status Timeline */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 ${previewTransfer.status === 'requested' ? 'text-yellow-600' : 'text-green-600'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${previewTransfer.status === 'requested' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Requested</p>
                        <p className="text-sm">{previewTransfer.requestDate}</p>
                      </div>
                    </div>

                    <div className={`flex-1 h-0.5 ${previewTransfer.status !== 'requested' && previewTransfer.status !== 'rejected' ? 'bg-green-400' : 'bg-slate-300'}`} />

                    <div className={`flex items-center gap-2 ${previewTransfer.status === 'approved' ? 'text-blue-600' : previewTransfer.approvedDate ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${previewTransfer.approvedDate ? (previewTransfer.status === 'approved' ? 'bg-blue-100' : 'bg-green-100') : 'bg-slate-100'}`}>
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Approved</p>
                        <p className="text-sm">{previewTransfer.approvedDate || '-'}</p>
                      </div>
                    </div>

                    <div className={`flex-1 h-0.5 ${previewTransfer.status === 'in-transit' || previewTransfer.status === 'received' ? 'bg-green-400' : 'bg-slate-300'}`} />

                    <div className={`flex items-center gap-2 ${previewTransfer.status === 'in-transit' ? 'text-purple-600' : previewTransfer.sentDate ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${previewTransfer.sentDate ? (previewTransfer.status === 'in-transit' ? 'bg-purple-100' : 'bg-green-100') : 'bg-slate-100'}`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">In-Transit</p>
                        <p className="text-sm">{previewTransfer.sentDate || '-'}</p>
                      </div>
                    </div>

                    <div className={`flex-1 h-0.5 ${previewTransfer.status === 'received' ? 'bg-green-400' : 'bg-slate-300'}`} />

                    <div className={`flex items-center gap-2 ${previewTransfer.status === 'received' ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${previewTransfer.status === 'received' ? 'bg-green-100' : 'bg-slate-100'}`}>
                        <PackageCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Received</p>
                        <p className="text-sm">{previewTransfer.receivedDate || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transfer Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">From Branch</p>
                        <p className="text-slate-900">{previewTransfer.senderBranch}</p>
                      </div>
                    </div>
                    {previewTransfer.sentBy && (
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Sent By</p>
                        <p className="text-sm text-slate-900">{previewTransfer.sentBy}</p>
                        <p className="text-xs text-slate-500">{previewTransfer.sentByUID}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">To Branch</p>
                        <p className="text-slate-900">{previewTransfer.requesterBranch}</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">Requested By</p>
                      <p className="text-sm text-slate-900">{previewTransfer.requestedBy}</p>
                      <p className="text-xs text-slate-500">{previewTransfer.requestedByUID}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-slate-800 mb-3">Transfer Items</h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs text-slate-600">Part Number</th>
                          <th className="px-4 py-2 text-left text-xs text-slate-600">Part Name</th>
                          <th className="px-4 py-2 text-right text-xs text-slate-600">Qty</th>
                          <th className="px-4 py-2 text-right text-xs text-slate-600">Unit Price</th>
                          <th className="px-4 py-2 text-right text-xs text-slate-600">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewTransfer.items.map(item => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm font-mono">{item.partNumber}</td>
                            <td className="px-4 py-2 text-sm">{item.partName}</td>
                            <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right">
                              Rp {item.unitPrice.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-blue-600">
                              Rp {item.totalPrice.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50">
                          <td colSpan={4} className="px-4 py-2 text-right text-slate-700">
                            <strong>Total Amount:</strong>
                          </td>
                          <td className="px-4 py-2 text-right text-blue-600">
                            <strong>Rp {previewTransfer.totalAmount.toLocaleString('id-ID')}</strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                {previewTransfer.requestNotes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs text-blue-600 mb-1">Request Notes</p>
                    <p className="text-sm text-slate-700">{previewTransfer.requestNotes}</p>
                  </div>
                )}

                {previewTransfer.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-xs text-red-600 mb-1">Rejection Reason</p>
                    <p className="text-sm text-slate-700">{previewTransfer.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowPrintPreview(false)}>
                  Close
                </Button>
                <Button
                  onClick={handlePrintDocument}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Document
                </Button>
                <Button
                  onClick={handleConfirmCreate}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Create
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedTransfer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-6 no-print">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-white mb-2">Transfer Details</h2>
                    <div className="flex items-center gap-3">
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                        {selectedTransfer.transferRequestNumber}
                      </span>
                      {selectedTransfer.transferSendNumber && (
                        <>
                          <ArrowRight className="w-4 h-4" />
                          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                            {selectedTransfer.transferSendNumber}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => setShowDetailModal(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div id="transfer-stock-print" className="p-6 space-y-6">
                {/* Print-only Header */}
                <div className="hidden print:block mb-6 border-b-2 border-slate-300 pb-4">
                  <div className="text-center mb-4">
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">TRANSFER STOCK DOCUMENT</h1>
                    <p className="text-sm text-slate-600">Stock Transfer Between Branches</p>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-slate-500">Request Number</p>
                      <p className="font-mono text-lg font-bold text-slate-900">{selectedTransfer.transferRequestNumber}</p>
                      {selectedTransfer.transferSendNumber && (
                        <>
                          <p className="text-xs text-slate-500 mt-2">Send Number</p>
                          <p className="font-mono text-lg font-bold text-slate-900">{selectedTransfer.transferSendNumber}</p>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Date</p>
                      <p className="text-sm font-semibold text-slate-900">{selectedTransfer.requestDate}</p>
                      <p className="text-xs text-slate-500 mt-2">Status</p>
                      <p className="text-sm font-semibold text-slate-900 uppercase">{selectedTransfer.status}</p>
                    </div>
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 ${selectedTransfer.status === 'requested' ? 'text-yellow-600' : 'text-green-600'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedTransfer.status === 'requested' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Requested</p>
                        <p className="text-sm">{selectedTransfer.requestDate}</p>
                      </div>
                    </div>

                    <div className={`flex-1 h-0.5 ${selectedTransfer.status !== 'requested' && selectedTransfer.status !== 'rejected' ? 'bg-green-400' : 'bg-slate-300'}`} />

                    <div className={`flex items-center gap-2 ${selectedTransfer.status === 'approved' ? 'text-blue-600' : selectedTransfer.approvedDate ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedTransfer.approvedDate ? (selectedTransfer.status === 'approved' ? 'bg-blue-100' : 'bg-green-100') : 'bg-slate-100'}`}>
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Approved</p>
                        <p className="text-sm">{selectedTransfer.approvedDate || '-'}</p>
                      </div>
                    </div>

                    <div className={`flex-1 h-0.5 ${selectedTransfer.status === 'in-transit' || selectedTransfer.status === 'received' ? 'bg-green-400' : 'bg-slate-300'}`} />

                    <div className={`flex items-center gap-2 ${selectedTransfer.status === 'in-transit' ? 'text-purple-600' : selectedTransfer.sentDate ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedTransfer.sentDate ? (selectedTransfer.status === 'in-transit' ? 'bg-purple-100' : 'bg-green-100') : 'bg-slate-100'}`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">In-Transit</p>
                        <p className="text-sm">{selectedTransfer.sentDate || '-'}</p>
                      </div>
                    </div>

                    <div className={`flex-1 h-0.5 ${selectedTransfer.status === 'received' ? 'bg-green-400' : 'bg-slate-300'}`} />

                    <div className={`flex items-center gap-2 ${selectedTransfer.status === 'received' ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedTransfer.status === 'received' ? 'bg-green-100' : 'bg-slate-100'}`}>
                        <PackageCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Received</p>
                        <p className="text-sm">{selectedTransfer.receivedDate || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transfer Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">From Branch</p>
                        <p className="text-slate-900">{selectedTransfer.senderBranch}</p>
                      </div>
                    </div>
                    {selectedTransfer.sentBy && (
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Sent By</p>
                        <p className="text-sm text-slate-900">{selectedTransfer.sentBy}</p>
                        <p className="text-xs text-slate-500">{selectedTransfer.sentByUID}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">To Branch</p>
                        <p className="text-slate-900">{selectedTransfer.requesterBranch}</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">Requested By</p>
                      <p className="text-sm text-slate-900">{selectedTransfer.requestedBy}</p>
                      <p className="text-xs text-slate-500">{selectedTransfer.requestedByUID}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-slate-800 mb-3">Transfer Items</h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs text-slate-600">Part Number</th>
                          <th className="px-4 py-2 text-left text-xs text-slate-600">Part Name</th>
                          <th className="px-4 py-2 text-right text-xs text-slate-600">Qty</th>
                          <th className="px-4 py-2 text-right text-xs text-slate-600">Unit Price</th>
                          <th className="px-4 py-2 text-right text-xs text-slate-600">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTransfer.items.map(item => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm font-mono">{item.partNumber}</td>
                            <td className="px-4 py-2 text-sm">{item.partName}</td>
                            <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right">
                              Rp {item.unitPrice.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-blue-600">
                              Rp {item.totalPrice.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50">
                          <td colSpan={4} className="px-4 py-2 text-right text-slate-700">
                            <strong>Total Amount:</strong>
                          </td>
                          <td className="px-4 py-2 text-right text-blue-600">
                            <strong>Rp {selectedTransfer.totalAmount.toLocaleString('id-ID')}</strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                {selectedTransfer.requestNotes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs text-blue-600 mb-1">Request Notes</p>
                    <p className="text-sm text-slate-700">{selectedTransfer.requestNotes}</p>
                  </div>
                )}

                {selectedTransfer.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-xs text-red-600 mb-1">Rejection Reason</p>
                    <p className="text-sm text-slate-700">{selectedTransfer.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3 no-print">
                <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  onClick={handlePrintDocument}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Document
                </Button>

                {/* Approve/Reject (for sender branch users when status is requested) */}
                {selectedTransfer.status === 'requested' && 
                 selectedTransfer.senderBranch === currentUser.branch && (
                  <>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) {
                          handleReject(selectedTransfer, reason);
                        }
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => handleApprove(selectedTransfer)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}

                {/* Send (for sender branch users when status is approved) */}
                {selectedTransfer.status === 'approved' && 
                 selectedTransfer.senderBranch === currentUser.branch && (
                  <Button
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                    onClick={() => handleSend(selectedTransfer)}
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Mark as Sent
                  </Button>
                )}

                {/* Receive (for requester branch users when status is in-transit) */}
                {selectedTransfer.status === 'in-transit' && 
                 selectedTransfer.requesterBranch === currentUser.branch && (
                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => handleReceive(selectedTransfer)}
                  >
                    <PackageCheck className="w-4 h-4 mr-2" />
                    Confirm Receipt
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}