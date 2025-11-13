'use client';

import React from 'react';
import { LucideIcon, CheckCircle2 } from 'lucide-react';

interface ProcessStepCardProps {
  number: number;
  title: string;
  department: string;
  icon: LucideIcon;
  color: string;
  tasks: string[];
}

export function ProcessStepCard({ number, title, department, icon: Icon, color, tasks }: ProcessStepCardProps) {
  const departmentColors: { [key: string]: string } = {
    'Front Office': 'bg-blue-50 text-blue-700 border-blue-200',
    'Mechanic': 'bg-slate-50 text-slate-700 border-slate-300',
    'Sparepart': 'bg-amber-50 text-amber-700 border-amber-200',
    'Finance': 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden hover:shadow-xl hover:border-slate-300 transition-all duration-300 h-full">
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
      </div>

      {/* Tasks list */}
      <div className="p-6">
        <p className="text-slate-500 mb-3">Key Tasks:</p>
        <ul className="space-y-2">
          {tasks.map((task, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-700 text-sm">{task}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
