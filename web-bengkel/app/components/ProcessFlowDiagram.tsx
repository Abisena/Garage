'use client';

import React from 'react';
import { ProcessStep } from './ProcessStep';
import { 
  ClipboardList, 
  Search, 
  FileText, 
  Package, 
  Wrench, 
  CheckCircle, 
  CreditCard, 
  Car,
  MessageCircle
} from 'lucide-react';

export function ProcessFlowDiagram() {
  const processSteps = [
    {
      id: 1,
      title: 'Customer Arrival & Registration',
      department: 'Front Office',
      icon: ClipboardList,
      color: 'bg-blue-500',
      notes: 'Input customer name, vehicle type, plate number, contact details, service request'
    },
    {
      id: 2,
      title: 'Vehicle Inspection & Diagnosis',
      department: 'Mechanic',
      icon: Search,
      color: 'bg-slate-600',
      notes: 'Visual inspection, diagnostic scan, identify issues, estimate repair time'
    },
    {
      id: 3,
      title: 'Repair Order Creation',
      department: 'Front Office',
      icon: FileText,
      color: 'bg-blue-500',
      notes: 'Create work order, list required services, estimate costs, customer approval'
    },
    {
      id: 4,
      title: 'Spare Parts Request & Approval',
      department: 'Sparepart',
      icon: Package,
      color: 'bg-amber-500',
      notes: 'Check parts availability, order from supplier, verify part numbers, quality check'
    },
    {
      id: 5,
      title: 'Repair & Maintenance Process',
      department: 'Mechanic',
      icon: Wrench,
      color: 'bg-slate-600',
      notes: 'Replace parts, perform repairs, conduct maintenance, document work progress'
    },
    {
      id: 6,
      title: 'Quality Check & Test Drive',
      department: 'Mechanic',
      icon: CheckCircle,
      color: 'bg-slate-600',
      notes: 'Final inspection, test all systems, road test, ensure quality standards met'
    },
    {
      id: 7,
      title: 'Payment & Invoicing',
      department: 'Finance',
      icon: CreditCard,
      color: 'bg-emerald-500',
      notes: 'Generate invoice, process payment, apply discounts, issue receipt, warranty info'
    },
    {
      id: 8,
      title: 'Vehicle Handover',
      department: 'Front Office',
      icon: Car,
      color: 'bg-blue-500',
      notes: 'Explain repairs done, provide maintenance tips, schedule next service, key handover'
    },
    {
      id: 9,
      title: 'Feedback & Follow-up',
      department: 'Front Office',
      icon: MessageCircle,
      color: 'bg-blue-500',
      notes: 'Customer satisfaction survey, follow-up call, address concerns, loyalty program'
    }
  ];

  const departmentColors = {
    'Front Office': 'bg-blue-50 border-blue-200',
    'Mechanic': 'bg-slate-50 border-slate-300',
    'Sparepart': 'bg-amber-50 border-amber-200',
    'Finance': 'bg-emerald-50 border-emerald-200'
  };

  const departmentOrder = ['Front Office', 'Mechanic', 'Sparepart', 'Finance'];

  return (
    <div className="w-full p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-slate-800 mb-2">Car Repair Workshop</h1>
          <h2 className="text-slate-600">Business Process Flow</h2>
          <p className="text-slate-500 mt-4">Complete workflow from customer arrival to follow-up</p>
        </div>

        {/* Department Legend */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {departmentOrder.map((dept) => (
            <div key={dept} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${departmentColors[dept as keyof typeof departmentColors]} border`}></div>
              <span className="text-slate-700">{dept}</span>
            </div>
          ))}
        </div>

        {/* Process Flow */}
        <div className="space-y-6">
          {processSteps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Department Badge */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-32">
                  <span className={`inline-block px-3 py-1 rounded-full text-slate-700 border ${departmentColors[step.department as keyof typeof departmentColors]}`}>
                    {step.department}
                  </span>
                </div>
                
                <div className="flex-1">
                  <ProcessStep
                    title={step.title}
                    icon={step.icon}
                    color={step.color}
                    notes={step.notes}
                  />
                </div>
              </div>

              {/* Arrow */}
              {index < processSteps.length - 1 && (
                <div className="flex justify-center my-4">
                  <div className="w-1 h-8 bg-slate-300 relative">
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-slate-400"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-12 p-6 bg-slate-100 rounded-xl border border-slate-200">
          <p className="text-slate-600 text-center">
            <span className="font-medium">Note:</span> This process flow ensures quality service delivery and customer satisfaction at every touchpoint
          </p>
        </div>
      </div>
    </div>
  );
}
