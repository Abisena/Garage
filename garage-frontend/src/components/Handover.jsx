import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Car,
  CheckCircle,
  FileText,
  RefreshCw,
  Search,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { SIKKPrint } from './SIKKPrint';
import { frappeClient } from '../lib/frappeClient';

const mapHandoverOrder = (row) => ({
  id: row.name,
  orderId: row.order_id || row.name,
  customerName: row.customer_name || 'Customer',
  phone: row.customer_phone || '-',
  email: row.customer_email || '',
  plateNumber: row.vehicle_plate || '-',
  vehicleBrand: row.vehicle_brand || '',
  vehicleModel: row.vehicle_model || '',
  vehicleYear: row.vehicle_year || '',
  vehicleColor: row.vehicle_color || 'Silver',
  branch: row.branch || '',
  branchCode: row.branch_code || '',
  receiptNumber: row.receipt_number || row.payment_entry || '-',
  invoiceNumber: row.invoice_number || row.invoice_name || '',
  paidAmount: Number(row.paid_amount || row.total_approved_amount || row.total_estimated_amount || 0),
  paymentDate: row.payment_date || row.modified,
  paymentStatus: row.payment_status || 'paid',
  paymentMethod: row.mode_of_payment || '',
  status: 'waiting-handover',
  backendStatus: row.status,
  sikkNumber: row.sikk_number,
  sikkStatus: row.sikk_status,
  sikkPrintCount: row.sikk_status === 'Printed' || row.sikk_status === 'Completed' ? 1 : 0,
  laborCost: Number(row.total_approved_amount || row.total_estimated_amount || 0),
  spareParts: [],
});

export function Handover({ currentUser }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [completingOrderId, setCompletingOrderId] = useState(null);
  const [showSIKKModal, setShowSIKKModal] = useState(false);
  const [selectedOrderForSIKK, setSelectedOrderForSIKK] = useState(null);

  const loadWorkOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const branchParam = currentUser?.branch === 'all' ? undefined : currentUser?.branch;
      const response = await frappeClient.listHandoverOrders({ branch: branchParam });
      const rows = Array.isArray(response?.orders) ? response.orders : [];
      setWorkOrders(rows.map(mapHandoverOrder));
    } catch (error) {
      console.error('Failed to load handover orders from API', error);
      toast.error('Gagal memuat data handover dari Frappe.');
      setWorkOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.branch]);

  useEffect(() => {
    void loadWorkOrders();
  }, [loadWorkOrders]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const calculateGrandTotal = (order) => {
    const sparePartsTotal = order.spareParts?.reduce((sum, part) => sum + (part.totalPrice || 0), 0) || 0;
    return sparePartsTotal + (order.laborCost || order.paidAmount || 0);
  };

  const handleOpenSIKK = async (order) => {
    try {
      await frappeClient.updateServiceOrder(order.orderId, { sikk_status: 'Printed' });
      const updatedOrder = {
        ...order,
        sikkPrintCount: (order.sikkPrintCount || 0) + 1,
        sikkStatus: 'Printed',
      };
      setSelectedOrderForSIKK(updatedOrder);
      setShowSIKKModal(true);
      setWorkOrders((prev) =>
        prev.map((item) => (item.orderId === order.orderId ? updatedOrder : item))
      );
    } catch (error) {
      console.error('Failed to update SIKK status', error);
      setSelectedOrderForSIKK(order);
      setShowSIKKModal(true);
      toast.message('SIKK tetap bisa dicetak, tetapi status belum tersimpan ke ERP.');
    }
  };

  const handleCompleteHandover = async (orderId) => {
    const confirmMsg = `Apakah Anda yakin ingin menyelesaikan handover untuk Order ${orderId}?`;
    if (!window.confirm(confirmMsg)) return;

    setCompletingOrderId(orderId);
    try {
      await frappeClient.completeServiceOrder(orderId, {
        completion_notes: `Handover completed via portal on ${new Date().toISOString()}`,
        sikk_status: 'Completed',
      });
      toast.success('Handover berhasil diselesaikan.');
      await loadWorkOrders();
    } catch (error) {
      console.error('Failed to complete handover', error);
      toast.error('Gagal menyelesaikan handover di ERPNext.');
    } finally {
      setCompletingOrderId(null);
    }
  };

  const filteredOrders = workOrders.filter((order) => {
    const query = searchTerm.toLowerCase();
    return (
      order.orderId.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.plateNumber.toLowerCase().includes(query) ||
      (order.receiptNumber && order.receiptNumber.toLowerCase().includes(query)) ||
      (order.invoiceNumber && order.invoiceNumber.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 shadow-xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] pointer-events-none" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                <Car className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-white text-3xl mb-1">Vehicle Handover</h1>
                <p className="text-blue-100">Serah terima kendaraan — data dari ERPNext</p>
              </div>
            </div>
            <Button
              onClick={() => void loadWorkOrders()}
              disabled={isLoading}
              variant="secondary"
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-slate-500 text-sm">Ready for Handover</p>
            <p className="text-2xl font-bold text-slate-900">{filteredOrders.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-slate-500 text-sm">Total Paid Amount</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(filteredOrders.reduce((sum, order) => sum + (order.paidAmount || 0), 0))}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Order ID, customer, plat, receipt, invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-3">
          {isLoading && filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
              Memuat data handover...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-slate-700 mb-2">Belum Ada Order Siap Handover</h3>
              <p className="text-slate-500">
                Order dengan status Waiting Payment dan invoice/payment sudah lunas akan muncul di sini.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.orderId}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <div className="bg-blue-100 rounded-lg p-2">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-slate-900">{order.customerName}</h3>
                        <p className="text-slate-500 text-sm">{order.phone}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                      <div>
                        <p className="text-slate-500 text-xs">Order ID</p>
                        <p className="text-slate-900 font-mono text-sm">{order.orderId}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Receipt / PE</p>
                        <p className="text-emerald-600 font-mono text-sm">{order.receiptNumber}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Vehicle</p>
                        <p className="text-slate-900 text-sm">
                          {order.vehicleBrand} {order.vehicleModel}
                        </p>
                        <p className="text-slate-600 font-mono text-xs">{order.plateNumber}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Total Payment</p>
                        <p className="text-blue-600 font-semibold">{formatCurrency(calculateGrandTotal(order))}</p>
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 mt-0.5">
                          Paid
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => void handleOpenSIKK(order)}
                        className={`text-sm py-2 ${
                          order.sikkPrintCount > 0
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                        }`}
                      >
                        <FileText className="w-4 h-4 mr-1.5" />
                        {order.sikkPrintCount > 0 ? 'SIKK Cetak Ulang' : 'Cetak SIKK'}
                      </Button>
                      <Button
                        onClick={() => void handleCompleteHandover(order.orderId)}
                        disabled={completingOrderId === order.orderId}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-2"
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        {completingOrderId === order.orderId ? 'Processing...' : 'Selesai Handover'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showSIKKModal && selectedOrderForSIKK && (
        <SIKKPrint order={selectedOrderForSIKK} onClose={() => setShowSIKKModal(false)} />
      )}
    </div>
  );
}

export default Handover;
