import React, { useRef, useEffect } from 'react';
import { X, Printer, CheckCircle, Package, User } from 'lucide-react';
import { Button } from './ui/button';

export function PartsDeliveryModal({ isOpen, onClose, orderData, onConfirm, existingDelivery }) {
  const mechanicSignatureRef = useRef(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [hasSigned, setHasSigned] = React.useState(false);
  const [mechanicName, setMechanicName] = React.useState('');

  const isViewMode = !!existingDelivery;

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
        setMechanicName(existingDelivery.mechanicName);
      }
    } else if (isOpen && !existingDelivery) {
      // Clear signature for new delivery and auto-populate mechanic name from orderData
      setHasSigned(false);
      setMechanicName(orderData.mechanicName || ''); // Auto-populate from work order
      clearSignature();
    }
  }, [isOpen, existingDelivery, orderData.mechanicName]);

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

  const deliveryId = existingDelivery?.deliveryId || `${orderData.branch.substring(0, 3).toUpperCase()}-DEL-${Date.now().toString().slice(-6)}`;
  const preparedBy = existingDelivery?.preparedBy || 'Spareparts Staff';

  const startDrawing = () => {
    if (mechanicSignatureRef.current && !isViewMode) {
      const ctx = mechanicSignatureRef.current.getContext('2d');
      if (ctx) {
        setIsDrawing(true);
      }
    }
  };

  const draw = (e) => {
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

  const clearSignature = () => {
    if (mechanicSignatureRef.current) {
      const ctx = mechanicSignatureRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, mechanicSignatureRef.current.width, mechanicSignatureRef.current.height);
        setHasSigned(false);
      }
    }
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
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #delivery-document, #delivery-document * {
            visibility: visible;
          }
          #delivery-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A5;
            margin: 10mm;
          }
        }
      `}</style>
      
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[148mm] max-h-[90vh] overflow-y-auto">
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
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Content */}
        <div className="p-8 bg-white" id="delivery-document">
          <div className="max-w-4xl mx-auto">
            {/* Document Header - Simplified without logo/letterhead */}
            <div className="border-b-2 border-slate-300 pb-3 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-slate-800 text-xl">BUKTI PENGELUARAN SPAREPART</h1>
                  <p className="text-slate-600 text-sm">(Parts Delivery Note)</p>
                </div>
                <div className="text-right">
                  <div className="bg-blue-500 text-white px-3 py-1.5 rounded-lg mb-1">
                    <p className="text-xs">Delivery ID</p>
                    <p className="text-base">{deliveryId}</p>
                  </div>
                  <p className="text-slate-600 text-xs">{currentDate}</p>
                  <p className="text-slate-500 text-xs">{currentTime}</p>
                </div>
              </div>
            </div>

            {/* Order & Customer Info - Simplified */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <h3 className="text-slate-700 text-sm mb-2 border-b border-slate-200 pb-1">Order Information</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex">
                    <span className="text-slate-600 w-28">Order ID:</span>
                    <span className="text-slate-900">{orderData.orderId}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 w-28">Customer:</span>
                    <span className="text-slate-900">{orderData.customerName}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 w-28">Plate Number:</span>
                    <span className="text-slate-900">{orderData.plateNumber}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <h3 className="text-slate-700 text-sm mb-2 border-b border-slate-200 pb-1">Delivery Information</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex">
                    <span className="text-slate-600 w-28">Branch:</span>
                    <span className="text-slate-900">{orderData.branch}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 w-28">Prepared By:</span>
                    <span className="text-slate-900">{preparedBy}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 w-28">Total Items:</span>
                    <span className="text-slate-900">{orderData.parts.reduce((sum, part) => sum + part.qty, 0)} pcs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Parts Table */}
            <div className="mb-4">
              <h3 className="text-slate-700 text-sm mb-2">Daftar Sparepart yang Dikeluarkan:</h3>
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-slate-700 text-xs">No</th>
                      <th className="px-3 py-2 text-left text-slate-700 text-xs">Part Code</th>
                      <th className="px-3 py-2 text-left text-slate-700 text-xs">Part Name</th>
                      <th className="px-3 py-2 text-center text-slate-700 text-xs">Qty</th>
                      <th className="px-3 py-2 text-center text-slate-700 text-xs">Unit</th>
                      <th className="px-3 py-2 text-left text-slate-700 text-xs">Storage Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderData.parts.map((part, index) => (
                      <tr key={index} className="border-t border-slate-200">
                        <td className="px-3 py-2 text-slate-900 text-xs">{index + 1}</td>
                        <td className="px-3 py-2 text-slate-900 text-xs font-mono">{part.partCode}</td>
                        <td className="px-3 py-2 text-slate-900 text-xs">{part.partName}</td>
                        <td className="px-3 py-2 text-center text-slate-900 text-xs">{part.qty}</td>
                        <td className="px-3 py-2 text-center text-slate-600 text-xs">{part.unit}</td>
                        <td className="px-3 py-2 text-slate-600 text-xs">{part.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
                <p className="text-blue-900 text-xs">
                  <strong>Total Items:</strong> {orderData.parts.reduce((sum, part) => sum + part.qty, 0)} pcs ({orderData.parts.length} part types)
                </p>
              </div>
            </div>

            {/* Signature Section */}
            <div className="grid grid-cols-2 gap-4">
              {/* Prepared By (Auto) */}
              <div className="border border-slate-300 rounded-lg p-3">
                <h3 className="text-slate-700 text-xs mb-2">Disiapkan Oleh:</h3>
                <div className="text-center">
                  <div className="h-20 flex items-center justify-center border-b border-slate-300 mb-2">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </div>
                  <p className="text-slate-900 text-sm">{preparedBy}</p>
                  <p className="text-slate-500 text-xs">Spareparts Staff</p>
                  <p className="text-slate-400 text-xs mt-0.5">{currentDate}</p>
                </div>
              </div>

              {/* Received By (Mechanic Signature) */}
              <div className="border border-slate-300 rounded-lg p-3">
                <h3 className="text-slate-700 text-xs mb-2">Diterima Oleh (Mechanic):</h3>
                
                {!isViewMode && (
                  <div className="mb-2">
                    <input
                      type="text"
                      value={mechanicName}
                      onChange={(e) => setMechanicName(e.target.value)}
                      placeholder="Nama Mechanic"
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                )}

                <div className="relative">
                  <canvas
                    ref={mechanicSignatureRef}
                    width={280}
                    height={80}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className={`border-2 ${hasSigned ? 'border-emerald-500' : 'border-slate-300'} rounded-lg w-full bg-white ${isViewMode ? '' : 'cursor-crosshair'}`}
                    style={{ touchAction: 'none' }}
                  />
                  {!hasSigned && !isViewMode && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-slate-400 text-xs">Tanda tangan di sini</p>
                    </div>
                  )}
                </div>

                {!isViewMode && hasSigned && (
                  <button
                    onClick={clearSignature}
                    className="mt-1 text-xs text-red-600 hover:text-red-700"
                  >
                    Clear Signature
                  </button>
                )}

                {isViewMode && (
                  <div className="mt-2 text-center">
                    <p className="text-slate-900 text-sm">{mechanicName}</p>
                    <p className="text-slate-500 text-xs">Mechanic</p>
                    <p className="text-slate-400 text-xs mt-0.5">{currentDate}</p>
                  </div>
                )}
              </div>
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