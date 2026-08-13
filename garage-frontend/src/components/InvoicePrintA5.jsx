import React from 'react';

export function InvoicePrintA5({ order, invoiceNumber, cashierName }) {
  const calculatePartsCost = (parts) => {
    if (!parts || parts.length === 0) return 0;
    return parts.reduce((sum, part) => sum + part.totalPrice, 0);
  };

  const calculateGrandTotal = () => {
    const partsCost = calculatePartsCost(order.spareParts);
    const labor = order.laborCost || 0;
    return partsCost + labor;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const numberToWords = (num) => {
    if (num === 0) return 'nol';

    const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
    const teens = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];
    const tens = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];

    const convertLessThanThousand = (n) => {
      if (n === 0) return '';
      if (n < 10) return units[n];
      if (n >= 10 && n < 20) return teens[n - 10];
      if (n >= 20 && n < 100) {
        const ten = Math.floor(n / 10);
        const unit = n % 10;
        return tens[ten] + (unit > 0 ? ' ' + units[unit] : '');
      }
      const hundred = Math.floor(n / 100);
      const remainder = n % 100;
      const hundredStr = hundred === 1 ? 'seratus' : units[hundred] + ' ratus';
      return hundredStr + (remainder > 0 ? ' ' + convertLessThanThousand(remainder) : '');
    };

    if (num < 1000) return convertLessThanThousand(num);
    if (num < 1000000) {
      const thousand = Math.floor(num / 1000);
      const remainder = num % 1000;
      const thousandStr = thousand === 1 ? 'seribu' : convertLessThanThousand(thousand) + ' ribu';
      return thousandStr + (remainder > 0 ? ' ' + convertLessThanThousand(remainder) : '');
    }
    if (num < 1000000000) {
      const million = Math.floor(num / 1000000);
      const remainder = num % 1000000;
      const millionStr = million === 1 ? 'satu juta' : convertLessThanThousand(million) + ' juta';
      let result = millionStr;
      if (remainder >= 1000) {
        const thousand = Math.floor(remainder / 1000);
        const lastRemainder = remainder % 1000;
        const thousandStr = thousand === 1 ? 'seribu' : convertLessThanThousand(thousand) + ' ribu';
        result += ' ' + thousandStr;
        if (lastRemainder > 0) {
          result += ' ' + convertLessThanThousand(lastRemainder);
        }
      } else if (remainder > 0) {
        result += ' ' + convertLessThanThousand(remainder);
      }
      return result;
    }
    return num.toString();
  };

  return (
    <div>
      <style>{`
        @media print {
          @page {
            size: A5 landscape;
            margin: 10mm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .invoice-page {
            position: relative !important;
            width: 190mm !important;
            height: 128mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
            background: white !important;
          }
          
          .header-bg {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%) !important;
          }
        }

        @media screen {
          .invoice-page {
            width: 100%;
            max-width: 900px;
            height: auto;
            min-height: 400px;
            background: white;
            margin: 0 auto;
            box-sizing: border-box;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            position: relative;
          }
        }
        
        .invoice-page {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 10mm;
          box-sizing: border-box;
        }
        
        .invoice-content {
          position: relative;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 80px;
          font-weight: bold;
          color: rgba(59, 130, 246, 0.05);
          z-index: 0;
          pointer-events: none;
          white-space: nowrap;
        }
      `}</style>

      <div className="invoice-page">
        <div className="watermark">IMOGI WORKSHOP</div>
        <div className="invoice-content" style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div className="header-bg" style={{ 
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            marginLeft: '-10mm',
            marginRight: '-10mm',
            marginTop: '-10mm',
            padding: '4mm 10mm 4mm 10mm',
            marginBottom: '5mm',
            color: 'white',
            borderRadius: '0 0 4px 4px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px' }}>IMOGI WORKSHOP</h1>
                <p style={{ margin: 0, marginTop: '2px', fontSize: '9px', opacity: 0.85 }}>📧 imogiofficial@cao-group.co.id | ☎ +62 21 1234 5678</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '9px', opacity: 0.85 }}>Tanggal: {order.date}</p>
              </div>
            </div>
          </div>

          {/* Document Info Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            padding: '6px 10px',
            borderRadius: '4px',
            marginBottom: '5mm',
            border: '1px solid #e2e8f0'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '14px', color: '#1e293b', fontWeight: 'bold' }}>KUITANSI</h2>
              <p style={{ margin: 0, marginTop: '2px', fontSize: '10px', color: '#64748b' }}>
                Invoice: <strong style={{ color: '#3b82f6' }}>{invoiceNumber}</strong> | Order: <strong>{order.orderId}</strong> | Cabang: <strong>{order.branch}</strong>
              </p>
            </div>
          </div>

          {/* Customer & Vehicle Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '5mm' }}>
            <div style={{ 
              border: '1px solid #3b82f6',
              borderRadius: '4px',
              padding: '8px 10px',
              background: '#eff6ff'
            }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#1e40af', fontWeight: 'bold', marginBottom: '6px' }}>👤 PELANGGAN</p>
              <div style={{ fontSize: '10px', lineHeight: '1.5' }}>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                  <span style={{ color: '#64748b', width: '80px', flexShrink: 0 }}>Nama</span>
                  <span style={{ color: '#1e293b', fontWeight: '600' }}>: {order.customerName}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                  <span style={{ color: '#64748b', width: '80px', flexShrink: 0 }}>Telepon</span>
                  <span style={{ color: '#1e293b' }}>: {order.phone}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ color: '#64748b', width: '80px', flexShrink: 0 }}>Alamat</span>
                  <span style={{ color: '#1e293b' }}>: {order.address || '-'}</span>
                </div>
              </div>
            </div>

            <div style={{ 
              border: '1px solid #8b5cf6',
              borderRadius: '4px',
              padding: '8px 10px',
              background: '#f5f3ff'
            }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#6d28d9', fontWeight: 'bold', marginBottom: '6px' }}>🚗 KENDARAAN</p>
              <div style={{ fontSize: '10px', lineHeight: '1.5' }}>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                  <span style={{ color: '#64748b', width: '80px', flexShrink: 0 }}>Merk</span>
                  <span style={{ color: '#1e293b', fontWeight: '600' }}>: {order.vehicleBrand} {order.vehicleModel}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                  <span style={{ color: '#64748b', width: '80px', flexShrink: 0 }}>Nopol</span>
                  <span style={{ color: '#1e293b', fontWeight: '600' }}>: {order.plateNumber}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '3px' }}>
                  <span style={{ color: '#64748b', width: '80px', flexShrink: 0 }}>Tahun</span>
                  <span style={{ color: '#1e293b' }}>: {order.vehicleYear}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ color: '#64748b', width: '80px', flexShrink: 0 }}>Servis</span>
                  <span style={{ color: '#1e293b' }}>: {order.serviceType}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div style={{ marginBottom: '5mm' }}>
            <div style={{ 
              border: '1px solid #10b981',
              borderRadius: '4px',
              padding: '8px 10px',
              background: '#ecfdf5'
            }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#059669', fontWeight: 'bold', marginBottom: '8px' }}>💰 RINCIAN PEMBAYARAN</p>
              <div style={{ fontSize: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 0', color: '#64748b' }}>Biaya Sparepart</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', color: '#1e293b', fontWeight: '600' }}>
                        {formatCurrency(calculatePartsCost(order.spareParts))}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', color: '#64748b' }}>Biaya Jasa/Labor</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', color: '#1e293b', fontWeight: '600' }}>
                        {formatCurrency(order.laborCost || 0)}
                      </td>
                    </tr>
                    <tr style={{ borderTop: '1px dashed #10b981' }}>
                      <td style={{ padding: '8px 0 4px 0', color: '#059669', fontWeight: 'bold', fontSize: '12px' }}>TOTAL PEMBAYARAN</td>
                      <td style={{ padding: '8px 0 4px 0', textAlign: 'right', color: '#059669', fontWeight: 'bold', fontSize: '14px' }}>
                        {formatCurrency(calculateGrandTotal())}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Terbilang */}
          <div style={{ 
            border: '1px solid #f59e0b',
            borderRadius: '4px',
            padding: '8px 10px',
            background: '#fef3c7',
            marginBottom: '5mm'
          }}>
            <p style={{ margin: 0, fontSize: '9px', color: '#92400e', marginBottom: '4px' }}>Terbilang:</p>
            <p style={{ margin: 0, fontSize: '10px', fontStyle: 'italic', color: '#78350f', lineHeight: '1.4' }}>
              # {numberToWords(calculateGrandTotal())} rupiah #
            </p>
          </div>

          {/* Untuk Pembayaran - WITH NOTA FAKTUR REFERENCE */}
          <div style={{ 
            fontSize: '10px',
            padding: '8px 10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            marginBottom: '6mm'
          }}>
            <div style={{ display: 'flex', marginBottom: '3px' }}>
              <span style={{ color: '#64748b', width: '160px', flexShrink: 0 }}>Untuk pembayaran</span>
              <span style={{ color: '#1e293b', fontWeight: '600' }}>: Sparepart & Jasa Servis</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ color: '#64748b', width: '160px', flexShrink: 0 }}>Referensi Nota Faktur</span>
              <span style={{ color: '#3b82f6', fontWeight: '600' }}>: {order.notaFakturNumber || 'N/A'}</span>
            </div>
          </div>

          {/* Signature - RIGHT ALIGNED, CASHIER NAME */}
          <div style={{ 
            marginTop: 'auto',
            paddingTop: '5mm',
            borderTop: '1px solid #cbd5e1'
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'center', marginRight: '20mm' }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b', marginBottom: '3px' }}>
                  {order.branch}, {order.date}
                </p>
                <p style={{ margin: 0, fontSize: '10px', color: '#475569', marginBottom: '12mm' }}>
                  Penerima,
                </p>
                <div style={{ 
                  display: 'inline-block',
                  borderTop: '1px solid #1e293b',
                  paddingTop: '4px',
                  minWidth: '160px'
                }}>
                  <p style={{ margin: 0, fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>
                    ( {cashierName} )
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
