import React from 'react';

export function NotaPrintA5({ order }) {
  const ITEMS_PER_PAGE = 8; // Max 8 items per page untuk A5 landscape
  const spareParts = order.spareParts || [];
  const totalPages = Math.ceil(spareParts.length / ITEMS_PER_PAGE) || 1;

  // DEBUG: Log spare parts data
  console.log('🔍 NotaPrintA5 - Spare Parts Count:', spareParts.length);
  console.log('🔍 NotaPrintA5 - Spare Parts Data:', spareParts);
  console.log('🔍 NotaPrintA5 - Total Pages:', totalPages);
  console.log('🔍 NotaPrintA5 - Spare Parts IDs:', spareParts.map(p => ({ id: p.id, name: p.name })));

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculatePartsCost = (parts) => {
    if (!parts) return 0;
    return parts.reduce((sum, part) => sum + part.totalPrice, 0);
  };

  const getLaborCost = () => {
    return order.laborCost || 0;
  };

  const calculateSubtotal = () => {
    return calculatePartsCost(order.spareParts) + getLaborCost();
  };

  const calculateDPP = () => {
    return Math.round(calculateSubtotal() / 1.11);
  };

  const calculatePPN = () => {
    return calculateSubtotal() - calculateDPP();
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal();
  };

  // Split spareparts into pages
  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    const start = i * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    pages.push(spareParts.slice(start, end));
  }

  // DEBUG: Log pages data
  console.log('📄 NotaPrintA5 - Pages Array:', pages);
  console.log('📄 NotaPrintA5 - Pages Count:', pages.length);
  pages.forEach((pageItems, idx) => {
    console.log(`📄 Page ${idx + 1} - Items:`, pageItems.length, pageItems);
  });

  return (
    <div className="nota-print-content">
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
          
          .nota-page {
            position: relative !important;
            width: 190mm !important;
            height: auto !important;
            min-height: 128mm !important;
            page-break-after: auto !important;
            page-break-inside: avoid !important;
            overflow: visible !important;
            background: white !important;
          }
          
          .nota-page-break {
            page-break-after: always !important;
          }
          
          .nota-page:last-child {
            page-break-after: auto !important;
          }
          
          .header-bg {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%) !important;
          }
          
          .nota-table-header {
            background-color: #475569 !important;
            color: white !important;
          }
          
          .nota-table-row-even {
            background-color: #f8fafc !important;
          }
          
          .nota-info-box {
            background-color: #eff6ff !important;
            border: 1.5px solid #3b82f6 !important;
          }
          
          .total-section {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%) !important;
            color: white !important;
          }
          
          .watermark-bg {
            background-color: #f1f5f9 !important;
          }
        }

        @media screen {
          .nota-page {
            width: 100%;
            max-width: 850px;
            height: auto;
            min-height: 500px;
            background: white;
            margin: 0 auto 20px auto;
            box-sizing: border-box;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            position: relative;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .nota-page:not(:last-child) {
            margin-bottom: 20px;
          }
          
          .nota-content {
            padding: 6mm;
          }
          
          .header-bg {
            margin: -6mm -6mm 2mm -6mm !important;
          }
        }
        
        @media print {
          .nota-content {
            padding: 0 !important;
          }
          
          .header-bg {
            margin: -10mm -10mm 2mm -10mm !important;
          }
        }
        
        .nota-page {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          box-sizing: border-box;
        }
        
        .nota-content {
          position: relative;
          height: 100%;
          display: block;
        }
        
        @media print {
          .nota-content {
            display: block !important;
            height: auto !important;
          }
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

      {pages.map((pageParts, pageIndex) => (
        <div key={pageIndex} className={`nota-page ${pageIndex < totalPages - 1 ? 'nota-page-break' : ''}`}>
          <div className="watermark">IMOGI WORKSHOP</div>
          <div className="nota-content" style={{ position: 'relative', zIndex: 1 }}>
            {/* Header - Compact & Simple */}
            <div className="header-bg" style={{ 
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              margin: '-10mm -10mm 2mm -10mm',
              padding: '3mm 10mm',
              color: 'white',
              borderRadius: '0 0 4px 4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px' }}>IMOGI WORKSHOP</h1>
                  <p style={{ margin: 0, marginTop: '1px', fontSize: '9px', opacity: 0.85 }}>📧 imogiofficial@cao-group.co.id | ☎ +62 21 1234 5678</p>
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
              padding: '4px 8px',
              borderRadius: '4px',
              marginBottom: '2mm',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '14px', color: '#1e293b', fontWeight: 'bold' }}>NOTA FAKTUR</h2>
                <p style={{ margin: 0, marginTop: '1px', fontSize: '10px', color: '#64748b' }}>
                  Nota: <strong style={{ color: '#3b82f6' }}>{order.notaFakturNumber || 'N/A'}</strong> | Order: <strong>{order.orderId}</strong> | Cabang: <strong>{order.branch}</strong>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '9px', color: '#94a3b8' }}>Halaman {pageIndex + 1} dari {totalPages}</p>
              </div>
            </div>

            {/* Customer & Vehicle Info - First Page Only - COMPACT */}
            {pageIndex === 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '2mm' }}>
                <div className="nota-info-box" style={{ 
                  border: '1px solid #3b82f6',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  background: '#eff6ff'
                }}>
                  <p style={{ margin: 0, fontSize: '9px', color: '#1e40af', fontWeight: 'bold', marginBottom: '4px' }}>👤 PELANGGAN</p>
                  <div style={{ fontSize: '9px', lineHeight: '1.4' }}>
                    <div style={{ display: 'flex', marginBottom: '2px' }}>
                      <span style={{ color: '#64748b', width: '90px', flexShrink: 0 }}>Nama</span>
                      <span style={{ color: '#1e293b', fontWeight: '600' }}>: {order.customerName}</span>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '2px' }}>
                      <span style={{ color: '#64748b', width: '90px', flexShrink: 0 }}>Telepon</span>
                      <span style={{ color: '#1e293b' }}>: {order.phone}</span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ color: '#64748b', width: '90px', flexShrink: 0 }}>Email</span>
                      <span style={{ color: '#1e293b', fontSize: '8px' }}>: {order.email || '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="nota-info-box" style={{ 
                  border: '1px solid #3b82f6',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  background: '#eff6ff'
                }}>
                  <p style={{ margin: 0, fontSize: '9px', color: '#1e40af', fontWeight: 'bold', marginBottom: '4px' }}>🚗 KENDARAAN</p>
                  <div style={{ fontSize: '9px', lineHeight: '1.4' }}>
                    <div style={{ display: 'flex', marginBottom: '2px' }}>
                      <span style={{ color: '#64748b', width: '120px', flexShrink: 0 }}>Kendaraan</span>
                      <span style={{ color: '#1e293b', fontWeight: '600' }}>: {order.vehicleBrand} {order.vehicleModel} ({order.vehicleYear})</span>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '2px' }}>
                      <span style={{ color: '#64748b', width: '120px', flexShrink: 0 }}>No. Polisi</span>
                      <span style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '10px' }}>: {order.plateNumber}</span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ color: '#64748b', width: '120px', flexShrink: 0 }}>Jenis Servis</span>
                      <span style={{ color: '#1e293b' }}>: {order.serviceType}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sparepart Table - MAXIMIZED */}
            <div style={{ 
              border: '1.5px solid #cbd5e1',
              borderRadius: '6px',
              overflow: 'visible',
              marginBottom: '2mm',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', tableLayout: 'fixed' }}>
                <thead>
                  <tr className="nota-table-header" style={{ background: '#475569', color: 'white' }}>
                    <th style={{ textAlign: 'center', padding: '8px', width: '50px', fontWeight: '600' }}>No</th>
                    <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600' }}>Nama Sparepart</th>
                    <th style={{ textAlign: 'left', padding: '8px', width: '170px', fontWeight: '600' }}>Kode Part</th>
                    <th style={{ textAlign: 'center', padding: '8px', width: '70px', fontWeight: '600' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px', width: '150px', fontWeight: '600' }}>Harga</th>
                    <th style={{ textAlign: 'right', padding: '8px', width: '100px', fontWeight: '600' }}>Disc</th>
                    <th style={{ textAlign: 'right', padding: '8px', width: '170px', fontWeight: '600' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {pageParts.map((part, idx) => {
                    const globalIndex = pageIndex * ITEMS_PER_PAGE + idx;
                    // DEBUG: Log each part being rendered
                    console.log(`🔧 Rendering row ${globalIndex + 1}:`, { id: part.id, name: part.name, partNumber: part.partNumber });
                    return (
                      <tr key={`${part.id}-${globalIndex}`} className={idx % 2 === 0 ? '' : 'nota-table-row-even'} style={{ 
                        background: idx % 2 === 0 ? 'white' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0'
                      }}>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>{globalIndex + 1}</td>
                        <td style={{ padding: '8px', color: '#1e293b', fontWeight: '500' }}>{part.name}</td>
                        <td style={{ padding: '8px', color: '#64748b', fontSize: '9px', fontFamily: 'monospace' }}>{part.partNumber}</td>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#1e293b', fontWeight: '600' }}>{part.quantity}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>{formatCurrency(part.unitPrice)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626', fontWeight: '500', fontSize: '9px' }}>
                          {part.discount > 0 ? (
                            part.discountType === 'percent' ? `${part.discount}%` : formatCurrency(part.discount)
                          ) : '-'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#1e293b', fontWeight: 'bold' }}>{formatCurrency(part.totalPrice)}</td>
                      </tr>
                    );
                  })}
                  {/* Fill empty rows to maintain 8 rows per page */}
                  {pageParts.length < 8 && Array.from({ length: 8 - pageParts.length }).map((_, idx) => (
                    <tr key={`empty-${idx}`} style={{ 
                      background: (pageParts.length + idx) % 2 === 0 ? 'white' : '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      height: '35px'
                    }}>
                      <td style={{ padding: '8px' }} colSpan={7}>&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary - Last Page Only */}
            {pageIndex === totalPages - 1 && (
              <div style={{ marginTop: 'auto' }}>
                {/* Breakdown */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: '6px'
                }}>
                  <div style={{ width: '700px' }}>
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 0', color: '#64748b' }}>Biaya Sparepart</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', color: '#1e293b', fontWeight: '500' }}>{formatCurrency(calculatePartsCost(order.spareParts))}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 0', color: '#64748b' }}>Biaya Jasa / Labor</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', color: '#1e293b', fontWeight: '500' }}>{formatCurrency(getLaborCost())}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 0', color: '#64748b' }}>Subtotal</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', color: '#1e293b', fontWeight: '600' }}>{formatCurrency(calculateSubtotal())}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 0', color: '#64748b', fontSize: '12px' }}>DPP (Dasar Pengenaan Pajak)</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', color: '#1e293b', fontSize: '12px' }}>{formatCurrency(calculateDPP())}</td>
                        </tr>
                        <tr style={{ borderBottom: '2px solid #94a3b8' }}>
                          <td style={{ padding: '8px 0', color: '#64748b', fontSize: '12px' }}>PPN 11%</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', color: '#1e293b', fontSize: '12px' }}>{formatCurrency(calculatePPN())}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Grand Total */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}>
                  <span style={{ color: 'white', fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.5px' }}>TOTAL TAGIHAN</span>
                  <span style={{ color: 'white', fontSize: '22px', fontWeight: 'bold' }}>{formatCurrency(calculateGrandTotal())}</span>
                </div>

                {/* Footer */}
                <div style={{ 
                  textAlign: 'center',
                  marginTop: '8px',
                  padding: '8px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0'
                }}>
                  <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>✨ Terima kasih atas kepercayaan Anda menggunakan layanan IMOGI Workshop</p>
                  <p style={{ margin: 0, marginTop: '2px', fontSize: '9px', color: '#94a3b8' }}>Dokumen ini sah sebagai bukti pembayaran | Dicetak pada {new Date().toLocaleString('id-ID')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
