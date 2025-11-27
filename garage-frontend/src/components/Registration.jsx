import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, User, Car } from 'lucide-react';
import { Button } from './ui/button';
import { WorkOrderModal } from './WorkOrderModall';
import frappeClient from '../lib/frappeClient';
import { refreshWorkOrdersFromBackend } from '../lib/workOrdersStorage';
import useServerCache, { ensurePointer } from '../lib/serverCache';

export function Registration({ currentUser }) {
  const cache = useServerCache();
  const defaultFormState = {
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
    serviceBundle: '',
    serviceBundleName: '',
    customerComplaint: '',
    kilometer: '',
    fuel: '',
    assemblyType: '',
    advisorNotes: ''
  };

  const draftKey = useMemo(
    () =>
      ensurePointer('registrationDraftKey', () =>
        `draft:registration:${currentUser?.username || currentUser?.name || 'guest'}`
      ),
    [currentUser?.name, currentUser?.username]
  );

  const registrationsKey = useMemo(
    () =>
      ensurePointer('registrationsKey', () =>
        `draft:registrations:${currentUser?.username || currentUser?.name || 'guest'}`
      ),
    [currentUser?.name, currentUser?.username]
  );

  const [formData, setFormData] = useState({ ...defaultFormState });

  const DEFAULT_SERVICE_TYPES = [
    'Service/Repair',
    'Inspection',
    'Warranty',
    'Insurance Claim'
  ];

  useEffect(() => {
    let active = true;
    const hydrateDraft = async () => {
      try {
        const cached = await cache.load(draftKey);
        if (!active) return;
        if (cached && typeof cached === 'object') {
          setFormData({ ...defaultFormState, ...cached });
        } else {
          setFormData({ ...defaultFormState });
        }
      } catch (error) {
        console.error('Unable to load registration draft from server cache:', error);
        setFormData({ ...defaultFormState });
      }
    };

    hydrateDraft();
    return () => {
      active = false;
    };
  }, [cache, draftKey]);

  const [serviceTypeOptions, setServiceTypeOptions] = useState(DEFAULT_SERVICE_TYPES);
  const [serviceBundles, setServiceBundles] = useState([]);

  // Persist draft to backend cache whenever it changes
  useEffect(() => {
    cache.save(draftKey, formData);
  }, [cache, draftKey, formData]);

  const [focusedField, setFocusedField] = useState('');
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const todayDate = new Date().toLocaleDateString('id-ID');

  useEffect(() => {
    const loadServiceBundles = async () => {
      try {
        const bootstrap = await frappeClient.getPortalBootstrap({ branch: currentUser?.branch });
        const bundles = Array.isArray(bootstrap?.service_bundles) ? bootstrap.service_bundles : [];

        if (bundles.length > 0) {
          setServiceBundles(bundles);
        }

        const serviceTypes = Array.isArray(bootstrap?.service_order_types)
          ? bootstrap.service_order_types
          : [];

        setServiceTypeOptions(
          serviceTypes.length > 0 ? serviceTypes : DEFAULT_SERVICE_TYPES
        );
        return;
      } catch (error) {
        console.error('Failed to load service bundles from Frappe:', error);
      }

      setServiceTypeOptions((prev) => (prev.length > 0 ? prev : DEFAULT_SERVICE_TYPES));
    };

    loadServiceBundles();
  }, [currentUser?.branch]);

  const [recentRegistrations, setRecentRegistrations] = useState([]);

  const refreshRegistrations = useCallback(async () => {
    const storedRegistrations = await cache.load(registrationsKey);
    const normalized = Array.isArray(storedRegistrations) ? storedRegistrations : [];
    setRecentRegistrations(normalized.filter((reg) => reg.date === todayDate));
  }, [cache, registrationsKey, todayDate]);

  const addRegistration = async (registration) => {
    const existingRegistrations = (await cache.load(registrationsKey)) || [];
    const updatedAllRegistrations = [registration, ...(Array.isArray(existingRegistrations) ? existingRegistrations : [])];
    await cache.save(registrationsKey, updatedAllRegistrations);
    setRecentRegistrations(updatedAllRegistrations.filter((reg) => reg.date === todayDate));
  };

  useEffect(() => {
    const hydrateFromBackend = async () => {
      try {
        const today = new Date();
        const fromDate = today.toISOString().split('T')[0];
        const backendOrders = await refreshWorkOrdersFromBackend({
          branch: currentUser?.branch,
          from_date: fromDate,
          to_date: fromDate,
        });

        const mappedRegistrations = backendOrders.map((order) => ({
          id: order.orderId,
          time: order.date ? new Date(order.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '',
          orderId: order.orderId,
          customerName: order.customerName,
          phone: order.phone,
          email: order.email,
          plateNumber: order.plateNumber,
          chassisNumber: order.chassisNumber,
          engineNumber: order.engineNumber,
          vehicleBrand: order.vehicleBrand,
          vehicleModel: order.vehicleModel,
          vehicleType: order.vehicleType,
          kilometer: order.kilometer,
          fuel: order.fuel,
          assemblyType: order.assemblyType,
          vehicleYear: order.vehicleYear,
          serviceType: order.serviceType,
          serviceBundleId: order.serviceBundleId,
          serviceBundleName: order.serviceBundleName,
          customerComplaint: order.customerComplaint,
          date: today.toLocaleDateString('id-ID'),
          estimatedCost: order.estimatedCost,
          estimatedDays: order.estimatedDays,
          branch: order.branch,
          status: order.status,
          inspectionStatus: order.inspectionStatus,
        }));

        await cache.save(registrationsKey, mappedRegistrations);
        setRecentRegistrations(mappedRegistrations.filter((reg) => reg.date === todayDate));
      } catch (error) {
        console.error('Unable to hydrate registrations from backend:', error);
      }
    };

    hydrateFromBackend();
    refreshRegistrations();
  }, [cache, currentUser?.branch, refreshRegistrations, registrationsKey, todayDate]);

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
    'Petrol',
    'Diesel',
    'Hybrid',
    'Electric'
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

  // Keep registration list in sync when focus returns
  useEffect(() => {
    refreshRegistrations();

    const onFocus = () => refreshRegistrations();

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }, [refreshRegistrations]);

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
      'email', 'serviceType', 'serviceBundle', 'customerComplaint'
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
    // Validate required fields
    if (!formData.plateNumber || !formData.chassisNumber || !formData.engineNumber ||
        !formData.vehicleBrand || !formData.vehicleModel || !formData.vehicleType ||
        !formData.kilometer || !formData.fuel || !formData.assemblyType ||
        !formData.vehicleYear || !formData.customerName || !formData.phone ||
        !formData.serviceType || !formData.customerComplaint) {
      alert('Please complete all required fields (*)');
      return;
    }

    const matchedBundle = serviceBundles.find((bundle) =>
      bundle.id === formData.serviceBundle ||
      bundle.name === formData.serviceBundle ||
      (bundle.bundle_name && bundle.bundle_name === formData.serviceBundle)
    );

    try {
      console.log('Sending registration data to Frappe...');


    //   const payload = {
    //   customer_name: formData.customerName,
    //   phone: formData.phone,
    //   email: formData.email || '',
    //   license_plate: formData.plateNumber,
    //   vin: formData.chassisNumber,
    //   engine_number: formData.engineNumber,
    //   brand: formData.vehicleBrand,
    //   model: formData.vehicleModel,
    //   vehicle_type: formData.vehicleType,
    //   year: formData.vehicleYear,
    //   vehicle_year: formData.vehicleYear,
    //   mileage: parseInt(formData.kilometer) || 0,
    //   fuel_type: formData.fuel,
    //   assembly_type: formData.assemblyType,
    //   service_order_type: formData.serviceType,
    //   notes: formData.customerComplaint,
    //   intake_type: 'Walk-In',
    //   priority: 'Normal',
    //   branch: currentUser.branch,
    //   service_notes: formData.advisorNotes || formData.customerComplaint
    // };

      const payload = {
        customer_name: formData.customerName,
        phone: formData.phone,
        email: formData.email || '',
        license_plate: formData.plateNumber,
        vin: formData.chassisNumber,
        engine_number: formData.engineNumber,
        brand: formData.vehicleBrand,
        model: formData.vehicleModel,
        vehicle_type: formData.vehicleType,
        year: formData.vehicleYear,
        vehicle_year: formData.vehicleYear,
        mileage: parseInt(formData.kilometer) || 0,
        fuel_type: formData.fuel,
        assembly_type: formData.assemblyType,
        service_order_type: formData.serviceType,
        service_bundle: matchedBundle?.id || formData.serviceBundle || '',
        service_bundle_name: matchedBundle?.bundle_name || matchedBundle?.name || formData.serviceBundleName || '',
        notes: formData.customerComplaint,
        intake_type: 'Walk-In',
        priority: 'Normal',
        branch: currentUser.branch,
        service_notes: formData.advisorNotes || formData.customerComplaint
      };

      console.log('Payload:', payload);

      const result = await frappeClient.registerCustomerVehicle(payload);
      console.log('Registration API Response:', result);

      if (result && result.created) {
        const createdData = result.created;

        // ✅ FIX: Prioritize user input, fallback to API
        const displayCustomerName =
          formData.customerName ||
          createdData.customer_display_name ||
          createdData.full_name ||
          'Customer';

        const newTime = new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit'
        });

        const newRegistration = {
          id: createdData.service_order || createdData.vehicle || Date.now().toString(),
          time: newTime,
          orderId: createdData.service_order || `ORD-${Date.now().toString().slice(-6)}`,
          customerName: displayCustomerName,  // ✅ NOW USING CORRECT NAME
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
          serviceBundleId: matchedBundle?.id || formData.serviceBundle || '',
          serviceBundleName: matchedBundle?.bundle_name || matchedBundle?.name || formData.serviceBundleName || '',
          customerComplaint: formData.customerComplaint,
          date: new Date().toLocaleDateString('id-ID'),
          estimatedCost: '0',
          estimatedDays: '1',
          branch: currentUser.branch,
          status: result.service_order_status || 'Inspection',
          inspectionStatus: 'waiting'
        };

        await addRegistration(newRegistration);
        setFormData({ ...defaultFormState });

        let successMessage = `✅ Registration Successful!\n\n`;
        successMessage += `Customer: ${displayCustomerName}\n`;
        successMessage += `Vehicle: ${formData.plateNumber}\n`;

        if (createdData.service_order) {
          successMessage += `Service Order: ${createdData.service_order}\n`;
        }
        if (createdData.customer) {
          successMessage += `Customer ID: ${createdData.customer}\n`;
        }
        if (createdData.vehicle) {
          successMessage += `Vehicle ID: ${createdData.vehicle}\n`;
        }

        successMessage += `\nData has been saved to Frappe backend.`;

        if (result.estimate_pdf || result.estimate_pdf_file) {
          successMessage += `\n\n📄 Service estimate PDF has been generated.`;
        }

        alert(successMessage);

        setTimeout(() => {
          const firstInput = document.querySelector('[name="plateNumber"]');
          if (firstInput) {
            firstInput.focus();
          }
        }, 100);

        return;
      }

      throw new Error('Registration failed: Invalid response from server');
    } catch (error) {
      console.error('Registration error:', error);

      const fallbackBranchCode = getBranchCode(currentUser.branch);
      const fallbackOrderId = getNextOrderNumber(currentUser.branch);
      const fallbackRegistration = {
        id: `${fallbackBranchCode}-REG-${Date.now().toString().slice(-5)}`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        orderId: fallbackOrderId,
        customerName: formData.customerName,  // ✅ DIRECTLY USE USER INPUT
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
        serviceBundleId: formData.serviceBundle,
        serviceBundleName: matchedBundle?.bundle_name || matchedBundle?.name || formData.serviceBundleName || '',
        customerComplaint: formData.customerComplaint,
        date: new Date().toLocaleDateString('id-ID'),
        estimatedCost: '0',
        estimatedDays: '1',
        branch: currentUser.branch,
        status: 'Inspection',
        inspectionStatus: 'waiting'
      };

      await addRegistration(fallbackRegistration);
      setFormData({ ...defaultFormState });

      alert(
        'Backend unavailable, but registration was saved locally.\n' +
        'It will appear in Today\'s Registrations and Inspection queue.'
      );
    }
  };

  // Load registrations from Frappe backend on mount
