'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, Eye, Wrench, ChevronRight, X, Save, Trash2, Package, Search, Send, CheckCircle, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { SPKDocument } from './SPKDocument';

interface WorkOrder {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  email?: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: string;
  plateNumber: string;
  vehicleType?: string;
  kilometer?: string;
  chassisNumber?: string;
  engineNumber?: string;
  fuel?: string;
  assemblyType?: string;
  serviceType: string;
  customerComplaint?: string;
  diagnosis: string;
  estimatedRepairTime: string;
  recommendedParts: string;
  status: string;
  repairStatus: string;
  date: string;
  branch: string;
  spareParts?: SparePart[];
  partOrderSent?: boolean;
  mechanicName?: string;
}

interface SparePart {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'percent' | 'amount';
  totalPrice: number;
  requested?: boolean;
  status?: 'requested' | 'prepared' | 'rejected';
}

interface MasterSparePart {
  id: string;
  partName: string;
  partNumber: string;
  compatibleModels: string[];
  category: string;
  unitPrice: number;
  stock: number;
  minStock: number;
}

export function ServiceOrders() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [newPart, setNewPart] = useState({
    name: '',
    partNumber: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    discountType: 'percent' as 'percent' | 'amount'
  });
  const [masterSpareParts, setMasterSpareParts] = useState<MasterSparePart[]>([]);
  const [filteredParts, setFilteredParts] = useState<MasterSparePart[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [partOrderSent, setPartOrderSent] = useState(false);
  const [mechanicName, setMechanicName] = useState<string>('');
  
  // List of available mechanics
  const availableMechanics = [
    'Ahmad Syahrul',
    'Budi Santoso',
    'Deni Pratama',
    'Eko Wijaya',
    'Fajar Ramadhan',
    'Gunawan Prakoso',
    'Hendra Kusuma',
    'Irfan Hakim'
  ];

  useEffect(() => {
    loadWorkOrders();
    loadMasterSpareParts();
  }, []);

  const loadWorkOrders = () => {
    const savedWorkOrders = localStorage.getItem('workOrders');
    if (savedWorkOrders) {
      setWorkOrders(JSON.parse(savedWorkOrders));
    }
  };

  const loadMasterSpareParts = () => {
    const savedParts = localStorage.getItem('masterSpareParts');
    if (savedParts) {
      setMasterSpareParts(JSON.parse(savedParts));
    } else {
      // Initialize with default parts if not exists
      const defaultParts: MasterSparePart[] = [
        // Toyota Avanza Parts
        { id: '1', partName: 'Brake Pad Front', partNumber: 'BP-TOY-AVZ-001', compatibleModels: ['Avanza'], category: 'Brake System', unitPrice: 450000, stock: 25, minStock: 10 },
        { id: '2', partName: 'Brake Pad Rear', partNumber: 'BP-TOY-AVZ-002', compatibleModels: ['Avanza'], category: 'Brake System', unitPrice: 350000, stock: 20, minStock: 10 },
        { id: '3', partName: 'Oil Filter', partNumber: 'OF-TOY-AVZ-001', compatibleModels: ['Avanza'], category: 'Engine', unitPrice: 85000, stock: 50, minStock: 20 },
        { id: '4', partName: 'Air Filter', partNumber: 'AF-TOY-AVZ-001', compatibleModels: ['Avanza'], category: 'Engine', unitPrice: 125000, stock: 35, minStock: 15 },
        { id: '5', partName: 'Spark Plug', partNumber: 'SP-TOY-AVZ-001', compatibleModels: ['Avanza'], category: 'Engine', unitPrice: 95000, stock: 60, minStock: 30 },
        { id: '6', partName: 'Engine Oil 5W-30', partNumber: 'EO-TOY-AVZ-001', compatibleModels: ['Avanza'], category: 'Engine', unitPrice: 180000, stock: 40, minStock: 20 },
        { id: '7', partName: 'Wiper Blade Front', partNumber: 'WB-TOY-AVZ-001', compatibleModels: ['Avanza'], category: 'Accessories', unitPrice: 145000, stock: 30, minStock: 15 },
        { id: '8', partName: 'Battery 12V', partNumber: 'BT-TOY-AVZ-001', compatibleModels: ['Avanza'], category: 'Electrical', unitPrice: 850000, stock: 15, minStock: 5 },
        { id: '9', partName: 'Alternator Belt', partNumber: 'AB-TOY-AVZ-001', compatibleModels: ['Avanza'], category: 'Engine', unitPrice: 175000, stock: 25, minStock: 10 },
        { id: '10', partName: 'Timing Belt', partNumber: 'TB-TOY-AVZ-001', compatibleModels: ['Avanza'], category: 'Engine', unitPrice: 385000, stock: 18, minStock: 8 },
        
        // Honda Jazz Parts
        { id: '11', partName: 'Brake Pad Front', partNumber: 'BP-HON-JAZ-001', compatibleModels: ['Jazz'], category: 'Brake System', unitPrice: 520000, stock: 22, minStock: 10 },
        { id: '12', partName: 'Brake Pad Rear', partNumber: 'BP-HON-JAZ-002', compatibleModels: ['Jazz'], category: 'Brake System', unitPrice: 380000, stock: 18, minStock: 10 },
        { id: '13', partName: 'Oil Filter', partNumber: 'OF-HON-JAZ-001', compatibleModels: ['Jazz'], category: 'Engine', unitPrice: 95000, stock: 45, minStock: 20 },
        { id: '14', partName: 'Air Filter', partNumber: 'AF-HON-JAZ-001', compatibleModels: ['Jazz'], category: 'Engine', unitPrice: 145000, stock: 32, minStock: 15 },
        { id: '15', partName: 'Spark Plug', partNumber: 'SP-HON-JAZ-001', compatibleModels: ['Jazz'], category: 'Engine', unitPrice: 115000, stock: 55, minStock: 30 },
        { id: '16', partName: 'Engine Oil 0W-20', partNumber: 'EO-HON-JAZ-001', compatibleModels: ['Jazz'], category: 'Engine', unitPrice: 220000, stock: 38, minStock: 20 },
        { id: '17', partName: 'Wiper Blade Front', partNumber: 'WB-HON-JAZ-001', compatibleModels: ['Jazz'], category: 'Accessories', unitPrice: 165000, stock: 28, minStock: 15 },
        { id: '18', partName: 'Battery 12V', partNumber: 'BT-HON-JAZ-001', compatibleModels: ['Jazz'], category: 'Electrical', unitPrice: 920000, stock: 12, minStock: 5 },
        { id: '19', partName: 'CVT Fluid', partNumber: 'CF-HON-JAZ-001', compatibleModels: ['Jazz'], category: 'Transmission', unitPrice: 385000, stock: 20, minStock: 10 },
        { id: '20', partName: 'Cabin Air Filter', partNumber: 'CA-HON-JAZ-001', compatibleModels: ['Jazz'], category: 'Accessories', unitPrice: 195000, stock: 25, minStock: 12 },

        // Mitsubishi Xpander Parts
        { id: '21', partName: 'Brake Pad Front', partNumber: 'BP-MIT-XPD-001', compatibleModels: ['Xpander'], category: 'Brake System', unitPrice: 480000, stock: 24, minStock: 10 },
        { id: '22', partName: 'Brake Pad Rear', partNumber: 'BP-MIT-XPD-002', compatibleModels: ['Xpander'], category: 'Brake System', unitPrice: 360000, stock: 19, minStock: 10 },
        { id: '23', partName: 'Oil Filter', partNumber: 'OF-MIT-XPD-001', compatibleModels: ['Xpander'], category: 'Engine', unitPrice: 90000, stock: 48, minStock: 20 },
        { id: '24', partName: 'Air Filter', partNumber: 'AF-MIT-XPD-001', compatibleModels: ['Xpander'], category: 'Engine', unitPrice: 135000, stock: 33, minStock: 15 },
        { id: '25', partName: 'Spark Plug', partNumber: 'SP-MIT-XPD-001', compatibleModels: ['Xpander'], category: 'Engine', unitPrice: 105000, stock: 58, minStock: 30 },
        { id: '26', partName: 'Engine Oil 5W-30', partNumber: 'EO-MIT-XPD-001', compatibleModels: ['Xpander'], category: 'Engine', unitPrice: 195000, stock: 42, minStock: 20 },
        { id: '27', partName: 'Wiper Blade Front', partNumber: 'WB-MIT-XPD-001', compatibleModels: ['Xpander'], category: 'Accessories', unitPrice: 155000, stock: 29, minStock: 15 },
        { id: '28', partName: 'Battery 12V', partNumber: 'BT-MIT-XPD-001', compatibleModels: ['Xpander'], category: 'Electrical', unitPrice: 880000, stock: 14, minStock: 5 },
        { id: '29', partName: 'Drive Belt', partNumber: 'DB-MIT-XPD-001', compatibleModels: ['Xpander'], category: 'Engine', unitPrice: 185000, stock: 26, minStock: 10 },
        { id: '30', partName: 'Radiator Coolant', partNumber: 'RC-MIT-XPD-001', compatibleModels: ['Xpander'], category: 'Engine', unitPrice: 165000, stock: 35, minStock: 15 },

        // Honda CR-V Parts
        { id: '31', partName: 'Brake Pad Front', partNumber: 'BP-HON-CRV-001', compatibleModels: ['CR-V'], category: 'Brake System', unitPrice: 650000, stock: 18, minStock: 8 },
        { id: '32', partName: 'Brake Pad Rear', partNumber: 'BP-HON-CRV-002', compatibleModels: ['CR-V'], category: 'Brake System', unitPrice: 480000, stock: 15, minStock: 8 },
        { id: '33', partName: 'Oil Filter', partNumber: 'OF-HON-CRV-001', compatibleModels: ['CR-V'], category: 'Engine', unitPrice: 110000, stock: 40, minStock: 20 },
        { id: '34', partName: 'Air Filter', partNumber: 'AF-HON-CRV-001', compatibleModels: ['CR-V'], category: 'Engine', unitPrice: 175000, stock: 28, minStock: 15 },
        { id: '35', partName: 'Spark Plug', partNumber: 'SP-HON-CRV-001', compatibleModels: ['CR-V'], category: 'Engine', unitPrice: 135000, stock: 50, minStock: 25 },
        { id: '36', partName: 'Engine Oil 0W-20', partNumber: 'EO-HON-CRV-001', compatibleModels: ['CR-V'], category: 'Engine', unitPrice: 250000, stock: 35, minStock: 18 },
        { id: '37', partName: 'Wiper Blade Front', partNumber: 'WB-HON-CRV-001', compatibleModels: ['CR-V'], category: 'Accessories', unitPrice: 185000, stock: 24, minStock: 12 },
        { id: '38', partName: 'Battery 12V', partNumber: 'BT-HON-CRV-001', compatibleModels: ['CR-V'], category: 'Electrical', unitPrice: 1050000, stock: 10, minStock: 5 },
        { id: '39', partName: 'Cabin Air Filter', partNumber: 'CA-HON-CRV-001', compatibleModels: ['CR-V'], category: 'Accessories', unitPrice: 225000, stock: 22, minStock: 10 },
        { id: '40', partName: 'Transmission Oil', partNumber: 'TO-HON-CRV-001', compatibleModels: ['CR-V'], category: 'Transmission', unitPrice: 420000, stock: 18, minStock: 10 },

        // Toyota Fortuner Parts
        { id: '41', partName: 'Brake Pad Front', partNumber: 'BP-TOY-FOR-001', compatibleModels: ['Fortuner'], category: 'Brake System', unitPrice: 720000, stock: 16, minStock: 8 },
        { id: '42', partName: 'Brake Pad Rear', partNumber: 'BP-TOY-FOR-002', compatibleModels: ['Fortuner'], category: 'Brake System', unitPrice: 550000, stock: 14, minStock: 8 },
        { id: '43', partName: 'Oil Filter', partNumber: 'OF-TOY-FOR-001', compatibleModels: ['Fortuner'], category: 'Engine', unitPrice: 125000, stock: 38, minStock: 18 },
        { id: '44', partName: 'Air Filter', partNumber: 'AF-TOY-FOR-001', compatibleModels: ['Fortuner'], category: 'Engine', unitPrice: 195000, stock: 26, minStock: 12 },
        { id: '45', partName: 'Spark Plug', partNumber: 'SP-TOY-FOR-001', compatibleModels: ['Fortuner'], category: 'Engine', unitPrice: 145000, stock: 45, minStock: 22 },
        { id: '46', partName: 'Engine Oil 5W-30', partNumber: 'EO-TOY-FOR-001', compatibleModels: ['Fortuner'], category: 'Engine', unitPrice: 285000, stock: 32, minStock: 16 },
        { id: '47', partName: 'Wiper Blade Front', partNumber: 'WB-TOY-FOR-001', compatibleModels: ['Fortuner'], category: 'Accessories', unitPrice: 205000, stock: 20, minStock: 10 },
        { id: '48', partName: 'Battery 12V', partNumber: 'BT-TOY-FOR-001', compatibleModels: ['Fortuner'], category: 'Electrical', unitPrice: 1250000, stock: 8, minStock: 4 },
        { id: '49', partName: 'Fuel Filter', partNumber: 'FF-TOY-FOR-001', compatibleModels: ['Fortuner'], category: 'Engine', unitPrice: 285000, stock: 22, minStock: 10 },
        { id: '50', partName: 'Differential Oil', partNumber: 'DO-TOY-FOR-001', compatibleModels: ['Fortuner'], category: 'Transmission', unitPrice: 385000, stock: 16, minStock: 8 },

        // Toyota Innova Parts
        { id: '51', partName: 'Brake Pad Front', partNumber: 'BP-TOY-INN-001', compatibleModels: ['Innova'], category: 'Brake System', unitPrice: 520000, stock: 20, minStock: 10 },
        { id: '52', partName: 'Brake Pad Rear', partNumber: 'BP-TOY-INN-002', compatibleModels: ['Innova'], category: 'Brake System', unitPrice: 420000, stock: 18, minStock: 10 },
        { id: '53', partName: 'Oil Filter', partNumber: 'OF-TOY-INN-001', compatibleModels: ['Innova'], category: 'Engine', unitPrice: 95000, stock: 42, minStock: 20 },
        { id: '54', partName: 'Air Filter', partNumber: 'AF-TOY-INN-001', compatibleModels: ['Innova'], category: 'Engine', unitPrice: 155000, stock: 30, minStock: 15 },
        { id: '55', partName: 'Spark Plug', partNumber: 'SP-TOY-INN-001', compatibleModels: ['Innova'], category: 'Engine', unitPrice: 110000, stock: 52, minStock: 28 },
      ];
      
      setMasterSpareParts(defaultParts);
      localStorage.setItem('masterSpareParts', JSON.stringify(defaultParts));
    }
  };

  // Reload data when component becomes visible
  useEffect(() => {
    const handleStorageChange = () => {
      loadWorkOrders();
      loadMasterSpareParts();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  // Filter parts based on vehicle model and part name input
  useEffect(() => {
    if (selectedWorkOrder && newPart.name && masterSpareParts.length > 0) {
      const vehicleModel = selectedWorkOrder.vehicleModel;
      const searchTerm = newPart.name.toLowerCase();
      
      const filtered = masterSpareParts.filter(part => 
        part.compatibleModels.includes(vehicleModel) &&
        part.partName.toLowerCase().includes(searchTerm)
      );
      
      setFilteredParts(filtered);
      setShowSuggestions(filtered.length > 0 && newPart.name.length > 0);
    } else {
      setFilteredParts([]);
      setShowSuggestions(false);
    }
  }, [newPart.name, selectedWorkOrder, masterSpareParts]);

  const handleSelectWorkOrder = (order: WorkOrder) => {
    setSelectedWorkOrder(order);
    setSpareParts(order.spareParts || []);
    setMechanicName(order.mechanicName || ''); // Load existing mechanic assignment
  };

  const handleMechanicChange = (newMechanic: string) => {
    setMechanicName(newMechanic);
    
    // Auto-save to localStorage
    if (selectedWorkOrder) {
      const updatedWorkOrders = workOrders.map(wo => {
        if (wo.id === selectedWorkOrder.id) {
          return { ...wo, mechanicName: newMechanic };
        }
        return wo;
      });
      
      localStorage.setItem('workOrders', JSON.stringify(updatedWorkOrders));
      setWorkOrders(updatedWorkOrders);
      setSelectedWorkOrder({ ...selectedWorkOrder, mechanicName: newMechanic });
    }
  };

  const handleBackToList = () => {
    setSelectedWorkOrder(null);
    setSpareParts([]);
    setNewPart({ name: '', partNumber: '', quantity: 1, unitPrice: 0, discount: 0, discountType: 'percent' });
    setShowSuggestions(false);
  };

  const handleSelectSuggestedPart = (part: MasterSparePart) => {
    // Langsung add part tanpa perlu klik tombol +
    const subtotal = 1 * part.unitPrice; // quantity default = 1
    let finalPrice = subtotal;
    
    const newSparePart: SparePart = {
      id: `PART-${Date.now()}`,
      name: part.partName,
      partNumber: part.partNumber,
      quantity: 1,
      unitPrice: part.unitPrice,
      discount: 0,
      discountType: 'percent',
      totalPrice: finalPrice
    };
    
    setSpareParts([...spareParts, newSparePart]);
    setNewPart({ name: '', partNumber: '', quantity: 1, unitPrice: 0, discount: 0, discountType: 'percent' });
    setShowSuggestions(false);
  };

  const handleAddPart = () => {
    if (newPart.name && newPart.partNumber && newPart.quantity > 0 && newPart.unitPrice > 0) {
      const subtotal = newPart.quantity * newPart.unitPrice;
      let finalPrice = subtotal;
      
      // Calculate discount
      if (newPart.discount > 0) {
        if (newPart.discountType === 'percent') {
          finalPrice = subtotal - (subtotal * newPart.discount / 100);
        } else {
          finalPrice = subtotal - newPart.discount;
        }
      }
      
      const part: SparePart = {
        id: `PART-${Date.now()}`,
        name: newPart.name,
        partNumber: newPart.partNumber,
        quantity: newPart.quantity,
        unitPrice: newPart.unitPrice,
        discount: newPart.discount,
        discountType: newPart.discountType,
        totalPrice: finalPrice
      };
      
      setSpareParts([...spareParts, part]);
      setNewPart({ name: '', partNumber: '', quantity: 1, unitPrice: 0, discount: 0, discountType: 'percent' });
      setShowSuggestions(false);
    }
  };

  const handleUpdatePartDiscount = (partId: string, discount: number, discountType: 'percent' | 'amount') => {
    setSpareParts(spareParts.map(part => {
      if (part.id === partId) {
        const subtotal = part.quantity * part.unitPrice;
        let finalPrice = subtotal;
        
        if (discount > 0) {
          if (discountType === 'percent') {
            finalPrice = subtotal - (subtotal * discount / 100);
          } else {
            finalPrice = subtotal - discount;
          }
        }
        
        return { ...part, discount, discountType, totalPrice: finalPrice };
      }
      return part;
    }));
  };

  const handleRemovePart = (partId: string) => {
    const partToRemove = spareParts.find(p => p.id === partId);
    // Bisa remove part yang rejected atau belum di-request
    if (partToRemove && (partToRemove.status === 'rejected' || !partToRemove.requested)) {
      setSpareParts(spareParts.filter(p => p.id !== partId));
    } else if (partToRemove && partToRemove.status === 'requested') {
      alert('❌ Part yang sudah di-request tidak bisa dihapus!\n\n💡 Part hanya bisa dihapus jika di-REJECT oleh petugas Spare Parts.');
    }
  };

  const handleSendOrderPart = () => {
    if (selectedWorkOrder) {
      // Filter hanya parts yang belum requested
      const partsToSend = spareParts.filter(p => !p.requested);
      
      if (partsToSend.length === 0) {
        alert('⚠️ Tidak ada parts baru untuk dikirim!\n\nSemua parts sudah di-request sebelumnya.');
        return;
      }
      
      // Mark parts as requested
      const updatedSpareParts = spareParts.map(part => {
        if (!part.requested) {
          return { ...part, requested: true, status: 'requested' as const };
        }
        return part;
      });
      
      setSpareParts(updatedSpareParts);
      
      // Save to work order
      const updatedWorkOrders = workOrders.map(wo => {
        if (wo.id === selectedWorkOrder.id) {
          return { ...wo, spareParts: updatedSpareParts };
        }
        return wo;
      });
      
      localStorage.setItem('workOrders', JSON.stringify(updatedWorkOrders));
      setWorkOrders(updatedWorkOrders);
      
      // Send to Spare Parts Request queue
      const currentTime = new Date();
      const partsRequest = {
        orderId: selectedWorkOrder.orderId,
        customerName: selectedWorkOrder.customerName,
        vehicleBrand: selectedWorkOrder.vehicleBrand,
        vehicleModel: selectedWorkOrder.vehicleModel,
        plateNumber: selectedWorkOrder.plateNumber,
        requestDate: currentTime.toISOString().split('T')[0],
        requestTime: currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        status: 'PENDING',
        branch: selectedWorkOrder.branch,
        mechanicName: selectedWorkOrder.mechanicName || '', // Include mechanic name
        parts: partsToSend.map(part => {
          // Find stock from master spareparts
          const masterPart = masterSpareParts.find(mp => mp.partNumber === part.partNumber);
          return {
            partCode: part.partNumber,
            partName: part.name,
            requestedQty: part.quantity,
            stockAvailable: masterPart?.stock || 0,
            unit: 'pcs',
            location: masterPart ? `Rack ${String.fromCharCode(65 + Math.floor(Math.random() * 3))}-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}` : '-',
            status: 'REQUESTED'
          };
        })
      };
      
      // Save to localStorage for Spare Parts Request page
      const existingRequests = localStorage.getItem('sparePartsRequests');
      const requests = existingRequests ? JSON.parse(existingRequests) : [];
      requests.push(partsRequest);
      localStorage.setItem('sparePartsRequests', JSON.stringify(requests));
      
      alert(`✅ Order Part berhasil dikirim!\n\n📦 ${partsToSend.length} parts BARU telah dikirim ke Spare Parts Request.\n\nOrder ID: ${selectedWorkOrder.orderId}\nTotal Qty: ${partsToSend.reduce((sum, p) => sum + p.quantity, 0)} pcs\n\n💡 Parts yang sudah di-request akan ditandai dengan badge "REQUESTED".`);
    }
  };

  const handleSaveSpareParts = () => {
    if (selectedWorkOrder) {
      // Update work order with spare parts
      const updatedWorkOrders = workOrders.map(wo => {
        if (wo.id === selectedWorkOrder.id) {
          return { ...wo, spareParts: spareParts };
        }
        return wo;
      });
      
      localStorage.setItem('workOrders', JSON.stringify(updatedWorkOrders));
      setWorkOrders(updatedWorkOrders);
      
      alert('Spare parts saved successfully!');
      handleBackToList();
    }
  };

  const calculateTotalCost = () => {
    return spareParts.reduce((sum, part) => sum + part.totalPrice, 0);
  };

  const calculateDPP = () => {
    const total = calculateTotalCost();
    return total / 1.11; // DPP = Total / 1.11 (jika PPN 11%)
  };

  const calculatePPN = () => {
    const dpp = calculateDPP();
    return dpp * 0.11; // PPN 11%
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusInfo = (repairStatus: string) => {
    switch (repairStatus) {
      case 'waiting-parts':
        return {
          label: 'Waiting Parts',
          color: 'bg-amber-100 text-amber-700 border-amber-200'
        };
      case 'in-progress':
        return {
          label: 'In Progress',
          color: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      case 'completed':
        return {
          label: 'Completed',
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
        };
      case 'urgent':
        return {
          label: 'Urgent',
          color: 'bg-red-100 text-red-700 border-red-200'
        };
      default:
        return {
          label: 'Pending',
          color: 'bg-slate-100 text-slate-700 border-slate-200'
        };
    }
  };

  const filteredOrders = filterStatus === 'all' 
    ? workOrders 
    : workOrders.filter(order => {
        const statusInfo = getStatusInfo(order.repairStatus);
        return statusInfo.label.toLowerCase().includes(filterStatus.toLowerCase());
      });

  // Spare Parts Input View
  if (selectedWorkOrder) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleBackToList}>
                <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                Back to List
              </Button>
              <div>
                <h1 className="text-slate-800">Sparepart Order</h1>
                <p className="text-slate-600">Work Order: {selectedWorkOrder.id} - {selectedWorkOrder.vehicleBrand} {selectedWorkOrder.vehicleModel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {spareParts.some(p => p.requested) && (
                <div className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">{spareParts.filter(p => p.requested).length} parts requested</span>
                </div>
              )}
              <Button 
                onClick={handleSendOrderPart}
                disabled={spareParts.length === 0 || !spareParts.some(p => !p.requested)}
                className="bg-blue-500 hover:bg-blue-600 text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Order Part
              </Button>
              <Button 
                onClick={() => window.print()}
                className="bg-slate-700 hover:bg-slate-800 text-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                Print Dokumen SPK
              </Button>
            </div>
          </div>

          {/* Work Order Info - Horizontal Card at Top */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-0 z-10 shadow-sm">
            <h3 className="text-slate-800 mb-4">Work Order Info</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              <div>
                <p className="text-slate-600 text-xs mb-1">Work Order ID</p>
                <p className="text-slate-900">{selectedWorkOrder.id}</p>
              </div>
              <div>
                <p className="text-slate-600 text-xs mb-1">Order ID</p>
                <p className="text-slate-900">{selectedWorkOrder.orderId}</p>
              </div>
              <div>
                <p className="text-slate-600 text-xs mb-1">Customer</p>
                <p className="text-slate-900">{selectedWorkOrder.customerName}</p>
              </div>
              <div>
                <p className="text-slate-600 text-xs mb-1">Phone</p>
                <p className="text-slate-900">{selectedWorkOrder.phone}</p>
              </div>
              <div>
                <p className="text-slate-600 text-xs mb-1">Plate Number</p>
                <p className="text-slate-900">{selectedWorkOrder.plateNumber}</p>
              </div>
              <div>
                <p className="text-slate-600 text-xs mb-1">Status</p>
                <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusInfo(selectedWorkOrder.repairStatus).color}`}>
                  {getStatusInfo(selectedWorkOrder.repairStatus).label}
                </span>
              </div>
              <div>
                <p className="text-slate-600 text-xs mb-1">Mechanic</p>
                <select
                  value={mechanicName}
                  onChange={(e) => handleMechanicChange(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not Assigned</option>
                  {availableMechanics.map(mechanic => (
                    <option key={mechanic} value={mechanic}>{mechanic}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <p className="text-slate-600 text-xs mb-1">Diagnosis</p>
                <p className="text-slate-900 text-sm">{selectedWorkOrder.diagnosis}</p>
              </div>
              <div className="col-span-3">
                <p className="text-slate-600 text-xs mb-1">Recommended Parts</p>
                <p className="text-slate-900 text-sm">{selectedWorkOrder.recommendedParts}</p>
              </div>
            </div>
          </div>

          {/* Spare Parts Grid - Full Width */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-800">Spare Parts Grid</h3>
              <div className="text-sm text-slate-600">
                <Package className="w-4 h-4 inline mr-1" />
                Smart part finder enabled for {selectedWorkOrder.vehicleModel}
              </div>
            </div>
            
            <div className="max-h-[500px] overflow-y-auto overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-300 sticky top-0 z-20">
                  <tr>
                    <th className="text-left px-3 py-3 text-slate-700 w-8 bg-slate-50">#</th>
                    <th className="text-left px-3 py-3 text-slate-700 bg-slate-50" style={{ width: '22%' }}>Part Name</th>
                    <th className="text-left px-3 py-3 text-slate-700 bg-slate-50" style={{ width: '18%' }}>Part Number</th>
                    <th className="text-center px-3 py-3 text-slate-700 bg-slate-50" style={{ width: '8%' }}>Qty</th>
                    <th className="text-right px-3 py-3 text-slate-700 bg-slate-50" style={{ width: '12%' }}>Unit Price</th>
                    <th className="text-center px-3 py-3 text-slate-700 bg-slate-50" style={{ width: '12%' }}>Discount</th>
                    <th className="text-right px-3 py-3 text-slate-700 bg-slate-50" style={{ width: '12%' }}>Total</th>
                    <th className="text-center px-3 py-3 text-slate-700 w-16 bg-slate-50">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Input Row - Always at top */}
                  <tr className="bg-blue-50 border-b-2 border-blue-300">
                    <td className="px-3 py-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Type part name..."
                          value={newPart.name}
                          onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                          onFocus={() => newPart.name && setShowSuggestions(filteredParts.length > 0)}
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {/* Auto-suggestions dropdown */}
                        {showSuggestions && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                            {filteredParts.length === 0 ? (
                              <div className="p-3 text-slate-500 text-sm">
                                No matching parts for {selectedWorkOrder.vehicleModel}
                              </div>
                            ) : (
                              <>
                                <div className="p-2 bg-blue-50 border-b border-blue-200 sticky top-0">
                                  <p className="text-blue-700 text-xs">
                                    ✓ Compatible parts for {selectedWorkOrder.vehicleModel}
                                  </p>
                                </div>
                                {filteredParts.map((part, index) => (
                                  <div
                                    key={index}
                                    onClick={() => handleSelectSuggestedPart(part)}
                                    className="p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <p className="text-slate-900 text-sm">{part.partName}</p>
                                        <p className="text-slate-600 text-xs">{part.partNumber} • {part.category}</p>
                                      </div>
                                      <div className="text-right ml-2">
                                        <p className="text-blue-600 text-sm">{formatCurrency(part.unitPrice)}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="Auto-fill"
                        value={newPart.partNumber}
                        readOnly
                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-slate-100 text-slate-600"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        value={newPart.quantity}
                        onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) || 1 })}
                        className="w-full px-2 py-1.5 text-sm text-center border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="Auto-fill"
                        value={newPart.unitPrice ? formatCurrency(newPart.unitPrice) : ''}
                        readOnly
                        className="w-full px-2 py-1.5 text-sm text-right border border-slate-300 rounded bg-slate-100 text-slate-600"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={newPart.discount || ''}
                          onChange={(e) => setNewPart({ ...newPart, discount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 text-sm text-center border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setNewPart({ ...newPart, discountType: newPart.discountType === 'percent' ? 'amount' : 'percent' })}
                          className="px-2 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded border border-slate-300 transition-colors"
                        >
                          {newPart.discountType === 'percent' ? '%' : 'Rp'}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-right text-sm text-blue-700 py-1.5 px-2">
                        {formatCurrency((() => {
                          const subtotal = newPart.quantity * newPart.unitPrice;
                          if (newPart.discount > 0) {
                            if (newPart.discountType === 'percent') {
                              return subtotal - (subtotal * newPart.discount / 100);
                            } else {
                              return subtotal - newPart.discount;
                            }
                          }
                          return subtotal;
                        })())}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        size="sm"
                        onClick={handleAddPart}
                        className="bg-blue-500 hover:bg-blue-600 text-white h-8 px-3"
                        disabled={!newPart.name || !newPart.partNumber || !newPart.unitPrice}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>

                  {/* Existing Parts */}
                  {spareParts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-500">
                        <Package className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                        <p className="text-sm">No spare parts added yet</p>
                        <p className="text-xs mt-1">Use the input row above to add parts</p>
                      </td>
                    </tr>
                  ) : (
                    spareParts.map((part, index) => (
                      <tr key={part.id} className={`border-b border-slate-100 ${part.requested ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                        <td className="px-3 py-3 text-slate-600 text-sm">{index + 1}</td>
                        <td className="px-3 py-3 text-slate-900 text-sm">
                          <div className="flex items-center gap-2">
                            {part.name}
                            {part.status === 'requested' && (
                              <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 rounded">REQUESTED</span>
                            )}
                            {part.status === 'prepared' && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded">PREPARED</span>
                            )}
                            {part.status === 'rejected' && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 border border-red-200 rounded">REJECTED</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-700 text-sm">{part.partNumber}</td>
                        <td className="px-3 py-3 text-center text-slate-900 text-sm">{part.quantity}</td>
                        <td className="px-3 py-3 text-right text-slate-900 text-sm">{formatCurrency(part.unitPrice)}</td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <input
                              type="number"
                              min="0"
                              value={part.discount || ''}
                              onChange={(e) => handleUpdatePartDiscount(part.id, parseFloat(e.target.value) || 0, part.discountType)}
                              className="w-16 px-2 py-1 text-xs text-center border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdatePartDiscount(part.id, part.discount, part.discountType === 'percent' ? 'amount' : 'percent')}
                              className="px-1.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded border border-slate-300 transition-colors"
                            >
                              {part.discountType === 'percent' ? '%' : 'Rp'}
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-slate-900 text-sm">{formatCurrency(part.totalPrice)}</td>
                        <td className="px-3 py-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50 h-7 px-2"
                            onClick={() => handleRemovePart(part.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Summary Footer */}
                {spareParts.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-right text-slate-700">Subtotal (DPP):</td>
                      <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(calculateDPP())}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-right text-slate-700">PPN 11%:</td>
                      <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(calculatePPN())}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-gradient-to-r from-blue-500 to-blue-600 border-t-2 border-blue-700">
                      <td colSpan={6} className="px-3 py-4 text-right text-white text-xl">Total Cost:</td>
                      <td className="px-3 py-4 text-right text-white text-3xl">{formatCurrency(calculateTotalCost())}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Helper Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <div className="flex items-start gap-3">
                <Search className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-blue-900 text-sm mb-1">Smart Part Finder</h4>
                  <p className="text-blue-700 text-xs">Type part name to get auto-suggestions with correct part numbers and prices from master data.</p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-emerald-900 text-sm mb-1">Grid Input with Discount</h4>
                  <p className="text-emerald-700 text-xs">Input parts directly in the grid. Use discount column to apply percentage (%) or amount (Rp) discount per item.</p>
                </div>
              </div>
            </div>
          </div>

          {/* SPK Document - Hidden on screen, visible on print */}
          <div className="hidden print:block">
            <SPKDocument workOrder={selectedWorkOrder} spareParts={spareParts} />
          </div>
        </div>
      </div>
    );
  }

  // Main List View
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Repair Orders</h1>
            <p className="text-slate-600">Manage and track all repair orders from inspection</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <span className="text-blue-600">Total Orders: {workOrders.length}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats - Moved to Top */}
        {workOrders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm mb-1">Waiting Parts</p>
                  <p className="text-slate-900 text-2xl">
                    {workOrders.filter(o => o.repairStatus === 'waiting-parts').length}
                  </p>
                </div>
                <div className="bg-amber-100 rounded-lg p-3">
                  <Filter className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm mb-1">In Progress</p>
                  <p className="text-slate-900 text-2xl">
                    {workOrders.filter(o => o.repairStatus === 'in-progress').length}
                  </p>
                </div>
                <div className="bg-blue-100 rounded-lg p-3">
                  <Wrench className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm mb-1">Completed</p>
                  <p className="text-slate-900 text-2xl">
                    {workOrders.filter(o => o.repairStatus === 'completed').length}
                  </p>
                </div>
                <div className="bg-emerald-100 rounded-lg p-3">
                  <Eye className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm mb-1">Total Orders</p>
                  <p className="text-slate-900 text-2xl">{workOrders.length}</p>
                </div>
                <div className="bg-slate-100 rounded-lg p-3">
                  <Filter className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-600" />
              <span className="text-slate-700">Filter by Status:</span>
            </div>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => setFilterStatus('waiting')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'waiting'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Waiting Parts
            </button>
            <button
              onClick={() => setFilterStatus('in progress')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'in progress'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'completed'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilterStatus('urgent')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'urgent'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Urgent
            </button>
            <div className="ml-auto">
              <Button variant="outline" className="border-slate-300">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {workOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p>No repair orders yet</p>
              <p className="text-sm mt-1">Work orders from Vehicle Inspection will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-left text-slate-700">Work Order ID</th>
                    <th className="px-6 py-4 text-left text-slate-700">Order ID</th>
                    <th className="px-6 py-4 text-left text-slate-700">Customer</th>
                    <th className="px-6 py-4 text-left text-slate-700">Vehicle</th>
                    <th className="px-6 py-4 text-left text-slate-700">Service Type</th>
                    <th className="px-6 py-4 text-left text-slate-700">Branch</th>
                    <th className="px-6 py-4 text-left text-slate-700">Status</th>
                    <th className="px-6 py-4 text-left text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => {
                    const statusInfo = getStatusInfo(order.repairStatus);
                    return (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-blue-600">{order.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-900">{order.orderId}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-slate-900">{order.customerName}</p>
                            <p className="text-slate-500 text-sm">{order.plateNumber}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-700">{order.vehicleBrand} {order.vehicleModel}</p>
                          <p className="text-slate-500 text-sm">{order.vehicleYear}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-700">{order.serviceType}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block px-3 py-1 rounded-full text-sm bg-slate-100 text-slate-700">
                            {order.branch}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full border text-sm ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                              onClick={() => handleSelectWorkOrder(order)}
                            >
                              <Package className="w-4 h-4 mr-1" />
                              Spare Parts
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}