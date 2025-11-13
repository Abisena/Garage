'use client';


import React, { useState, useEffect } from 'react';
import { Wrench, CheckCircle, Clock, AlertCircle, X, Eye, FileText, ClipboardCheck } from 'lucide-react';
import { Button } from './ui/button';

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
  mechanicName?: string;
  repairProgress?: number;
  repairStartTime?: string;
  progressHistory?: ProgressHistoryItem[];
  qcApproved?: boolean;
  qcInspector?: string;
  qcNotes?: string;
  qcDate?: string;
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

interface ProgressHistoryItem {
  timestamp: string;
  progress: number;
  notes: string;
  updatedBy: string;
}

export function Workshop() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [showUpdateProgressModal, setShowUpdateProgressModal] = useState(false);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
  const [showApproveQCModal, setShowApproveQCModal] = useState(false);
  const [showViewChecklistModal, setShowViewChecklistModal] = useState(false);

  // Update Progress Modal State
  const [progressValue, setProgressValue] = useState(0);
  const [progressNotes, setProgressNotes] = useState('');
  const [progressStatus, setProgressStatus] = useState<'in-progress' | 'quality-check'>('in-progress');

  // Approve QC Modal State
  const [qcChecklist, setQcChecklist] = useState([
    { id: 1, label: 'All repairs completed as specified', checked: false },
    { id: 2, label: 'No unusual noises or vibrations', checked: false },
    { id: 3, label: 'All systems functioning properly', checked: false },
    { id: 4, label: 'Test drive completed successfully', checked: false },
    { id: 5, label: 'Vehicle cleaned and prepared', checked: false }
  ]);
  const [qcInspector, setQcInspector] = useState('');
  const [qcNotes, setQcNotes] = useState('');

  const qcInspectors = [
    'Hendra Kusuma',
    'Irfan Hakim',
    'Joko Widodo',
    'Kusuma Atmaja'
  ];

  useEffect(() => {
    loadWorkOrders();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      loadWorkOrders();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const loadWorkOrders = () => {
    const savedWorkOrders = localStorage.getItem('workOrders');
    if (savedWorkOrders) {
      const orders = JSON.parse(savedWorkOrders);
      // Filter orders that are ready for workshop (have mechanic assigned or already in progress/QC)
      const activeOrders = orders.filter((order: WorkOrder) => 
        (order.mechanicName && order.mechanicName !== '') || // Has mechanic assigned
        order.repairStatus === 'in-progress' || 
        order.repairStatus === 'quality-check'
      );
      setWorkOrders(activeOrders);
    }
  };

  const saveWorkOrders = (updatedOrders: WorkOrder[]) => {
    const savedWorkOrders = localStorage.getItem('workOrders');
    if (savedWorkOrders) {
      const allOrders = JSON.parse(savedWorkOrders);
      const updatedAllOrders = allOrders.map((order: WorkOrder) => {
        const updated = updatedOrders.find(o => o.id === order.id);
        return updated || order;
      });
      localStorage.setItem('workOrders', JSON.stringify(updatedAllOrders));
      loadWorkOrders();
      window.dispatchEvent(new Event('storage'));
    }
  };

  const getStats = () => {
    const inProgress = workOrders.filter(o => o.repairStatus === 'in-progress').length;
    const qualityCheck = workOrders.filter(o => o.repairStatus === 'quality-check').length;
    
    // Count completed from all orders
    const savedWorkOrders = localStorage.getItem('workOrders');
    let completed = 0;
    let delayed = 0;
    
    if (savedWorkOrders) {
      const allOrders = JSON.parse(savedWorkOrders);
      completed = allOrders.filter((o: WorkOrder) => o.repairStatus === 'completed' && o.qcApproved).length;
      
      // Check for delayed orders (estimate time passed)
      const now = new Date();
      delayed = workOrders.filter((o: WorkOrder) => {
        if (!o.repairStartTime || !o.estimatedRepairTime) return false;
        const estimatedHours = parseInt(o.estimatedRepairTime);
        const startTime = new Date(o.repairStartTime);
        const estimatedEndTime = new Date(startTime.getTime() + estimatedHours * 60 * 60 * 1000);
        return now > estimatedEndTime && o.repairStatus !== 'completed';
      }).length;
    }
    
    return { inProgress, qualityCheck, completed, delayed };
  };

  const handleOpenUpdateProgress = (order: WorkOrder) => {
    setSelectedOrder(order);
    setProgressValue(order.repairProgress || 0);
    setProgressNotes('');
    setProgressStatus(order.repairStatus as 'in-progress' | 'quality-check');
    setShowUpdateProgressModal(true);
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

    // Add to progress history
    const historyItem: ProgressHistoryItem = {
      timestamp,
      progress: progressValue,
      notes: progressNotes || `Progress updated to ${progressValue}%`,
      updatedBy: selectedOrder.mechanicName || 'Mechanic'
    };

    const updatedHistory = [...(selectedOrder.progressHistory || []), historyItem];

    // Update work order
    const updatedOrder = {
      ...selectedOrder,
      repairProgress: progressValue,
      repairStatus: progressStatus,
      progressHistory: updatedHistory
    };

    // If moved to quality check, set start time if not exists
    if (progressStatus === 'quality-check' && !selectedOrder.repairStartTime) {
      updatedOrder.repairStartTime = currentTime.toISOString();
    }

    const updatedOrders = workOrders.map(o => 
      o.id === selectedOrder.id ? updatedOrder : o
    );

    saveWorkOrders(updatedOrders);
    setShowUpdateProgressModal(false);

    alert(`✅ Progress updated successfully!\n\nWork Order: ${selectedOrder.orderId}\nProgress: ${progressValue}%\nStatus: ${progressStatus === 'quality-check' ? 'Moved to Quality Check' : 'In Progress'}`);
  };

  const handleOpenViewDetails = (order: WorkOrder) => {
    setSelectedOrder(order);
    setShowViewDetailsModal(true);
  };

  const handleOpenApproveQC = (order: WorkOrder) => {
    setSelectedOrder(order);
    setQcChecklist([
      { id: 1, label: 'All repairs completed as specified', checked: false },
      { id: 2, label: 'No unusual noises or vibrations', checked: false },
      { id: 3, label: 'All systems functioning properly', checked: false },
      { id: 4, label: 'Test drive completed successfully', checked: false },
      { id: 5, label: 'Vehicle cleaned and prepared', checked: false }
    ]);
    setQcInspector('');
    setQcNotes('');
    setShowApproveQCModal(true);
  };

  const handleApproveQC = () => {
    if (!selectedOrder) return;

    // Check if all checklist items are checked
    const allChecked = qcChecklist.every(item => item.checked);
    if (!allChecked) {
      alert('⚠️ Please complete all checklist items before approving!');
      return;
    }

    if (!qcInspector) {
      alert('⚠️ Please select a QC Inspector!');
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

    // Update work order
    const updatedOrder = {
      ...selectedOrder,
      repairStatus: 'completed',
      repairProgress: 100,
      qcApproved: true,
      qcInspector,
      qcNotes,
      qcDate
    };

    const updatedOrders = workOrders.map(o => 
      o.id === selectedOrder.id ? updatedOrder : o
    );

    saveWorkOrders(updatedOrders);
    setShowApproveQCModal(false);

    alert(`✅ QC Approved Successfully!\n\nWork Order: ${selectedOrder.orderId}\nVehicle: ${selectedOrder.vehicleBrand} ${selectedOrder.vehicleModel}\n\n✓ Vehicle is now ready for handover\n✓ Status: COMPLETED\n✓ QC Inspector: ${qcInspector}\n\n➡️ Move to Step 7: Handover & Delivery`);
  };

  const handleOpenViewChecklist = (order: WorkOrder) => {
    setSelectedOrder(order);
    setShowViewChecklistModal(true);
  };

  const handleStartRepair = (order: WorkOrder) => {
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

    // Create first progress history entry
    const historyItem: ProgressHistoryItem = {
      timestamp,
      progress: 0,
      notes: 'Repair started',
      updatedBy: order.mechanicName || 'Mechanic'
    };

    const updatedOrder = {
      ...order,
      repairStatus: 'in-progress',
      repairProgress: 0,
      repairStartTime: currentTime.toISOString(),
      progressHistory: [historyItem]
    };

    const updatedOrders = workOrders.map(o => 
      o.id === order.id ? updatedOrder : o
    );

    saveWorkOrders(updatedOrders);

    alert(`✅ Repair started successfully!\n\nWork Order: ${order.orderId}\nStatus: In Progress\nMechanic: ${order.mechanicName}\n\nYou can now update progress using "Update Progress" button.`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateTotalCost = (spareParts?: SparePart[]) => {
    if (!spareParts || spareParts.length === 0) return 0;
    return spareParts.reduce((sum, part) => sum + part.totalPrice, 0);
  };

  const calculateDPP = (total: number) => {
    return total / 1.11;
  };

  const calculatePPN = (dpp: number) => {
    return dpp * 0.11;
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

        {/* Active Repairs */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-slate-800">Active Repairs</h3>
          </div>
          <div className="p-6 space-y-4">
            {workOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p>No active repairs at the moment</p>
                <p className="text-sm mt-1">Work orders will appear here when mechanics start repairs</p>
              </div>
            ) : (
              workOrders.map((order) => (
                <div key={order.id} className="border border-slate-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-slate-900">{order.customerName}</h4>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-600">{order.orderId}</span>
                      </div>
                      <p className="text-slate-600">{order.vehicleBrand} {order.vehicleModel} {order.vehicleYear} - {order.plateNumber}</p>
                      <p className="text-slate-700">{order.serviceType}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full border ${
                      order.repairStatus === 'quality-check'
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : order.repairStatus === 'in-progress'
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {order.repairStatus === 'quality-check' ? 'Quality Check' : order.repairStatus === 'in-progress' ? 'In Progress' : 'Ready to Start'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-slate-500 mb-1">Mechanic</p>
                      <p className="text-slate-900">{order.mechanicName || 'Not Assigned'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Branch</p>
                      <p className="text-slate-900">{order.branch}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Est. Repair Time</p>
                      <p className="text-slate-900">{order.estimatedRepairTime} hours</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-700">Progress</span>
                      <span className="text-slate-900">{order.repairProgress || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${order.repairProgress || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    {order.repairStatus === 'quality-check' ? (
                      <>
                        <Button 
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                          onClick={() => handleOpenApproveQC(order)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve QC
                        </Button>
                        <Button 
                          variant="outline" 
                          className="border-slate-300"
                          onClick={() => handleOpenViewChecklist(order)}
                        >
                          <ClipboardCheck className="w-4 h-4 mr-2" />
                          View Checklist
                        </Button>
                        <Button 
                          variant="outline" 
                          className="border-slate-300"
                          onClick={() => handleOpenViewDetails(order)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => handleOpenUpdateProgress(order)}
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Update Progress
                        </Button>
                        <Button 
                          variant="outline" 
                          className="border-slate-300"
                          onClick={() => handleOpenViewDetails(order)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quality Check Checklist Reference */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-slate-800 mb-4">Quality Check Checklist Reference</h3>
          <p className="text-slate-600 text-sm mb-4">Standard checklist items for QC approval</p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-slate-400" />
              <span className="text-slate-700">All repairs completed as specified</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-slate-400" />
              <span className="text-slate-700">No unusual noises or vibrations</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-slate-400" />
              <span className="text-slate-700">All systems functioning properly</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-slate-400" />
              <span className="text-slate-700">Test drive completed successfully</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-slate-400" />
              <span className="text-slate-700">Vehicle cleaned and prepared</span>
            </label>
          </div>
        </div>
      </div>

      {/* Modal: Update Progress */}
      {showUpdateProgressModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-slate-800">Update Repair Progress</h3>
              </div>
              <button 
                onClick={() => setShowUpdateProgressModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Work Order Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Work Order</p>
                    <p className="text-slate-900">{selectedOrder.orderId}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Customer</p>
                    <p className="text-slate-900">{selectedOrder.customerName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-600 text-sm mb-1">Vehicle</p>
                    <p className="text-slate-900">{selectedOrder.vehicleBrand} {selectedOrder.vehicleModel} - {selectedOrder.plateNumber}</p>
                  </div>
                </div>
              </div>

              {/* Current Progress */}
              <div>
                <p className="text-slate-700 mb-2">Current Progress: <span className="text-blue-600">{selectedOrder.repairProgress || 0}%</span></p>
              </div>

              {/* Progress Slider */}
              <div>
                <label className="text-slate-700 mb-2 block">Update Progress: <span className="text-blue-600">{progressValue}%</span></label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressValue}
                  onChange={(e) => setProgressValue(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Status Selection */}
              <div>
                <label className="text-slate-700 mb-2 block">Status</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="status"
                      value="in-progress"
                      checked={progressStatus === 'in-progress'}
                      onChange={(e) => setProgressStatus(e.target.value as 'in-progress')}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-slate-900">Keep in Progress</p>
                      <p className="text-slate-500 text-sm">Repair is still ongoing</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="status"
                      value="quality-check"
                      checked={progressStatus === 'quality-check'}
                      onChange={(e) => setProgressStatus(e.target.value as 'quality-check')}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-slate-900">Move to Quality Check</p>
                      <p className="text-slate-500 text-sm">Repair completed, ready for QC inspection</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-slate-700 mb-2 block">Notes (Optional)</label>
                <textarea
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  placeholder="Add any notes about the progress update..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowUpdateProgressModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={handleSaveProgress}
                >
                  💾 Save Progress
                </Button>
              </div>
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
                <h3 className="text-slate-800">Work Order Details</h3>
              </div>
              <button 
                onClick={() => setShowViewDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div>
                <h4 className="text-slate-800 mb-3 border-b border-slate-200 pb-2">Customer Information</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Name</p>
                    <p className="text-slate-900">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Phone</p>
                    <p className="text-slate-900">{selectedOrder.phone}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Email</p>
                    <p className="text-slate-900">{selectedOrder.email || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div>
                <h4 className="text-slate-800 mb-3 border-b border-slate-200 pb-2">Vehicle Information</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Brand</p>
                    <p className="text-slate-900">{selectedOrder.vehicleBrand}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Model</p>
                    <p className="text-slate-900">{selectedOrder.vehicleModel}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Year</p>
                    <p className="text-slate-900">{selectedOrder.vehicleYear}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Plate Number</p>
                    <p className="text-slate-900">{selectedOrder.plateNumber}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Kilometer</p>
                    <p className="text-slate-900">{selectedOrder.kilometer || '-'} km</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Chassis Number</p>
                    <p className="text-slate-900">{selectedOrder.chassisNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Engine Number</p>
                    <p className="text-slate-900">{selectedOrder.engineNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Fuel Type</p>
                    <p className="text-slate-900">{selectedOrder.fuel || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Assembly Type</p>
                    <p className="text-slate-900">{selectedOrder.assemblyType || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Service Information */}
              <div>
                <h4 className="text-slate-800 mb-3 border-b border-slate-200 pb-2">Service Information</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Service Type</p>
                    <p className="text-slate-900">{selectedOrder.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Customer Complaint</p>
                    <p className="text-slate-900">{selectedOrder.customerComplaint || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Diagnosis</p>
                    <p className="text-slate-900">{selectedOrder.diagnosis}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Recommended Parts</p>
                    <p className="text-slate-900">{selectedOrder.recommendedParts}</p>
                  </div>
                </div>
              </div>

              {/* Spare Parts Used */}
              {selectedOrder.spareParts && selectedOrder.spareParts.length > 0 && (
                <div>
                  <h4 className="text-slate-800 mb-3 border-b border-slate-200 pb-2">Spare Parts Used</h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-slate-700">#</th>
                          <th className="px-4 py-2 text-left text-slate-700">Part Name</th>
                          <th className="px-4 py-2 text-left text-slate-700">Part Number</th>
                          <th className="px-4 py-2 text-center text-slate-700">Qty</th>
                          <th className="px-4 py-2 text-right text-slate-700">Unit Price</th>
                          <th className="px-4 py-2 text-right text-slate-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.spareParts.map((part, index) => (
                          <tr key={part.id} className="border-t border-slate-100">
                            <td className="px-4 py-2 text-slate-600">{index + 1}</td>
                            <td className="px-4 py-2 text-slate-900">{part.name}</td>
                            <td className="px-4 py-2 text-slate-700">{part.partNumber}</td>
                            <td className="px-4 py-2 text-center text-slate-900">{part.quantity}</td>
                            <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(part.unitPrice)}</td>
                            <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(part.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-right text-slate-700">Subtotal (DPP):</td>
                          <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(calculateDPP(calculateTotalCost(selectedOrder.spareParts)))}</td>
                        </tr>
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-right text-slate-700">PPN 11%:</td>
                          <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(calculatePPN(calculateDPP(calculateTotalCost(selectedOrder.spareParts))))}</td>
                        </tr>
                        <tr className="bg-blue-50 border-t border-blue-200">
                          <td colSpan={5} className="px-4 py-3 text-right text-blue-900">Total Cost:</td>
                          <td className="px-4 py-3 text-right text-blue-900">{formatCurrency(calculateTotalCost(selectedOrder.spareParts))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Repair Timeline */}
              <div>
                <h4 className="text-slate-800 mb-3 border-b border-slate-200 pb-2">Repair Timeline</h4>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4">
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Estimated Repair Time</p>
                    <p className="text-slate-900">{selectedOrder.estimatedRepairTime} hours</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Current Progress</p>
                    <p className="text-slate-900">{selectedOrder.repairProgress || 0}%</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Mechanic</p>
                    <p className="text-slate-900">{selectedOrder.mechanicName || 'Not Assigned'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Branch</p>
                    <p className="text-slate-900">{selectedOrder.branch}</p>
                  </div>
                </div>
              </div>

              {/* Progress History */}
              {selectedOrder.progressHistory && selectedOrder.progressHistory.length > 0 && (
                <div>
                  <h4 className="text-slate-800 mb-3 border-b border-slate-200 pb-2">Progress History</h4>
                  <div className="space-y-2">
                    {selectedOrder.progressHistory.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-slate-900">{item.notes}</p>
                            <span className="text-blue-600">{item.progress}%</span>
                          </div>
                          <p className="text-slate-500 text-sm">{item.timestamp} • {item.updatedBy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowViewDetailsModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Approve QC */}
      {showApproveQCModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 rounded-lg p-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-slate-800">Quality Control Approval</h3>
              </div>
              <button 
                onClick={() => setShowApproveQCModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Work Order Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Work Order</p>
                    <p className="text-slate-900">{selectedOrder.orderId}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Customer</p>
                    <p className="text-slate-900">{selectedOrder.customerName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-600 text-sm mb-1">Vehicle</p>
                    <p className="text-slate-900">{selectedOrder.vehicleBrand} {selectedOrder.vehicleModel} - {selectedOrder.plateNumber}</p>
                  </div>
                </div>
              </div>

              {/* QC Checklist */}
              <div>
                <h4 className="text-slate-700 mb-3">Quality Check Checklist</h4>
                <div className="space-y-2">
                  {qcChecklist.map((item) => (
                    <label key={item.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => {
                          setQcChecklist(qcChecklist.map(i => 
                            i.id === item.id ? { ...i, checked: e.target.checked } : i
                          ));
                        }}
                        className="w-5 h-5 rounded border-slate-300"
                      />
                      <span className="text-slate-700">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* QC Inspector */}
              <div>
                <label className="text-slate-700 mb-2 block">QC Inspector *</label>
                <select
                  value={qcInspector}
                  onChange={(e) => setQcInspector(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Inspector</option>
                  {qcInspectors.map((inspector) => (
                    <option key={inspector} value={inspector}>{inspector}</option>
                  ))}
                </select>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="text-slate-700 mb-2 block">Additional Notes (Optional)</label>
                <textarea
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Add any additional notes or observations..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                />
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-900">This will mark the repair as COMPLETED and ready for handover to customer.</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowApproveQCModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={handleApproveQC}
                >
                  ✅ Approve & Complete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Checklist */}
      {showViewChecklistModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <ClipboardCheck className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-slate-800">Quality Check Checklist</h3>
              </div>
              <button 
                onClick={() => setShowViewChecklistModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Work Order Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Work Order</p>
                    <p className="text-slate-900">{selectedOrder.orderId}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm mb-1">Vehicle</p>
                    <p className="text-slate-900">{selectedOrder.vehicleBrand} {selectedOrder.vehicleModel} - {selectedOrder.plateNumber}</p>
                  </div>
                </div>
              </div>

              {/* Mechanical Checks */}
              <div>
                <h4 className="text-slate-800 mb-3 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  Mechanical Checks
                </h4>
                <div className="space-y-2">
                  {[
                    'Engine starts smoothly',
                    'No oil/fluid leaks',
                    'All lights working',
                    'Brakes functioning properly',
                    'Steering wheel responsive',
                    'Suspension normal'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Drive */}
              <div>
                <h4 className="text-slate-800 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Test Drive
                </h4>
                <div className="space-y-2">
                  {[
                    'Acceleration smooth',
                    'Braking effective',
                    'No unusual noises',
                    'Gear shifting smooth'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aesthetics */}
              <div>
                <h4 className="text-slate-800 mb-3 flex items-center gap-2">
                  ✨ Aesthetics
                </h4>
                <div className="space-y-2">
                  {[
                    'Exterior cleaned',
                    'Interior vacuumed',
                    'Dashboard wiped',
                    'Windows cleaned'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documentation */}
              <div>
                <h4 className="text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-600" />
                  Documentation
                </h4>
                <div className="space-y-2">
                  {[
                    'Work order completed',
                    'Parts documented',
                    'Photos taken (before/after)'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowViewChecklistModal(false)}
                >
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