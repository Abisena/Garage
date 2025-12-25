import React, { useState, useEffect } from 'react';
import { Wrench, CheckCircle, Clock, AlertCircle, X, Eye, FileText, ClipboardCheck, Play, Check, PackageCheck, ListChecks, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { getStoredWorkOrders, persistWorkOrders } from '../lib/workOrdersStorage';

export function Workshop({ currentUser }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);

  // Update Modal State
  const [currentTab, setCurrentTab] = useState('progress');
  const [progressValue, setProgressValue] = useState(0);
  const [progressNotes, setProgressNotes] = useState('');
  
  // Parts Approval State
  const [partsApprovalChecklist, setPartsApprovalChecklist] = useState({});
  
  // QC State
  const [qcMechanicalChecks, setQcMechanicalChecks] = useState([
    { id: 'qc-1', label: 'Engine starts smoothly without unusual sounds', checked: false },
    { id: 'qc-2', label: 'No oil/fluid leaks detected', checked: false },
    { id: 'qc-3', label: 'All lights (headlights, turn signals, brake lights) working', checked: false },
    { id: 'qc-4', label: 'Brakes functioning properly and responsively', checked: false },
    { id: 'qc-5', label: 'Steering wheel responsive and aligned', checked: false },
    { id: 'qc-6', label: 'Suspension feels normal without noise', checked: false },
  ]);

  const [qcTestDrive, setQcTestDrive] = useState([
    { id: 'td-1', label: 'Acceleration smooth and responsive', checked: false },
    { id: 'td-2', label: 'Braking effective without pulling', checked: false },
    { id: 'td-3', label: 'No unusual noises during driving', checked: false },
    { id: 'td-4', label: 'Gear shifting smooth (if applicable)', checked: false },
    { id: 'td-5', label: 'All dashboard indicators normal', checked: false },
  ]);

  const [qcAesthetics, setQcAesthetics] = useState([
    { id: 'ae-1', label: 'Exterior washed and cleaned', checked: false },
    { id: 'ae-2', label: 'Interior vacuumed and organized', checked: false },
    { id: 'ae-3', label: 'Dashboard and console wiped clean', checked: false },
    { id: 'ae-4', label: 'Windows and mirrors cleaned', checked: false },
  ]);

  const [qcDocumentation, setQcDocumentation] = useState([
    { id: 'doc-1', label: 'All work orders documented', checked: false },
    { id: 'doc-2', label: 'Spare parts installation verified', checked: false },
    { id: 'doc-3', label: 'Before/after photos taken', checked: false },
  ]);

  const [qcNotes, setQcNotes] = useState('');
  const currentUserLabel = currentUser?.displayName || currentUser?.name || currentUser?.username || '';
  const currentUserId = currentUser?.username || currentUser?.name || currentUserLabel;

  useEffect(() => {
    loadWorkOrders();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      loadWorkOrders();
    };

    const handleWorkOrdersUpdate = () => {
      loadWorkOrders();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    window.addEventListener('workOrdersUpdated', handleWorkOrdersUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
      window.removeEventListener('workOrdersUpdated', handleWorkOrdersUpdate);
    };
  }, []);

  const loadWorkOrders = () => {
    const orders = getStoredWorkOrders();
    const activeOrders = orders.filter((order) =>
      (order.mechanicName && order.mechanicName !== '') ||
      order.repairStatus === 'in-progress' ||
      order.repairStatus === 'quality-check' ||
      order.repairStatus === 'qc-finished' ||
      order.repairStatus === 'final-inspection'
    );
    setWorkOrders(activeOrders);
  };

  const saveWorkOrders = (updatedOrders) => {
    const allOrders = getStoredWorkOrders();
    if (allOrders.length > 0) {
      const updatedAllOrders = allOrders.map((order) => {
        const updated = updatedOrders.find(o => o.id === order.id);
        return updated || order;
      });
      persistWorkOrders(updatedAllOrders);
      loadWorkOrders();
    }
  };

  const arePartsPrepared = (order) => {
    if (!order.spareParts || order.spareParts.length === 0) return false;
    return order.spareParts.some(part => part.status === 'prepared');
  };

  const getEffectiveStatus = (order) => {
    if (order.repairStatus === 'final-inspection') return 'final-inspection';
    if (order.repairStatus === 'qc-finished') return 'qc-finished';
    if (order.repairStatus === 'in-progress') return 'in-progress';
    if (order.repairStatus === 'quality-check') return 'quality-check';
    if (order.repairStatus === 'completed') return 'completed';
    
    if (arePartsPrepared(order)) {
      return 'parts-prepared';
    }
    
    if (order.spareParts?.some(part => part.requested || part.status === 'requested')) {
      return 'parts-requested';
    }
    
    return 'waiting-parts';
  };

  const getStats = () => {
    const inProgress = workOrders.filter(o => o.repairStatus === 'in-progress').length;
    const qualityCheck = workOrders.filter(o => o.repairStatus === 'quality-check' || o.repairStatus === 'qc-finished').length;
    
    const allOrders = getStoredWorkOrders();
    let completed = 0;
    let delayed = 0;

    if (allOrders.length > 0) {
      completed = allOrders.filter((o) => o.repairStatus === 'completed' && o.qcApproved).length;

      const now = new Date();
      delayed = workOrders.filter((o) => {
        if (!o.repairStartTime || !o.estimatedRepairTime) return false;
        const estimatedHours = parseInt(o.estimatedRepairTime);
        const startTime = new Date(o.repairStartTime);
        const estimatedEndTime = new Date(startTime.getTime() + estimatedHours * 60 * 60 * 1000);
        return now > estimatedEndTime && o.repairStatus !== 'completed';
      }).length;
    }
    
    return { inProgress, qualityCheck, completed, delayed };
  };

  const getAutoProgress = (order) => {
    if (order.repairProgress !== undefined && order.repairStatus === 'in-progress') {
      return order.repairProgress;
    }

    const hasPreparedParts = order.spareParts?.some(part => part.status === 'prepared');
    
    if (order.repairStatus === 'completed') return 100;
    if (order.repairStatus === 'final-inspection') return 99;
    if (order.repairStatus === 'qc-finished') return 97;
    if (order.repairStatus === 'quality-check') return 95;
    if (order.repairStatus === 'in-progress') {
      return order.repairProgress || 50;
    }
    if (hasPreparedParts) return 25;
    if (order.spareParts?.some(part => part.requested)) return 10;
    return 0;
  };

  const handleOpenUpdate = (order, forceTab) => {
    setSelectedOrder(order);
    setProgressValue(getAutoProgress(order));
    setProgressNotes('');
    
    // If forceTab is specified (e.g., from Re-Open), use it
    if (forceTab) {
      setCurrentTab(forceTab);
    } else {
      // Check if there are installed parts that need verification (exclude rejected)
      const hasInstalledParts = order.spareParts?.some(part => 
        part.status === 'installed' && part.status !== 'rejected'
      );
      const partsNeedVerification = hasInstalledParts && !order.installedPartsApproved;
      
      // Determine which tab to show based on status
      if (order.repairStatus === 'final-inspection') {
        setCurrentTab('final');
      } else if (order.repairStatus === 'qc-finished' || order.repairStatus === 'quality-check') {
        setCurrentTab('qc');
      } else if (partsNeedVerification) {
        // IMPORTANT: If there are installed parts that haven't been verified, FORCE Parts tab
        setCurrentTab('parts');
      } else if (order.installedPartsApproved) {
        setCurrentTab('qc');
      } else if (order.repairProgress && order.repairProgress > 0) {
        setCurrentTab('parts');
      } else {
        setCurrentTab('progress');
      }
    }
    
    // Initialize parts approval checklist
    if (order.spareParts) {
      const checklist = {};
      order.spareParts.forEach(part => {
        // Check if this specific part was already approved before
        // This allows new parts to be unchecked while keeping old parts checked
        checklist[part.id] = part.approved || false;
      });
      setPartsApprovalChecklist(checklist);
    }
    
    // Reset QC checklists
    setQcMechanicalChecks(qcMechanicalChecks.map(item => ({ ...item, checked: false })));
    setQcTestDrive(qcTestDrive.map(item => ({ ...item, checked: false })));
    setQcAesthetics(qcAesthetics.map(item => ({ ...item, checked: false })));
    setQcDocumentation(qcDocumentation.map(item => ({ ...item, checked: false })));
    setQcNotes('');
    
    setShowUpdateModal(true);
  };

  const handleSaveProgress = () => {
    if (!selectedOrder) return;

    const currentTime = new Date();
    const timestamp = currentTime.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const historyItem = {
      timestamp,
      progress: progressValue,
      notes: progressNotes || `Progress updated to ${progressValue}%`,
      updatedBy: selectedOrder.mechanicName || 'Mechanic'
    };

    const updatedHistory = [...(selectedOrder.progressHistory || []), historyItem];

    const updatedOrder = {
      ...selectedOrder,
      repairProgress: progressValue,
      progressHistory: updatedHistory
    };

    const updatedOrders = workOrders.map(o => 
      o.id === selectedOrder.id ? updatedOrder : o
    );

    saveWorkOrders(updatedOrders);
    setSelectedOrder(updatedOrder);
    
    alert(`✅ Progress updated to ${progressValue}%`);
    
    // Move to next tab
    setCurrentTab('parts');
  };

  const handleApproveInstalledParts = () => {
    if (!selectedOrder) return;

    // Check if all parts (except rejected ones) are checked
    const allChecked = selectedOrder.spareParts
      ?.filter(part => part.status !== 'rejected') // Exclude rejected parts
      .every(part => partsApprovalChecklist[part.id]);

    if (!allChecked) {
      alert('⚠️ Please verify all installed parts!');
      return;
    }

    const currentTime = new Date();
    const timestamp = currentTime.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Update spare parts status to 'installed' and mark as approved (skip rejected)
    const updatedSpareParts = selectedOrder.spareParts?.map(part => {
      // Don't change status of rejected parts
      if (part.status === 'rejected') {
        return part;
      }
      return {
        ...part,
        status: 'installed',
        approved: true // Mark each part as approved so they stay checked on re-open
      };
    });

    const updatedQualityCheck = {
      ...(selectedOrder.qualityCheck || {}),
      service_order: selectedOrder.orderId || selectedOrder.id,
      service_advisor: currentUserId,
      parts_installation_approved: true,
    };

    const updatedOrder = {
      ...selectedOrder,
      spareParts: updatedSpareParts,
      installedPartsApproved: true,
      installedPartsApprovedBy: currentUserLabel, // Auto-fill from logged in user
      installedPartsApprovedDate: timestamp,
      qualityCheck: updatedQualityCheck,
    };

    const updatedOrders = workOrders.map(o => 
      o.id === selectedOrder.id ? updatedOrder : o
    );

    saveWorkOrders(updatedOrders);
    setSelectedOrder(updatedOrder);

    alert(`✅ Parts installation approved by ${currentUserLabel}`);
    
    // Move to QC tab
    setCurrentTab('qc');
  };

  const buildQualityCheckPayload = () => {
    const fieldMap = {
      'qc-1': 'engine_starts_smoothly',
      'qc-2': 'no_fluid_leaks_detected',
      'qc-3': 'lights_and_signals_functional',
      'qc-4': 'brakes_functioning_properly',
      'qc-5': 'steering_alignment_normal',
      'qc-6': 'suspension_normal',
      'td-1': 'acceleration_smooth_responsive',
      'td-2': 'braking_effective_without_pulling',
      'td-3': 'no_unusual_noise_during_drive',
      'td-4': 'dry_and_wet_brakes_tested',
      'td-5': 'dashboard_indicators_normal',
      'ae-1': 'exterior_washed_and_dried',
      'ae-2': 'interior_vacuumed_and_wiped',
      'ae-3': 'interior_disinfected',
      'ae-4': 'windows_and_mirrors_cleaned',
      'doc-1': 'all_work_order_documented',
      'doc-2': 'spare_parts_installation_verified',
      'doc-3': 'photos_before_after_taken'
    };

    const qcPayload = {
      qc_inspector: currentUserId,
      qc_notes: qcNotes,
      inspection_date: new Date().toISOString().split('T')[0],
    };

    [
      ...qcMechanicalChecks,
      ...qcTestDrive,
      ...qcAesthetics,
      ...qcDocumentation,
    ].forEach(item => {
      const fieldname = fieldMap[item.id];
      if (fieldname) {
        qcPayload[fieldname] = !!item.checked;
      }
    });

    return qcPayload;
  };

  const handleQCFinished = () => {
    if (!selectedOrder) return;

    // Validate all QC checklists
    const allMechanicalChecked = qcMechanicalChecks.every(item => item.checked);
    const allTestDriveChecked = qcTestDrive.every(item => item.checked);
    const allAestheticsChecked = qcAesthetics.every(item => item.checked);
    const allDocumentationChecked = qcDocumentation.every(item => item.checked);

    if (!allMechanicalChecked || !allTestDriveChecked || !allAestheticsChecked || !allDocumentationChecked) {
      alert('⚠️ Please complete all QC checklist items!');
      return;
    }

    const currentTime = new Date();
    const qcDate = currentTime.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const historyItem = {
      timestamp: qcDate,
      progress: 97,
      notes: `Quality Check finished by ${currentUserLabel}`,
      updatedBy: currentUserLabel
    };

    const updatedHistory = [...(selectedOrder.progressHistory || []), historyItem];

    const updatedQualityCheck = {
      ...(selectedOrder.qualityCheck || {}),
      service_order: selectedOrder.orderId || selectedOrder.id,
      ...buildQualityCheckPayload(),
    };

    const updatedOrder = {
      ...selectedOrder,
      repairStatus: 'qc-finished',
      repairProgress: 97,
      qcApproved: true,
      qcInspector: currentUserLabel, // Auto-fill from logged in user
      qcNotes,
      qcDate,
      progressHistory: updatedHistory,
      qualityCheck: updatedQualityCheck,
    };

    const updatedOrders = workOrders.map(o => 
      o.id === selectedOrder.id ? updatedOrder : o
    );

    saveWorkOrders(updatedOrders);
    setSelectedOrder(updatedOrder);

    alert(`✅ QC FINISHED!\n\nQC Inspector: ${currentUserLabel}\n\n➡️ Moving to Final Inspection...`);
    
    // Move to Final Inspection tab
    setCurrentTab('final');
  };

  const handleMoveToQC = () => {
    if (!selectedOrder) return;

    if (!selectedOrder.installedPartsApproved) {
      alert('⚠️ Please approve installed parts first!');
      setCurrentTab('parts');
      return;
    }

    const currentTime = new Date();
    const timestamp = currentTime.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const historyItem = {
      timestamp,
      progress: 95,
      notes: 'Moved to Quality Check - Ready for final inspection',
      updatedBy: selectedOrder.mechanicName || 'Mechanic'
    };

    const updatedHistory = [...(selectedOrder.progressHistory || []), historyItem];

    const updatedOrder = {
      ...selectedOrder,
      repairStatus: 'quality-check',
      repairProgress: 95,
      progressHistory: updatedHistory
    };

    const updatedOrders = workOrders.map(o => 
      o.id === selectedOrder.id ? updatedOrder : o
    );

    saveWorkOrders(updatedOrders);
    setSelectedOrder(updatedOrder);

    alert(`✅ Work order moved to Quality Check!\n\nStatus: Quality Check (95%)`);
    
    // Stay on QC tab to complete checklist
  };

  const handleFinalInspectionComplete = () => {
    if (!selectedOrder) return;

    const confirmed = confirm(`🎯 Complete Final Inspection?\n\nThis will mark the work order as FINAL INSPECTION and ready for handover.\n\nOrder ID: ${selectedOrder.orderId}\nCustomer: ${selectedOrder.customerName}\nVehicle: ${selectedOrder.vehicleBrand} ${selectedOrder.vehicleModel}`);

    if (!confirmed) return;

    const currentTime = new Date();
    const timestamp = currentTime.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const branchCode = (selectedOrder.branch || 'GAR').substring(0, 3).toUpperCase();
    const orderNumber = selectedOrder.orderId?.split('-')[1] || String(selectedOrder.id).padStart(3, '0');
    const draftInvoiceNumber = selectedOrder.invoiceNumber || `INV-${branchCode}-${orderNumber}`;
    const draftJournalEntryNumber = selectedOrder.journalEntryNumber || `JE-${branchCode}-${orderNumber}`;
    const draftPaymentEntryNumber = selectedOrder.paymentEntryNumber || `PAY-${branchCode}-${orderNumber}`;

    const historyItem = {
      timestamp,
      progress: 99,
      notes: `Final Inspection completed by ${currentUserLabel} - Ready for handover`,
      updatedBy: currentUserLabel
    };

    const updatedHistory = [...(selectedOrder.progressHistory || []), historyItem];

    const updatedOrder = {
      ...selectedOrder,
      repairStatus: 'final-inspection',
      status: 'ready-for-payment', // Update main status for Payment UI
      paymentStatus: 'pending',
      invoiceStatus: 'draft',
      journalEntryStatus: 'draft',
      paymentEntryStatus: 'draft',
      invoiceNumber: draftInvoiceNumber,
      journalEntryNumber: draftJournalEntryNumber,
      paymentEntryNumber: draftPaymentEntryNumber,
      invoiceCancelled: false,
      repairProgress: 99,
      finalInspectionCompleted: true,
      progressHistory: updatedHistory
    };

    const updatedOrders = workOrders.map(o => 
      o.id === selectedOrder.id ? updatedOrder : o
    );

    saveWorkOrders(updatedOrders);
    setShowUpdateModal(false);

    alert(`✅ FINAL INSPECTION COMPLETED!\n\nWork Order: ${selectedOrder.orderId}\nVehicle: ${selectedOrder.vehicleBrand} ${selectedOrder.vehicleModel}\n\n✓ Status: Final Inspection (99%)\n✓ Inspector: ${currentUserLabel}\n✓ Vehicle ready for payment\n\n➡️ Data sent to Payment\n➡️ Move to Step 7: Payment & Invoice`);
  };

  const handleStartRepair = (order) => {
    const confirmed = confirm(`🔧 Start repair for this work order?\n\nOrder ID: ${order.orderId}\nCustomer: ${order.customerName}\nVehicle: ${order.vehicleBrand} ${order.vehicleModel}\nMechanic: ${order.mechanicName}\n\nThis will change status to "In Progress".`);
    
    if (!confirmed) return;

    const currentTime = new Date();
    const timestamp = currentTime.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const historyItem = {
      timestamp,
      progress: 25,
      notes: 'Repair started - Parts preparation completed',
      updatedBy: order.mechanicName || 'Mechanic'
    };

    const updatedOrder = {
      ...order,
      repairStatus: 'in-progress',
      repairProgress: 25,
      repairStartTime: currentTime.toISOString(),
      progressHistory: [historyItem]
    };

    const updatedOrders = workOrders.map(o => 
      o.id === order.id ? updatedOrder : o
    );

    saveWorkOrders(updatedOrders);

    alert(`✅ Repair started successfully!\n\nWork Order: ${order.orderId}\nStatus: In Progress (25%)\nMechanic: ${order.mechanicName}`);
  };

  const handleOpenViewDetails = (order) => {
    setSelectedOrder(order);
    setShowViewDetailsModal(true);
  };

  const handleReOpenOrder = (order) => {
    // Check if order has active invoice
    if (order.invoiceNumber && order.invoiceStatus !== 'draft' && !order.invoiceCancelled) {
      alert(`❌ Tidak bisa Re-Open Order!\n\n📋 Order: ${order.orderId}\n📄 Invoice: ${order.invoiceNumber}\n\n⚠️ Order ini sudah memiliki invoice yang aktif.\n\n💡 Silakan batalkan invoice terlebih dahulu di menu Payment, kemudian Re-Open order ini.`);
      return;
    }
    
    if (!confirm(`⚠️ Re-Open Order?\n\nOrder: ${order.orderId}\nCustomer: ${order.customerName}\n\nOrder akan dikembalikan ke status In Progress, semua QC checklist di-reset, dan dihapus dari Payment. Lanjutkan?`)) {
      return;
    }

    // Get last progress before QC (find last history item before 95%)
    const lastProgressBeforeQC = order.progressHistory?.find(
      h => h.progress < 95
    )?.progress || 70;

    // 1. Update order status back to 'in-progress' and reset QC data
    const updatedOrder = {
      ...order,
      repairStatus: 'in-progress',
      status: 'in-progress',
      repairProgress: lastProgressBeforeQC,
      paymentStatus: undefined,
      invoiceStatus: undefined,
      journalEntryStatus: undefined,
      paymentEntryStatus: undefined,
      invoiceNumber: undefined,
      journalEntryNumber: undefined,
      paymentEntryNumber: undefined,
      // Reset QC data - must be re-checked
      qcApproved: false,
      qcInspector: undefined,
      qcNotes: '',
      qcDate: undefined,
      installedPartsApproved: false // Reset approval flag (but keep individual part.approved flags)
      // NOTE: Individual parts with approved=true will stay checked in the checklist
      // Only new parts (without approved flag) will need to be checked
    };

    // 2. Update workOrders in localStorage and backend
    const allOrders = getStoredWorkOrders();
    if (allOrders.length > 0) {
      const updatedOrders = allOrders.map((o) =>
        o.id === order.id ? updatedOrder : o
      );
      persistWorkOrders(updatedOrders);

      const filteredOrders = updatedOrders.filter((o) =>
        (o.mechanicName && o.mechanicName !== '') ||
        o.repairStatus === 'in-progress' ||
        o.repairStatus === 'quality-check' ||
        o.repairStatus === 'qc-finished' ||
        o.repairStatus === 'final-inspection'
      );
      setWorkOrders(filteredOrders);
    }

    // 3. Remove from Payment (if exists)
    const savedPayments = localStorage.getItem('payments');
    if (savedPayments) {
      const payments = JSON.parse(savedPayments);
      const filteredPayments = payments.filter((p) => p.orderId !== order.orderId);
      localStorage.setItem('payments', JSON.stringify(filteredPayments));
    }

    // 4. Reset all QC checklists (uncheck all)
    setPartsApprovalChecklist({});
    setQcMechanicalChecks(qcMechanicalChecks.map(item => ({ ...item, checked: false })));
    setQcTestDrive(qcTestDrive.map(item => ({ ...item, checked: false })));
    setQcAesthetics(qcAesthetics.map(item => ({ ...item, checked: false })));
    setQcDocumentation(qcDocumentation.map(item => ({ ...item, checked: false })));
    setQcNotes('');

    // 5. Open modal using handleOpenUpdate with forceTab
    // This will automatically check for installed parts and set correct tab
    handleOpenUpdate(updatedOrder, 'parts');

    // 6. Trigger custom event AFTER modal is opened (to avoid race condition)
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('workOrdersUpdated'));
      
      // Show alert
      alert(`✅ Order Re-Opened!\n\n📋 Order: ${order.orderId}\n🔄 Status: In Progress (${lastProgressBeforeQC}%)\n✅ Removed from Payment\n♻️ QC Data Reset\n\n💡 Modal Parts Verification sudah terbuka. Silakan cek ulang semua installed parts.`);
    }, 100);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateTotalCost = (spareParts) => {
    if (!spareParts || spareParts.length === 0) return 0;
    return spareParts.reduce((sum, part) => sum + part.totalPrice, 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'final-inspection':
        return <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 border border-purple-200">Final Inspection</span>;
      case 'qc-finished':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 border border-green-200">QC Finished</span>;
      case 'quality-check':
        return <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700 border border-amber-200">Quality Check</span>;
      case 'in-progress':
        return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200">In Progress</span>;
      case 'parts-prepared':
        return <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700 border border-emerald-200">Part Prepared</span>;
      case 'parts-requested':
        return <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700 border border-indigo-200">Parts Requested</span>;
      case 'waiting-parts':
        return <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700 border border-orange-200">Waiting Parts</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200">Ready to Start</span>;
    }
  };

  const stats = getStats();

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-slate-600 rounded-lg p-2">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-slate-800">Workshop - Repair & Quality Control</h1>
                <p className="text-slate-600">Step 5-6: Monitor repairs and perform quality checks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 mb-2">In Progress</p>
                <h3 className="text-slate-900">{stats.inProgress}</h3>
              </div>
              <div className="bg-blue-500 rounded-lg p-3">
                <Wrench className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 mb-2">Quality Check</p>
                <h3 className="text-slate-900">{stats.qualityCheck}</h3>
              </div>
              <div className="bg-amber-500 rounded-lg p-3">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 mb-2">Completed</p>
                <h3 className="text-slate-900">{stats.completed}</h3>
              </div>
              <div className="bg-emerald-500 rounded-lg p-3">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 mb-2">Delayed</p>
                <h3 className="text-slate-900">{stats.delayed}</h3>
              </div>
              <div className="bg-red-500 rounded-lg p-3">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Repairs - Table Layout */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-slate-800">Active Repairs</h3>
          </div>
          <div className="overflow-x-auto">
            {workOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p>No active repairs at the moment</p>
                <p className="text-sm mt-1">Work orders will appear here when mechanics are assigned</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-700 text-sm">Order ID</th>
                    <th className="px-4 py-3 text-left text-slate-700 text-sm">Customer</th>
                    <th className="px-4 py-3 text-left text-slate-700 text-sm">Vehicle</th>
                    <th className="px-4 py-3 text-left text-slate-700 text-sm">Service</th>
                    <th className="px-4 py-3 text-left text-slate-700 text-sm">Mechanic</th>
                    <th className="px-4 py-3 text-left text-slate-700 text-sm">Progress</th>
                    <th className="px-4 py-3 text-left text-slate-700 text-sm">Status</th>
                    <th className="px-4 py-3 text-center text-slate-700 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((order) => {
                    const progress = getAutoProgress(order);
                    const effectiveStatus = getEffectiveStatus(order);
                    return (
                      <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-slate-900">{order.orderId}</p>
                              <p className="text-slate-500 text-xs">{order.branch}</p>
                            </div>
                            {order.invoiceNumber && !order.invoiceCancelled && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-300 rounded text-xs whitespace-nowrap" title={`Invoice: ${order.invoiceNumber}`}>
                                📄 INV
                              </span>
                            )}
                            {order.invoiceNumber && order.invoiceCancelled && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-300 rounded text-xs whitespace-nowrap line-through" title={`Invoice cancelled: ${order.invoiceNumber}`}>
                                📄 INV
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-slate-900">{order.customerName}</p>
                          <p className="text-slate-500 text-xs">{order.phone}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-slate-900">{order.vehicleBrand} {order.vehicleModel}</p>
                          <p className="text-slate-500 text-xs">{order.plateNumber} • {order.vehicleYear}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-slate-900 text-sm">{order.serviceType}</p>
                          <p className="text-slate-500 text-xs">{order.estimatedRepairTime}h estimated</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-slate-900 text-sm">{order.mechanicName || '-'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="w-32">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-600">{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full transition-all ${
                                  progress === 100 ? 'bg-emerald-500' :
                                  progress >= 99 ? 'bg-purple-500' :
                                  progress >= 97 ? 'bg-green-500' :
                                  progress >= 95 ? 'bg-amber-500' :
                                  progress >= 50 ? 'bg-blue-500' :
                                  progress >= 25 ? 'bg-indigo-500' :
                                  'bg-slate-400'
                                }`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(effectiveStatus)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {effectiveStatus === 'final-inspection' ? (
                              <>
                                <Button 
                                  size="sm"
                                  className="bg-purple-500 hover:bg-purple-600 text-white"
                                  disabled
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Complete
                                </Button>
                                {(() => {
                                  const hasActiveInvoice =
                                    order.invoiceNumber &&
                                    order.invoiceStatus !== 'draft' &&
                                    !order.invoiceCancelled;
                                  return (
                                    <Button 
                                      size="sm"
                                      className="bg-orange-500 hover:bg-orange-600 text-white disabled:bg-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                                      onClick={() => handleReOpenOrder(order)}
                                      disabled={hasActiveInvoice}
                                      title={
                                        hasActiveInvoice 
                                          ? `❌ Tidak bisa Re-Open: Invoice ${order.invoiceNumber} sudah dibuat. Batalkan invoice di Payment terlebih dahulu.` 
                                          : '♻️ Re-Open order untuk revisi'
                                      }
                                    >
                                      <RotateCcw className="w-3 h-3 mr-1" />
                                      Re-Open
                                    </Button>
                                  );
                                })()}
                                <Button 
                                  size="sm"
                                  variant="outline" 
                                  className="border-slate-300"
                                  onClick={() => handleOpenViewDetails(order)}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </>
                            ) : effectiveStatus === 'qc-finished' || effectiveStatus === 'quality-check' ? (
                              <>
                                <Button 
                                  size="sm"
                                  className="bg-amber-500 hover:bg-amber-600 text-white"
                                  onClick={() => handleOpenUpdate(order)}
                                >
                                  <ClipboardCheck className="w-3 h-3 mr-1" />
                                  {effectiveStatus === 'qc-finished' ? 'Final' : 'QC Check'}
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline" 
                                  className="border-slate-300"
                                  onClick={() => handleOpenViewDetails(order)}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </>
                            ) : effectiveStatus === 'in-progress' ? (
                              <>
                                <Button 
                                  size="sm"
                                  className="bg-blue-500 hover:bg-blue-600 text-white"
                                  onClick={() => handleOpenUpdate(order)}
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  Update
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline" 
                                  className="border-slate-300"
                                  onClick={() => handleOpenViewDetails(order)}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => handleStartRepair(order)}
                                  disabled={effectiveStatus !== 'parts-prepared'}
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  {effectiveStatus === 'parts-prepared' ? 'Start' : 'Waiting'}
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline" 
                                  className="border-slate-300"
                                  onClick={() => handleOpenViewDetails(order)}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Update with 4 Tabs */}
      {showUpdateModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-lg p-2">
                    {currentTab === 'final' ? (
                      <ListChecks className="w-5 h-5 text-blue-600" />
                    ) : currentTab === 'qc' ? (
                      <ClipboardCheck className="w-5 h-5 text-blue-600" />
                    ) : currentTab === 'parts' ? (
                      <PackageCheck className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Wrench className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-slate-800">
                      {currentTab === 'final' ? 'Final Inspection' : 
                       currentTab === 'qc' ? 'Quality Check Inspection' : 
                       currentTab === 'parts' ? 'Installed Parts Verification' : 
                       'Update Work Progress'}
                    </h3>
                    <p className="text-slate-600 text-sm">{selectedOrder.orderId} • {selectedOrder.customerName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowUpdateModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-slate-200 -mb-4">
                <button
                  onClick={() => setCurrentTab('progress')}
                  className={`px-4 py-2 border-b-2 transition-colors ${
                    currentTab === 'progress'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  disabled={selectedOrder.repairStatus === 'quality-check' || selectedOrder.repairStatus === 'qc-finished' || selectedOrder.repairStatus === 'final-inspection'}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">1. Progress</span>
                    {selectedOrder.repairProgress && selectedOrder.repairProgress > 0 && (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setCurrentTab('parts')}
                  className={`px-4 py-2 border-b-2 transition-colors ${
                    currentTab === 'parts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  disabled={selectedOrder.repairStatus === 'quality-check' || selectedOrder.repairStatus === 'qc-finished' || selectedOrder.repairStatus === 'final-inspection'}
                >
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-4 h-4" />
                    <span className="text-sm">2. Parts</span>
                    {selectedOrder.installedPartsApproved ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : selectedOrder.spareParts && selectedOrder.spareParts.length > 0 && (
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setCurrentTab('qc')}
                  className={`px-4 py-2 border-b-2 transition-colors ${
                    currentTab === 'qc'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  disabled={selectedOrder.repairStatus === 'final-inspection'}
                >
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4" />
                    <span className="text-sm">3. QC</span>
                    {selectedOrder.qcApproved && (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setCurrentTab('final')}
                  className={`px-4 py-2 border-b-2 transition-colors ${
                    currentTab === 'final'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  disabled={!selectedOrder.qcApproved}
                >
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    <span className="text-sm">4. Final</span>
                    {selectedOrder.finalInspectionCompleted && (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Tab 1: Progress Update */}
              {currentTab === 'progress' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600 mb-1">Vehicle</p>
                        <p className="text-slate-900">{selectedOrder.vehicleBrand} {selectedOrder.vehicleModel} - {selectedOrder.plateNumber}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-1">Mechanic</p>
                        <p className="text-slate-900">{selectedOrder.mechanicName}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-700 mb-2 block">Repair Progress: <span className="text-blue-600">{progressValue}%</span></label>
                    <input
                      type="range"
                      min="25"
                      max="90"
                      step="5"
                      value={progressValue}
                      onChange={(e) => setProgressValue(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>90%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-700 mb-2 block">Progress Notes</label>
                    <textarea
                      value={progressNotes}
                      onChange={(e) => setProgressNotes(e.target.value)}
                      placeholder="Describe the work completed..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                    <Button
                      variant="outline"
                      onClick={() => setShowUpdateModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={handleSaveProgress}
                    >
                      Save & Continue →
                    </Button>
                  </div>
                </div>
              )}

              {/* Tab 2: Parts Approval - TABLE FORMAT */}
              {currentTab === 'parts' && (
                <div className="space-y-6">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-orange-900 text-sm">
                      ⚠️ <strong>IMPORTANT:</strong> Verify that all spare parts have been properly installed. Check all items before proceeding to Quality Check.
                    </p>
                  </div>

                  {selectedOrder.spareParts && selectedOrder.spareParts.length > 0 ? (
                    <>
                      <div>
                        <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-2 rounded-lg mb-3">
                          <h4 className="text-blue-900 flex items-center gap-2">
                            <PackageCheck className="w-5 h-5 text-blue-600" />
                            Installed Parts Verification
                          </h4>
                        </div>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-3 text-center text-slate-700 text-sm w-16">✓</th>
                                <th className="px-4 py-3 text-left text-slate-700 text-sm">Part Name</th>
                                <th className="px-4 py-3 text-left text-slate-700 text-sm">Part Number</th>
                                <th className="px-4 py-3 text-center text-slate-700 text-sm">Qty</th>
                                <th className="px-4 py-3 text-right text-slate-700 text-sm">Unit Price</th>
                                <th className="px-4 py-3 text-right text-slate-700 text-sm">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedOrder.spareParts
                                .filter(part => part.status !== 'rejected') // Only show parts that are NOT rejected
                                .map((part) => (
                                <tr key={part.id} className="border-t border-slate-100 hover:bg-slate-50">
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={partsApprovalChecklist[part.id] || false}
                                      onChange={(e) => {
                                        setPartsApprovalChecklist({
                                          ...partsApprovalChecklist,
                                          [part.id]: e.target.checked
                                        });
                                      }}
                                      className="w-5 h-5 rounded border-slate-300"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-slate-900">{part.name}</td>
                                  <td className="px-4 py-3 text-slate-700">{part.partNumber}</td>
                                  <td className="px-4 py-3 text-center text-slate-900">{part.quantity}</td>
                                  <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(part.unitPrice)}</td>
                                  <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(part.totalPrice)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-700 mb-2 block">Service Advisor</label>
                        <input
                          type="text"
                          value={currentUserLabel}
                          disabled
                          className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700"
                        />
                        <p className="text-slate-500 text-xs mt-1">Auto-filled from logged in user</p>
                      </div>

                      {selectedOrder.installedPartsApproved && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-emerald-900">
                            <CheckCircle className="w-5 h-5" />
                            <div>
                              <p>Parts installation approved</p>
                              <p className="text-sm">By: {selectedOrder.installedPartsApprovedBy} • {selectedOrder.installedPartsApprovedDate}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentTab('progress')}
                        >
                          ← Back
                        </Button>
                        {!selectedOrder.installedPartsApproved ? (
                          <Button
                            className="bg-emerald-500 hover:bg-emerald-600 text-white"
                            onClick={handleApproveInstalledParts}
                          >
                            ✓ Approve Parts Installation
                          </Button>
                        ) : (
                          <Button
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={() => setCurrentTab('qc')}
                          >
                            Continue to QC →
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p>No spare parts to verify</p>
                      <Button
                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={() => setCurrentTab('qc')}
                      >
                        Continue to QC →
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Quality Check */}
              {currentTab === 'qc' && (
                <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-900 text-sm">
                      🔍 QC Inspector: Complete comprehensive quality check before final approval
                    </p>
                  </div>

                  {/* 2 COLUMN LAYOUT FOR QC CHECKLISTS */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* LEFT COLUMN */}
                    <div className="space-y-6">
                      {/* Mechanical Checks */}
                      <div>
                        <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-2 rounded-lg mb-3">
                          <h4 className="text-blue-900 flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-blue-600" />
                            Mechanical Inspection
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {qcMechanicalChecks.map((item) => (
                            <label key={item.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={(e) => {
                                  setQcMechanicalChecks(qcMechanicalChecks.map(i => 
                                    i.id === item.id ? { ...i, checked: e.target.checked } : i
                                  ));
                                }}
                                className="w-5 h-5 rounded border-slate-300"
                              />
                              <span className="text-slate-700 text-sm">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Test Drive */}
                      <div>
                        <div className="bg-emerald-50 border-l-4 border-emerald-500 px-4 py-2 rounded-lg mb-3">
                          <h4 className="text-emerald-900 flex items-center gap-2">
                            🚗 Test Drive Verification
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {qcTestDrive.map((item) => (
                            <label key={item.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={(e) => {
                                  setQcTestDrive(qcTestDrive.map(i => 
                                    i.id === item.id ? { ...i, checked: e.target.checked } : i
                                  ));
                                }}
                                className="w-5 h-5 rounded border-slate-300"
                              />
                              <span className="text-slate-700 text-sm">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-6">
                      {/* Aesthetics */}
                      <div>
                        <div className="bg-purple-50 border-l-4 border-purple-500 px-4 py-2 rounded-lg mb-3">
                          <h4 className="text-purple-900 flex items-center gap-2">
                            ✨ Aesthetics & Cleanliness
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {qcAesthetics.map((item) => (
                            <label key={item.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={(e) => {
                                  setQcAesthetics(qcAesthetics.map(i => 
                                    i.id === item.id ? { ...i, checked: e.target.checked } : i
                                  ));
                                }}
                                className="w-5 h-5 rounded border-slate-300"
                              />
                              <span className="text-slate-700 text-sm">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Documentation */}
                      <div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 px-4 py-2 rounded-lg mb-3">
                          <h4 className="text-amber-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-600" />
                            Documentation
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {qcDocumentation.map((item) => (
                            <label key={item.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={(e) => {
                                  setQcDocumentation(qcDocumentation.map(i => 
                                    i.id === item.id ? { ...i, checked: e.target.checked } : i
                                  ));
                                }}
                                className="w-5 h-5 rounded border-slate-300"
                              />
                              <span className="text-slate-700 text-sm">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QC Inspector & Notes - Full Width Below */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* QC Inspector - Auto-filled */}
                    <div>
                      <label className="text-slate-700 mb-2 block">QC Inspector</label>
                      <input
                        type="text"
                        value={currentUserLabel}
                        disabled
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700"
                      />
                      <p className="text-slate-500 text-xs mt-1">Auto-filled from logged in user</p>
                    </div>

                    {/* QC Notes */}
                    <div>
                      <label className="text-slate-700 mb-2 block">QC Notes (Optional)</label>
                      <textarea
                        value={qcNotes}
                        onChange={(e) => setQcNotes(e.target.value)}
                        placeholder="Add any additional observations..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                    <Button
                      variant="outline"
                      onClick={() => setShowUpdateModal(false)}
                    >
                      Cancel
                    </Button>
                    {selectedOrder.repairStatus !== 'quality-check' && selectedOrder.repairStatus !== 'qc-finished' ? (
                      <Button
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={handleMoveToQC}
                      >
                        Move to Quality Check
                      </Button>
                    ) : (
                      <Button
                        className="bg-green-500 hover:bg-green-600 text-white"
                        onClick={handleQCFinished}
                      >
                        ✅ QC Finished
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Final Inspection - SUMMARY */}
              {currentTab === 'final' && (
                <div className="space-y-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-purple-900">
                      🎯 Final Inspection Summary - Review all completed work before handover
                    </p>
                  </div>

                  {/* Customer & Vehicle Summary */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                      <h4 className="text-slate-800 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        Customer Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Name:</span>
                          <span className="text-slate-900">{selectedOrder.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Phone:</span>
                          <span className="text-slate-900">{selectedOrder.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Branch:</span>
                          <span className="text-slate-900">{selectedOrder.branch}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                      <h4 className="text-slate-800 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        Vehicle Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Vehicle:</span>
                          <span className="text-slate-900">{selectedOrder.vehicleBrand} {selectedOrder.vehicleModel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Plate:</span>
                          <span className="text-slate-900">{selectedOrder.plateNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Year:</span>
                          <span className="text-slate-900">{selectedOrder.vehicleYear}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Work Summary */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h4 className="text-slate-800 mb-3 flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-blue-600" />
                      Work Completed
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Service Type:</span>
                        <span className="text-slate-900">{selectedOrder.serviceType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Mechanic:</span>
                        <span className="text-slate-900">{selectedOrder.mechanicName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Estimated Time:</span>
                        <span className="text-slate-900">{selectedOrder.estimatedRepairTime} hours</span>
                      </div>
                    </div>
                  </div>

                  {/* Approval Status */}
                  <div className="space-y-3">
                    <h4 className="text-slate-800">Approval Status</h4>
                    
                    {selectedOrder.installedPartsApproved && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-emerald-900">Parts Installation Approved</p>
                          <p className="text-emerald-700">By: {selectedOrder.installedPartsApprovedBy} • {selectedOrder.installedPartsApprovedDate}</p>
                        </div>
                      </div>
                    )}

                    {selectedOrder.qcApproved && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-emerald-900">Quality Check Completed</p>
                          <p className="text-emerald-700">By: {selectedOrder.qcInspector} • {selectedOrder.qcDate}</p>
                          {selectedOrder.qcNotes && <p className="text-emerald-700 mt-1">Notes: {selectedOrder.qcNotes}</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Spare Parts Summary */}
                  {selectedOrder.spareParts && selectedOrder.spareParts.length > 0 && (
                    <div>
                      <h4 className="text-slate-800 mb-3">Parts Used</h4>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-slate-700">Part Name</th>
                              <th className="px-3 py-2 text-center text-slate-700">Qty</th>
                              <th className="px-3 py-2 text-right text-slate-700">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedOrder.spareParts.map((part) => (
                              <tr key={part.id} className="border-t border-slate-100">
                                <td className="px-3 py-2 text-slate-900">{part.name}</td>
                                <td className="px-3 py-2 text-center text-slate-900">{part.quantity}</td>
                                <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(part.totalPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-purple-50 border-t-2 border-purple-200">
                            <tr>
                              <td colSpan={2} className="px-3 py-2 text-right text-purple-900">Grand Total:</td>
                              <td className="px-3 py-2 text-right text-purple-900">{formatCurrency(calculateTotalCost(selectedOrder.spareParts))}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Final Confirmation */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-900">
                        <p className="mb-1">By clicking "Complete", you confirm that:</p>
                        <ul className="list-disc ml-5 space-y-1">
                          <li>All repairs have been completed and verified</li>
                          <li>Vehicle is in excellent condition</li>
                          <li>Ready for customer handover</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                    <Button
                      variant="outline"
                      onClick={() => setShowUpdateModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-purple-500 hover:bg-purple-600 text-white"
                      onClick={handleFinalInspectionComplete}
                    >
                      ✅ Complete Final Inspection
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Details */}
      {showViewDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 rounded-lg p-2">
                  <FileText className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="text-slate-800">Work Order Details - {selectedOrder.orderId}</h3>
              </div>
              <button 
                onClick={() => setShowViewDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-slate-800 mb-3 pb-2 border-b border-slate-200">Customer Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Name:</span>
                      <span className="text-slate-900">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Phone:</span>
                      <span className="text-slate-900">{selectedOrder.phone}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-slate-800 mb-3 pb-2 border-b border-slate-200">Vehicle Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Vehicle:</span>
                      <span className="text-slate-900">{selectedOrder.vehicleBrand} {selectedOrder.vehicleModel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Plate:</span>
                      <span className="text-slate-900">{selectedOrder.plateNumber}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrder.spareParts && selectedOrder.spareParts.length > 0 && (
                <div>
                  <h4 className="text-slate-800 mb-3 pb-2 border-b border-slate-200">Spare Parts</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-700">Part Name</th>
                          <th className="px-3 py-2 text-center text-slate-700">Qty</th>
                          <th className="px-3 py-2 text-right text-slate-700">Price</th>
                          <th className="px-3 py-2 text-right text-slate-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.spareParts.map((part) => (
                          <tr key={part.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-900">{part.name}</td>
                            <td className="px-3 py-2 text-center text-slate-900">{part.quantity}</td>
                            <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(part.unitPrice)}</td>
                            <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(part.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-right text-blue-900">Grand Total:</td>
                          <td className="px-3 py-2 text-right text-blue-900">{formatCurrency(calculateTotalCost(selectedOrder.spareParts))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {selectedOrder.progressHistory && selectedOrder.progressHistory.length > 0 && (
                <div>
                  <h4 className="text-slate-800 mb-3 pb-2 border-b border-slate-200">Progress History</h4>
                  <div className="space-y-2">
                    {selectedOrder.progressHistory.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg text-sm">
                        <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-slate-900">{item.notes}</p>
                            <span className="text-blue-600">{item.progress}%</span>
                          </div>
                          <p className="text-slate-500 text-xs">{item.timestamp} • {item.updatedBy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowViewDetailsModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