// useEffect(() => {
//   const loadRegistrationsFromFrappe = async () => {
//     try {
//       console.log('Loading registrations from Frappe...');
      
//       // Call API to get registrations
//       const result = await frappeClient.request('/api/method/garage.api.portal.get_customer_registrations');
      
//       if (result.message && result.message.success) {
//         const registrationsData = result.message.data || [];
        
//         // Transform data untuk UI
//         const transformedData = registrationsData.map(reg => ({
//           id: reg.registration_id,
//           time: new Date(reg.registration_date).toLocaleTimeString('id-ID', { 
//             hour: '2-digit', 
//             minute: '2-digit' 
//           }),
//           orderId: reg.registration_id,
//           customerName: reg.customer_name,
//           phone: reg.phone,
//           email: reg.email,
//           plateNumber: reg.plate_number,
//           chassisNumber: reg.chassis_number || '',
//           engineNumber: reg.engine_number || '',
//           vehicleBrand: reg.vehicle_brand,
//           vehicleModel: reg.vehicle_model,
//           vehicleType: reg.vehicle_type,
//           vehicleYear: reg.vehicle_year,
//           serviceType: reg.service_type,
//           customerComplaint: reg.customer_complaint,
//           date: new Date(reg.registration_date).toLocaleDateString('id-ID'),
//           estimatedCost: '0',
//           estimatedDays: '1',
//           branch: currentUser.branch,
//           status: reg.status
//         }));
        
