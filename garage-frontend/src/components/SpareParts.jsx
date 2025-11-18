import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, Search, Save, X } from 'lucide-react';
import { Button } from './ui/button';

export function SpareParts() {
  const [spareParts, setSpareParts] = useState([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    partName: '',
    partNumber: '',
    compatibleModels: [],
    category: '',
    unitPrice: 0,
    stock: 0,
    minStock: 10
  });

  // Initialize with default data
  useEffect(() => {
    const savedParts = localStorage.getItem('masterSpareParts');
    if (savedParts) {
      setSpareParts(JSON.parse(savedParts));
    } else {
      // Initialize with default parts
      const defaultParts = [
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
      ];
      
      setSpareParts(defaultParts);
      localStorage.setItem('masterSpareParts', JSON.stringify(defaultParts));
    }
  }, []);

  // Save to localStorage whenever parts change
  useEffect(() => {
    if (spareParts.length > 0) {
      localStorage.setItem('masterSpareParts', JSON.stringify(spareParts));
    }
  }, [spareParts]);

  const handleAddNew = () => {
    setIsAddingNew(true);
    setFormData({
      partName: '',
      partNumber: '',
      compatibleModels: [],
      category: '',
      unitPrice: 0,
      stock: 0,
      minStock: 10
    });
  };

  const handleEdit = (part) => {
    setEditingId(part.id);
    setFormData(part);
  };

  const handleSave = () => {
    if (isAddingNew) {
      const newPart = {
        id: Date.now().toString(),
        partName: formData.partName || '',
        partNumber: formData.partNumber || '',
        compatibleModels: formData.compatibleModels || [],
        category: formData.category || '',
        unitPrice: formData.unitPrice || 0,
        stock: formData.stock || 0,
        minStock: formData.minStock || 10
      };
      setSpareParts([...spareParts, newPart]);
    } else if (editingId) {
      setSpareParts(spareParts.map(part => 
        part.id === editingId ? { ...part, ...formData } : part
      ));
    }
    
    setIsAddingNew(false);
    setEditingId(null);
    setFormData({
      partName: '',
      partNumber: '',
      compatibleModels: [],
      category: '',
      unitPrice: 0,
      stock: 0,
      minStock: 10
    });
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData({
      partName: '',
      partNumber: '',
      compatibleModels: [],
      category: '',
      unitPrice: 0,
      stock: 0,
      minStock: 10
    });
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this part?')) {
      setSpareParts(spareParts.filter(part => part.id !== id));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredParts = spareParts.filter(part =>
    part.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.compatibleModels.some(model => model.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const vehicleModels = ['Avanza', 'Jazz', 'Xpander', 'CR-V', 'Fortuner', 'Innova', 'HRV', 'Brio'];
  const categories = ['Brake System', 'Engine', 'Transmission', 'Electrical', 'Accessories', 'Suspension', 'Body Parts'];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Master Spare Parts</h1>
            <p className="text-slate-600">Manage spare parts inventory and pricing</p>
          </div>
          <Button 
            onClick={handleAddNew}
            className="bg-blue-500 hover:bg-blue-600 text-white"
            disabled={isAddingNew || editingId !== null}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Part
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Total Parts</p>
                <p className="text-slate-900 text-2xl">{spareParts.length}</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Low Stock</p>
                <p className="text-slate-900 text-2xl">
                  {spareParts.filter(p => p.stock <= p.minStock).length}
                </p>
              </div>
              <div className="bg-amber-100 rounded-lg p-3">
                <Package className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Categories</p>
                <p className="text-slate-900 text-2xl">
                  {new Set(spareParts.map(p => p.category)).size}
                </p>
              </div>
              <div className="bg-emerald-100 rounded-lg p-3">
                <Package className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Total Value</p>
                <p className="text-slate-900 text-lg">
                  {formatCurrency(spareParts.reduce((sum, p) => sum + (p.stock * p.unitPrice), 0))}
                </p>
              </div>
              <div className="bg-slate-100 rounded-lg p-3">
                <Package className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by part name, part number, category, or vehicle model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Add/Edit Form */}
        {(isAddingNew || editingId) && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-slate-800 mb-4">{isAddingNew ? 'Add New Part' : 'Edit Part'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 mb-2">Part Name *</label>
                <input
                  type="text"
                  value={formData.partName || ''}
                  onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Brake Pad Front"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-2">Part Number *</label>
                <input
                  type="text"
                  value={formData.partNumber || ''}
                  onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., BP-TOY-AVZ-001"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-2">Category *</label>
                <select
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-2">Compatible Models * (Select multiple)</label>
                <select
                  multiple
                  value={formData.compatibleModels || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData({ ...formData, compatibleModels: selected });
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size={5}
                >
                  {vehicleModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <p className="text-slate-500 text-xs mt-1">Hold Ctrl/Cmd to select multiple models</p>
              </div>

              <div>
                <label className="block text-slate-700 mb-2">Unit Price (Rp) *</label>
                <input
                  type="number"
                  value={formData.unitPrice || ''}
                  onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-2">Stock *</label>
                <input
                  type="number"
                  value={formData.stock || ''}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-2">Min Stock *</label>
                <input
                  type="number"
                  value={formData.minStock || ''}
                  onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                  min="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                className="bg-blue-500 hover:bg-blue-600 text-white"
                disabled={!formData.partName || !formData.partNumber || !formData.category || !formData.compatibleModels?.length}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        )}

        {/* Parts Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-slate-700">Part Name</th>
                  <th className="text-left px-6 py-4 text-slate-700">Part Number</th>
                  <th className="text-left px-6 py-4 text-slate-700">Category</th>
                  <th className="text-left px-6 py-4 text-slate-700">Compatible Models</th>
                  <th className="text-right px-6 py-4 text-slate-700">Unit Price</th>
                  <th className="text-center px-6 py-4 text-slate-700">Stock</th>
                  <th className="text-center px-6 py-4 text-slate-700">Min Stock</th>
                  <th className="text-center px-6 py-4 text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParts.map((part) => (
                  <tr key={part.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-900">{part.partName}</td>
                    <td className="px-6 py-4 text-slate-700">{part.partNumber}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                        {part.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {part.compatibleModels.map((model, idx) => (
                          <span key={idx} className="inline-block px-2 py-1 rounded text-xs bg-slate-100 text-slate-700">
                            {model}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-900">{formatCurrency(part.unitPrice)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded ${
                        part.stock <= part.minStock 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {part.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700">{part.minStock}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(part)}
                          disabled={isAddingNew || editingId !== null}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(part.id)}
                          disabled={isAddingNew || editingId !== null}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredParts.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p>No spare parts found</p>
              <p className="text-sm mt-1">Try adjusting your search query</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}