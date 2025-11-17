import { useState, useEffect } from 'react';
import { Plus, User, Car } from 'lucide-react';
import { Button } from './ui/button';
import { WorkOrderModal } from './WorkOrderModal';
import frappeClient from '../lib/frappeClient';

export function Registration({ currentUser }) {
  // Load saved form data from localStorage on mount
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('registrationFormDraft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {
          vehicleBrand: '',
          vehicleModel: '',
          vehicleYear: '',
          vehicleType: '',
          plateNumber: '',
          chassisNumber: '',
          engineNumber: '',
          customerName: '',
          phone: '',
          email: '',
          serviceType: '',
          customerComplaint: '',
          kilometer: '',
          fuel: '',
          assemblyType: '',
          advisorNotes: ''
        };
      }
    }
    return {
      vehicleBrand: '',
      vehicleModel: '',
      vehicleYear: '',
      vehicleType: '',
      plateNumber: '',
      chassisNumber: '',
      engineNumber: '',
      customerName: '',
      phone: '',
      email: '',
      serviceType: '',
      customerComplaint: '',
      kilometer: '',
      fuel: '',
      assemblyType: '',
      advisorNotes: ''
    };
  });

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('registrationFormDraft', JSON.stringify(formData));
  }, [formData]);

  const [focusedField, setFocusedField] = useState('');
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentRegistrations, setRecentRegistrations] = useState([
    {
      id: 'JKT-REG-001',
      time: '10:30',
      orderId: 'JKT-001',
      customerName: 'Budi Santoso',
      phone: '+62 812-3456-7890',
      email: 'budi.santoso@email.com',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Avanza',
      vehicleYear: '2020',
      vehicleType: 'MPV',
      plateNumber: 'B 1234 XYZ',
      chassisNumber: 'MHKA42V159K123456',
      engineNumber: '1NR-VE-1234567',
      serviceType: 'Engine Service',
      customerComplaint: 'Engine making unusual noise and reduced power',
      date: new Date().toLocaleDateString('id-ID'),
      estimatedCost: '500000',
      estimatedDays: '3',
      branch: 'Jakarta'
    },
    {
      id: 'BDG-REG-001',
      time: '11:15',
      orderId: 'BDG-001',
      customerName: 'Siti Rahayu',
      phone: '+62 813-4567-8901',
      email: 'siti.rahayu@email.com',
      vehicleBrand: 'Honda',
      vehicleModel: 'Jazz',
      vehicleYear: '2019',
      vehicleType: 'Hatchback',
      plateNumber: 'D 5678 ABC',
      chassisNumber: 'MRHGK8840KJ123456',
      engineNumber: 'L15Z-1234567',
      serviceType: 'Brake Service',
      customerComplaint: 'Brake pedal feels soft and squeaking noise',
      date: new Date().toLocaleDateString('id-ID'),
      estimatedCost: '300000',
      estimatedDays: '2',
      branch: 'Bandung'
    },
    {
      id: 'SBY-REG-001',
      time: '12:00',
      orderId: 'SBY-001',
      customerName: 'Ahmad Yani',
      phone: '+62 814-5678-9012',
      email: 'ahmad.yani@email.com',
      vehicleBrand: 'Suzuki',
      vehicleModel: 'Ertiga',
      vehicleYear: '2021',
      vehicleType: 'MPV',
      plateNumber: 'L 9012 DEF',
      chassisNumber: 'MBJKS83B1LJ123456',
      engineNumber: 'K15B-1234567',
      serviceType: 'Oil Change',
      customerComplaint: 'Regular maintenance service',
      date: new Date().toLocaleDateString('id-ID'),
      estimatedCost: '200000',
      estimatedDays: '1',
      branch: 'Surabaya'
    },
    {
      id: 'JKT-REG-002',
      time: '13:45',
      orderId: 'JKT-002',
      customerName: 'Dewi Lestari',
      phone: '+62 815-1234-5678',
      email: 'dewi.lestari@email.com',
      vehicleBrand: 'Mitsubishi',
      vehicleModel: 'Xpander',
      vehicleYear: '2022',
      vehicleType: 'MPV',
      plateNumber: 'B 3456 GHI',
      chassisNumber: 'MMBJNKB40NJ123456',
      engineNumber: '4A91-1234567',
      serviceType: 'AC Service',
      customerComplaint: 'AC not cooling properly',
      date: new Date().toLocaleDateString('id-ID'),
      estimatedCost: '450000',
      estimatedDays: '2',
      branch: 'Jakarta'
    },
    {
      id: 'BDG-REG-002',
      time: '14:20',
      orderId: 'BDG-002',
      customerName: 'Rudi Hartono',
      phone: '+62 816-2345-6789',
      email: 'rudi.hartono@email.com',
      vehicleBrand: 'Daihatsu',
      vehicleModel: 'Terios',
      vehicleYear: '2018',
      vehicleType: 'SUV',
      plateNumber: 'D 7890 JKL',
      chassisNumber: 'MHKJ5EA1JJK123456',
      engineNumber: '3SZ-VE-1234567',
      serviceType: 'Transmission Service',
      customerComplaint: 'Gear shifting is not smooth',
      date: new Date().toLocaleDateString('id-ID'),
      estimatedCost: '650000',
      estimatedDays: '4',
      branch: 'Bandung'
    }
  ]);

  const serviceTypes = [
    'Oil Change',
    'Paket Service Oil Change',
    'Engine Service',
    'Paket Service Engine Service',
    'Brake Service',
    'Paket Service Brake Service',
    'Transmission Service',
    'Paket Service Transmission Service',
    'AC Service',
    'Paket Service AC Service',
    'Battery Replacement',
    'Paket Service Battery Replacement',
    'Tire Replacement',
    'Paket Service Tire Replacement',
    'Wheel Alignment',
    'Paket Service Wheel Alignment',
    'General Inspection',
    'Paket Service General Inspection',
    'Electrical Repair',
    'Paket Service Electrical Repair',
    'Body Repair',
    'Paket Service Body Repair',
    'Other'
  ];

  const vehicleTypes = [
    'Sedan',
    'Hatchback',
    'SUV',
    'MPV',
    'Truck',
    'Van',
    'Coupe',
    'Wagon'
  ];

  const fuelTypes = [
    'BBM',
    'Listrik',
    'Hybrid'
  ];

  const assemblyTypes = [
    'CKD',
    'CBU'
  ];

  // Vehicle models by brand
  const vehicleModelsByBrand = {
    'Toyota': ['Avanza', 'Innova', 'Fortuner', 'Rush', 'Calya', 'Agya', 'Yaris', 'Corolla', 'Camry', 'Alphard', 'Vellfire', 'Land Cruiser', 'Hilux'],
    'Honda': ['Brio', 'Jazz', 'Mobilio', 'BR-V', 'HR-V', 'CR-V', 'City', 'Civic', 'Accord', 'Odyssey'],
    'Suzuki': ['Ertiga', 'XL7', 'Ignis', 'Swift', 'Baleno', 'Jimny', 'Carry', 'APV'],
    'Mitsubishi': ['Xpander', 'Pajero Sport', 'Outlander', 'Eclipse Cross', 'L300', 'Triton'],
    'Daihatsu': ['Ayla', 'Sigra', 'Terios', 'Rocky', 'Luxio', 'Gran Max', 'Xenia'],
    'Nissan': ['Livina', 'Kicks', 'X-Trail', 'Terra', 'Serena', 'Navara'],
    'Mazda': ['CX-3', 'CX-5', 'CX-9', 'Mazda2', 'Mazda3', 'Mazda6'],
    'Isuzu': ['D-Max', 'MU-X', 'Panther', 'Traga', 'Giga']
  };

  // Get available models based on selected brand
  const availableModels = formData.vehicleBrand ? vehicleModelsByBrand[formData.vehicleBrand] || [] : [];

  // Load registrations from localStorage on mount
  useEffect(() => {
    const savedRegistrations = localStorage.getItem('registrations');
    if (savedRegistrations) {
      setRecentRegistrations(JSON.parse(savedRegistrations));
    }
  }, []);

  // Save registrations to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('registrations', JSON.stringify(recentRegistrations));
  }, [recentRegistrations]);

  // Helper function to get branch code
  const getBranchCode = (branch) => {
    const branchCodes = {
      'Jakarta': 'JKT',
      'Bandung': 'BDG',
      'Surabaya': 'SBY'
    };
    return branchCodes[branch] || 'XXX';
  };

  // Helper function to get next order number for a branch
  const getNextOrderNumber = (branch) => {
    const branchCode = getBranchCode(branch);
    const branchRegistrations = recentRegistrations.filter(reg => reg.branch === branch);
    const nextNumber = branchRegistrations.length + 1;
    return `${branchCode}-${String(nextNumber).padStart(3, '0')}`;
  };

  const handleInputComplete = (currentField, value) => {
    if (!value) return;
    
    // Define field order
    const fieldOrder = [
      'plateNumber', 'chassisNumber', 'engineNumber', 'vehicleBrand', 
      'vehicleModel', 'vehicleType', 'kilometer', 'fuel', 
      'assemblyType', 'vehicleYear', 'customerName', 'phone', 
      'email', 'serviceType', 'customerComplaint'
    ];
    
    const currentIndex = fieldOrder.indexOf(currentField);
    if (currentIndex < fieldOrder.length - 1) {
      const nextField = fieldOrder[currentIndex + 1];
      setTimeout(() => {
        const nextInput = document.querySelector(`[name="${nextField}"]`);
        if (nextInput) {
          nextInput.focus();
        }
      }, 100);
    }
  };

  const handleRegisterClick = () => {
    // Validate required fields
    if (!formData.plateNumber || !formData.chassisNumber || !formData.engineNumber ||
        !formData.vehicleBrand || !formData.vehicleModel || !formData.vehicleType || 
        !formData.kilometer || !formData.fuel || !formData.assemblyType || 
        !formData.vehicleYear || !formData.customerName || !formData.phone || 
        !formData.serviceType || !formData.customerComplaint) {
      alert('Please complete all required fields (*)');
      return;
    }
    
    // Generate new registration and add to list immediately
    const newTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const branchCode = getBranchCode(currentUser.branch);
    const branchRegistrations = recentRegistrations.filter(reg => reg.branch === currentUser.branch);
    const nextNumber = branchRegistrations.length + 1;
    const newId = `${branchCode}-REG-${String(nextNumber).padStart(3, '0')}`;
    const newOrderId = getNextOrderNumber(currentUser.branch);
    
    const newRegistration = {
      id: newId,
      time: newTime,
      orderId: newOrderId,
      customerName: formData.customerName,
      phone: formData.phone,
      email: formData.email,
      plateNumber: formData.plateNumber,
      chassisNumber: formData.chassisNumber,
      engineNumber: formData.engineNumber,
      vehicleBrand: formData.vehicleBrand,
      vehicleModel: formData.vehicleModel,
      vehicleType: formData.vehicleType,
      kilometer: formData.kilometer,
      fuel: formData.fuel,
      assemblyType: formData.assemblyType,
      vehicleYear: formData.vehicleYear,
      serviceType: formData.serviceType,
      customerComplaint: formData.customerComplaint,
      date: new Date().toLocaleDateString('id-ID'),
      estimatedCost: '0',
      estimatedDays: '1',
      branch: currentUser.branch
    };

    // Add to list (at the beginning)
    setRecentRegistrations([newRegistration, ...recentRegistrations]);
    
    // Reset form
    setFormData({
      plateNumber: '',
      chassisNumber: '',
      engineNumber: '',
      vehicleBrand: '',
      vehicleModel: '',
      vehicleType: '',
      kilometer: '',
      fuel: '',
      assemblyType: '',
      vehicleYear: '',
      customerName: '',
      phone: '',
      email: '',
      serviceType: '',
      customerComplaint: '',
      estimatedCost: '',
      estimatedDays: '',
      advisorNotes: ''
    });

    // Show success message
    alert(`Registration successful!\nCustomer: ${newRegistration.customerName}\nVehicle: ${newRegistration.plateNumber}\nOrder ID: ${newOrderId}\n\nData has been added to today's registrations.`);
    
    // Auto focus to first field for next entry
    setTimeout(() => {
      const firstInput = document.querySelector('[name="plateNumber"]');
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  };

  const handleWorkOrderConfirm = (customerSig, advisorSig) => {
    // Generate new registration
    const newTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const branchCode = getBranchCode(currentUser.branch);
    const branchRegistrations = recentRegistrations.filter(reg => reg.branch === currentUser.branch);
    const nextNumber = branchRegistrations.length + 1;
    const newId = `${branchCode}-REG-${String(nextNumber).padStart(3, '0')}`;
    const newOrderId = getNextOrderNumber(currentUser.branch);
    
    const newRegistration = {
      id: newId,
      time: newTime,
      orderId: newOrderId,
      customerName: formData.customerName,
      phone: formData.phone,
      email: formData.email,
      plateNumber: formData.plateNumber,
      chassisNumber: formData.chassisNumber,
      engineNumber: formData.engineNumber,
      vehicleBrand: formData.vehicleBrand,
      vehicleModel: formData.vehicleModel,
      vehicleType: formData.vehicleType,
      kilometer: formData.kilometer,
      fuel: formData.fuel,
      assemblyType: formData.assemblyType,
      vehicleYear: formData.vehicleYear,
      serviceType: formData.serviceType,
      customerComplaint: formData.customerComplaint,
      customerSignature: customerSig,
      advisorSignature: advisorSig,
      date: new Date().toLocaleDateString('id-ID'),
      estimatedCost: formData.estimatedCost,
      estimatedDays: formData.estimatedDays,
      branch: currentUser.branch
    };

    // Add to list (at the beginning)
    setRecentRegistrations([newRegistration, ...recentRegistrations]);
    
    // Reset form
    setFormData({
      plateNumber: '',
      chassisNumber: '',
      engineNumber: '',
      vehicleBrand: '',
      vehicleModel: '',
      vehicleType: '',
      kilometer: '',
      fuel: '',
      assemblyType: '',
      vehicleYear: '',
      customerName: '',
      phone: '',
      email: '',
      serviceType: '',
      customerComplaint: '',
      estimatedCost: '',
      estimatedDays: '',
      advisorNotes: ''
    });

    alert('Registration successful! Data has been added to today\'s registrations.');
  };

  const handleViewRegistration = (registration) => {
    setSelectedRegistration(registration);
    setShowWorkOrder(true);
  };

  // Filter registrations based on user branch
  const filteredRegistrations = currentUser.role === 'admin' && currentUser.branch === 'all'
    ? recentRegistrations
    : recentRegistrations.filter(reg => reg.branch === currentUser.branch);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-500 rounded-lg p-2">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Customer Registration</h1>
                <p className="text-slate-600">Step 1: Register new customer and vehicle</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Registration Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-6">New Registration Form</h3>
              
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleRegisterClick(); }}>
                {/* Vehicle Information - NOW FIRST */}
                <div>
                  <h4 className="text-base font-medium text-slate-700 mb-4 flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Vehicle Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Plate Number */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Plate Number *</label>
                      <input
                        type="text"
                        name="plateNumber"
                        placeholder="B 1234 XYZ"
                        className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          focusedField === 'plateNumber' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                        }`}
                        value={formData.plateNumber}
                        onChange={(e) => setFormData({...formData, plateNumber: e.target.value})}
                        onFocus={() => setFocusedField('plateNumber')}
                        onBlur={(e) => {
                          setFocusedField('');
                          handleInputComplete('plateNumber', e.target.value);
                        }}
                      />
                    </div>
                    
                    {/* 2. Chassis Number */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Chassis Number *</label>
                      <input
                        type="text"
                        name="chassisNumber"
                        placeholder="e.g. MHKA42V159K123456"
                        className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          focusedField === 'chassisNumber' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                        }`}
                        value={formData.chassisNumber}
                        onChange={(e) => setFormData({...formData, chassisNumber: e.target.value})}
                        onFocus={() => setFocusedField('chassisNumber')}
                        onBlur={(e) => {
                          setFocusedField('');
                          handleInputComplete('chassisNumber', e.target.value);
                        }}
                      />
                    </div>
                    
                    {/* 3. Engine Number */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Engine Number *</label>
                      <input
                        type="text"
                        name="engineNumber"
                        placeholder="e.g. 1NR-VE-123"
                        className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          focusedField === 'engineNumber' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                        }`}
                        value={formData.engineNumber}
                        onChange={(e) => setFormData({...formData, engineNumber: e.target.value})}
                        onFocus={() => setFocusedField('engineNumber')}
                        onBlur={(e) => {
                          setFocusedField('');
                          handleInputComplete('engineNumber', e.target.value);
                        }}
                      />
                    </div>
                    
                    {/* 4. Brand */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Brand *</label>
                      <select 
                        name="vehicleBrand"
                        className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          focusedField === 'vehicleBrand' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                        }`}
                        value={formData.vehicleBrand}
                        onChange={(e) => {
                          setFormData({...formData, vehicleBrand: e.target.value});
                          handleInputComplete('vehicleBrand', e.target.value);
                        }}
                        onFocus={() => setFocusedField('vehicleBrand')}
                        onBlur={() => setFocusedField('')}
                      >
                        <option value="">Select brand</option>
                        <option value="Toyota">Toyota</option>
                        <option value="Honda">Honda</option>
                        <option value="Suzuki">Suzuki</option>
                        <option value="Mitsubishi">Mitsubishi</option>
                        <option value="Daihatsu">Daihatsu</option>
                        <option value="Nissan">Nissan</option>
                        <option value="Mazda">Mazda</option>
                        <option value="Isuzu">Isuzu</option>
                      </select>
                    </div>
                    
                    {/* 5. Model */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Model *</label>
                      <select 
                        name="vehicleModel"
                        className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          focusedField === 'vehicleModel' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                        }`}
                        value={formData.vehicleModel}
                        onChange={(e) => {
                          setFormData({...formData, vehicleModel: e.target.value});
                          handleInputComplete('vehicleModel', e.target.value);
                        }}
                        onFocus={() => setFocusedField('vehicleModel')}
                        onBlur={() => setFocusedField('')}
                      >
                        <option value="">Select model</option>
                        {availableModels.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* 6. Vehicle Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle Type *</label>
                      <select 
                        name="vehicleType"
                        className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          focusedField === 'vehicleType' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                        }`}
                        value={formData.vehicleType}
                        onChange={(e) => {
                          setFormData({...formData, vehicleType: e.target.value});
                          handleInputComplete('vehicleType', e.target.value);
                        }}
                        onFocus={() => setFocusedField('vehicleType')}
                        onBlur={() => setFocusedField('')}
                      >
                        <option value="">Select type</option>
                        {vehicleTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* 7. Kilometer */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Kilometer *</label>
                      <input
                        type="text"
                        name="kilometer"
                        placeholder="e.g. 45000"
                        className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          focusedField === 'kilometer' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                        }`}
                        value={formData.kilometer}
                        onChange={(e) => setFormData({...formData, kilometer: e.target.value})}
                        onFocus={() => setFocusedField('kilometer')}
                        onBlur={(e) => {
                          setFocusedField('');
                          handleInputComplete('kilometer', e.target.value);
                        }}
                      />
                    </div>
                    
                    {/* 8. Fuel */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Fuel *</label>
                      <select 
                        name="fuel"
                        className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          focusedField === 'fuel' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                        }`}
                        value={formData.fuel}
                        onChange={(e) => {
                          setFormData({...formData, fuel: e.target.value});
                          handleInputComplete('fuel', e.target.value);
                        }}
                        onFocus={() => setFocusedField('fuel')}
                        onBlur={() => setFocusedField('')}
                      >
                        <option value="">Select fuel type</option>
                        {fuelTypes.map(fuel => (
                          <option key={fuel} value={fuel}>{fuel}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* 9. Jenis Rakit */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Jenis Rakit *</label>
                      <select 
                        name="assemblyType"
                        className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          focusedField === 'assemblyType' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                        }`}
                        value={formData.assemblyType}
                        onChange={(e) => {
                          setFormData({...formData, assemblyType: e.target.value});
                          handleInputComplete('assemblyType', e.target.value);
                        }}
                        onFocus={() => setFocusedField('assemblyType')}
                        onBlur={() => setFocusedField('')}
                      >
                        <option value="">Select type</option>
                        {assemblyTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* 10. Year */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Year *</label>
                      <input
                        type="text"
                        name="vehicleYear"
                        placeholder="e.g. 2020"
                        className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          focusedField === 'vehicleYear' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                        }`}
                        value={formData.vehicleYear}
                        onChange={(e) => setFormData({...formData, vehicleYear: e.target.value})}
                        onFocus={() => setFocusedField('vehicleYear')}
                        onBlur={(e) => {
                          setFocusedField('');
                          handleInputComplete('vehicleYear', e.target.value);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Customer Information - NOW SECOND */}
                <div>
                  <h4 className="text-base font-medium text-slate-700 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        name="customerName"
                        placeholder="Enter customer name"
                        className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          focusedField === 'customerName' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                        }`}
                        value={formData.customerName}
                        onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                        onFocus={() => setFocusedField('customerName')}
                        onBlur={(e) => {
                          setFocusedField('');
                          handleInputComplete('customerName', e.target.value);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="+62 xxx-xxxx-xxxx"
                        className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          focusedField === 'phone' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                        }`}
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        onFocus={() => setFocusedField('phone')}
                        onBlur={(e) => {
                          setFocusedField('');
                          handleInputComplete('phone', e.target.value);
                        }}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        placeholder="customer@email.com"
                        className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          focusedField === 'email' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                        }`}
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        onFocus={() => setFocusedField('email')}
                        onBlur={(e) => {
                          setFocusedField('');
                          handleInputComplete('email', e.target.value);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Service Type *</label>
                  <select 
                    name="serviceType"
                    className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      focusedField === 'serviceType' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                    }`}
                    value={formData.serviceType}
                    onChange={(e) => {
                      setFormData({...formData, serviceType: e.target.value});
                      handleInputComplete('serviceType', e.target.value);
                    }}
                    onFocus={() => setFocusedField('serviceType')}
                    onBlur={() => setFocusedField('')}
                  >
                    <option value="">Select service type</option>
                    {serviceTypes.map(service => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>
                </div>

                {/* Customer Complaint */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Customer Complaint *</label>
                  <textarea
                    name="customerComplaint"
                    rows={4}
                    placeholder="Describe the issues or problems with the vehicle..."
                    className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      focusedField === 'customerComplaint' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                    }`}
                    value={formData.customerComplaint}
                    onChange={(e) => setFormData({...formData, customerComplaint: e.target.value})}
                    onFocus={() => setFocusedField('customerComplaint')}
                    onBlur={() => setFocusedField('')}
                  />
                </div>

                {/* Service Advisor Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Service Advisor Notes</label>
                  <textarea
                    name="advisorNotes"
                    rows={3}
                    placeholder="Additional notes from service advisor (optional)..."
                    className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      focusedField === 'advisorNotes' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                    }`}
                    value={formData.advisorNotes}
                    onChange={(e) => setFormData({...formData, advisorNotes: e.target.value})}
                    onFocus={() => setFocusedField('advisorNotes')}
                    onBlur={() => setFocusedField('')}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button 
                    type="button"
                    onClick={handleRegisterClick}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Register & Continue to Inspection
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    className="border-slate-300"
                    onClick={() => setFormData({
                      plateNumber: '',
                      chassisNumber: '',
                      engineNumber: '',
                      vehicleBrand: '',
                      vehicleModel: '',
                      vehicleType: '',
                      kilometer: '',
                      fuel: '',
                      assemblyType: '',
                      vehicleYear: '',
                      customerName: '',
                      phone: '',
                      email: '',
                      serviceType: '',
                      customerComplaint: '',
                      estimatedCost: '',
                      estimatedDays: '',
                      advisorNotes: ''
                    })}
                  >
                    Clear Form
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Recent Registrations */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 h-full flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-800">Today's Registrations</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">{filteredRegistrations.length}</span>
                </div>
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, plate, order ID..."
                    className="w-full pl-3 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Table */}
              <div className="flex-1 overflow-auto">
                {filteredRegistrations.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="border-b border-slate-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Time</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Customer</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Vehicle</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Service</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations
                        .filter(reg => {
                          const query = searchQuery.toLowerCase();
                          return (
                            reg.customerName.toLowerCase().includes(query) ||
                            reg.plateNumber.toLowerCase().includes(query) ||
                            reg.orderId.toLowerCase().includes(query)
                          );
                        })
                        .map((reg) => (
                        <tr 
                          key={reg.id}
                          onClick={() => handleViewRegistration(reg)}
                          className="border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-2">
                            <span className="text-slate-900 text-sm font-medium">{reg.time}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div>
                              <p className="text-slate-900 text-sm font-medium truncate">{reg.customerName}</p>
                              <p className="text-slate-500 text-xs font-mono">{reg.plateNumber}</p>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div>
                              <p className="text-slate-900 text-sm">{reg.vehicleBrand}</p>
                              <p className="text-slate-500 text-xs">{reg.vehicleModel} '{reg.vehicleYear.slice(-2)}</p>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-slate-700 text-xs">{reg.serviceType}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                    No registrations yet today
                  </div>
                )}
              </div>
              
              {/* Footer Info */}
              {filteredRegistrations.length > 0 && (
                <div className="p-3 border-t border-slate-200 bg-slate-50">
                  <p className="text-xs text-slate-600 text-center">
                    Click any row to view work order
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Work Order Modal */}
        <WorkOrderModal
          isOpen={showWorkOrder}
          onClose={() => {
            setShowWorkOrder(false);
            setSelectedRegistration(null);
          }}
          orderData={selectedRegistration ? {
            customerName: selectedRegistration.customerName,
            phone: selectedRegistration.phone,
            email: selectedRegistration.email,
            plateNumber: selectedRegistration.plateNumber,
            chassisNumber: selectedRegistration.chassisNumber,
            engineNumber: selectedRegistration.engineNumber,
            vehicleBrand: selectedRegistration.vehicleBrand,
            vehicleModel: selectedRegistration.vehicleModel,
            vehicleType: selectedRegistration.vehicleType,
            kilometer: selectedRegistration.kilometer,
            fuel: selectedRegistration.fuel,
            assemblyType: selectedRegistration.assemblyType,
            vehicleYear: selectedRegistration.vehicleYear,
            serviceType: selectedRegistration.serviceType,
            customerComplaint: selectedRegistration.customerComplaint,
            estimatedCost: selectedRegistration.estimatedCost,
            estimatedDays: selectedRegistration.estimatedDays
          } : formData}
          onConfirm={handleWorkOrderConfirm}
          existingRegistration={selectedRegistration}
        />
      </div>
    </div>
  );
}

export default Registration;