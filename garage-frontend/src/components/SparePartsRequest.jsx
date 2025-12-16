import React, { useState, useEffect } from 'react';
import { Package, Search, CheckCircle, Clock, AlertCircle, Truck, Eye, FileText, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { PartsDeliveryModal } from './PartsDeliveryModal';
import { getStoredWorkOrders, persistWorkOrders } from '../lib/workOrdersStorage';
import { frappeClient } from '../lib/frappeClient';

export function SparePartsRequest({ currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailView, setDetailView] = useState(false);
  const [requests, setRequests] = useState([]);

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

  const saveRequests = (updatedRequests) => {
    setRequests(updatedRequests);
    localStorage.setItem('sparePartsRequests', JSON.stringify(updatedRequests));
  };

  const syncRequestToFrappe = async (request) => {
    if (!request) return;

    try {
      await frappeClient.syncSparePartRequest({
        service_order: request.orderId,
        request_title: `Spare Part Request ${request.orderId}`,
        request_date: request.requestDate,
        customer: request.customerName,
        vehicle: request.plateNumber,
        items: request.parts.map((part) => ({
          part_code: part.partCode,
          part_name: part.partName,
          requested_qty: part.requestedQty,
          qty: part.requestedQty,
          uom: part.unit || 'Unit',
          status: part.status,
          source_warehouse: part.location,
        })),
      });
    } catch (error) {
      console.error('Failed to sync spare part request to Frappe:', error);
    }
  };

  const filteredRequests = requests.filter(req => {
    const shouldFilterByBranch = currentUser.branch && currentUser.branch !== 'all';
    if (shouldFilterByBranch && req.branch !== currentUser.branch) {
      return false;
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

  const handlePrepare = async (orderId, partCode, index) => {
    // Get the part being prepared to reduce stock
    const request = requests.find(r => r.orderId === orderId);
    if (!request) return;

    const partToPrepare = request.parts[index]; // Use index to get exact part
    if (!partToPrepare || partToPrepare.stockAvailable <= 0) return;

    // Get current stock from master spare parts (Garage Spare Part List)
    const savedMasterParts = localStorage.getItem('masterSpareParts');
    const masterParts = savedMasterParts ? JSON.parse(savedMasterParts) : [];
    const masterPart = masterParts.find((p) => p.partNumber === partCode);
    const currentStock = typeof masterPart?.stock === 'number'
      ? masterPart.stock
      : partToPrepare.stockAvailable;
    let newStock = Math.max(0, currentStock - partToPrepare.requestedQty);

    try {
      const apiResponse = await frappeClient.adjustSparePartStock(
        partCode,
        partToPrepare.requestedQty,
        'issue'
      );

      if (apiResponse && typeof apiResponse.stock_qty === 'number') {
        newStock = Math.max(0, Number(apiResponse.stock_qty));
      }
    } catch (error) {
      console.error('❌ Failed to sync stock to Pravenya:', error);
      alert('Gagal mengurangi stok di Pravenya. Silakan coba lagi.');
      return;
    }
    
    console.log('🎯 PREPARE DEBUG START');
    console.log('OrderId:', orderId);
    console.log('PartCode to match:', partCode);
    console.log('PartName to match:', partToPrepare.partName);
    console.log('Index:', index);
    
    // Update requests - update only the part at specific index
    const updatedRequests = requests.map(req => {
      if (req.orderId === orderId) {
        const updatedParts = req.parts.map((part, i) => {
          if (i === index && part.stockAvailable > 0) {
            return { ...part, status: 'PREPARED', stockAvailable: newStock };
          }
          return part;
        });

        const allPrepared = updatedParts.every(p => p.status === 'PREPARED');
        const somePrepared = updatedParts.some(p => p.status === 'PREPARED');

        return {
          ...req,
          parts: updatedParts,
          status: allPrepared ? 'READY' : (somePrepared ? 'PARTIAL' : 'PENDING')
        };
      }
      return req;
    });

    const updatedRequest = updatedRequests.find(r => r.orderId === orderId);

    saveRequests(updatedRequests);

    // Reduce stock in master spare parts
    if (masterParts.length > 0) {
      const updatedMasterParts = masterParts.map((part) => (
        part.partNumber === partCode
          ? { ...part, stock: newStock }
          : part
      ));

      localStorage.setItem('masterSpareParts', JSON.stringify(updatedMasterParts));
      console.log(`✅ Stock reduced from Garage Spare Part List: ${partCode} - Qty: ${partToPrepare.requestedQty} - New stock: ${newStock}`);
    }

    // Update workOrders to mark part as PREPARED
    const workOrders = getStoredWorkOrders();
    if (workOrders.length > 0) {

      console.log('🔍 Looking for orderId:', orderId);
      console.log('🔍 Looking for partCode:', partCode);
      console.log('🔍 partCode type:', typeof partCode);

      const updatedWorkOrders = workOrders.map((wo) => {
        if (wo.orderId === orderId) {
          console.log('✅ Found work order:', wo.orderId);
          
          // Check if workOrder has spareParts
          if (!wo.spareParts || wo.spareParts.length === 0) {
            console.error('❌ Work order has NO spare parts!');
            alert(`⚠️ ERROR: Work Order ${orderId} tidak memiliki spare parts!\\n\\nSilakan refresh halaman Repair Orders dan pastikan parts sudah di-save.`);
            return wo;
          }
          
          console.log('📦 Spare parts in work order:', wo.spareParts.map((p) => ({ 
            partNumber: p.partNumber, 
            name: p.name, 
            type: typeof p.partNumber,
            match: p.partNumber === partCode,
            strictMatch: p.partNumber === partCode && typeof p.partNumber === typeof partCode
          })));
          
          let matchFound = false;
          const normalizedPartCode = String(partCode).trim();
          
          // Get the part name from the request for fallback matching
          const partToPrepare = request.parts[index];
          const requestedPartName = partToPrepare?.partName || '';
          
          const updatedSpareParts = wo.spareParts.map((part) => {
            const normalizedPartNumber = String(part.partNumber).trim();
            
            // Try multiple matching strategies
            const isMatch = 
              normalizedPartNumber === normalizedPartCode || // Exact match
              part.partNumber === partCode || // Original match
              normalizedPartNumber.toLowerCase() === normalizedPartCode.toLowerCase() || // Case insensitive
              (requestedPartName && part.name === requestedPartName); // Match by name as fallback
            
            if (isMatch) {
              console.log('✅ MATCH FOUND! Updating part:', part.partNumber, 'to PREPARED');
              matchFound = true;
              return { ...part, status: 'prepared', requested: true };
            }
            return part;
          });
          
          if (!matchFound) {
            console.error('❌ NO MATCH! partCode not found in spare parts list');
            console.log('Available partNumbers:', wo.spareParts.map((p) => p.partNumber));
            console.log('Searching for:', partCode);
            console.log('Searching for name:', requestedPartName);
            console.log('Type check:', {
              partCode,
              partCodeType: typeof partCode,
              availableTypes: wo.spareParts.map((p) => ({ num: p.partNumber, type: typeof p.partNumber }))
            });
            
            // Try to find close matches by partNumber OR name
            const closeMatches = wo.spareParts.filter((p) => 
              String(p.partNumber).toLowerCase().includes(String(partCode).toLowerCase()) ||
              String(partCode).toLowerCase().includes(String(p.partNumber).toLowerCase()) ||
              (requestedPartName && String(p.name).toLowerCase().includes(requestedPartName.toLowerCase()))
            );
            
            if (closeMatches.length > 0) {
              console.log('🔍 Close matches found:', closeMatches.map((p) => ({ partNumber: p.partNumber, name: p.name })));
              
              // AUTO-FIX: If there's exactly one close match, use it
              if (closeMatches.length === 1) {
                console.log('🔧 AUTO-FIX: Using close match automatically');
                const autoMatch = closeMatches[0];
                const autoFixedSpareParts = wo.spareParts.map((part) => {
                  if (part.partNumber === autoMatch.partNumber) {
                    return { ...part, status: 'prepared', requested: true };
                  }
                  return part;
                });
                matchFound = true;
                return { ...wo, spareParts: autoFixedSpareParts };
              }
              
              alert(`⚠️ Part tidak ditemukan persis, tapi ada yang mirip!\n\nMencari: ${partCode} (${requestedPartName})\nMirip dengan: ${closeMatches.map((p) => `${p.partNumber} - ${p.name}`).join(', ')}\n\n💡 Data sudah di-update otomatis jika hanya 1 match ditemukan.`);
            } else {
              alert(`❌ Part tidak ditemukan!\n\nMencari: ${partCode} (${requestedPartName})\nYang tersedia: ${wo.spareParts.map((p) => `${p.partNumber} - ${p.name}`).join(', ')}\n\n💡 Pastikan part number di Repair Orders sama dengan yang di request.`);
            }
          }
          
          const syncPreparedPartsToSpareParts = (currentParts, preparedParts) => {
            if (!updatedRequest || updatedRequest.status !== 'READY') {
              return currentParts;
            }

            const normalizedParts = Array.isArray(currentParts) ? [...currentParts] : [];

            preparedParts.forEach((preparedPart, preparedIndex) => {
              if (!preparedPart || preparedPart.status !== 'PREPARED') return;

              const normalizedCode = String(preparedPart.partCode || '').trim().toLowerCase();
              const normalizedName = String(preparedPart.partName || '').trim().toLowerCase();

              const existingIndex = normalizedParts.findIndex((part) => {
                const partCode = String(part.partNumber || '').trim().toLowerCase();
                const partName = String(part.name || '').trim().toLowerCase();
                return (normalizedCode && partCode === normalizedCode) || (normalizedName && partName === normalizedName);
              });

              const matchedMasterPart = masterParts.find((mp) => String(mp.partNumber || '').trim().toLowerCase() === normalizedCode);
              const basePart = existingIndex !== -1 ? normalizedParts[existingIndex] : null;
              const unitPrice = matchedMasterPart?.unitPrice ?? basePart?.unitPrice ?? 0;
              const quantity = preparedPart.requestedQty || basePart?.quantity || 0;

              const updatedPart = {
                id: basePart?.id || `PART-${Date.now()}-${preparedIndex}`,
                name: preparedPart.partName || basePart?.name || preparedPart.partCode,
                partNumber: preparedPart.partCode,
                quantity,
                unitPrice,
                discount: basePart?.discount || 0,
                discountType: basePart?.discountType || 'percent',
                totalPrice: Math.max(0, quantity * unitPrice),
                requested: true,
                status: 'prepared'
              };

              if (existingIndex !== -1) {
                normalizedParts[existingIndex] = { ...basePart, ...updatedPart };
              } else {
                normalizedParts.push(updatedPart);
              }
            });

            return normalizedParts;
          };

          const syncedSpareParts = syncPreparedPartsToSpareParts(
            updatedSpareParts,
            Array.isArray(updatedRequest?.parts) ? updatedRequest.parts : []
          );

          const requestedParts = syncedSpareParts.filter((p) => p.requested);
          const allPartsPrepared = requestedParts.length > 0 && requestedParts.every((p) => p.status === 'prepared');

          // Auto-update repair status to 'parts-prepared' if all parts are ready
          let newRepairStatus = wo.repairStatus;
          if (allPartsPrepared && wo.repairStatus === 'waiting-parts') {
            newRepairStatus = 'parts-prepared';
            console.log('✅ All parts prepared! Auto-updating work order status to: parts-prepared');
          }

          return { ...wo, spareParts: syncedSpareParts, repairStatus: newRepairStatus };
        }
        return wo;
      });
      persistWorkOrders(updatedWorkOrders);

      console.log('💾 WorkOrders updated and saved');
    }

    // Update selected request if viewing details
    if (selectedRequest && selectedRequest.orderId === orderId) {
      const updated = updatedRequests.find(r => r.orderId === orderId);
      if (updated) {
        setSelectedRequest(updated);
      }
    }

    if (updatedRequest) {
      await syncRequestToFrappe(updatedRequest);
    }
  };

  const handleOrder = async (orderId, partCode, index) => {
    const updatedRequests = requests.map(req => {
      if (req.orderId === orderId) {
        const updatedParts = req.parts.map((part, i) => {
          if (i === index) {
            return { ...part, status: 'ON_ORDER' };
          }
          return part;
        });

        const somePrepared = updatedParts.some(p => p.status === 'PREPARED');

        return {
          ...req,
          parts: updatedParts,
          status: somePrepared ? 'PARTIAL' : 'PENDING'
        };
      }
      return req;
    });
    saveRequests(updatedRequests);

    // Update selected request if in detail view
    const updated = updatedRequests.find(r => r.orderId === orderId);
    if (selectedRequest && selectedRequest.orderId === orderId && updated) {
      setSelectedRequest(updated);
    }

    if (updated) {
      await syncRequestToFrappe(updated);
    }
  };

  const handleReject = async (orderId, partCode, index) => {
    if (!confirm('⚠️ Apakah Anda yakin ingin REJECT part ini?\n\nPart akan ditandai sebagai REJECTED.')) {
      return;
    }

    const updatedRequests = requests.map(req => {
      if (req.orderId === orderId) {
        const updatedParts = req.parts.map((part, i) => {
          if (i === index) {
            return { ...part, status: 'REJECTED' };
          }
          return part;
        });

        const allPrepared = updatedParts.every(p => p.status === 'PREPARED');
        const somePrepared = updatedParts.some(p => p.status === 'PREPARED');
        const anyPending = updatedParts.some(p => p.status === 'REQUESTED' || p.status === 'ON_ORDER');
        const anyRejected = updatedParts.some(p => p.status === 'REJECTED');

        let requestStatus = 'PENDING';
        if (allPrepared) {
          requestStatus = 'READY';
        } else if (somePrepared) {
          requestStatus = 'PARTIAL';
        } else if (!anyPending && anyRejected) {
          requestStatus = 'COMPLETED';
        }

        return {
          ...req,
          parts: updatedParts,
          status: requestStatus
        };
      }
      return req;
    });

    saveRequests(updatedRequests);

    const updatedRequest = updatedRequests.find(r => r.orderId === orderId);

    // Update workOrders to mark part as REJECTED
    const workOrders = getStoredWorkOrders();
    if (workOrders.length > 0) {
      const updatedWorkOrders = workOrders.map((wo) => {
        if (wo.orderId === orderId && wo.spareParts) {
          const updatedSpareParts = wo.spareParts.map((part) => {
            if (part.partNumber === partCode) {
              return { ...part, status: 'rejected', requested: true };
            }
            return part;
          });
          return { ...wo, spareParts: updatedSpareParts };
        }
        return wo;
      });
      persistWorkOrders(updatedWorkOrders);
    }

    if (selectedRequest && selectedRequest.orderId === orderId && updatedRequest) {
      setSelectedRequest(updatedRequest);
      if (updatedRequest.status === 'COMPLETED') {
        alert('✅ Semua parts telah di-reject. Request ditutup.');
        handleBackToList();
      }
    }

    if (updatedRequest) {
      await syncRequestToFrappe(updatedRequest);
    }
  };

  const handleGenerateDelivery = (request) => {
    const preparedParts = request.parts.filter(p => p.status === 'PREPARED');
    if (preparedParts.length === 0) {
      alert('Tidak ada parts yang sudah PREPARED!');
      return;
    }

    setSelectedRequest(request);
    setShowDeliveryModal(true);
  };

  const handleDeliveryConfirm = (mechanicSignature, mechanicName) => {
    if (selectedRequest) {
      const deliveryId = `${selectedRequest.branch.substring(0, 3).toUpperCase()}-DEL-${Date.now().toString().slice(-6)}`;
      
      const updatedRequests = requests.map(req => {
        if (req.orderId === selectedRequest.orderId) {
          return {
            ...req,
            status: 'COMPLETED',
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

  const handleViewDelivery = (request) => {
    setSelectedRequest(request);
    setShowDeliveryModal(true);
  };

  const handleSelectRequest = (request) => {
    setSelectedRequest(request);
    setDetailView(true);
  };

  const handleBackToList = () => {
    setDetailView(false);
    setSelectedRequest(null);
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { 
        bg: 'bg-gradient-to-r from-slate-500 to-slate-600', 
        text: 'text-white', 
        border: 'border-slate-700', 
        icon: Clock, 
        label: 'Pending',
        shadow: 'shadow-md'
      },
      PARTIAL: { 
        bg: 'bg-gradient-to-r from-amber-500 to-orange-500', 
        text: 'text-white', 
        border: 'border-amber-600', 
        icon: AlertCircle, 
        label: 'Partial',
        shadow: 'shadow-md'
      },
      READY: { 
        bg: 'bg-gradient-to-r from-blue-500 to-indigo-500', 
        text: 'text-white', 
        border: 'border-blue-600', 
        icon: Package, 
        label: 'Ready',
        shadow: 'shadow-md'
      },
      COMPLETED: { 
        bg: 'bg-gradient-to-r from-emerald-500 to-teal-500', 
        text: 'text-white', 
        border: 'border-emerald-600', 
        icon: CheckCircle, 
        label: 'Completed',
        shadow: 'shadow-md'
      }
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span className={`px-3 py-1.5 ${badge.bg} ${badge.text} border-2 ${badge.border} rounded-full flex items-center gap-2 text-sm ${badge.shadow}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const getPartStatusBadge = (status) => {
    const badges = {
      REQUESTED: { 
        bg: 'bg-gradient-to-r from-slate-400 to-slate-500', 
        text: 'text-white', 
        label: '📋 Requested',
        shadow: 'shadow-sm'
      },
      PREPARED: {
        bg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
        text: 'text-white',
        label: '✅ Prepared',
        shadow: 'shadow-sm'
      },
      ON_ORDER: {
        bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
        text: 'text-white',
        label: '🚚 On Order',
        shadow: 'shadow-sm'
      },
      REJECTED: {
        bg: 'bg-gradient-to-r from-red-500 to-rose-500',
        text: 'text-white',
        label: '⛔ Rejected',
        shadow: 'shadow-sm'
      }
    };
    const badge = badges[status];
    return (
      <span className={`px-2 py-1 ${badge.bg} ${badge.text} rounded-md text-xs ${badge.shadow} border border-white/20`}>
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
                      <tr key={`${part.partCode}-${index}`} className="border-t border-slate-200">
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
                                  onClick={() => handlePrepare(selectedRequest.orderId, part.partCode, index)}
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Prepare
                                </Button>
                              )}
                              {part.status === 'REQUESTED' && part.stockAvailable === 0 && (
                                <Button
                                  onClick={() => handleOrder(selectedRequest.orderId, part.partCode, index)}
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
                                  onClick={() => handleReject(selectedRequest.orderId, part.partCode, index)}
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
            <Button
              variant="outline"
              onClick={() => {
                const wo = getStoredWorkOrders();
                const pr = localStorage.getItem('sparePartsRequests');
                console.log('=== DEBUG DATA ===');
                console.log('Work Orders:', wo);
                console.log('Parts Requests:', JSON.parse(pr || '[]'));
                alert('Check browser console (F12) for data dump');
              }}
            className="text-xs"
          >
            🔍 Debug Data
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg p-3 border-2 border-slate-700 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Pending</p>
                <p className="text-white text-2xl">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg p-3 border-2 border-amber-600 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm">Partial</p>
                <p className="text-white text-2xl">{stats.partial}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg p-3 border-2 border-blue-600 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm">Ready</p>
                <p className="text-white text-2xl">{stats.ready}</p>
              </div>
              <Package className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg p-3 border-2 border-emerald-600 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm">Completed</p>
                <p className="text-white text-2xl">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-white/60" />
            </div>
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
            filteredRequests.map((request, index) => (
              <div 
                key={`${request.orderId}-${index}`}
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