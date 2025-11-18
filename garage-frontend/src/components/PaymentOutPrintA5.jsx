import React from 'react';

export function PaymentOutPrintA5({ po, payoutNumber, paymentBy }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div 
      className="w-full bg-white p-8"
      style={{
        width: '210mm',
        height: '148mm',
        maxWidth: '210mm',
        maxHeight: '148mm',
        margin: '0 auto',
        boxSizing: 'border-box',
        fontSize: '11pt'
      }}
    >
      {/* Header Section */}
      <div className="border-b-2 border-slate-800 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl mb-1" style={{ fontWeight: 700, color: '#1e293b' }}>
              IMOGI WORKSHOP
            </h1>
            <p className="text-xs text-slate-600 leading-tight">
              Multi-Branch Automotive Service Center<br />
              Jakarta | Bandung | Surabaya
            </p>
          </div>
          <div className="text-right">
            <div className="bg-red-100 border-2 border-red-600 px-4 py-2 rounded-lg inline-block mb-2">
              <h2 className="text-base m-0" style={{ fontWeight: 700, color: '#dc2626' }}>
                BUKTI PENGELUARAN UANG
              </h2>
            </div>
            <p className="text-xs text-slate-600 m-0">
              <span style={{ fontWeight: 600 }}>No: {payoutNumber}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Payment Info Section */}
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div>
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="py-1 text-slate-600" style={{ width: '110px' }}>Tanggal Bayar</td>
                <td className="py-1 text-slate-600">:</td>
                <td className="py-1 text-slate-900" style={{ fontWeight: 600 }}>
                  {po.paymentDate ? formatDate(po.paymentDate.split(',')[0]) : '-'}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-slate-600">PO Number</td>
                <td className="py-1 text-slate-600">:</td>
                <td className="py-1 text-slate-900" style={{ fontWeight: 600 }}>{po.poNumber}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-600">Vendor</td>
                <td className="py-1 text-slate-600">:</td>
                <td className="py-1 text-slate-900" style={{ fontWeight: 600 }}>{po.vendor}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-600">Cabang</td>
                <td className="py-1 text-slate-600">:</td>
                <td className="py-1 text-slate-900">{po.branch}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="py-1 text-slate-600" style={{ width: '110px' }}>Metode Bayar</td>
                <td className="py-1 text-slate-600">:</td>
                <td className="py-1 text-slate-900" style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  {po.paymentMethod || '-'}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-slate-600">Dibayar Oleh</td>
                <td className="py-1 text-slate-600">:</td>
                <td className="py-1 text-slate-900" style={{ fontWeight: 600 }}>{paymentBy}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-600">Diminta Oleh</td>
                <td className="py-1 text-slate-600">:</td>
                <td className="py-1 text-slate-900">{po.requestedBy}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-600">Tanggal Order</td>
                <td className="py-1 text-slate-600">:</td>
                <td className="py-1 text-slate-900">{formatDate(po.orderDate)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Table */}
      <div className="border-2 border-slate-300 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-700 text-white">
              <th className="text-left py-2 px-3 border-r border-slate-500" style={{ width: '40px' }}>No</th>
              <th className="text-left py-2 px-3 border-r border-slate-500">Part Number / Nama Part</th>
              <th className="text-center py-2 px-3 border-r border-slate-500" style={{ width: '60px' }}>Qty</th>
              <th className="text-right py-2 px-3 border-r border-slate-500" style={{ width: '100px' }}>Harga Satuan</th>
              <th className="text-right py-2 px-3" style={{ width: '110px' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item, index) => (
              <tr key={item.id} className={`${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'} border-b border-slate-200`}>
                <td className="py-2 px-3 text-center text-slate-600">{index + 1}</td>
                <td className="py-2 px-3">
                  <div className="text-slate-900" style={{ fontWeight: 600 }}>{item.partName}</div>
                  <div className="text-slate-500 text-xs">{item.partNumber}</div>
                </td>
                <td className="py-2 px-3 text-center text-slate-900">{item.quantity}</td>
                <td className="py-2 px-3 text-right text-slate-700">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2 px-3 text-right text-slate-900" style={{ fontWeight: 600 }}>
                  {formatCurrency(item.totalPrice)}
                </td>
              </tr>
            ))}
            {/* Empty rows for spacing if items less than 3 */}
            {po.items.length < 3 && Array.from({ length: 3 - po.items.length }).map((_, i) => (
              <tr key={`empty-${i}`} className="border-b border-slate-200">
                <td className="py-2 px-3">&nbsp;</td>
                <td className="py-2 px-3">&nbsp;</td>
                <td className="py-2 px-3">&nbsp;</td>
                <td className="py-2 px-3">&nbsp;</td>
                <td className="py-2 px-3">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total Section */}
      <div className="flex justify-end mb-4">
        <div className="w-80">
          <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ fontWeight: 600 }}>TOTAL PENGELUARAN:</span>
              <span className="text-xl" style={{ fontWeight: 700 }}>{formatCurrency(po.totalAmount)}</span>
            </div>
          </div>
          {po.paymentMethod === 'cash' && po.paidAmount && po.paidAmount > po.totalAmount && (
            <div className="mt-2 text-xs text-slate-600 bg-slate-100 p-2 rounded">
              <div className="flex justify-between">
                <span>Dibayar:</span>
                <span>{formatCurrency(po.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kembalian:</span>
                <span>{formatCurrency(po.paidAmount - po.totalAmount)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Signature Section */}
      <div className="border-t-2 border-slate-300 pt-3 mt-auto">
        <div className="grid grid-cols-3 gap-6 text-xs text-center">
          <div>
            <p className="mb-8 text-slate-700" style={{ fontWeight: 600 }}>Diminta Oleh</p>
            <div className="border-t border-slate-400 pt-1 mt-8">
              <p className="text-slate-900" style={{ fontWeight: 600 }}>( {po.requestedBy} )</p>
            </div>
          </div>
          <div>
            <p className="mb-8 text-slate-700" style={{ fontWeight: 600 }}>Dibayar Oleh</p>
            <div className="border-t border-slate-400 pt-1 mt-8">
              <p className="text-slate-900" style={{ fontWeight: 600 }}>( {paymentBy} )</p>
            </div>
          </div>
          <div>
            <p className="mb-8 text-slate-700" style={{ fontWeight: 600 }}>Diterima Oleh (Vendor)</p>
            <div className="border-t border-slate-400 pt-1 mt-8">
              <p className="text-slate-900" style={{ fontWeight: 600 }}>( ........................... )</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-center text-slate-500 mt-3">
          Dokumen ini adalah bukti sah pengeluaran uang untuk pembelian spare parts
        </p>
      </div>
    </div>
  );
}
