'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ProcessStepProps {
  title: string;
  icon: LucideIcon;
  color: string;
  notes: string;
}

export function ProcessStep({ title, icon: Icon, color, notes }: ProcessStepProps) {
  return (
    <div className="space-y-3">
      {/* Main Process Box */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={`${color} rounded-lg p-3 flex-shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          
          {/* Title */}
          <div className="flex-1">
            <h3 className="text-slate-800">{title}</h3>
          </div>
        </div>
      </div>

      {/* Notes Box */}
      <div className="ml-16 bg-slate-50 rounded-lg p-4 border border-slate-200">
        <p className="text-slate-600">{notes}</p>
      </div>
    </div>
  );
}
