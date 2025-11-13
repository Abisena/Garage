'use client';


import React, { useState, useEffect } from 'react';
import { Package, Search, CheckCircle, Clock, AlertCircle, Truck, Eye, FileText, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { PartsDeliveryModal } from './PartsDeliveryModal';

interface Part {
  partCode: string;
  partName: string;
  requestedQty: number;
  stockAvailable: number;
  unit: string;
  location: string;
  status: 'REQUESTED' | 'PREPARED' | 'ON_ORDER';
}

interface PartsRequest {
  orderId: string;
  customerName: string;
  vehicleBrand: string;
  vehicleModel: string;
  plateNumber: string;
  requestDate: string;
  requestTime: string;
  parts: Part[];
  status: 'PENDING' | 'PARTIAL' | 'READY' | 'COMPLETED';
  branch: string;
  mechanicName?: string; // Add mechanic name
  deliveryDoc?: {
    deliveryId: string;
    mechanicSignature: string;
    mechanicName: string;
    date: string;
    preparedBy: string;
  };
}

interface SparePartsRequestProps {
  currentUser: {
    username: string;
    role: 'admin' | 'branch';
    branch: 'all' | 'Jakarta' | 'Bandung' | 'Surabaya';
    displayName: string;
  };
}

export function SparePartsRequest({ currentUser }: SparePartsRequestProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PartsRequest | null>(null);
  const [detailView, setDetailView] = useState(false);
  const [requests, setRequests] = useState<PartsRequest[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  // Reload data when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      loadRequests();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const loadRequests = () => {
    const savedRequests = localStorage.getItem('sparePartsRequests');
    if (savedRequests) {
      setRequests(JSON.parse(savedRequests));
    }
  };

  const saveRequests = (updatedRequests: PartsRequest[]) => {
    setRequests(updatedRequests);
    localStorage.setItem('sparePartsRequests', JSON.stringify(updatedRequests));
  };

  const filteredRequests = requests.filter(req => {
    if (currentUser.role === 'branch' && currentUser.branch !== 'all') {
      if (req.branch !== currentUser.branch) return false;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        req.orderId.toLowerCase().includes(query) ||
        req.customerName.toLowerCase().includes(query) ||
        req.plateNumber.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handlePrepare = (orderId: string, partCode: string) => {
    // Get the part being prepared to reduce stock
    const request = requests.find(r => r.orderId === orderId);
    const partToPrepare = request?.parts.find(p => p.partCode === partCode);
    
    if (!partToPrepare) return;
    
    // Update requests
    const updatedRequests = requests.map(req => {
      if (req.orderId === orderId) {
        const updatedParts = req.parts.map(part => {
          if (part.partCode === partCode && part.stockAvailable > 0) {
            return { ...part, status: 'PREPARED' as const };
          }
          return part;
        });

        const allPrepared = updatedParts.every(p => p.status === 'PREPARED');
        const somePrepared = updatedParts.some(p => p.status === 'PREPARED');

        return {
          ...req,
          parts: updatedParts,
          status: allPrepared ? 'READY' as const : (somePrepared ? 'PARTIAL' as const : 'PENDING' as const)
        };
      }
      return req;
    });

    saveRequests(updatedRequests);

    // Reduce stock in master spare parts
    const savedMasterParts = localStorage.getItem('masterSpareParts');
    if (savedMasterParts) {
      const masterParts = JSON.parse(savedMasterParts);
      const updatedMasterParts = masterParts.map((masterPart: any) => {
        if (masterPart.partNumber === partCode) {
          const newStock = masterPart.stock - partToPrepare.requestedQty;
          return {
            ...masterPart,
            stock: Math.max(0, newStock) // Ensure stock doesn't go negative
          };
        }
        return masterPart;
      });
      localStorage.setItem('masterSpareParts', JSON.stringify(updatedMasterParts));
      
      console.log(`✅ Stock reduced: ${partCode} - Qty: ${partToPrepare.requestedQty} - New stock: ${Math.max(0, masterParts.find((p: any) => p.partNumber === partCode)?.stock - partToPrepare.requestedQty)}`);
    }

    // Update workOrders to mark part as PREPARED
    const savedWorkOrders = localStorage.getItem('workOrders');
    if (savedWorkOrders) {
      const workOrders = JSON.parse(savedWorkOrders);
      const updatedWorkOrders = workOrders.map((wo: any) => {
        if (wo.orderId === orderId && wo.spareParts) {
          const updatedSpareParts = wo.spareParts.map((part: any) => {
            if (part.partNumber === partCode) {
              return { ...part, status: 'prepared' as const, requested: true };
            }
            return part;
          });
          return { ...wo, spareParts: updatedSpareParts };
        }
        return wo;
      });
      localStorage.setItem('workOrders', JSON.stringify(updatedWorkOrders));
      
      // Trigger storage event for other tabs/components
      window.dispatchEvent(new Event('storage'));
    }

    // Update selected request if viewing details
    if (selectedRequest && selectedRequest.orderId === orderId) {
      const updated = updatedRequests.find(r => r.orderId === orderId);
      if (updated) {
        setSelectedRequest(updated);
      }
    }
  };

  const handleOrder = (orderId: string, partCode: string) => {
    const updatedRequests = requests.map(req => {
      if (req.orderId === orderId) {
        const updatedParts = req.parts.map(part => {
          if (part.partCode === partCode) {
            return { ...part, status: 'ON_ORDER' as const };
          }
          return part;
        });

        const somePrepared = updatedParts.some(p => p.status === 'PREPARED');

        return {
          ...req,
          parts: updatedParts,
          status: somePrepared ? 'PARTIAL' as const : 'PENDING' as const
        };
      }
      return req;
    });
    saveRequests(updatedRequests);

    // Update selected request if in detail view
    if (selectedRequest && selectedRequest.orderId === orderId) {
      const updated = updatedRequests.find(r => r.orderId === orderId);
      if (updated) setSelectedRequest(updated);
    }
  };

  const handleReject = (orderId: string, partCode: string) => {
    if (!confirm('⚠️ Apakah Anda yakin ingin REJECT part ini?\n\nPart yang di-reject akan dihapus dari request list.')) {
      return;
    }

    const updatedRequests = requests.map(req => {
      if (req.orderId === orderId) {
        // Remove rejected part
        const updatedParts = req.parts.filter(part => part.partCode !== partCode);
        
        // If no parts left, mark as completed (cancelled)
        if (updatedParts.length === 0) {
          return {
            ...req,
            parts: updatedParts,
            status: 'COMPLETED' as const
          };
        }

        // Recalculate status
        const allPrepared = updatedParts.every(p => p.status === 'PREPARED');
        const somePrepared = updatedParts.some(p => p.status === 'PREPARED');

        return {
          ...req,
          parts: updatedParts,
          status: allPrepared ? 'READY' as const : (somePrepared ? 'PARTIAL' as const : 'PENDING' as const)
        };
      }
      return req;
    });
    
    saveRequests(updatedRequests);

    // Update workOrders to mark part as REJECTED
    const savedWorkOrders = localStorage.getItem('workOrders');
    if (savedWorkOrders) {
      const workOrders = JSON.parse(savedWorkOrders);
      const updatedWorkOrders = workOrders.map((wo: any) => {
        if (wo.orderId === orderId && wo.spareParts) {
          const updatedSpareParts = wo.spareParts.map((part: any) => {
            if (part.partNumber === partCode) {
              return { ...part, status: 'rejected' as const, requested: true };
            }
            return part;
          });
          return { ...wo, spareParts: updatedSpareParts };
        }
        return wo;
      });
      localStorage.setItem('workOrders', JSON.stringify(updatedWorkOrders));
    }

    // Update selected request if in detail view
    if (selectedRequest && selectedRequest.orderId === orderId) {
      const updated = updatedRequests.find(r => r.orderId === orderId);
      if (updated) {
        setSelectedRequest(updated);
        // If no parts left, go back to list
        if (updated.parts.length === 0) {
          alert('✅ Semua parts telah di-reject. Request ditutup.');
          handleBackToList();
        }
      }
    }
  };

  const handleGenerateDelivery = (request: PartsRequest) => {
    const preparedParts = request.parts.filter(p => p.status === 'PREPARED');
    if (preparedParts.length === 0) {
      alert('Tidak ada parts yang sudah PREPARED!');
      return;
    }

    setSelectedRequest(request);
    setShowDeliveryModal(true);
  };

  const handleDeliveryConfirm = (mechanicSignature: string, mechanicName: string) => {
    if (selectedRequest) {
      const deliveryId = `${selectedRequest.branch.substring(0, 3).toUpperCase()}-DEL-${Date.now().toString().slice(-6)}`;
      
      const updatedRequests = requests.map(req => {
        if (req.orderId === selectedRequest.orderId) {
          return {
            ...req,
            status: 'COMPLETED' as const,
            deliveryDoc: {
              deliveryId,
              mechanicSignature,
              mechanicName,
              date: new Date().toLocaleDateString('id-ID'),
              preparedBy: currentUser.displayName
            }
          };
        }
        return req;
      });
      
      saveRequests(updatedRequests);
      setShowDeliveryModal(false);
      
      // Update selected request
      const updated = updatedRequests.find(r => r.orderId === selectedRequest.orderId);
      if (updated) setSelectedRequest(updated);
      
      alert(`✅ Dokumen Pengeluaran ${deliveryId} berhasil dibuat!\n\n🔄 STOK BERKURANG saat dokumen ditandatangani.\n📦 Parts siap digunakan oleh Mechanic.`);
    }
  };

  const handleViewDelivery = (request: PartsRequest) => {
    setSelectedRequest(request);
    setShowDeliveryModal(true);
  };

  const handleSelectRequest = (request: PartsRequest) => {
    setSelectedRequest(request);
    setDetailView(true);
  };

  const handleBackToList = () => {
    setDetailView(false);
    setSelectedRequest(null);
  };

  const getStatusBadge = (status: PartsRequest['status']) => {
    const badges = {
      PENDING: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: Clock, label: 'Pending' },
      PARTIAL: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: AlertCircle, label: 'Partial' },
      READY: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Package, label: 'Ready' },
      COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle, label: 'Completed' }
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

  const getPartStatusBadge = (status: Part['status']) => {
    const badges = {
      REQUESTED: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Requested' },
      PREPARED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Prepared' },
      ON_ORDER: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'On Order' }
    };
    const badge = badges[status];
    return (
      <span className={`px-2 py-1 ${badge.bg} ${badge.text} rounded text-xs`}>
        {badge.label}
      </span>
    );
  };

  const stats = {
    pending: filteredRequests.filter(r => r.status === 'PENDING').length,
    partial: filteredRequests.filter(r => r.status === 'PARTIAL').length,
    ready: filteredRequests.filter(r => r.status === 'READY').length,
    completed: filteredRequests.filter(r => r.status === 'COMPLETED').length
  };

  // DETAIL VIEW
  if (detailView && selectedRequest) {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleBackToList}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to List
              </Button>
              <div>
                <h1 className="text-slate-800">Sparepart Request Detail - {selectedRequest.orderId}</h1>
                <p className="text-slate-600">{selectedRequest.customerName} - {selectedRequest.vehicleBrand} {selectedRequest.vehicleModel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(selectedRequest.status)}
              {selectedRequest.status === 'READY' && !selectedRequest.deliveryDoc && (
                <Button
                  onClick={() => handleGenerateDelivery(selectedRequest)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Delivery Doc
                </Button>
              )}
              {selectedRequest.status === 'COMPLETED' && selectedRequest.deliveryDoc && (
                <Button
                  onClick={() => handleViewDelivery(selectedRequest)}
                  variant="outline"
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Delivery Doc
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Order Info Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
              <h3 className="text-blue-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Request Information
              </h3>
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <p className="text-blue-700 text-sm mb-1">Order ID</p>
                  <p className="text-slate-900">{selectedRequest.orderId}</p>
                </div>
                <div>
                  <p className="text-blue-700 text-sm mb-1">Customer</p>
                  <p className="text-slate-900">{selectedRequest.customerName}</p>
                </div>
                <div>
                  <p className="text-blue-700 text-sm mb-1">Vehicle</p>
                  <p className="text-slate-900">{selectedRequest.vehicleBrand} {selectedRequest.vehicleModel}</p>
                </div>
                <div>
                  <p className="text-blue-700 text-sm mb-1">Plate Number</p>
                  <p className="text-slate-900">{selectedRequest.plateNumber}</p>
                </div>
                <div>
                  <p className="text-blue-700 text-sm mb-1">Branch</p>
                  <p className="text-slate-900">{selectedRequest.branch}</p>
                </div>
                <div>
                  <p className="text-blue-700 text-sm mb-1">Request Date</p>
                  <p className="text-slate-900">{selectedRequest.requestDate}</p>
                </div>
                <div>
                  <p className="text-blue-700 text-sm mb-1">Request Time</p>
                  <p className="text-slate-900">{selectedRequest.requestTime}</p>
                </div>
                <div>
                  <p className="text-blue-700 text-sm mb-1">Status</p>
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>
            </div>

            {/* Parts Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-slate-700 to-slate-600 border-b border-slate-300 p-4">
                <h3 className="text-white flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Parts Request List
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-700 text-sm">No</th>
                      <th className="px-4 py-3 text-left text-slate-700 text-sm">Part Code</th>
                      <th className="px-4 py-3 text-left text-slate-700 text-sm">Part Name</th>
                      <th className="px-4 py-3 text-center text-slate-700 text-sm">Requested</th>
                      <th className="px-4 py-3 text-center text-slate-700 text-sm">Stock Available</th>
                      <th className="px-4 py-3 text-left text-slate-700 text-sm">Location</th>
                      <th className="px-4 py-3 text-center text-slate-700 text-sm">Status</th>
                      <th className="px-4 py-3 text-center text-slate-700 text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequest.parts.map((part, index) => (
                      <tr key={part.partCode} className="border-t border-slate-200">
                        <td className="px-4 py-4 text-slate-900 text-sm">{index + 1}</td>
                        <td className="px-4 py-4 text-slate-900 text-sm font-mono">{part.partCode}</td>
                        <td className="px-4 py-4 text-slate-900 text-sm">{part.partName}</td>
                        <td className="px-4 py-4 text-center text-slate-900 text-sm">
                          {part.requestedQty} {part.unit}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`${part.stockAvailable === 0 ? 'text-red-600' : part.stockAvailable < part.requestedQty ? 'text-amber-600' : 'text-emerald-600'} text-sm`}>
                            {part.stockAvailable} {part.unit}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-600 text-sm">{part.location}</td>
                        <td className="px-4 py-4 text-center">
                          {getPartStatusBadge(part.status)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {selectedRequest.status !== 'COMPLETED' && (
                            <div className="flex gap-2 justify-center">
                              {part.status === 'REQUESTED' && part.stockAvailable > 0 && (
                                <Button
                                  onClick={() => handlePrepare(selectedRequest.orderId, part.partCode)}
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Prepare
                                </Button>
                              )}
                              {part.status === 'REQUESTED' && part.stockAvailable === 0 && (
                                <Button
                                  onClick={() => handleOrder(selectedRequest.orderId, part.partCode)}
                                  size="sm"
                                  className="bg-amber-500 hover:bg-amber-600 text-white"
                                >
                                  <Truck className="w-3 h-3 mr-1" />
                                  Order
                                </Button>
                              )}
                              {part.status === 'PREPARED' && (
                                <span className="text-emerald-600 text-sm">✓ Ready</span>
                              )}
                              {part.status === 'ON_ORDER' && (
                                <span className="text-amber-600 text-sm">⏳ Ordering...</span>
                              )}
                              {part.status === 'REQUESTED' && (
                                <Button
                                  onClick={() => handleReject(selectedRequest.orderId, part.partCode)}
                                  size="sm"
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Modal */}
        {showDeliveryModal && selectedRequest && (
          <PartsDeliveryModal
            isOpen={showDeliveryModal}
            onClose={() => {
              setShowDeliveryModal(false);
            }}
            orderData={{
              orderId: selectedRequest.orderId,
              customerName: selectedRequest.customerName,
              vehicleBrand: selectedRequest.vehicleBrand,
              vehicleModel: selectedRequest.vehicleModel,
              plateNumber: selectedRequest.plateNumber,
              branch: selectedRequest.branch,
              mechanicName: selectedRequest.mechanicName, // Pass mechanic name
              parts: selectedRequest.parts
                .filter(p => p.status === 'PREPARED')
                .map(p => ({
                  partCode: p.partCode,
                  partName: p.partName,
                  qty: p.requestedQty,
                  location: p.location,
                  unit: p.unit
                }))
            }}
            onConfirm={handleDeliveryConfirm}
            existingDelivery={selectedRequest.deliveryDoc || null}
          />
        )}
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-slate-800">Spare Parts Request</h1>
              <p className="text-slate-600">Step 4: Prepare and deliver spare parts</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-slate-600 text-sm">Pending</p>
            <p className="text-slate-900 text-2xl">{stats.pending}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <p className="text-amber-700 text-sm">Partial</p>
            <p className="text-amber-900 text-2xl">{stats.partial}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-blue-700 text-sm">Ready</p>
            <p className="text-blue-900 text-2xl">{stats.ready}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
            <p className="text-emerald-700 text-sm">Completed</p>
            <p className="text-emerald-900 text-2xl">{stats.completed}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order ID, Customer, or Plate Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      {/* Requests List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-2">
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p className="text-slate-600">No parts requests found</p>
              <p className="text-slate-500 text-sm mt-1">Requests from Repair Orders will appear here</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div 
                key={request.orderId} 
                onClick={() => handleSelectRequest(request)}
                className="bg-white rounded-lg border border-slate-200 px-6 py-3 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between gap-6">
                  {/* Order ID & Status */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className="text-slate-900 font-mono">{request.orderId}</span>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  {/* Customer */}
                  <div className="flex-1 min-w-[150px]">
                    <span className="text-slate-900">{request.customerName}</span>
                  </div>
                  
                  {/* Vehicle & Plate */}
                  <div className="flex-1 min-w-[200px]">
                    <span className="text-slate-700">{request.vehicleBrand} {request.vehicleModel}</span>
                    <span className="text-slate-500 ml-2">• {request.plateNumber}</span>
                  </div>
                  
                  {/* Parts Info */}
                  <div className="flex items-center gap-4 text-sm min-w-[280px]">
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-600">{request.parts.length} parts ({request.parts.reduce((sum, p) => sum + p.requestedQty, 0)} pcs)</span>
                    </div>
                    <span className="text-emerald-600">✓ {request.parts.filter(p => p.status === 'PREPARED').length}</span>
                    <span className="text-amber-600">⏳ {request.parts.filter(p => p.status === 'ON_ORDER').length}</span>
                  </div>
                  
                  {/* Time */}
                  <div className="text-slate-600 text-sm min-w-[80px] text-right">
                    {request.requestTime}
                  </div>
                  
                  {/* Arrow */}
                  <div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}