//         setRecentRegistrations(transformedData);
//         console.log('Loaded registrations:', transformedData);
//       }
//     } catch (error) {
//       console.error('Failed to load registrations from Frappe:', error);
      
//       // Fallback to localStorage if Frappe fails
//       const savedRegistrations = localStorage.getItem('registrations');
//       if (savedRegistrations) {
//         setRecentRegistrations(JSON.parse(savedRegistrations));
//       }
//     }
//   };

//   loadRegistrationsFromFrappe();
// }, [currentUser.branch]);

  const handleWorkOrderConfirm = async (customerSig, advisorSig) => {
    // Generate new registration
    const newTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const branchCode = getBranchCode(currentUser.branch);
    const branchRegistrations = recentRegistrations.filter(reg => reg.branch === currentUser.branch);
    const nextNumber = branchRegistrations.length + 1;
    const newId = `${branchCode}-REG-${String(nextNumber).padStart(3, '0')}`;
    const newOrderId = getNextOrderNumber(currentUser.branch);

    const matchedBundle = serviceBundles.find((bundle) =>
      bundle.id === formData.serviceBundle ||
      bundle.name === formData.serviceBundle ||
      (bundle.bundle_name && bundle.bundle_name === formData.serviceBundle)
    );

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
      serviceBundleId: matchedBundle?.id || formData.serviceBundle || '',
      serviceBundleName: matchedBundle?.bundle_name || matchedBundle?.name || formData.serviceBundleName || '',
      customerComplaint: formData.customerComplaint,
      customerSignature: customerSig,
      advisorSignature: advisorSig,
      date: new Date().toLocaleDateString('id-ID'),
      estimatedCost: formData.estimatedCost,
      estimatedDays: formData.estimatedDays,
      branch: currentUser.branch,
      inspectionStatus: 'waiting'
    };

    // Add to list (at the beginning)
    await addRegistration(newRegistration);

    // Reset form
    setFormData({ ...defaultFormState });

    alert('Registration successful! Data has been added to today\'s registrations.');
  };

  const handleServiceTypeChange = (value) => {
    setFormData({
      ...formData,
      serviceType: value
    });
  };

  const handleServiceBundleChange = (value) => {
    const matchedBundle = serviceBundles.find((bundle) =>
      bundle.id === value ||
      bundle.name === value ||
      (bundle.bundle_name && bundle.bundle_name === value)
    );

    setFormData({
      ...formData,
      serviceBundle: matchedBundle?.id || value,
      serviceBundleName: matchedBundle?.bundle_name || matchedBundle?.name || ''
    });
  };

  const handleViewRegistration = (registration) => {
    setSelectedRegistration(registration);
    setShowWorkOrder(true);
  };

  // Filter registrations based on user branch, but fall back to all data if branch doesn't match any
  const shouldFilterByBranch = currentUser.branch && currentUser.branch !== 'all';
  const branchFilteredRegistrations = shouldFilterByBranch
    ? recentRegistrations.filter(reg => reg.branch === currentUser.branch)
    : recentRegistrations;

  const filteredRegistrations = branchFilteredRegistrations.length > 0
    ? branchFilteredRegistrations
    : recentRegistrations;

  return (
    <>
      {/* Header dengan Icon */}
      <div className="bg-gray-50 px-8 py-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Registration</h1>
            <p className="text-sm text-gray-600">Step 1: Register new customer and vehicle</p>
          </div>
        </div>
      </div>

      {/* Main Content - Fixed Height Layout */}
      <div className="flex h-[calc(100vh-180px)]">
        
        {/* LEFT: Form Area - 60% width, scrollable */}
        <div className="w-[60%] overflow-y-auto bg-white border-r border-gray-200">
          <div className="p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">New Registration Form</h3>
            
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleRegisterClick(); }}>
              
              {/* Vehicle Information */}
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Car className="w-5 h-5 text-gray-700" />
                  Vehicle Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Plate Number *</label>
                    <input
                      type="text"
                      name="plateNumber"
                      placeholder="B 1234 XYZ"
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chassis Number *</label>
                    <input
                      type="text"
                      name="chassisNumber"
                      placeholder="e.g. MHKA42V159K123456"
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Engine Number *</label>
                    <input
                      type="text"
                      name="engineNumber"
                      placeholder="e.g. 1NR-VE-123"
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand *</label>
                    <select 
                      name="vehicleBrand"
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                        focusedField === 'vehicleBrand' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                      }`}
                      value={formData.vehicleBrand}
                      onChange={(e) => {
                        setFormData({...formData, vehicleBrand: e.target.value, vehicleModel: ''});
                        handleInputComplete('vehicleBrand', e.target.value);
                      }}
                      onFocus={() => setFocusedField('vehicleBrand')}
                      onBlur={() => setFocusedField('')}
                    >
                      <option value="">Select brand</option>
                      {Object.keys(vehicleModelsByBrand).map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                    <select 
                      name="vehicleModel"
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                        focusedField === 'vehicleModel' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                      }`}
                      value={formData.vehicleModel}
                      onChange={(e) => {
                        setFormData({...formData, vehicleModel: e.target.value});
                        handleInputComplete('vehicleModel', e.target.value);
                      }}
                      onFocus={() => setFocusedField('vehicleModel')}
                      onBlur={() => setFocusedField('')}
                      disabled={!formData.vehicleBrand}
                    >
                      <option value="">Select model</option>
                      {availableModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type *</label>
                    <select 
                      name="vehicleType"
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kilometer *</label>
                    <input
                      type="text"
                      name="kilometer"
                      placeholder="e.g. 45000"
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fuel *</label>
                    <select 
                      name="fuel"
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Rakit *</label>
                    <select 
                      name="assemblyType"
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
                    <input
                      type="text"
                      name="vehicleYear"
                      placeholder="e.g. 2020"
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
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

              {/* Customer Information */}
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-700" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      name="customerName"
                      placeholder="Enter customer name"
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="+62 xxx-xxxx-xxxx"
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
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
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="customer@email.com"
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Type *</label>
                <select
                  name="serviceType"
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                    focusedField === 'serviceType' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                  }`}
                  value={formData.serviceType}
                  onChange={(e) => {
                    handleServiceTypeChange(e.target.value);
                    handleInputComplete('serviceType', e.target.value);
                  }}
                  onFocus={() => setFocusedField('serviceType')}
                  onBlur={() => setFocusedField('')}
                >
                  <option value="">Select service type</option>
                  {serviceTypeOptions.map(service => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              {/* Service Bundle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paket Service</label>
                <select
                  name="serviceBundle"
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                    focusedField === 'serviceBundle' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                  }`}
                  value={formData.serviceBundle}
                  onChange={(e) => {
                    handleServiceBundleChange(e.target.value);
                    handleInputComplete('serviceBundle', e.target.value);
                  }}
                  onFocus={() => setFocusedField('serviceBundle')}
                  onBlur={() => setFocusedField('')}
                  disabled={serviceBundles.length === 0}
                >
                  <option value="">{serviceBundles.length > 0 ? 'Select service package' : 'No service packages available'}</option>
                  {serviceBundles.map((bundle) => {
                    const displayName = bundle.bundle_name || bundle.name || bundle.id;
                    const optionValue = bundle.id || bundle.name || bundle.bundle_name;

                    if (!displayName || !optionValue) return null;

                    return (
                      <option key={optionValue} value={optionValue}>{displayName}</option>
                    );
                  })}
                </select>
              </div>

              {/* Customer Complaint */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Complaint *</label>
                <textarea
                  name="customerComplaint"
                  rows={4}
                  placeholder="Describe the issues or problems with the vehicle..."
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all ${
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Advisor Notes</label>
                <textarea
                  name="advisorNotes"
                  rows={3}
                  placeholder="Additional notes from service advisor (optional)..."
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all ${
                    focusedField === 'advisorNotes' ? 'bg-blue-50 border-blue-400' : 'bg-white'
                  }`}
                  value={formData.advisorNotes}
                  onChange={(e) => setFormData({...formData, advisorNotes: e.target.value})}
                  onFocus={() => setFocusedField('advisorNotes')}
                  onBlur={() => setFocusedField('')}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Register & Continue to Inspection
                </button>
                <button
                  type="button"
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
                  onClick={() => setFormData({ ...defaultFormState })}
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT: Today's Registrations - 40% width, scrollable */}
        <div className="w-[40%] overflow-y-auto bg-gray-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4 text-2xl">
              <h3 className="text-2xl font-semibold text-gray-900">Today's Registrations</h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-lg font-semibold">
                {filteredRegistrations.length}
              </span>
            </div>
            
            <input
              type="text"
              placeholder="Search by name, plate, order ID..."
              className="w-full px-4 py-2.5 mb-4 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {filteredRegistrations
              .filter(reg => {
                const query = searchQuery.toLowerCase();
                return (
                  reg.customerName.toLowerCase().includes(query) ||
                  reg.plateNumber.toLowerCase().includes(query) ||
                  reg.orderId.toLowerCase().includes(query)
                );
              }).length > 0 ? (
              <div className="space-y-3">
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
                  <div 
                    key={reg.id}
                    onClick={() => handleViewRegistration(reg)}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{reg.customerName}</p>
                        <p className="text-xs text-gray-500 font-mono">{reg.plateNumber}</p>
                      </div>
                      <span className="text-xs font-medium text-gray-600">{reg.time}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{reg.vehicleBrand} {reg.vehicleModel}</span>
                      <span className="text-blue-600 font-medium">{reg.serviceType}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">No registrations yet today</p>
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
    </>
  );
}

export default Registration;