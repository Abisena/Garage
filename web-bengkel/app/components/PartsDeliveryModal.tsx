'use client';


import React, { useRef, useEffect, useCallback } from 'react';
import { X, Printer, CheckCircle, Package } from 'lucide-react';
import { Button } from './ui/button';

interface Part {
  partCode: string;
  partName: string;
  qty: number;
  location: string;
  unit: string;
}

interface PartsDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    orderId: string;
    customerName: string;
    vehicleBrand: string;
    vehicleModel: string;
    plateNumber: string;
    parts: Part[];
    branch: string;
  };
  onConfirm: (mechanicSignature: string, mechanicName: string) => void;
  existingDelivery?: {
    deliveryId: string;
    mechanicSignature?: string;
    mechanicName?: string;
    date: string;
    preparedBy: string;
  } | null;
}

export function PartsDeliveryModal({ isOpen, onClose, orderData, onConfirm, existingDelivery }: PartsDeliveryModalProps) {
  const mechanicSignatureRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [hasSigned, setHasSigned] = React.useState(false);
  const [mechanicName, setMechanicName] = React.useState('');
  const [generatedDeliveryId, setGeneratedDeliveryId] = React.useState(() =>
    `${orderData.branch.substring(0, 3).toUpperCase()}-DEL-${Date.now().toString().slice(-6)}`,
  );

  const isViewMode = !!existingDelivery;

  const clearSignature = useCallback(() => {
    if (mechanicSignatureRef.current) {
      const ctx = mechanicSignatureRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, mechanicSignatureRef.current.width, mechanicSignatureRef.current.height);
      }
    }
    setHasSigned(false);
  }, []);

  useEffect(() => {
    if (isOpen && existingDelivery) {
      // Load existing signature
      if (existingDelivery.mechanicSignature && mechanicSignatureRef.current) {
        const ctx = mechanicSignatureRef.current.getContext('2d');
        const img = new Image();
        img.onload = () => {
          ctx?.drawImage(img, 0, 0);
          setHasSigned(true);
        };
        img.src = existingDelivery.mechanicSignature;
      }
      if (existingDelivery.mechanicName) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMechanicName(existingDelivery.mechanicName);
      }
    } else if (isOpen && !existingDelivery) {
      // Clear signature for new delivery
      setHasSigned(false);
      setMechanicName('');
      clearSignature();
    }
  }, [clearSignature, existingDelivery, isOpen]);

  useEffect(() => {
    if (isOpen && !existingDelivery) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGeneratedDeliveryId(`${orderData.branch.substring(0, 3).toUpperCase()}-DEL-${Date.now().toString().slice(-6)}`);
    }
  }, [existingDelivery, isOpen, orderData.branch]);

  if (!isOpen) return null;

  const currentDate = existingDelivery?.date || new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const currentTime = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const deliveryId = existingDelivery?.deliveryId || generatedDeliveryId;
  const preparedBy = existingDelivery?.preparedBy || 'Spareparts Staff';

  const startDrawing = () => {
    if (mechanicSignatureRef.current && !isViewMode) {
      const ctx = mechanicSignatureRef.current.getContext('2d');
      if (ctx) {
        setIsDrawing(true);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !mechanicSignatureRef.current || isViewMode) return;
    
    const ctx = mechanicSignatureRef.current.getContext('2d');
    if (!ctx) return;

    const rect = mechanicSignatureRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasSigned(true);
  };

  const stopDrawing = () => {
    if (mechanicSignatureRef.current) {
      const ctx = mechanicSignatureRef.current.getContext('2d');
      if (ctx) {
        ctx.beginPath();
      }
    }
    setIsDrawing(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConfirm = () => {
    if (!hasSigned || !mechanicName.trim()) {
      alert('Mechanic harus mengisi nama dan tanda tangan!');
      return;
    }

    const canvas = mechanicSignatureRef.current;
    if (canvas) {
      const signatureData = canvas.toDataURL();
      onConfirm(signatureData, mechanicName);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[210mm] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10 print:hidden">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-500" />
            <h2 className="text-slate-800">Dokumen Pengeluaran Sparepart</h2>
            {isViewMode && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1 text-sm">
                <CheckCircle className="w-4 h-4" />
                Completed
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Document Content */}
        <div className="p-8 bg-white" id="delivery-document">
          <div className="max-w-4xl mx-auto">
            {/* Document Header */}
            <div className="border-b-2 border-slate-300 pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-slate-800 text-2xl mb-1">AutoCare Workshop</h1>
                  <p className="text-slate-600">Professional Car Repair Service</p>
                  <p className="text-slate-500 text-sm mt-2">Jl. Sudirman No. 123, Jakarta</p>
                  <p className="text-slate-500 text-sm">Telp: (021) 1234-5678</p>
                </div>
                <div className="text-right">
                  <div className="bg-blue-500 text-white px-4 py-2 rounded-lg mb-2">
                    <p className="text-sm">Delivery ID</p>
                    <p className="text-xl">{deliveryId}</p>
                  </div>
                  <p className="text-slate-600 text-sm">{currentDate}</p>
                  <p className="text-slate-500 text-sm">{currentTime}</p>
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center mb-6">
              <h2 className="text-slate-800 text-2xl">BUKTI PENGELUARAN SPAREPART</h2>
              <p className="text-slate-600">(Parts Delivery Note)</p>
            </div>

            {/* Order & Vehicle Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-slate-700 mb-3 border-b border-slate-200 pb-2">Order Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <span className="text-slate-600 w-32">Order ID:</span>
                    <span className="text-slate-900">{orderData.orderId}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 w-32">Customer:</span>
                    <span className="text-slate-900">{orderData.customerName}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 w-32">Branch:</span>
                    <span className="text-slate-900">{orderData.branch}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-slate-700 mb-3 border-b border-slate-200 pb-2">Vehicle Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <span className="text-slate-600 w-32">Plate Number:</span>
                    <span className="text-slate-900">{orderData.plateNumber}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 w-32">Vehicle:</span>
                    <span className="text-slate-900">{orderData.vehicleBrand} {orderData.vehicleModel}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 w-32">Prepared By:</span>
                    <span className="text-slate-900">{preparedBy}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Parts Table */}
            <div className="mb-6">
              <h3 className="text-slate-700 mb-3">Daftar Sparepart yang Dikeluarkan:</h3>
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-700 text-sm">No</th>
                      <th className="px-4 py-3 text-left text-slate-700 text-sm">Part Code</th>
                      <th className="px-4 py-3 text-left text-slate-700 text-sm">Part Name</th>
                      <th className="px-4 py-3 text-center text-slate-700 text-sm">Qty</th>
                      <th className="px-4 py-3 text-center text-slate-700 text-sm">Unit</th>
                      <th className="px-4 py-3 text-left text-slate-700 text-sm">Storage Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderData.parts.map((part, index) => (
                      <tr key={index} className="border-t border-slate-200">
                        <td className="px-4 py-3 text-slate-900 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 text-slate-900 text-sm font-mono">{part.partCode}</td>
                        <td className="px-4 py-3 text-slate-900 text-sm">{part.partName}</td>
                        <td className="px-4 py-3 text-center text-slate-900 text-sm">{part.qty}</td>
                        <td className="px-4 py-3 text-center text-slate-600 text-sm">{part.unit}</td>
                        <td className="px-4 py-3 text-slate-600 text-sm">{part.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                <p className="text-blue-900 text-sm">
                  <strong>Total Items:</strong> {orderData.parts.reduce((sum, part) => sum + part.qty, 0)} pcs ({orderData.parts.length} part types)
                </p>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h3 className="text-amber-900 text-sm mb-2">Catatan Penting:</h3>
              <ul className="space-y-1 text-amber-800 text-sm">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Sparepart yang diterima harus diperiksa kondisinya sebelum instalasi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Mechanic bertanggung jawab atas sparepart yang telah ditandatangani</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Jika ada sparepart rusak/tidak sesuai, segera laporkan ke Spareparts Staff</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Dokumen ini adalah bukti resmi pengeluaran stok gudang</span>
                </li>
              </ul>
            </div>

            {/* Signature Section */}
            <div className="grid grid-cols-2 gap-6">
              {/* Prepared By (Auto) */}
              <div className="border border-slate-300 rounded-lg p-4">
                <h3 className="text-slate-700 text-sm mb-3">Disiapkan Oleh:</h3>
                <div className="text-center">
                  <div className="h-24 flex items-center justify-center border-b border-slate-300 mb-3">
                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                  </div>
                  <p className="text-slate-900">{preparedBy}</p>
                  <p className="text-slate-500 text-sm">Spareparts Staff</p>
                  <p className="text-slate-400 text-xs mt-1">{currentDate}</p>
                </div>
              </div>

              {/* Received By (Mechanic Signature) */}
              <div className="border border-slate-300 rounded-lg p-4">
                <h3 className="text-slate-700 text-sm mb-3">Diterima Oleh (Mechanic):</h3>
                
                {!isViewMode && (
                  <div className="mb-3">
                    <input
                      type="text"
                      value={mechanicName}
                      onChange={(e) => setMechanicName(e.target.value)}
                      placeholder="Nama Mechanic"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                )}

                <div className="relative">
                  <canvas
                    ref={mechanicSignatureRef}
                    width={300}
                    height={100}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className={`border-2 ${hasSigned ? 'border-emerald-500' : 'border-slate-300'} rounded-lg w-full bg-white ${isViewMode ? '' : 'cursor-crosshair'}`}
                    style={{ touchAction: 'none' }}
                  />
                  {!hasSigned && !isViewMode && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-slate-400 text-sm">Tanda tangan di sini</p>
                    </div>
                  )}
                </div>

                {!isViewMode && hasSigned && (
                  <button
                    onClick={clearSignature}
                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Clear Signature
                  </button>
                )}

                {isViewMode && (
                  <div className="mt-3 text-center">
                    <p className="text-slate-900">{mechanicName}</p>
                    <p className="text-slate-500 text-sm">Mechanic</p>
                    <p className="text-slate-400 text-xs mt-1">{currentDate}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-slate-500 text-xs border-t border-slate-200 pt-4 mt-6">
              <p>Dokumen ini dibuat otomatis oleh sistem dan sah sebagai bukti pengeluaran sparepart</p>
              <p className="mt-1">AutoCare Workshop Management System © 2025</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 flex gap-3 print:hidden">
          {!isViewMode ? (
            <>
              <Button
                onClick={handleConfirm}
                disabled={!hasSigned || !mechanicName.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Konfirmasi Penerimaan Parts
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                className="border-slate-300"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="border-slate-300"
              >
                Batal
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handlePrint}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Dokumen
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="border-slate-300"
              >
                Close
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
