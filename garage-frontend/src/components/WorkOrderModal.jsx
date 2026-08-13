import { Button } from './ui/button';

export function WorkOrderModal({ isOpen, onClose, onConfirm, orderData, existingRegistration }) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm('', '');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Work Order Preview</h3>
            <p className="text-sm text-slate-600">Confirm the details before proceeding.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>

        {orderData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
            <div>
              <p><strong>Customer:</strong> {orderData.customerName}</p>
              <p><strong>Phone:</strong> {orderData.phone || '-'}</p>
              <p><strong>Email:</strong> {orderData.email || '-'}</p>
            </div>
            <div>
              <p><strong>Vehicle:</strong> {orderData.plateNumber}</p>
              <p><strong>Model:</strong> {orderData.vehicleBrand} {orderData.vehicleModel}</p>
              <p><strong>Service:</strong> {orderData.serviceType}</p>
            </div>
          </div>
        )}

        {existingRegistration && (
          <p className="text-xs text-slate-500">Viewing existing registration {existingRegistration.id}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Confirm & Save</Button>
        </div>
      </div>
    </div>
  );
}

export default WorkOrderModal;
