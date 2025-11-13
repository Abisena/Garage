'use client';

import React from 'react';
import { ProcessStepCard } from './ProcessStepCard';
import { 
  ClipboardList, 
  Search, 
  FileText, 
  Package, 
  Wrench, 
  CheckCircle, 
  CreditCard, 
  Car,
  MessageCircle,
  ArrowRight
} from 'lucide-react';

export function ProcessFlow() {
  const processSteps = [
    {
      number: 1,
      title: 'Customer Registration',
      department: 'Front Office',
      icon: ClipboardList,
      color: 'bg-blue-500',
      tasks: ['Customer data input', 'Vehicle information', 'Service request']
    },
    {
      number: 2,
      title: 'Inspection & Diagnosis',
      department: 'Mechanic',
      icon: Search,
      color: 'bg-slate-600',
      tasks: ['Visual inspection', 'Diagnostic scan', 'Problem identification']
    },
    {
      number: 3,
      title: 'Create Repair Order',
      department: 'Front Office',
      icon: FileText,
      color: 'bg-blue-500',
      tasks: ['Work order creation', 'Cost estimation', 'Customer approval']
    },
    {
      number: 4,
      title: 'Spare Parts Request',
      department: 'Sparepart',
      icon: Package,
      color: 'bg-amber-500',
      tasks: ['Check availability', 'Order parts', 'Quality verification']
    },
    {
      number: 5,
      title: 'Repair Process',
      department: 'Mechanic',
      icon: Wrench,
      color: 'bg-slate-600',
      tasks: ['Parts replacement', 'Repairs & maintenance', 'Work documentation']
    },
    {
      number: 6,
      title: 'Quality Check',
      department: 'Mechanic',
      icon: CheckCircle,
      color: 'bg-slate-600',
      tasks: ['Final inspection', 'System testing', 'Test drive']
    },
    {
      number: 7,
      title: 'Payment',
      department: 'Finance',
      icon: CreditCard,
      color: 'bg-emerald-500',
      tasks: ['Invoice generation', 'Payment processing', 'Receipt issuance']
    },
    {
      number: 8,
      title: 'Vehicle Handover',
      department: 'Front Office',
      icon: Car,
      color: 'bg-blue-500',
      tasks: ['Explain repairs', 'Maintenance tips', 'Schedule next service']
    },
    {
      number: 9,
      title: 'Follow-up',
      department: 'Front Office',
      icon: MessageCircle,
      color: 'bg-blue-500',
      tasks: ['Customer survey', 'Feedback collection', 'Loyalty program']
    }
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-slate-800 mb-2">Business Process Flow</h1>
          <p className="text-slate-600">9-step workflow for quality service delivery</p>
        </div>

        {/* Process Grid - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
          {processSteps.map((step, index) => (
            <div key={step.number} className="relative">
              <ProcessStepCard {...step} />
              
              {/* Arrow for desktop - right arrow for items not in last column */}
              {(index + 1) % 3 !== 0 && index < processSteps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-8 h-8 text-slate-300" />
                </div>
              )}
              
              {/* Arrow for items at end of row going to next row */}
              {(index + 1) % 3 === 0 && index < processSteps.length - 1 && (
                <div className="hidden lg:flex absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10 justify-center">
                  <div className="w-1 h-8 bg-slate-300 relative">
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-slate-300"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-center">
            <p className="text-blue-900">Front Office</p>
            <p className="text-blue-600">4 steps</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-300 text-center">
            <p className="text-slate-900">Mechanic</p>
            <p className="text-slate-600">3 steps</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-center">
            <p className="text-amber-900">Sparepart</p>
            <p className="text-amber-600">1 step</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
            <p className="text-emerald-900">Finance</p>
            <p className="text-emerald-600">1 step</p>
          </div>
        </div>
      </div>
    </div>
  );
}