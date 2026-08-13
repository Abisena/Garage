import React from 'react';
import { CheckCircle2, FileText, Clock } from 'lucide-react';

export function ProcessStepCard({ 
  number, 
  title, 
  department, 
  icon: Icon, 
  color, 
  tasks,
  description,
  documents,
  duration,
  keyPoint
}) {
  const departmentColors = {
    'Front Office': 'bg-blue-50 text-blue-700 border-blue-200',
    'Mekanik': 'bg-slate-50 text-slate-700 border-slate-300',
    'Suku Cadang': 'bg-amber-50 text-amber-700 border-amber-200',
    'Keuangan': 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden hover:shadow-xl hover:border-slate-300 transition-all duration-300 h-full flex flex-col">
      {/* Header with number and icon */}
      <div className={`${color} p-6 relative`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">{number}</span>
            </div>
            <div>
              <h3 className="text-white mb-1">{title}</h3>
              <span className={`inline-block px-2 py-1 rounded-md text-xs border ${departmentColors[department]}`}>
                {department}
              </span>
            </div>
          </div>
          <Icon className="w-8 h-8 text-white opacity-80" />
        </div>
        
        {/* Duration Badge */}
        {duration && (
          <div className="mt-3 flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-3 py-1.5 inline-flex">
            <Clock className="w-4 h-4 text-white" />
            <span className="text-white text-sm">{duration}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {description && (
        <div className="px-6 pt-4">
          <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
        </div>
      )}

      {/* Tasks list */}
      <div className="px-6 py-4 flex-1">
        <p className="text-slate-500 mb-3">Tugas Utama:</p>
        <ul className="space-y-2">
          {tasks.map((task, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-700 text-sm">{task}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Documents */}
      {documents && documents.length > 0 && (
        <div className="px-6 pb-4">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <p className="text-slate-700 text-sm">Dokumen:</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {documents.map((doc, index) => (
                <span key={index} className="text-xs bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">
                  {doc}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Key Point */}
      {keyPoint && (
        <div className="px-6 pb-6">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-blue-900 text-sm">
              <strong>💡 Poin Penting:</strong> {keyPoint}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}