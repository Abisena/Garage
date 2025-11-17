import { useState } from 'react';
import { Search, Camera, AlertTriangle, CheckCircle, Clock, FileText, X, Printer, ChevronRight, ClipboardList } from 'lucide-react';
import { Button } from './ui/button';
// import watermarkLogo from 'figma:asset/5ef42b457e7713cd266d609b04b7f121b13997b7.png';

export function Inspection() {
  const [registrations, setRegistrations] = useState(() => {
    const savedRegistrations = localStorage.getItem('registrations');
    if (!savedRegistrations) return [];

    try {
      return JSON.parse(savedRegistrations);
    } catch (error) {
      console.error('Failed to restore registrations from storage', error);
      localStorage.removeItem('registrations');
      return [];
    }
  });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showDiagnosisReport, setShowDiagnosisReport] = useState(false);
  const [createdWorkOrderId, setCreatedWorkOrderId] = useState('');
  const [inspectionData, setInspectionData] = useState({
    engine: [
      { item: 'Oil Level', status: 'ok', notes: '' },
      { item: 'Coolant Level', status: 'ok', notes: '' },
      { item: 'Battery Condition', status: 'ok', notes: '' },
      { item: 'Belts & Hoses', status: 'ok', notes: '' }
    ],
    brakes: [
      { item: 'Brake Pads Front', status: 'ok', notes: '' },
      { item: 'Brake Pads Rear', status: 'ok', notes: '' },
      { item: 'Brake Fluid Level', status: 'ok', notes: '' },
      { item: 'Brake Lines', status: 'ok', notes: '' }
    ],
    tires: [
      { item: 'Tire Pressure FL', status: 'ok', notes: '' },
      { item: 'Tire Pressure FR', status: 'ok', notes: '' },
      { item: 'Tire Pressure RL', status: 'ok', notes: '' },
      { item: 'Tire Pressure RR', status: 'ok', notes: '' },
      { item: 'Tread Depth', status: 'ok', notes: '' },
      { item: 'Wheel Alignment', status: 'ok', notes: '' }
    ],
    electrical: [
      { item: 'Headlights', status: 'ok', notes: '' },
      { item: 'Tail Lights', status: 'ok', notes: '' },
      { item: 'Turn Signals', status: 'ok', notes: '' },
      { item: 'Wipers', status: 'ok', notes: '' },
      { item: 'Horn', status: 'ok', notes: '' },
      { item: 'AC System', status: 'ok', notes: '' }
    ],
    exterior: [
      { item: 'Body Condition', status: 'ok', notes: '' },
      { item: 'Windshield', status: 'ok', notes: '' },
      { item: 'Mirrors', status: 'ok', notes: '' },
      { item: 'Door Locks', status: 'ok', notes: '' }
    ],
    diagnosis: '',
    estimatedRepairTime: '',
    recommendedParts: '',
    photos: []
  });
  

  const handleVehicleSelect = (registration) => {
    setSelectedVehicle(registration);
    // Reset inspection data when selecting new vehicle
    setInspectionData({
      engine: [
        { item: 'Oil Level', status: 'ok', notes: '' },
        { item: 'Coolant Level', status: 'ok', notes: '' },
        { item: 'Battery Condition', status: 'ok', notes: '' },
        { item: 'Belts & Hoses', status: 'ok', notes: '' }
      ],
      brakes: [
        { item: 'Brake Pads Front', status: 'ok', notes: '' },
        { item: 'Brake Pads Rear', status: 'ok', notes: '' },
        { item: 'Brake Fluid Level', status: 'ok', notes: '' },
        { item: 'Brake Lines', status: 'ok', notes: '' }
      ],
      tires: [
        { item: 'Tire Pressure FL', status: 'ok', notes: '' },
        { item: 'Tire Pressure FR', status: 'ok', notes: '' },
        { item: 'Tire Pressure RL', status: 'ok', notes: '' },
        { item: 'Tire Pressure RR', status: 'ok', notes: '' },
        { item: 'Tread Depth', status: 'ok', notes: '' },
        { item: 'Wheel Alignment', status: 'ok', notes: '' }
      ],
      electrical: [
        { item: 'Headlights', status: 'ok', notes: '' },
        { item: 'Tail Lights', status: 'ok', notes: '' },
        { item: 'Turn Signals', status: 'ok', notes: '' },
        { item: 'Wipers', status: 'ok', notes: '' },
        { item: 'Horn', status: 'ok', notes: '' },
        { item: 'AC System', status: 'ok', notes: '' }
      ],
      exterior: [
        { item: 'Body Condition', status: 'ok', notes: '' },
        { item: 'Windshield', status: 'ok', notes: '' },
        { item: 'Mirrors', status: 'ok', notes: '' },
        { item: 'Door Locks', status: 'ok', notes: '' }
      ],
      diagnosis: '',
      estimatedRepairTime: '',
      recommendedParts: '',
      photos: []
    });
  };

  const handleInspectionItemChange = (category, index, field, value) => {
    setInspectionData(prev => ({
      ...prev,
      [category]: prev[category].map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleCompleteInspection = () => {
    if (!selectedVehicle) return;
    
    // Get branch code for work order numbering
    const getBranchCode = (branch) => {
      switch (branch) {
        case 'Jakarta': return 'JKT';
        case 'Bandung': return 'BDG';
        case 'Surabaya': return 'SBY';
        default: return 'XXX';
      }
    };
    
    const branchCode = getBranchCode(selectedVehicle.branch);
    
    // Generate work order number with branch code
    const savedWorkOrders = localStorage.getItem('workOrders');
    const existingWorkOrders = savedWorkOrders ? JSON.parse(savedWorkOrders) : [];
    
    // Count work orders for this branch to get next number
    const branchWorkOrders = existingWorkOrders.filter((wo) => wo.branch === selectedVehicle.branch);
    const nextNumber = branchWorkOrders.length + 1;
    const workOrderId = `${branchCode}-${String(nextNumber).padStart(3, '0')}`;
    
    // Create work order
    const workOrder = {
      id: workOrderId,
      orderId: selectedVehicle.orderId,
      registrationId: selectedVehicle.id,
      customerName: selectedVehicle.customerName,
      phone: selectedVehicle.phone,
      email: selectedVehicle.email,
      vehicleBrand: selectedVehicle.vehicleBrand,
      vehicleModel: selectedVehicle.vehicleModel,
      vehicleYear: selectedVehicle.vehicleYear,
      vehicleInfo: `${selectedVehicle.vehicleBrand} ${selectedVehicle.vehicleModel} ${selectedVehicle.vehicleYear}`,
      plateNumber: selectedVehicle.plateNumber,
      chassisNumber: selectedVehicle.chassisNumber,
      engineNumber: selectedVehicle.engineNumber,
      vehicleType: selectedVehicle.vehicleType,
      serviceType: selectedVehicle.serviceType,
      customerComplaint: selectedVehicle.customerComplaint,
      diagnosis: inspectionData.diagnosis,
      estimatedRepairTime: inspectionData.estimatedRepairTime,
      recommendedParts: inspectionData.recommendedParts,
      inspectionData: inspectionData,
      status: 'pending',
      repairStatus: 'waiting-parts',
      createdAt: new Date().toISOString(),
      date: selectedVehicle.date,
      branch: selectedVehicle.branch,
      mechanicName: '' // Will be assigned in Repair Orders
    };
    
    // Save work order to localStorage for Repair Order menu
    existingWorkOrders.push(workOrder);
    localStorage.setItem('workOrders', JSON.stringify(existingWorkOrders));
    
    // Update registration status to 'in-progress'
    const savedRegistrations = localStorage.getItem('registrations');
    if (savedRegistrations) {
      const allRegistrations = JSON.parse(savedRegistrations);
      const updatedRegistrations = allRegistrations.map((reg) => {
        if (reg.id === selectedVehicle.id) {
          return { ...reg, inspectionStatus: 'in-progress' };
        }
        return reg;
      });
      localStorage.setItem('registrations', JSON.stringify(updatedRegistrations));
      
      // Update local state
      setRegistrations(updatedRegistrations);
    }
    
    // Show diagnosis report
    setShowDiagnosisReport(true);
    setCreatedWorkOrderId(workOrderId);
    
    console.log('Work Order Created:', workOrder);
  };

  const handlePrint = () => {
    window.print();
    // Close diagnosis report and return to inspection list after print
    setTimeout(() => {
      setShowDiagnosisReport(false);
      setSelectedVehicle(null);
    }, 100);
  };

  const handleBackToList = () => {
    setSelectedVehicle(null);
    setShowDiagnosisReport(false);
  };

  const handleNewInspection = () => {
    setShowDiagnosisReport(false);
    setSelectedVehicle(null);
  };

  // Vehicle List View
  if (!selectedVehicle && !showDiagnosisReport) {
    // Calculate counters based on status
    const waitingCount = registrations.filter(r => !r.inspectionStatus || r.inspectionStatus === 'waiting').length;
    const inProgressCount = registrations.filter(r => r.inspectionStatus === 'in-progress').length;
    const completedCount = registrations.filter(r => r.inspectionStatus === 'completed').length;
    
    // Filter only waiting registrations for the table
    const waitingRegistrations = registrations.filter(r => !r.inspectionStatus || r.inspectionStatus === 'waiting');
    
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-slate-600 rounded-lg p-2">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">Vehicle Inspection & Diagnosis</h1>
                  <p className="text-slate-600">Step 2: Select vehicle and perform inspection</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Vehicle List - Compact Table */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Waiting for Inspection</h3>
                
                {waitingRegistrations.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <p>No vehicles waiting for inspection</p>
                    <p className="text-sm mt-1">Vehicles from Customer Registration will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-700 uppercase">Order ID</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-700 uppercase">Customer</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-700 uppercase">Vehicle</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-700 uppercase">Plate</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-700 uppercase">Service Type</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-700 uppercase">Time</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-slate-700 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waitingRegistrations.map((reg) => (
                          <tr 
                            key={reg.id} 
                            className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => handleVehicleSelect(reg)}
                          >
                            <td className="px-4 py-3">
                              <span className="text-blue-600 font-medium">{reg.orderId}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-slate-900 font-medium">{reg.customerName}</p>
                                <p className="text-slate-500 text-sm">{reg.phone}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-slate-900">{reg.vehicleBrand} {reg.vehicleModel}</p>
                              <p className="text-slate-500 text-sm">{reg.vehicleYear}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-900 font-mono">{reg.plateNumber}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-700">{reg.serviceType}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-600 text-sm">{reg.time}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button 
                                size="sm" 
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                                onClick={() => handleVehicleSelect(reg)}
                              >
                                Inspect
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Inspection Queue</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <span className="text-sm font-medium text-slate-700">Waiting</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{waitingCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Search className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">In Progress</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{inProgressCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-slate-700">Completed</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{completedCount}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-2">Important</h4>
                    <p className="text-amber-700 text-sm">Always perform diagnostic scan for check engine lights and document all findings.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Diagnosis Report View
  if (showDiagnosisReport && selectedVehicle) {
    return (
      <>
        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #print-area, #print-area * {
              visibility: visible;
            }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            @page {
              size: A4;
              margin: 10mm;
            }
          }
        `}</style>

        <div className="p-8 print:p-0">
          <div className="max-w-5xl mx-auto">
            {/* Action Buttons - Hidden on print */}
            <div className="flex items-center justify-between mb-6 print:hidden">
              <Button variant="outline" onClick={handleNewInspection}>
                <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                New Inspection
              </Button>
              <Button onClick={handlePrint} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </Button>
            </div>

            {/* Diagnosis Report - A4 Format */}
            <div id="print-area" className="bg-white rounded-xl border border-slate-200 p-8 print:border-0 print:rounded-none print:p-0">
              {/* Header with Logo */}
              <div className="flex items-center justify-between mb-6 border-b-2 border-slate-800 pb-4">
                {/* Logo IMOGI - Placeholder */}
                <div className="h-16 w-16 bg-slate-200 rounded flex items-center justify-center text-slate-600 text-xs">
                  LOGO
                </div>
                
                {/* Title */}
                <div className="text-center flex-1">
                  <h1 className="text-2xl font-bold text-slate-800 mb-1">VEHICLE INSPECTION & DIAGNOSIS REPORT</h1>
                  <p className="text-sm text-slate-600">IMOGI Auto Repair Workshop - Branch: {selectedVehicle.branch}</p>
                </div>
                
                {/* Spacer for alignment */}
                <div className="h-16 w-16"></div>
              </div>

              {/* Report Info Grid - Compact */}
              <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                {/* Column 1 - Order Info */}
                <div className="border border-slate-300 rounded p-3">
                  <h3 className="font-semibold text-slate-800 mb-2 border-b border-slate-300 pb-1">Order Information</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Order ID:</span>
                      <span className="font-medium text-slate-900">{selectedVehicle.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Reg ID:</span>
                      <span className="font-medium text-slate-900">{selectedVehicle.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Date:</span>
                      <span className="font-medium text-slate-900">{selectedVehicle.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Time:</span>
                      <span className="font-medium text-slate-900">{selectedVehicle.time}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2 - Customer Info */}
                <div className="border border-slate-300 rounded p-3">
                  <h3 className="font-semibold text-slate-800 mb-2 border-b border-slate-300 pb-1">Customer Information</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Name:</span>
                      <span className="font-medium text-slate-900">{selectedVehicle.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Phone:</span>
                      <span className="font-medium text-slate-900">{selectedVehicle.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Email:</span>
                      <span className="font-medium text-slate-900 text-xs truncate">{selectedVehicle.email}</span>
                    </div>
                  </div>
                </div>

                {/* Column 3 - Vehicle Info */}
                <div className="border border-slate-300 rounded p-3">
                  <h3 className="font-semibold text-slate-800 mb-2 border-b border-slate-300 pb-1">Vehicle Information</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Brand:</span>
                      <span className="font-medium text-slate-900">{selectedVehicle.vehicleBrand} {selectedVehicle.vehicleModel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Year:</span>
                      <span className="font-medium text-slate-900">{selectedVehicle.vehicleYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Plate:</span>
                      <span className="font-medium font-mono text-slate-900">{selectedVehicle.plateNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Type:</span>
                      <span className="font-medium text-slate-900">{selectedVehicle.vehicleType}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle Details - 2 columns */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="border border-slate-300 rounded p-3">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Chassis Number:</span>
                      <span className="font-mono text-slate-900">{selectedVehicle.chassisNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Engine Number:</span>
                      <span className="font-mono text-slate-900">{selectedVehicle.engineNumber}</span>
                    </div>
                  </div>
                </div>
                <div className="border border-slate-300 rounded p-3">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Service Type:</span>
                      <span className="font-medium text-slate-900">{selectedVehicle.serviceType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Estimated Time:</span>
                      <span className="font-medium text-slate-900">{inspectionData.estimatedRepairTime || 'Not specified'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Complaint */}
              <div className="mb-6">
                <h3 className="font-semibold text-slate-800 text-sm mb-2 border-b border-slate-300 pb-1">Customer Complaint</h3>
                <p className="text-slate-700 text-sm bg-slate-50 p-2 rounded">{selectedVehicle.customerComplaint}</p>
              </div>

              {/* Inspection Results - 2 columns compact */}
              <div className="mb-6">
                <h3 className="font-semibold text-slate-800 text-sm mb-2 border-b border-slate-300 pb-1">Inspection Checklist Results</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {['engine', 'brakes', 'tires', 'electrical', 'exterior'].map((category) => (
                    <div key={category} className="border border-slate-300 rounded p-2">
                      <h4 className="font-semibold text-slate-900 text-sm mb-2 capitalize bg-slate-100 px-2 py-1 rounded">{category}</h4>
                      <div className="space-y-1">
                        {inspectionData[category].map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <span className="text-slate-700 flex-1">{item.item}</span>
                            <span className={`px-2 py-0.5 rounded ml-2 font-medium ${
                              item.status === 'ok' ? 'bg-emerald-100 text-emerald-700' :
                              item.status === 'attention' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {item.status === 'ok' ? 'OK' : item.status === 'attention' ? 'Attention' : 'Replace'}
                            </span>
                            {item.notes && <span className="text-slate-600 text-xs ml-2">({item.notes})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnosis & Recommended Parts - 2 columns */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm mb-2 border-b border-slate-300 pb-1">Diagnosis & Findings</h3>
                  <p className="text-slate-700 text-sm bg-slate-50 p-2 rounded whitespace-pre-wrap" style={{ minHeight: '80px' }}>{inspectionData.diagnosis || 'No diagnosis notes provided.'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm mb-2 border-b border-slate-300 pb-1">Recommended Parts</h3>
                  <p className="text-slate-700 text-sm bg-slate-50 p-2 rounded whitespace-pre-wrap" style={{ minHeight: '80px' }}>{inspectionData.recommendedParts || 'No parts recommended.'}</p>
                </div>
              </div>

              {/* Work Order Notice */}
              <div className="bg-emerald-50 border border-emerald-300 rounded p-2 mb-6">
                <div className="flex items-center gap-2 text-emerald-800 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Work Order <strong>{createdWorkOrderId}</strong> has been automatically created</span>
                </div>
              </div>

              {/* Footer - Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300">
                <div>
                  <p className="text-slate-600 text-sm mb-2">Inspector Signature:</p>
                  <div className="border-b border-slate-400 pt-8"></div>
                  <p className="text-slate-600 text-xs mt-1">Name: ________________</p>
                  <p className="text-slate-600 text-xs">Date: ________________</p>
                </div>
                <div>
                  <p className="text-slate-600 text-sm mb-2">Service Advisor Signature:</p>
                  <div className="border-b border-slate-400 pt-8"></div>
                  <p className="text-slate-600 text-xs mt-1">Name: ________________</p>
                  <p className="text-slate-600 text-xs">Date: ________________</p>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center mt-4 pt-4 border-t border-slate-200">
                <p className="text-slate-500 text-xs">This is an official document from IMOGI Auto Repair Workshop</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Inspection Form View
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleBackToList}>
              <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
              Back to List
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Performing Inspection</h1>
              <p className="text-slate-600">Order: {selectedVehicle?.orderId}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inspection Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Info Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Vehicle Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Customer</p>
                  <p className="text-slate-900">{selectedVehicle?.customerName}</p>
                </div>
                <div>
                  <p className="text-slate-600 text-sm font-medium">Phone</p>
                  <p className="text-slate-900">{selectedVehicle?.phone}</p>
                </div>
                <div>
                  <p className="text-slate-600 text-sm font-medium">Vehicle</p>
                  <p className="text-slate-900">{selectedVehicle?.vehicleBrand} {selectedVehicle?.vehicleModel} {selectedVehicle?.vehicleYear}</p>
                </div>
                <div>
                  <p className="text-slate-600 text-sm font-medium">Plate Number</p>
                  <p className="text-slate-900 font-mono">{selectedVehicle?.plateNumber}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-600 text-sm font-medium">Customer Complaint</p>
                  <p className="text-slate-900">{selectedVehicle?.customerComplaint}</p>
                </div>
              </div>
            </div>

            {/* Inspection Checklist */}
            {['engine', 'brakes', 'tires', 'electrical', 'exterior'].map((category) => (
              <div key={category} className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 capitalize">{category} Inspection</h3>
                <div className="space-y-3">
                  {inspectionData[category].map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-slate-900 font-medium mb-2">{item.item}</p>
                        <div className="flex gap-2">
                          <select
                            value={item.status}
                            onChange={(e) => handleInspectionItemChange(category, index, 'status', e.target.value)}
                            className="px-3 py-1 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="ok">✓ OK</option>
                            <option value="attention">⚠ Needs Attention</option>
                            <option value="replace">✗ Replace</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Add notes..."
                            value={item.notes}
                            onChange={(e) => handleInspectionItemChange(category, index, 'notes', e.target.value)}
                            className="flex-1 px-3 py-1 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Diagnosis & Findings */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Diagnosis & Findings</h3>
              <textarea
                rows={6}
                placeholder="Enter detailed diagnosis, root cause analysis, and findings..."
                value={inspectionData.diagnosis}
                onChange={(e) => setInspectionData(prev => ({ ...prev, diagnosis: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="mt-4">
                <label className="block text-slate-700 font-medium mb-2">Recommended Parts & Quantity</label>
                <textarea
                  rows={3}
                  placeholder="List parts needed (e.g., Brake Pads Front x2, Engine Oil 5W-30 x4L)"
                  value={inspectionData.recommendedParts}
                  onChange={(e) => setInspectionData(prev => ({ ...prev, recommendedParts: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mt-4">
                <label className="block text-slate-700 font-medium mb-2">Estimated Repair Time</label>
                <input
                  type="text"
                  placeholder="e.g., 3-4 hours, 1-2 days"
                  value={inspectionData.estimatedRepairTime}
                  onChange={(e) => setInspectionData(prev => ({ ...prev, estimatedRepairTime: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Complete Button */}
              <div className="flex gap-3 mt-6">
                <Button 
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-6"
                  onClick={handleCompleteInspection}
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Complete Inspection & Generate Report
                </Button>
              </div>
            </div>
          </div>

          {/* Side Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Inspection Progress</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Engine</span>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Brakes</span>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Tires</span>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Electrical</span>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Exterior</span>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <div className="flex items-start gap-3">
                <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">What Happens Next?</h4>
                  <p className="text-blue-700 text-sm">After completing inspection, a diagnosis report will be generated and a Work Order will be automatically created for the repair process.</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-900 mb-2">Reminder</h4>
                  <ul className="text-amber-700 text-sm space-y-1">
                    <li>• Check all inspection items</li>
                    <li>• Document issues clearly</li>
                    <li>• List all required parts</li>
                    <li>• Provide accurate time estimate</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Inspection;