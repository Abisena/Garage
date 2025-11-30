import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, Eye, Wrench, ChevronRight, X, Save, Trash2, Package, Search, Send, CheckCircle, FileText, XCircle, AlertCircle, History } from 'lucide-react';
import { Button } from './ui/button';
import { SPKDocument } from './SPKDocument';
// import { SparePartOrderModal } from './SparePartOrderModal';
import { frappeClient } from '../lib/frappeClient';
import { getStoredWorkOrders, persistWorkOrders } from '../lib/workOrdersStorage';

export function ServiceOrders({ currentUser }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [spareParts, setSpareParts] = useState([]);
  const [newPart, setNewPart] = useState({
    name: '',
    partNumber: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    discountType: 'percent'
  });
  const [masterSpareParts, setMasterSpareParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [partOrderSent, setPartOrderSent] = useState(false);
  const [mechanicName, setMechanicName] = useState('');
  const [availableMechanics, setAvailableMechanics] = useState([]);
  
  // Cancel Order States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // View Modal States
  const [showViewModal, setShowViewModal] = useState(false);
  const [orderToView, setOrderToView] = useState(null);

  // Flat Rate States
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState('');
  const [laborCost, setLaborCost] = useState(0);
  const [serviceTypes, setServiceTypes] = useState([]);

  const [serviceBundles, setServiceBundles] = useState([]);
  
  // Cancel Reason Options
  const cancelReasons = [
    'Customer Request - Biaya terlalu mahal',
    'Customer Request - Butuh waktu perbaikan terlalu lama',
    'Customer Request - Membatalkan servis',
    'Parts Not Available - Sparepart tidak tersedia',
    'Technical Issue - Kerusakan terlalu parah untuk diperbaiki'
  ];
  
  // Helper function to get part status badge
  const getPartStatusBadge = (part) => {
    if (part.status === 'requested') {
      return <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 rounded">REQUESTED</span>;
    } else if (part.status === 'prepared') {
      return <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded">PREPARED</span>;
    } else if (part.status === 'rejected') {
      return <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 border border-red-200 rounded">REJECTED</span>;
    } else if (part.status === 'installed') {
      return <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 border border-purple-200 rounded">INSTALLED</span>;
    } else {
      return <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded">DRAFT</span>;
    }
  };

  // Helper function to check if there are package parts in the grid
  const hasPackageParts = () => {
    return spareParts.some(part =>
      part.partNumber.startsWith('PKG-') ||
      part.partNumber.startsWith('LABOR-')
    );
  };

  const resolveServiceBundle = () => {
    if (!selectedWorkOrder || serviceBundles.length === 0) return null;

    const bundleIdCandidates = [
      selectedWorkOrder.serviceBundleId,
      selectedWorkOrder.serviceBundle,
      selectedWorkOrder.service_bundle_id
    ].filter(Boolean);

    const bundleNameCandidates = [
      selectedWorkOrder.serviceBundleName,
      selectedWorkOrder.serviceType
    ].filter(Boolean);

    const bundleById = serviceBundles.find((bundle) =>
      bundleIdCandidates.some(
        (candidate) => candidate === bundle.id || candidate === bundle.name
      )
    );

    if (bundleById) return bundleById;

    return serviceBundles.find(
      (bundle) =>
        bundleNameCandidates.includes(bundle.bundle_name) ||
        bundleNameCandidates.includes(bundle.name)
    );
  };
  
  useEffect(() => {
    loadWorkOrders();
    loadMasterSpareParts();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      loadWorkOrders();
      loadMasterSpareParts(selectedWorkOrder?.id);
    };

    const handleWorkOrdersUpdate = () => {
      loadWorkOrders();
      loadMasterSpareParts(selectedWorkOrder?.id);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    window.addEventListener('workOrdersUpdated', handleWorkOrdersUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
      window.removeEventListener('workOrdersUpdated', handleWorkOrdersUpdate);
    };
  }, [selectedWorkOrder?.id]);

  useEffect(() => {
    const branchFilter = currentUser?.branch === 'all' ? '' : currentUser?.branch || '';
    loadMechanicRoster(branchFilter);
    loadServiceTypesFromFrappe(branchFilter);
  }, [currentUser?.branch]);

  useEffect(() => {
    const branchFilter = selectedWorkOrder?.branch;
    if (branchFilter) {
      loadMechanicRoster(branchFilter);
      loadServiceTypesFromFrappe(branchFilter);
    }
  }, [selectedWorkOrder?.branch]);

  useEffect(() => {
    if (serviceBundles.length > 0) {
      mergeServiceTypes(normalizeBundleAsServiceTypes(serviceBundles));
    }
  }, [serviceBundles]);

  const loadWorkOrders = () => {
    const storedOrders = getStoredWorkOrders();
    setWorkOrders(storedOrders);
  };

  const mapProfilePart = (part) => ({
    id: part.id || part.name || part.part_code || part.partNumber,
    partName: part.part_name || part.partName || part.description || part.name,
    partNumber: part.part_code || part.partNumber || part.item_code,
    compatibleModels: Array.isArray(part.compatible_models) ? part.compatible_models : (Array.isArray(part.compatibleModels) ? part.compatibleModels : []),
    category: part.category || part.brand || 'General',
    unitPrice: Number(part.unit_price || part.rate || part.unitPrice || 0),
    stock: Number(part.stock_qty ?? part.stock ?? 0),
    minStock: Number(part.reorder_level ?? part.minStock ?? 0)
  });

  const normalizeServiceTypes = (types = []) => {
    return types
      .map((type) => {
        const resolvedId = type.id || type.name || type.service_code || type.service_type;
        const flatRateValue = Number(
          type.flat_rate ??
          type.service_fee ??
          type.rate ??
          type.labor_rate ??
          0
        );

        return {
          id: resolvedId,
          code: type.service_code || type.code || type.name || type.service_type,
          name: type.service_type || type.name || type.code,
          category: type.category || type.service_category || type.order_category || 'General',
          flatRate: Number.isFinite(flatRateValue) ? flatRateValue : 0,
          description: type.description || '',
        };
      })
      .filter((type) => type.id && type.name);
  };

  const normalizeBundleAsServiceTypes = (bundles = []) => {
    return bundles
      .map((bundle) => {
        const identifier = bundle.name || bundle.id;
        return {
          id: identifier,
          code: bundle.bundle_name || bundle.name || bundle.id,
          name: bundle.bundle_name || bundle.name || bundle.id,
          category: 'Bundle',
          flatRate: Number(bundle.service_fee ?? bundle.grand_total ?? 0) || 0,
          description: bundle.description || '',
        };
      })
      .filter((bundle) => bundle.id && bundle.name);
  };

  const mergeServiceTypes = (incoming = []) => {
    if (!incoming || incoming.length === 0) return;

    setServiceTypes((prev) => {
      const combined = [...prev];
      const existingIds = new Set(combined.map((item) => item.id));

      incoming.forEach((item) => {
        if (item.id && !existingIds.has(item.id)) {
          combined.push(item);
          existingIds.add(item.id);
        }
      });

      return combined;
    });
  };

  const normalizeMechanicNames = (entries = []) => entries
    .map((mechanic) =>
      mechanic?.employee_name ||
      mechanic?.employee ||
      mechanic?.name ||
      mechanic?.full_name ||
      mechanic?.user_id
    )
    .map((name) => (name ? String(name).trim() : ''))
    .filter(Boolean);

  const mergeMechanicNames = (names = []) => {
    if (!names || names.length === 0) return;

    setAvailableMechanics((prev) => {
      const combined = new Set([...prev, ...names]);
      return Array.from(combined);
    });
  };

  const loadMechanicRoster = async (branchFilter = '') => {
    try {
      const { technicians, employees } = await frappeClient.listMechanics(branchFilter);
      const normalized = [
        ...normalizeMechanicNames(technicians),
        ...normalizeMechanicNames(employees),
      ];
      mergeMechanicNames(normalized);
    } catch (error) {
      console.error('Failed to load mechanic roster:', error);
    }
  };

  const loadServiceTypesFromFrappe = async (branchFilter = '') => {
    try {
      const types = await frappeClient.listServiceTypes(branchFilter);
      const normalizedTypes = normalizeServiceTypes(types);

      if (normalizedTypes.length > 0) {
        mergeServiceTypes(normalizedTypes);
        return;
      }

      const bundles = await frappeClient.listServiceBundles();
      const normalizedBundles = normalizeBundleAsServiceTypes(bundles);
      mergeServiceTypes(normalizedBundles);

      if (bundles?.length) {
        setServiceBundles((prev) => (prev.length > 0 ? prev : bundles));
      }
    } catch (error) {
      console.error('Failed to load service types from Frappe:', error);
    }
  };

  const isMechanicRole = (value) => {
    if (!value) return false;
    const normalized = String(value).toLowerCase();
    return normalized.includes('mechanic') || normalized.includes('mekanik');
  };

  const updateMechanicOptions = (technicians) => {
    if (!technicians || !Array.isArray(technicians)) return;

    const mechanicCandidates = technicians.filter((technician) => {
      const roleHints = [
        technician?.role,
        technician?.role_name,
        technician?.roleName,
        technician?.role_profile,
        technician?.roleProfile,
        technician?.designation,
        technician?.job_title,
        technician?.jobTitle,
        technician?.position,
        technician?.type,
        technician?.employment_type,
        technician?.employee_type,
        technician?.skill_tags,
        technician?.notes
      ].filter(Boolean);

      return roleHints.some(isMechanicRole);
    });

    const targetList = mechanicCandidates.length > 0 ? mechanicCandidates : technicians;
    const names = normalizeMechanicNames(targetList);

    if (names.length > 0) {
      mergeMechanicNames(names);
    }
  };

  const loadMasterSpareParts = async (orderId) => {
    const savedParts = localStorage.getItem('masterSpareParts');
    if (savedParts) {
      setMasterSpareParts(JSON.parse(savedParts));
    }

    try {
      let profileParts = [];

      if (orderId) {
        const details = await frappeClient.getServiceOrderDetails(orderId);
        const payload = details?.message || details;

        if (payload?.available_spare_parts?.length) {
          profileParts = payload.available_spare_parts;
        }

        if (payload?.available_technicians) {
          updateMechanicOptions(payload.available_technicians);
        }
      }

      if (profileParts.length === 0 || serviceBundles.length === 0) {
        const bootstrap = await frappeClient.getPortalBootstrap();
        profileParts = bootstrap?.spare_parts || bootstrap?.available_spare_parts || profileParts;
        updateMechanicOptions(bootstrap?.available_technicians);

        if (Array.isArray(bootstrap?.service_bundles) && bootstrap.service_bundles.length > 0) {
          setServiceBundles(bootstrap.service_bundles);
        }
      }

      if (profileParts.length > 0) {
        const mappedParts = profileParts
          .map(mapProfilePart)
          .filter((part) => part.partName && part.partNumber);

        if (mappedParts.length > 0) {
          setMasterSpareParts(mappedParts);
          localStorage.setItem('masterSpareParts', JSON.stringify(mappedParts));
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load master spare parts from profile', error);
    }
  };

  // Filter parts based on vehicle model and part name input
  useEffect(() => {
    if (selectedWorkOrder && newPart.name && masterSpareParts.length > 0) {
      const vehicleModel = selectedWorkOrder.vehicleModel;
      const searchTerm = newPart.name.toLowerCase();
      
      const filtered = masterSpareParts.filter(part => {
        const compatibleModels = Array.isArray(part.compatibleModels) ? part.compatibleModels : [];
        const matchesModel = compatibleModels.length === 0 || compatibleModels.includes(vehicleModel);
        const partName = (part.partName || '').toLowerCase();

        return matchesModel && partName.includes(searchTerm);
      });
      
      setFilteredParts(filtered);
      setShowSuggestions(filtered.length > 0 && newPart.name.length > 0);
    } else {
      setFilteredParts([]);
      setShowSuggestions(false);
    }
  }, [newPart.name, selectedWorkOrder, masterSpareParts]);

  // Sync selectedWorkOrder with workOrders changes (important for status updates from Spare Parts Request)
  useEffect(() => {
    console.log('🔍 Checking if selectedWorkOrder needs sync...', {
      hasSelectedWorkOrder: !!selectedWorkOrder,
      workOrdersCount: workOrders.length
    });
    
    if (selectedWorkOrder) {
      const updated = workOrders.find(wo => wo.id === selectedWorkOrder.id);
      console.log('🔍 Found updated work order:', !!updated);
      
      if (updated) {
        console.log('🔄 FORCE syncing selectedWorkOrder with latest data from storage');
        console.log('Current selected spare parts:', selectedWorkOrder.spareParts);
        console.log('Updated spare parts from storage:', updated.spareParts);
        
        // ALWAYS sync to ensure UI reflects latest data
        setSelectedWorkOrder({ ...updated }); // Create new object reference to force re-render
        setSpareParts([...(updated.spareParts || [])]); // Create new array reference to force re-render
      }
    }
  }, [workOrders]);

  const handleSelectWorkOrder = (order) => {
    setSelectedWorkOrder(order);
    setSpareParts(order.spareParts || []);
    setMechanicName(order.mechanicName || ''); // Load existing mechanic assignment
    loadMasterSpareParts(order.id);
  };

  const handleMechanicChange = (newMechanic) => {
    setMechanicName(newMechanic);

    if (!selectedWorkOrder) return;

    const updatedOrder = {
      ...selectedWorkOrder,
      mechanicName: newMechanic,
      branch: selectedWorkOrder.branch // keep original branch untouched
    };

    const updatedWorkOrders = workOrders.map(wo =>
      wo.id === selectedWorkOrder.id ? updatedOrder : wo
    );

    persistWorkOrders(updatedWorkOrders);
    setWorkOrders(updatedWorkOrders);
    setSelectedWorkOrder(updatedOrder);
  };

  const handleServiceBundleChange = (value) => {
    if (!selectedWorkOrder) return;

    const matchedBundle = serviceBundles.find((bundle) =>
      bundle.id === value ||
      bundle.name === value ||
      (bundle.bundle_name && bundle.bundle_name === value)
    );

    const bundleId = matchedBundle?.id || value || '';
    const bundleName = matchedBundle?.bundle_name || matchedBundle?.name || '';

    const updatedWorkOrders = workOrders.map((wo) => {
      if (wo.id === selectedWorkOrder.id) {
        return {
          ...wo,
          serviceBundleId: bundleId,
          serviceBundleName: bundleName
        };
      }
      return wo;
    });

    persistWorkOrders(updatedWorkOrders);
    setWorkOrders(updatedWorkOrders);
    setSelectedWorkOrder({
      ...selectedWorkOrder,
      serviceBundleId: bundleId,
      serviceBundleName: bundleName
    });
  };

  const handleBackToList = () => {
    setSelectedWorkOrder(null);
    setSpareParts([]);
    setNewPart({ name: '', partNumber: '', quantity: 1, unitPrice: 0, discount: 0, discountType: 'percent' });
    setShowSuggestions(false);
  };

  const handleSelectSuggestedPart = (part) => {
    // Langsung add part tanpa perlu klik tombol +
    const subtotal = 1 * part.unitPrice; // quantity default = 1
    let finalPrice = subtotal;
    
    const newSparePart = {
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
      
      const part = {
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

  // Handler untuk add flat rate
  const handleAddFlatRate = () => {
    if (laborCost <= 0) {
      alert('⚠️ Labor cost harus lebih dari 0!');
      return;
    }

    const selectedService = serviceTypes.find(st => st.id === selectedServiceTypeId);
    const serviceName = selectedService ? selectedService.name : 'Labor / Jasa Service';

    const laborPart = {
      id: `LABOR-${Date.now()}`,
      name: serviceName,
      partNumber: `LABOR-${selectedServiceTypeId || Date.now()}`,
      quantity: 1,
      unitPrice: laborCost,
      discount: 0,
      discountType: 'percent',
      totalPrice: laborCost
    };

    setSpareParts([...spareParts, laborPart]);
    setLaborCost(0);
    setSelectedServiceTypeId('');
    alert('✅ Flat rate jasa berhasil ditambahkan ke grid!');
  };

  const handleAddPackageParts = () => {
    if (!selectedWorkOrder) return;

    const bundle = resolveServiceBundle();

    if (!bundle) {
      alert('⚠️ Paket servis tidak ditemukan untuk order ini. Pastikan service type terhubung ke Service Bundle di Frappe.');
      return;
    }

    const bundleParts = Array.isArray(bundle.parts) ? bundle.parts : [];

    if (bundleParts.length === 0) {
      alert('⚠️ Paket ini belum memiliki daftar sparepart di Frappe.');
      return;
    }

    const newParts = bundleParts.map((item, index) => {
      const quantity = Math.max(1, Number(item.quantity) || 1);

      const resolvedPrice = (() => {
        const explicitPrice =
          item.unitPrice ??
          item.unit_price ??
          item.rate ??
          item.price ??
          item.amount ??
          item.total;

        if (explicitPrice && !Number.isNaN(Number(explicitPrice))) {
          const numericPrice = Number(explicitPrice);
          if (numericPrice > 0) return numericPrice;
        }

        const derivedTotal = Number(item.total ?? item.amount ?? 0);
        if (derivedTotal > 0 && quantity > 0) {
          return derivedTotal / quantity;
        }

        const matchFromMaster = masterSpareParts.find((part) => {
          const partIdentifiers = [
            part.part_code,
            part.partNumber,
            part.item_code,
            part.name,
            part.part_name,
            part.item_name
          ].filter(Boolean);

          const bundleIdentifiers = [
            item.partCode,
            item.partNumber,
            item.partName,
            item.item_code,
            item.itemName
          ].filter(Boolean);

          return partIdentifiers.some((id) => bundleIdentifiers.includes(id));
        });

        if (matchFromMaster) {
          const priceFromMaster =
            matchFromMaster.unit_price ||
            matchFromMaster.unitPrice ||
            matchFromMaster.rate ||
            matchFromMaster.price;

          if (priceFromMaster && !Number.isNaN(Number(priceFromMaster))) {
            return Number(priceFromMaster);
          }
        }

        return 0;
      })();

      const unitPrice = resolvedPrice;

      return {
        id: `BUNDLE-${bundle.id || bundle.name}-${index}-${Date.now()}`,
        name: item.partName || item.partCode || 'Bundle Item',
        partNumber: item.partCode || item.partName || `PART-${index + 1}`,
        quantity,
        unitPrice,
        discount: 0,
        discountType: 'percent',
        totalPrice: quantity * unitPrice,
        usage: item.usage,
        warehouse: item.warehouse_location,
        bundleId: bundle.id || bundle.name
      };
    });

    const updatedParts = [...spareParts, ...newParts];
    setSpareParts(updatedParts);

    const bundleName = bundle.bundle_name || bundle.name || selectedWorkOrder.serviceType;

    // Update localStorage
    const updatedWorkOrders = workOrders.map(wo => {
      if (wo.id === selectedWorkOrder.id) {
        return {
          ...wo,
          spareParts: updatedParts,
          serviceBundleId: bundle.id || wo.serviceBundleId || wo.serviceBundle,
          serviceBundleName: bundleName
        };
      }
      return wo;
    });

    const updatedSelectedWorkOrder = {
      ...selectedWorkOrder,
      spareParts: updatedParts,
      serviceBundleId: bundle.id || selectedWorkOrder.serviceBundleId || selectedWorkOrder.serviceBundle,
      serviceBundleName: bundleName
    };

    persistWorkOrders(updatedWorkOrders);
    setWorkOrders(updatedWorkOrders);
    setSelectedWorkOrder(updatedSelectedWorkOrder);

    alert('✅ Paket service berhasil ditambahkan!\n\n📦 ' + bundleParts.length + ' items (parts + labor) telah ditambahkan ke spare parts grid.');
  };

  const handleUpdatePartDiscount = (partId, discount, discountType) => {
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

  const handleUpdatePartQuantity = (partId, newQuantity) => {
    // Validate quantity minimum 1
    const validQuantity = Math.max(1, newQuantity);
    
    setSpareParts(spareParts.map(part => {
      if (part.id === partId) {
        const subtotal = validQuantity * part.unitPrice;
        let finalPrice = subtotal;
        
        // Recalculate with existing discount
        if (part.discount > 0) {
          if (part.discountType === 'percent') {
            finalPrice = subtotal - (subtotal * part.discount / 100);
          } else {
            // If discount amount is more than new subtotal, adjust it
            const validDiscount = Math.min(part.discount, subtotal);
            finalPrice = subtotal - validDiscount;
          }
        }
        
        return { ...part, quantity: validQuantity, totalPrice: finalPrice };
      }
      return part;
    }));
  };

  const handleRemovePart = (partId) => {
    const partToRemove = spareParts.find(p => p.id === partId);
    // Hanya bisa remove part yang belum di-request (DRAFT status)
    if (partToRemove && !partToRemove.requested) {
      const updatedParts = spareParts.filter(p => p.id !== partId);
      setSpareParts(updatedParts);

      // Update localStorage
      if (selectedWorkOrder) {
        const updatedWorkOrders = workOrders.map(wo => {
          if (wo.id === selectedWorkOrder.id) {
            return { ...wo, spareParts: updatedParts };
          }
          return wo;
        });

        persistWorkOrders(updatedWorkOrders);
        setWorkOrders(updatedWorkOrders);
        setSelectedWorkOrder({ ...selectedWorkOrder, spareParts: updatedParts });
      }
    } else if (partToRemove && partToRemove.requested) {
      const statusText = partToRemove.status === 'prepared' ? 'PREPARED' : partToRemove.status === 'rejected' ? 'REJECTED' : partToRemove.status === 'installed' ? 'INSTALLED' : 'REQUESTED';
      alert('❌ Part tidak bisa dihapus!\n\n📦 Status: ' + statusText + '\n💡 Part yang sudah diproses oleh petugas Spare Parts tidak dapat dihapus dari list.');
    }
  };

  const handleCancelOrderClick = (order) => {
    setOrderToCancel(order);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason) {
      alert('⚠️ Mohon pilih alasan pembatalan order!');
      return;
    }

    if (!orderToCancel) return;

    setIsCancelling(true);

    try {
      await frappeClient.cancelServiceOrder(orderToCancel.orderId, cancelReason);
    } catch (error) {
      console.error('Failed to cancel order in backend:', error);
      alert('❌ Gagal membatalkan order di backend. Silakan coba lagi.');
      setIsCancelling(false);
      return;
    }

    // Update status order menjadi cancelled di local storage
    const updatedWorkOrders = workOrders.map(wo => {
      if (wo.id === orderToCancel.id) {
        return {
          ...wo,
          repairStatus: 'cancelled',
          cancelReason: cancelReason,
          cancellationReason: cancelReason,
          cancelDate: new Date().toISOString()
        };
      }
      return wo;
    });

    persistWorkOrders(updatedWorkOrders);
    setWorkOrders(updatedWorkOrders);

    // Update today's registrations so entries are not removed from the dashboard
    try {
      const storedRegistrations = JSON.parse(localStorage.getItem('registrations') || '[]');
      const updatedRegistrations = storedRegistrations.map((reg) => {
        if (reg.orderId === orderToCancel.orderId) {
          return {
            ...reg,
            status: 'cancelled',
            cancellationReason: cancelReason
          };
        }
        return reg;
      });

      localStorage.setItem('registrations', JSON.stringify(updatedRegistrations));
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Failed to update registrations for cancellation:', error);
    }

    // Close modal
    setShowCancelModal(false);
    setOrderToCancel(null);
    setCancelReason('');
    setIsCancelling(false);

    alert(`✅ Order ${orderToCancel.orderId} berhasil dibatalkan!\n\nAlasan: ${cancelReason}`);
  };

  const handleCancelModalClose = () => {
    setShowCancelModal(false);
    setOrderToCancel(null);
    setCancelReason('');
  };

  // Handler untuk view spare part history
  const handleViewSparePartHistory = (order) => {
    setOrderToView(order);
    setShowViewModal(true);
  };

  const handleSendOrderPart = () => {
    if (selectedWorkOrder) {
      // Validate mechanic field - MANDATORY
      if (!mechanicName || mechanicName.trim() === '') {
        alert('❌ Mechanic belum dipilih!\n\n👨‍🔧 Mohon pilih mechanic yang akan mengerjakan order ini sebelum mengirim order part.\n\n💡 Field Mechanic adalah mandatory.');
        return;
      }
      
      // Filter hanya parts yang belum requested
      const partsToSend = spareParts.filter(p => !p.requested);
      
      if (partsToSend.length === 0) {
        alert('⚠️ Tidak ada parts baru untuk dikirim!\n\nSemua parts sudah di-request sebelumnya.');
        return;
      }
      
      // Separate physical parts (PKG-* and regular parts) from labor (LABOR-*)
      const physicalParts = partsToSend.filter(p => !p.partNumber.startsWith('LABOR-'));
      const laborParts = partsToSend.filter(p => p.partNumber.startsWith('LABOR-'));
      
      // Mark parts as requested
      const updatedSpareParts = spareParts.map(part => {
        if (!part.requested) {
          return { ...part, requested: true, status: 'requested' };
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
      
      persistWorkOrders(updatedWorkOrders);
      setWorkOrders(updatedWorkOrders);
      
      // Send ONLY physical parts to Spare Parts Request queue (exclude LABOR)
      const currentTime = new Date();
      
      // Only create request if there are physical parts to send
      if (physicalParts.length > 0) {
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
          parts: physicalParts.map(part => {
            // Find stock from master spareparts
            const masterPart = masterSpareParts.find(mp => mp.partNumber === part.partNumber);
            
            // For package parts (PKG-*), set default stock to 999
            const isPackagePart = part.partNumber.startsWith('PKG-');
            const stockAvailable = isPackagePart ? 999 : (masterPart?.stock || 0);
            
            return {
              partCode: part.partNumber,
              partName: part.name,
              requestedQty: part.quantity,
              stockAvailable: stockAvailable,
              unit: 'pcs',
              location: masterPart ? `Rack ${String.fromCharCode(65 + Math.floor(Math.random() * 3))}-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}` : 'Workshop',
              status: 'REQUESTED'
            };
          })
        };
        
        // Save to localStorage for Spare Parts Request page
        const existingRequests = localStorage.getItem('sparePartsRequests');
        const requests = existingRequests ? JSON.parse(existingRequests) : [];
        
        // Check if there's already a request for this orderId
        const existingRequestIndex = requests.findIndex((req) => req.orderId === selectedWorkOrder.orderId);
        
        if (existingRequestIndex !== -1) {
          // UPDATE existing request - MERGE new parts with existing parts
          const existingRequest = requests[existingRequestIndex];
          
          // Add new parts to existing parts list
          const newParts = partsRequest.parts;
          const mergedParts = [...existingRequest.parts];
          
          // FIXED: Don't aggregate parts - each request should be a separate line item
          // Just push all new parts to the array, even if partCode is the same
          newParts.forEach((newPart) => {
            // Always add as new line item - don't check if exists
            mergedParts.push(newPart);
          });
          
          // Update the request with merged parts
          requests[existingRequestIndex] = {
            ...existingRequest,
            parts: mergedParts,
            requestDate: partsRequest.requestDate,
            requestTime: partsRequest.requestTime,
            // Recalculate status based on merged parts
            status: mergedParts.every((p) => p.status === 'PREPARED') ? 'READY' :
                    mergedParts.some((p) => p.status === 'PREPARED') ? 'PARTIAL' : 'PENDING'
          };
        } else {
          // CREATE new request
          requests.push(partsRequest);
        }
        
        localStorage.setItem('sparePartsRequests', JSON.stringify(requests));
      }
      
      // Prepare success message
      let successMessage = `✅ Order Part berhasil dikirim!\n\n`;
      
      if (physicalParts.length > 0) {
        successMessage += `📦 ${physicalParts.length} PHYSICAL PARTS dikirim ke Spare Parts Request\n`;
        successMessage += `   Total Qty: ${physicalParts.reduce((sum, p) => sum + p.quantity, 0)} pcs\n`;
      }
      
      if (laborParts.length > 0) {
        successMessage += `\n👨‍🔧 ${laborParts.length} LABOR/JASA (tidak perlu prepare)\n`;
        successMessage += `   ${laborParts.map(p => `• ${p.name}`).join('\n   ')}\n`;
      }
      
      successMessage += `\nOrder ID: ${selectedWorkOrder.orderId}`;
      successMessage += `\n\n💡 Parts yang sudah di-request akan ditandai dengan badge "REQUESTED".`;
      
      alert(successMessage);
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
      
      persistWorkOrders(updatedWorkOrders);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusInfo = (repairStatus) => {
    switch (repairStatus) {
      case 'waiting-parts':
        return {
          label: 'Waiting Parts',
          color: 'bg-amber-100 text-amber-700 border-amber-200'
        };
      case 'parts-prepared':
        return {
          label: 'Parts Prepared',
          color: 'bg-cyan-100 text-cyan-700 border-cyan-200'
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
      case 'final-inspection':
        return {
          label: 'Final Inspection',
          color: 'bg-purple-100 text-purple-700 border-purple-200'
        };
      case 'qc-finished':
        return {
          label: 'QC Finished',
          color: 'bg-indigo-100 text-indigo-700 border-indigo-200'
        };
      case 'quality-check':
        return {
          label: 'Quality Check',
          color: 'bg-sky-100 text-sky-700 border-sky-200'
        };
      case 'urgent':
        return {
          label: 'Urgent',
          color: 'bg-red-100 text-red-700 border-red-200'
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: 'bg-slate-300 text-slate-600 border-slate-400'
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

  // Filter by branch for branch users
  const shouldFilterByBranch = currentUser.branch && currentUser.branch !== 'all';
  const branchFilteredOrders = shouldFilterByBranch
    ? filteredOrders.filter(order => order.branch === currentUser.branch)
    : filteredOrders;

  // Spare Parts Input View
  if (selectedWorkOrder) {
    const resolvedBundle = resolveServiceBundle();

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
                  <span className="text-sm">
                    {spareParts.filter(p => p.status === 'prepared').length} prepared / {spareParts.filter(p => p.requested).length} requested
                  </span>
                </div>
              )}
              {!mechanicName && spareParts.length > 0 && (
                <div className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Mechanic must be assigned</span>
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
                <p className="text-slate-600 text-xs mb-1">
                  Mechanic <span className="text-red-500">*</span>
                </p>
                <select
                  value={mechanicName}
                  onChange={(e) => handleMechanicChange(e.target.value)}
                  className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !mechanicName ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select Mechanic</option>
                  {availableMechanics.map(mechanic => (
                    <option key={mechanic} value={mechanic}>{mechanic}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <p className="text-slate-600 text-xs mb-1">Service Type</p>
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 flex-1">{selectedWorkOrder.serviceType || '-'}</p>
                  {selectedWorkOrder.serviceType?.startsWith('Paket Service') && (
                    <Button
                      onClick={handleAddPackageParts}
                      disabled={hasPackageParts()}
                      className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 h-auto disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      <Package className="w-3 h-3 mr-1" />
                      Add Part & Package
                    </Button>
                  )}
                </div>
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

          {/* Flat Rate Jasa Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="text-blue-900 mb-4 flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Input Flat Rate Jasa Service
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-700 mb-2 block text-sm">
                  Select Service Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedServiceTypeId}
                  onChange={(e) => {
                    const serviceTypeId = e.target.value;
                    setSelectedServiceTypeId(serviceTypeId);
                    
                    // Auto-fill flat rate
                    const selectedServiceType = serviceTypes.find(st => st.id === serviceTypeId);
                    if (selectedServiceType) {
                      setLaborCost(selectedServiceType.flatRate);
                    } else {
                      setLaborCost(0);
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Pilih Service Type --</option>
                  {serviceTypes.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.code} - {st.name} ({st.category}) - {formatCurrency(st.flatRate)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih jenis service untuk auto-fill flat rate jasa
                </p>
              </div>

              <div>
                <label className="text-slate-700 mb-2 block text-sm">
                  Labor Cost / Biaya Jasa
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={laborCost || ''}
                    onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                    placeholder="50000"
                    min="0"
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={handleAddFlatRate}
                    disabled={laborCost <= 0}
                    className="bg-blue-500 hover:bg-blue-600 text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Grid
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Otomatis terisi dari service type, atau input manual
                </p>
                {laborCost > 0 && (
                  <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-emerald-800 text-sm">
                      💰 Labor Cost: {formatCurrency(laborCost)}
                    </p>
                  </div>
                )}
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
                    spareParts.map((part, index) => {
                      // Debug log
                      if (index === 0) {
                        console.log('🎨 Rendering spare parts. First part:', {
                          name: part.name,
                          partNumber: part.partNumber,
                          status: part.status,
                          requested: part.requested
                        });
                      }
                      
                      // Check if this is a labor/flat rate part
                      const isLaborPart = part.partNumber.startsWith('LABOR-');
                      
                      return (
                        <tr key={part.id} className={`border-b border-slate-100 ${isLaborPart ? 'bg-blue-50' : part.requested ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                          <td className="px-3 py-3 text-slate-600 text-sm">{index + 1}</td>
                          <td className="px-3 py-3 text-slate-900 text-sm">
                            <div className="flex items-center gap-2">
                              {isLaborPart && <Wrench className="w-4 h-4 text-blue-600" />}
                              <span className={isLaborPart ? 'font-semibold text-blue-900' : ''}>{part.name}</span>
                              {getPartStatusBadge(part)}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-700 text-sm">{part.partNumber}</td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={part.quantity}
                              onChange={(e) => handleUpdatePartQuantity(part.id, parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 text-sm text-center border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              disabled={part.requested}
                            />
                          </td>
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
                      );
                    })
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
                  <h4 className="text-emerald-900 text-sm mb-1">Editable Grid with Auto-Calculate</h4>
                  <p className="text-emerald-700 text-xs">Edit quantity directly in the grid - total will auto-calculate. Use discount column to apply percentage (%) or amount (Rp) discount per item.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-700 text-sm mb-1">Waiting Parts</p>
                  <p className="text-amber-900 text-2xl">
                    {workOrders.filter(o => o.repairStatus === 'waiting-parts').length}
                  </p>
                </div>
                <div className="bg-amber-200/50 rounded-lg p-3">
                  <Filter className="w-6 h-6 text-amber-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-700 text-sm mb-1">In Progress</p>
                  <p className="text-blue-900 text-2xl">
                    {workOrders.filter(o => o.repairStatus === 'in-progress').length}
                  </p>
                </div>
                <div className="bg-blue-200/50 rounded-lg p-3">
                  <Wrench className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-700 text-sm mb-1">Completed</p>
                  <p className="text-emerald-900 text-2xl">
                    {workOrders.filter(o => o.repairStatus === 'completed').length}
                  </p>
                </div>
                <div className="bg-emerald-200/50 rounded-lg p-3">
                  <Eye className="w-6 h-6 text-emerald-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-700 text-sm mb-1">Cancelled</p>
                  <p className="text-slate-900 text-2xl">
                    {workOrders.filter(o => o.repairStatus === 'cancelled').length}
                  </p>
                </div>
                <div className="bg-slate-200/50 rounded-lg p-3">
                  <XCircle className="w-6 h-6 text-slate-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-700 text-sm mb-1">Total Orders</p>
                  <p className="text-violet-900 text-2xl">{workOrders.length}</p>
                </div>
                <div className="bg-violet-200/50 rounded-lg p-3">
                  <Filter className="w-6 h-6 text-violet-700" />
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
            <button
              onClick={() => setFilterStatus('cancelled')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'cancelled'
                  ? 'bg-slate-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cancelled
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
          {branchFilteredOrders.length === 0 ? (
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
                  {branchFilteredOrders.map((order, index) => {
                    const statusInfo = getStatusInfo(order.repairStatus);
                    const isCancelled = order.repairStatus === 'cancelled';
                    const isCompleted = order.repairStatus === 'completed' || 
                                       order.repairStatus === 'final-inspection';
                    // Check if order has parts that have been processed by parts staff
                    // (PREPARED or INSTALLED - not counting DRAFT, REQUESTED, or REJECTED)
                    const hasProcessedParts = order.spareParts?.some(part => 
                      part.status === 'prepared' || part.status === 'installed'
                    ) || false;
                    // Disable if cancelled, completed, or has prepared parts
                    const isDisabled = isCancelled || isCompleted;
                    // Disable cancel button specifically if has processed parts
                    const cannotCancel = isDisabled || hasProcessedParts;
                    return (
                      <tr 
                        key={order.id} 
                        className={`border-b border-slate-100 transition-colors ${
                          isDisabled
                            ? 'bg-slate-200 opacity-60 cursor-not-allowed' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <span className={isDisabled ? "text-slate-500" : "text-blue-600"}>{order.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={isDisabled ? "text-slate-500" : "text-slate-900"}>{order.orderId}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className={isDisabled ? "text-slate-500" : "text-slate-900"}>{order.customerName}</p>
                            <p className="text-slate-500 text-sm">{order.plateNumber}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className={isDisabled ? "text-slate-500" : "text-slate-700"}>{order.vehicleBrand} {order.vehicleModel}</p>
                          <p className="text-slate-500 text-sm">{order.vehicleYear}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={isDisabled ? "text-slate-500" : "text-slate-700"}>{order.serviceType || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                            isDisabled ? 'bg-slate-300 text-slate-600' : 'bg-slate-100 text-slate-700'
                          }`}>
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
                              className={isDisabled
                                ? "bg-slate-400 text-slate-200 cursor-not-allowed" 
                                : "bg-blue-500 hover:bg-blue-600 text-white"
                              }
                              onClick={() => !isDisabled && handleSelectWorkOrder(order)}
                              disabled={isDisabled}
                            >
                              <Package className="w-4 h-4 mr-1" />
                              Spare Parts
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-slate-300 text-slate-700 hover:bg-slate-50"
                              onClick={() => handleViewSparePartHistory(order)}
                              title="View Spare Part Order History"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                            {!cannotCancel && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => handleCancelOrderClick(order)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            )}
                            {hasProcessedParts && !isDisabled && (
                              <span className="text-xs text-amber-600 italic">
                                ⚠️ Cannot cancel - parts processed
                              </span>
                            )}
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

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 rounded-lg p-2">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-slate-900">Cancel Order</h3>
                  <p className="text-slate-600 text-sm">Order ID: {orderToCancel?.orderId}</p>
                </div>
              </div>
              <button
                onClick={handleCancelModalClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-4">
              <div>
                <p className="text-slate-700 mb-2">Pilih alasan pembatalan order:</p>
                <div className="space-y-2">
                  {cancelReasons.map((reason, index) => (
                    <label
                      key={index}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        cancelReason === reason
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason}
                        checked={cancelReason === reason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-slate-700 text-sm flex-1">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Warning Message */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="text-amber-600 flex-shrink-0">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-amber-900 text-sm">
                      Order yang sudah dibatalkan tidak dapat dikembalikan. Pastikan keputusan ini sudah final.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleCancelModalClose}
                className="border-slate-300"
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmCancel}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!cancelReason}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Konfirmasi Pembatalan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}