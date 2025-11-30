import React from 'react';
import { 
  ClipboardList, 
  Search, 
  FileText, 
  CheckCircle, 
  Wrench, 
  ClipboardCheck, 
  CreditCard, 
  Car,
  Users,
  ArrowRight,
  ArrowDown,
  Target,
  Info,
  Download
} from 'lucide-react';
import { toPng } from 'html-to-image';

const BusinessProcessFlowDiagram = () => {
  const processSteps = [
    {
      id: 1,
      title: 'Customer Registration',
      description: 'START',
      icon: <Users className="w-4 h-4" />,
      details: [
        'Data pelanggan baru/lama',
        'Informasi kendaraan',
        'Riwayat service',
        'Input keluhan pelanggan'
      ],
      color: 'bg-pink-500',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-700',
      shape: 'pill'
    },
    {
      id: 2,
      title: 'Service Advisor',
      description: 'Konsultasi',
      icon: <ClipboardList className="w-4 h-4" />,
      details: [
        'Diskusi keluhan customer',
        'Penjelasan service yang dibutuhkan',
        'Estimasi waktu pengerjaan',
        'Rekomendasi perbaikan'
      ],
      color: 'bg-yellow-400',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      shape: 'rounded'
    },
    {
      id: 3,
      title: 'Inspection',
      description: 'Diagnosis',
      icon: <Search className="w-4 h-4" />,
      details: [
        'Pemeriksaan menyeluruh kendaraan',
        'Diagnosis masalah teknis',
        'Identifikasi spare part yang dibutuhkan',
        'Dokumentasi kondisi kendaraan'
      ],
      color: 'bg-cyan-400',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-800',
      shape: 'diamond'
    },
    {
      id: 4,
      title: 'Quotation',
      description: 'Penawaran',
      icon: <FileText className="w-4 h-4" />,
      details: [
        'Rincian biaya jasa service',
        'Daftar spare part & harga',
        'Total estimasi biaya',
        'Estimasi waktu pengerjaan'
      ],
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-800',
      shape: 'rounded'
    },
    {
      id: 5,
      title: 'Approval',
      description: 'Decision',
      icon: <CheckCircle className="w-4 h-4" />,
      details: [
        'Review & konfirmasi quotation',
        'Tanda tangan persetujuan',
        'Down payment (jika diperlukan)',
        'Konfirmasi jadwal pengerjaan'
      ],
      color: 'bg-lime-500',
      bgColor: 'bg-lime-50',
      textColor: 'text-lime-800',
      shape: 'diamond'
    },
    {
      id: 6,
      title: 'Work Order',
      description: 'Pengerjaan',
      icon: <Wrench className="w-4 h-4" />,
      details: [
        'Pelaksanaan perbaikan/service',
        'Penggantian spare part',
        'Update progress real-time',
        'Dokumentasi pengerjaan'
      ],
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-800',
      shape: 'rounded'
    },
    {
      id: 7,
      title: 'Quality Control',
      description: 'QC & Testing',
      icon: <ClipboardCheck className="w-4 h-4" />,
      details: [
        'Pengecekan hasil pengerjaan',
        'Test drive kendaraan',
        'Verifikasi semua pekerjaan',
        'Approval quality control'
      ],
      color: 'bg-teal-500',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-800',
      shape: 'rounded'
    },
    {
      id: 8,
      title: 'Payment',
      description: 'Pembayaran',
      icon: <CreditCard className="w-4 h-4" />,
      details: [
        'Invoice final',
        'Proses pembayaran',
        'Bukti pembayaran',
        'Garansi service & spare part'
      ],
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      shape: 'rounded'
    },
    {
      id: 9,
      title: 'Delivery',
      description: 'SUCCESS',
      icon: <Car className="w-4 h-4" />,
      details: [
        'Penjelasan hasil service',
        'Serah terima kendaraan',
        'Jadwal service berikutnya',
        'Survey kepuasan & feedback'
      ],
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-800',
      shape: 'pill'
    }
  ];

  const renderCompactBox = (step) => {
    if (step.shape === 'pill') {
      return (
        <div className={`${step.color} rounded-full px-5 py-2 shadow-lg inline-flex items-center gap-2`}>
          <div className="text-white">{step.icon}</div>
          <div>
            <div className="text-white text-xs opacity-90">{step.description}</div>
            <h3 className="text-white text-sm">{step.title}</h3>
          </div>
        </div>
      );
    }
    
    if (step.shape === 'diamond') {
      return (
        <div className="w-20 h-20 relative inline-block">
          <div className={`absolute inset-0 ${step.color} transform rotate-45 rounded shadow-lg`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center z-10">
              <div className="flex items-center justify-center text-white mb-0.5">{step.icon}</div>
              <h3 className="text-white text-xs px-1">{step.title}</h3>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className={`${step.color} rounded-lg px-4 py-2 shadow-lg inline-flex items-center gap-2`}>
        <div className="text-white">{step.icon}</div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-white text-xs opacity-75">#{step.id}</span>
            <span className="text-white text-xs opacity-90">{step.description}</span>
          </div>
          <h3 className="text-white text-sm">{step.title}</h3>
        </div>
      </div>
    );
  };

  const handleDownload = () => {
    const element = document.getElementById('flowchart');
    if (element) {
      toPng(element).then(dataUrl => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'business_process_flow_diagram.png';
        link.click();
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full shadow-lg">
              <Target className="w-5 h-5" />
              <h1 className="text-xl">Flow It!</h1>
            </div>
            
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Download PNG</span>
            </button>
          </div>
          <p className="text-slate-600 text-sm">
            Business Process Flow - Sistem Manajemen Bengkel Multi-Cabang
          </p>
        </div>

        {/* Main Content - Wrapped with ID for capture */}
        <div id="flowchart" className="bg-white rounded-2xl shadow-xl p-6">
          <div className="grid grid-cols-12 gap-6">
            {/* LEFT: Flowchart - 4 columns */}
            <div className="col-span-12 lg:col-span-4">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                <h2 className="text-sm text-slate-700 mb-4 text-center">Alur Visual Proses</h2>
                
                <div className="space-y-2">
                  {/* START */}
                  <div className="flex flex-col items-center">
                    {renderCompactBox(processSteps[0])}
                    <ArrowDown className="w-5 h-5 text-slate-400 my-1" />
                  </div>
                  
                  {/* Service Advisor */}
                  <div className="flex flex-col items-center">
                    {renderCompactBox(processSteps[1])}
                    <ArrowDown className="w-5 h-5 text-slate-400 my-1" />
                  </div>
                  
                  {/* Inspection */}
                  <div className="flex flex-col items-center">
                    {renderCompactBox(processSteps[2])}
                    <ArrowDown className="w-5 h-5 text-slate-400 my-1" />
                  </div>
                  
                  {/* Quotation */}
                  <div className="flex flex-col items-center">
                    {renderCompactBox(processSteps[3])}
                    <ArrowDown className="w-5 h-5 text-slate-400 my-1" />
                  </div>
                  
                  {/* Approval - Decision */}
                  <div className="flex flex-col items-center relative">
                    {renderCompactBox(processSteps[4])}
                    <div className="flex items-center gap-3 my-1">
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-300">← Revisi</span>
                      <ArrowDown className="w-5 h-5 text-green-500" />
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded border border-green-300">OK →</span>
                    </div>
                  </div>
                  
                  {/* Work Order */}
                  <div className="flex flex-col items-center">
                    {renderCompactBox(processSteps[5])}
                    <ArrowDown className="w-5 h-5 text-slate-400 my-1" />
                  </div>
                  
                  {/* Quality Control */}
                  <div className="flex flex-col items-center">
                    {renderCompactBox(processSteps[6])}
                    <ArrowDown className="w-5 h-5 text-slate-400 my-1" />
                  </div>
                  
                  {/* Payment */}
                  <div className="flex flex-col items-center">
                    {renderCompactBox(processSteps[7])}
                    <ArrowDown className="w-5 h-5 text-slate-400 my-1" />
                  </div>
                  
                  {/* END */}
                  <div className="flex flex-col items-center">
                    {renderCompactBox(processSteps[8])}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-200">
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <div className="text-lg text-blue-600">9</div>
                    <div className="text-xs text-slate-600">Steps</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2 text-center">
                    <div className="text-lg text-emerald-600">3</div>
                    <div className="text-xs text-slate-600">Cabang</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-2 text-center">
                    <div className="text-lg text-purple-600">100%</div>
                    <div className="text-xs text-slate-600">RBAC</div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Details - 8 columns */}
            <div className="col-span-12 lg:col-span-8">
              <h2 className="text-sm text-slate-700 mb-3">Detail Tahapan Proses</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {processSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`${step.bgColor} border-l-4 ${step.color.replace('bg-', 'border-')} rounded-lg p-3`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className={`${step.color} rounded-lg p-1.5 flex-shrink-0`}>
                        {step.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-slate-500">#{step.id}</span>
                          {step.shape === 'pill' && (
                            <span className="text-xs bg-pink-200 text-pink-700 px-1.5 py-0.5 rounded">
                              {step.description}
                            </span>
                          )}
                          {step.shape === 'diamond' && (
                            <span className="text-xs bg-green-200 text-green-700 px-1.5 py-0.5 rounded">
                              Decision
                            </span>
                          )}
                        </div>
                        <h3 className={`text-sm ${step.textColor}`}>{step.title}</h3>
                      </div>
                    </div>
                    
                    <ul className="space-y-1">
                      {step.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs">
                          <CheckCircle className={`w-3 h-3 flex-shrink-0 mt-0.5 ${step.textColor}`} />
                          <span className="text-slate-700">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Important Notes */}
              <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="bg-amber-400 rounded-lg p-1.5 flex-shrink-0">
                    <Info className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm text-amber-900 mb-2">Catatan Penting Sistem</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-800">
                      <div className="flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-600" />
                        <span>Role-based access control setiap tahap</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-600" />
                        <span>Decision Approval: NO = revisi Quotation</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-600" />
                        <span>Payment tidak boleh dihapus (audit trail)</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-600" />
                        <span>Penomoran otomatis dengan kode cabang</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-600" />
                        <span>Integrasi Procurement & Asset Management</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-600" />
                        <span>Dual mode: localStorage + Frappe</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
                <h3 className="text-xs text-slate-700 mb-2">Panduan Simbol</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-pink-500 rounded-full w-8 h-5 flex-shrink-0"></div>
                    <div className="text-xs text-slate-600">Start/End</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-500 rounded w-8 h-5 flex-shrink-0"></div>
                    <div className="text-xs text-slate-600">Process</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <div className="absolute inset-1 bg-lime-500 transform rotate-45 rounded"></div>
                    </div>
                    <div className="text-xs text-slate-600">Decision</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessProcessFlowDiagram;