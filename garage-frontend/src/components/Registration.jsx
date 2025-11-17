import { useState, useEffect } from 'react';
import { Plus, User, Car, Phone, Mail, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { WorkOrderModal } from './WorkOrderModal';
import { frappeClient } from '../lib/frappeClient';

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
          advisorNotes: '',
          estimatedCost: '',
          estimatedDays: ''
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
      advisorNotes: '',
      estimatedCost: '',
      estimatedDays: ''
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [recentRegistrations, setRecentRegistrations] = useState([]);

  const serviceTypes = [
    'Oil Change',
    'Engine Service',
    'Brake Service',
    'Transmission Service',
    'AC Service',
    'Battery Replacement',
    'Tire Replacement',
    'Wheel Alignment',
    'General Inspection',
    'Electrical Repair',
    'Body Repair',
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

  const toDateKey = (value) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      return date.toISOString().slice(0, 10);
    } catch (error) {
      return '';
    }
  };

  const mapServiceOrdersToRegistrations = (bootstrapData) => {
    if (!bootstrapData) return [];

    const customers = bootstrapData.customers || [];
    const vehicles = bootstrapData.vehicles || [];
    const serviceOrders = bootstrapData.service_orders || [];
    const branchFallback = bootstrapData.active_branch || currentUser?.branch || 'all';

    const customerMap = new Map(customers.map((customer) => [customer.name, customer]));
    const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.name, vehicle]));

    const todayKey = toDateKey(new Date());

    return serviceOrders
      .filter((order) => toDateKey(order.service_booking_date) === todayKey)
      .map((order) => {
        const customer = customerMap.get(order.customer) || {};
        const vehicle = vehicleMap.get(order.vehicle) || {};
        const bookingDate = order.service_booking_date ? new Date(order.service_booking_date) : null;

        return {
          id: order.name,
          time: bookingDate
            ? bookingDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : '--:--',
          orderId: order.name,
          serviceOrderName: order.name,
          customerName: customer.customer_name || order.customer || 'Unknown Customer',
          phone: customer.phone || '',
          email: customer.email || '',
          plateNumber: vehicle.license_plate || '',
          chassisNumber: vehicle.vin || '',
          engineNumber: vehicle.engine_number || '',
          vehicleBrand: vehicle.brand || '',
          vehicleModel: vehicle.model || vehicle.model_variant || '',
          vehicleType: vehicle.type_model || '',
          kilometer: vehicle.mileage || '',
          fuel: vehicle.fuel_type || '',
          assemblyType: vehicle.transmission || '',
          vehicleYear: vehicle.vehicle_year ? String(vehicle.vehicle_year) : '',
          serviceType: order.service_order_type || order.service_notes || 'Service',
          customerComplaint: order.service_notes || '',
          date: bookingDate ? bookingDate.toLocaleDateString('id-ID') : '',
          estimatedCost: order.total_estimated_amount ? String(order.total_estimated_amount) : '',
          estimatedDays: '',
          branch: order.branch || branchFallback,
        };
      });
  };

  // Load registrations from localStorage on mount
  useEffect(() => {
    const savedRegistrations = localStorage.getItem('registrations');
    if (savedRegistrations) {
      setRecentRegistrations(JSON.parse(savedRegistrations));
    }
  }, []);

  // Load today's registrations from Frappe
  useEffect(() => {
    let cancelled = false;

    const fetchRegistrations = async () => {
      try {
        const bootstrap = await frappeClient.getPortalBootstrap();
        if (cancelled) return;

        const mappedRegistrations = mapServiceOrdersToRegistrations(bootstrap);
        if (mappedRegistrations.length) {
          setRecentRegistrations(mappedRegistrations);
        }
      } catch (error) {
        console.error('Failed to load registrations from Pravenya', error);
      }
    };

    fetchRegistrations();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.branch]);

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

  const validateRequiredFields = () => {
    if (!formData.plateNumber || !formData.chassisNumber || !formData.engineNumber ||
        !formData.vehicleBrand || !formData.vehicleModel || !formData.vehicleType ||
        !formData.kilometer || !formData.fuel || !formData.assemblyType ||
        !formData.vehicleYear || !formData.customerName || !formData.phone ||
        !formData.serviceType || !formData.customerComplaint) {
      alert('Please complete all required fields (*)');
      return false;
    }
    return true;
  };

  const buildRegistrationPayload = () => {
    const branchValue = currentUser?.branch && currentUser.branch !== 'all' ? currentUser.branch : undefined;
    const payload = {
      branch: branchValue,
      customer_name: formData.customerName,
      phone: formData.phone,
      email: formData.email,
      license_plate: formData.plateNumber,
      vin: formData.chassisNumber,
      engine_number: formData.engineNumber,
      brand: formData.vehicleBrand,
      model: formData.vehicleModel,
      type_model: formData.vehicleType,
      mileage: formData.kilometer ? Number(formData.kilometer) || undefined : undefined,
      fuel_type: formData.fuel,
      transmission: formData.assemblyType,
      vehicle_year: formData.vehicleYear,
      service_order_type: formData.serviceType,
      service_notes: formData.customerComplaint,
      inspection_summary: formData.customerComplaint,
      intake_type: 'Walk-In'
    };

    if (formData.estimatedCost) {
      payload.total_estimated_amount = Number(formData.estimatedCost) || 0;
    }

    return { payload, branchValue: branchValue || currentUser?.branch || 'all' };
  };

  const appendRegistrationToList = (branchValue, serviceOrderName = '', extraFields = {}) => {
    const newTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    let createdRegistration = null;

    setRecentRegistrations((prev) => {
      const branchRegistrations = prev.filter(reg => reg.branch === branchValue);
      const nextNumber = branchRegistrations.length + 1;
      const newId = `${getBranchCode(branchValue)}-REG-${String(nextNumber).padStart(3, '0')}`;
      const newOrderId = serviceOrderName || getNextOrderNumber(branchValue);
      const registration = {
        id: newId,
        time: newTime,
        orderId: newOrderId,
        serviceOrderName,
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
        estimatedCost: formData.estimatedCost || '0',
        estimatedDays: formData.estimatedDays || '1',
        branch: branchValue,
        ...extraFields
      };
      createdRegistration = registration;
      return [registration, ...prev];
    });

    return createdRegistration;
  };

  const resetForm = () => {
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
  };

  const handleInputComplete = (currentField, value) => {
    if (!value) return;
    
    // Define field order (removed estimatedCost and estimatedDays)
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

  const handleRegisterClick = async () => {
    setSubmitError('');
    if (!validateRequiredFields()) return;

    setSubmitting(true);
    try {
      const { payload, branchValue } = buildRegistrationPayload();
      const response = await frappeClient.registerCustomerVehicle(payload);
      const created = response?.created || {};
      const serviceOrderName = response?.service_order || created.service_order || '';

      appendRegistrationToList(branchValue, serviceOrderName);
      resetForm();

      const successMessage = serviceOrderName
        ? `Registration successful!\nService Order: ${serviceOrderName}\n\nData has been sent to Pravenya.`
        : 'Registration successful! Data has been added to today\'s registrations.';

      alert(successMessage);
    } catch (error) {
      console.error('Failed to save registration', error);
      setSubmitError(error.message || 'Failed to save registration to Pravenya.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWorkOrderConfirm = async (customerSig, advisorSig) => {
    setSubmitError('');
    if (!validateRequiredFields()) return;

    setSubmitting(true);
    try {
      const { payload, branchValue } = buildRegistrationPayload();
      const response = await frappeClient.registerCustomerVehicle(payload);
      const created = response?.created || {};
      const serviceOrderName = response?.service_order || created.service_order || '';

      appendRegistrationToList(branchValue, serviceOrderName, {
        customerSignature: customerSig,
        advisorSignature: advisorSig
      });
      resetForm();

      alert('Registration successful! Data has been added to today\'s registrations.');
    } catch (error) {
      console.error('Failed to save registration', error);
      setSubmitError(error.message || 'Failed to save registration to Pravenya.');
    } finally {
      setSubmitting(false);
      setShowWorkOrder(false);
    }
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
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={handleRegisterClick}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Register & Continue to Inspection
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-300"
                      onClick={resetForm}
                      disabled={submitting}
                    >
                      Clear Form
                    </Button>
                  </div>
                  {submitError && (
                    <p className="text-sm text-red-600">{submitError}</p>
                  )}
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
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium text-sm">{filteredRegistrations.length}</span>
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