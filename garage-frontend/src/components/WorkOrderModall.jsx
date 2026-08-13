import { useRef, useEffect, useState } from 'react';
import { X, Printer, CheckCircle, Wrench, Eye } from 'lucide-react';
import { Button } from './ui/button';

export function WorkOrderModal({ isOpen, onClose, orderData, onConfirm, existingRegistration }) {
  const customerSignatureRef = useRef(null);
  const advisorSignatureRef = useRef(null);
  const [isDrawingCustomer, setIsDrawingCustomer] = useState(false);
  const [isDrawingAdvisor, setIsDrawingAdvisor] = useState(false);
  const [hasCustomerSigned, setHasCustomerSigned] = useState(false);
  const [hasAdvisorSigned, setHasAdvisorSigned] = useState(false);

  const isViewMode = !!existingRegistration;

  useEffect(() => {
    if (isOpen && existingRegistration) {
      // Load existing signatures
      if (existingRegistration.customerSignature && customerSignatureRef.current) {
        const ctx = customerSignatureRef.current.getContext('2d');
        const img = new Image();
        img.onload = () => {
          ctx?.drawImage(img, 0, 0);
          setHasCustomerSigned(true);
        };
        img.src = existingRegistration.customerSignature;
      }
      
      if (existingRegistration.advisorSignature && advisorSignatureRef.current) {
        const ctx = advisorSignatureRef.current.getContext('2d');
        const img = new Image();
        img.onload = () => {
          ctx?.drawImage(img, 0, 0);
          setHasAdvisorSigned(true);
        };
        img.src = existingRegistration.advisorSignature;
      }
    } else if (isOpen && !existingRegistration) {
      // Clear signatures for new registration
      setHasCustomerSigned(false);
      setHasAdvisorSigned(false);
      clearSignature(customerSignatureRef.current, setHasCustomerSigned);
      clearSignature(advisorSignatureRef.current, setHasAdvisorSigned);
    }
  }, [isOpen, existingRegistration]);

  if (!isOpen) return null;

  const currentDate = existingRegistration?.date || new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const orderId = existingRegistration?.orderId || `ORD-${Date.now().toString().slice(-6)}`;

  const startDrawing = (canvas, setDrawing) => {
    if (canvas && !isViewMode) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setDrawing(true);
      }
    }
  };

  const draw = (e, canvas, isDrawing, setSigned) => {
    if (!isDrawing || !canvas || isViewMode) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setSigned(true);
  };

  const stopDrawing = (canvas) => {
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
      }
    }
  };

  const clearSignature = (canvas, setSigned) => {
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSigned(false);
      }
    }
  };

  const handlePrint = () => {
    window.print();
    // Close modal after print dialog closes
    setTimeout(() => {
      onClose();
    }, 100);
  };

  const handleConfirm = () => {
    // Langsung konfirmasi tanpa signature untuk struk antrian
    if (!isViewMode) {
      onConfirm('', ''); // Empty signatures
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[210mm] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10 print:hidden">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">Struk Nomor Antrian Inspection</h2>
            {isViewMode && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-sm font-medium flex items-center gap-1">
                <Eye className="w-4 h-4" />
                View Only
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

        {/* Document Content - A4 Size */}
        <div className="p-8 bg-white relative" id="work-order-document" style={{ minHeight: '297mm' }}>
          {/* Content */}
          <div className="relative max-w-md mx-auto">
            {/* Struk Header */}
            <div className="text-center border-b-2 border-dashed border-slate-300 pb-4 mb-4">
              <div className="bg-blue-500 rounded-lg p-3 inline-block mb-3">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">AutoCare Workshop</h1>
              <p className="text-slate-600 text-sm font-medium">Professional Car Repair Service</p>
              <p className="text-slate-500 text-xs mt-1">Jl. Sudirman No. 123, Jakarta</p>
              <p className="text-slate-500 text-xs">Telp: (021) 1234-5678</p>
            </div>

            {/* Struk Title */}
            <div className="text-center mb-6">
              <h2 className="text-slate-800 text-2xl font-bold mb-1">NOMOR ANTRIAN</h2>
              <p className="text-slate-600 text-sm">Inspection Registration</p>
            </div>

            {/* Queue Number - BIG */}
            <div className="bg-blue-500 text-white rounded-xl p-6 text-center mb-6">
              <p className="text-sm font-medium mb-2">Registration ID</p>
              <p className="text-5xl font-bold tracking-wider">{orderId}</p>
              <p className="text-sm font-medium mt-3">{currentDate}</p>
            </div>

            {/* Customer Info - Simple */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <h3 className="text-slate-700 text-sm font-semibold mb-3 border-b border-slate-200 pb-2">Customer Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Name:</span>
                  <span className="text-slate-900 font-medium">{orderData.customerName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Phone:</span>
                  <span className="text-slate-900 font-medium">{orderData.phone || '-'}</span>
                </div>
              </div>
            </div>

            {/* Vehicle Info - Simple */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <h3 className="text-slate-700 text-sm font-semibold mb-3 border-b border-slate-200 pb-2">Vehicle Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Plate Number:</span>
                  <span className="text-slate-900 font-mono font-medium">{orderData.plateNumber || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Vehicle:</span>
                  <span className="text-slate-900 font-medium">{orderData.vehicleBrand} {orderData.vehicleModel} ({orderData.vehicleYear})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Service Type:</span>
                  <span className="text-slate-900 font-medium">{orderData.serviceType || '-'}</span>
                </div>
              </div>
            </div>

            {/* Customer Complaint */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h3 className="text-slate-700 text-sm font-semibold mb-2">Customer Complaint</h3>
              <p className="text-slate-900 text-sm whitespace-pre-line">{orderData.customerComplaint || '-'}</p>
            </div>

            {/* Next Steps - Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-blue-900 text-sm font-semibold mb-2">Next Steps:</h3>
              <ol className="space-y-1 text-blue-800 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">1.</span>
                  <span>Silakan tunggu dipanggil untuk proses inspeksi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">2.</span>
                  <span>Mechanic akan melakukan pemeriksaan kendaraan</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">3.</span>
                  <span>Estimasi biaya dan waktu akan diberikan setelah inspeksi</span>
                </li>
              </ol>
            </div>

            {/* Important Notes */}
            <div className="border border-slate-200 rounded-lg p-4 mb-6">
              <h3 className="text-slate-700 text-sm font-semibold mb-2">Important Notes:</h3>
              <ul className="space-y-1 text-slate-600 text-xs">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Simpan struk ini sebagai bukti registrasi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Barang berharga di dalam kendaraan menjadi tanggung jawab pelanggan</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Persetujuan perbaikan akan diminta setelah inspeksi</span>
                </li>
              </ul>
            </div>

            {/* Footer with Barcode Placeholder */}
            <div className="text-center border-t-2 border-dashed border-slate-300 pt-4">
              <div className="bg-slate-100 rounded p-3 mb-3">
                <p className="text-slate-400 text-xs mb-2">Scan untuk tracking status</p>
                <div className="h-16 bg-white rounded border border-slate-300 flex items-center justify-center">
                  <p className="text-slate-400 text-xs font-mono">{orderId}</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs">Terima kasih atas kepercayaan Anda</p>
              <p className="text-slate-400 text-xs mt-1">AutoCare Workshop © 2025</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 flex gap-3 print:hidden">
          {!isViewMode ? (
            <>
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Konfirmasi & Lanjutkan ke Inspeksi
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                className="border-slate-300"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Struk
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
                Print Struk
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

export default WorkOrderModal;