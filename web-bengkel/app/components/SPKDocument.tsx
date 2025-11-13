'use client';

import React from 'react';

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
  branch: string;
  date: string;
  mechanicName?: string;
  spareParts?: SparePart[];
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
}

interface SPKDocumentProps {
  workOrder: WorkOrder;
  spareParts: SparePart[];
}

export function SPKDocument({ workOrder, spareParts }: SPKDocumentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateTotal = () => {
    return spareParts.reduce((sum, part) => sum + part.totalPrice, 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #spk-print-area, #spk-print-area * {
            visibility: visible;
          }
          #spk-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
        @media screen {
          #spk-print-area {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 20mm;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      <div id="spk-print-area" className="print:p-0 text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-base mb-0" style={{ color: '#5b7c99', fontWeight: '600' }}>AutoCare Workshop</h2>
            <p className="text-sm text-slate-600 mb-0.5" style={{ color: '#5b7c99' }}>Professional Car Repair Service</p>
            <p className="text-xs text-slate-600" style={{ color: '#5b7c99' }}>Jl. Sudirman No. 123, Jakarta | Telp: (021) 1234-5678</p>
          </div>
          <div className="flex items-center">
            <img 
            //   src={watermarkLogo} 
              alt="IMOGI Logo" 
              className="h-10 w-auto object-contain"
            />
          </div>
        </div>

        {/* Document Number & Date - Right aligned */}
        <div className="flex justify-end mb-3">
          <div className="text-right text-sm" style={{ color: '#5b7c99' }}>
            <p className="mb-0">No: <span className="text-slate-900">{workOrder.id}</span></p>
            <p className="mb-0">Tanggal: <span className="text-slate-900">{formatDate(workOrder.date)}</span></p>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-4" style={{ borderTop: '3px solid #333', width: '100%' }}></div>

        {/* Title - Center */}
        <div className="text-center mb-4">
          <h1 className="text-base mb-0" style={{ color: '#5b7c99', fontWeight: '600' }}>SURAT PERINTAH KERJA</h1>
          <p className="text-sm mb-0" style={{ color: '#5b7c99' }}>(Work Order)</p>
        </div>

        {/* Customer & Vehicle Information - 2 Columns */}
        <div className="grid grid-cols-2 gap-8 mb-4">
          {/* Customer Information */}
          <div>
            <h3 className="text-sm mb-3" style={{ color: '#5b7c99', fontWeight: '600' }}>Customer Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Name</p>
                <p className="mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.customerName}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Phone</p>
                <p className="mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.phone}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Email</p>
                <p className="mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.email || 'abisena1123@gmail.com'}</p>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div>
            <h3 className="text-sm mb-3" style={{ color: '#5b7c99', fontWeight: '600' }}>Vehicle Information</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Plate Number</p>
                <p className="mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.plateNumber}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Brand</p>
                <p className="mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.vehicleBrand}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Model</p>
                <p className="mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.vehicleModel}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Year</p>
                <p className="mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.vehicleYear}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Type</p>
                <p className="mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.vehicleType || 'MPV'}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Kilometer</p>
                <p className="mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.kilometer || '1000 km'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Vehicle Details - 4 Columns */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Chassis Number</p>
            <p className="text-sm mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.chassisNumber || '13123123'}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Engine Number</p>
            <p className="text-sm mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.engineNumber || '13213123'}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Fuel Type</p>
            <p className="text-sm mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.fuel || 'BBM'}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Jenis Rakit</p>
            <p className="text-sm mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.assemblyType || 'CKD'}</p>
          </div>
        </div>

        {/* Service Information */}
        <div className="mb-4">
          <h3 className="text-sm mb-3" style={{ color: '#5b7c99', fontWeight: '600' }}>Service Information</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Service Type</p>
              <p className="text-sm mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.serviceType}</p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Customer Complaint</p>
              <p className="text-sm mb-0" style={{ color: '#333', fontWeight: '500' }}>{workOrder.customerComplaint || workOrder.diagnosis}</p>
            </div>
          </div>
        </div>

        {/* Repair Estimation - Yellow Box */}
        <div className="mb-4">
          <h3 className="text-sm mb-2" style={{ color: '#5b7c99', fontWeight: '600' }}>Repair Estimation</h3>
          <div className="rounded-lg p-4" style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24' }}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Estimated Cost</p>
                <p className="text-sm mb-0" style={{ color: '#333', fontWeight: '600' }}>
                  {spareParts.length > 0 ? formatCurrency(calculateTotal()) : 'Rp 100.000'}
                </p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#5b7c99' }}>Estimated Completion</p>
                <p className="text-sm mb-0" style={{ color: '#333', fontWeight: '600' }}>
                  {workOrder.estimatedRepairTime || '1 days'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Syarat dan Ketentuan - Yellow Box with Bullets */}
        <div className="mb-6 rounded-lg p-4" style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24' }}>
          <h3 className="text-sm mb-2" style={{ color: '#5b7c99', fontWeight: '600' }}>Syarat dan Ketentuan</h3>
          <ul className="text-xs space-y-1 pl-5" style={{ color: '#333', listStyleType: 'disc' }}>
            <li>Pelanggan menyetujui pemeriksaan dan perbaikan sesuai keluhan yang disampaikan</li>
            <li>Estimasi biaya diberikan setelah pemeriksaan awal dan memerlukan persetujuan pelanggan</li>
            <li>Barang berharga di dalam kendaraan menjadi tanggung jawab pelanggan</li>
            <li>Kendaraan yang tidak diambil dalam 7 hari dikenakan biaya parkir</li>
          </ul>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 pt-4">
          <div className="text-center">
            <p className="text-sm mb-16" style={{ color: '#5b7c99' }}>Tanda Tangan Pelanggan</p>
            <div style={{ borderBottom: '1px solid #999', width: '80%', margin: '0 auto' }}></div>
          </div>
          <div className="text-center">
            <p className="text-sm mb-16" style={{ color: '#5b7c99' }}>Tanda Tangan Service Advisor</p>
            <div style={{ borderBottom: '1px solid #999', width: '80%', margin: '0 auto' }}></div>
          </div>
        </div>
      </div>
    </>
  );
}