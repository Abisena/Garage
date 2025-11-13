'use client';

import React from 'react';
import { Car, CheckCircle, FileText, Key } from 'lucide-react';
import { Button } from './ui/button';

export function Handover() {
  const readyForHandover = [
    {
      orderId: 'ORD-002',
      customer: 'Siti Rahayu',
      phone: '+62 813-4567-8901',
      vehicle: 'Honda Jazz 2019',
      plate: 'B 5678 ABC',
      servicesCompleted: ['Brake Pad Replacement', 'Brake Fluid Change'],
      paymentStatus: 'Paid',
      parkingBay: 'A-12'
    }
  ];

  const handoverChecklist = [
    'Vehicle cleaned and washed',
    'All tools and equipment removed',
    'Work order signed and completed',
    'Payment confirmed',
    'Keys prepared',
    'Vehicle parked in handover area'
  ];

  const maintenanceTips = [
    'Check brake fluid every 6 months',
    'Inspect brake pads every 10,000 km',
    'Avoid sudden braking when possible',
    'Schedule next service in 3 months'
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-500 rounded-lg p-2">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-slate-800">Vehicle Handover</h1>
                <p className="text-slate-600">Step 8: Return vehicle to customer</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ready for Handover */}
            {readyForHandover.map((item, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-slate-900 mb-1">{item.orderId} - {item.customer}</h3>
                      <p className="text-slate-600">{item.vehicle}</p>
                      <p className="text-slate-500">{item.plate}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                      {item.paymentStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500 mb-1">Contact</p>
                      <p className="text-slate-900">{item.phone}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Parking Bay</p>
                      <p className="text-slate-900">{item.parkingBay}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-b border-slate-200">
                  <h4 className="text-slate-800 mb-3">Services Completed</h4>
                  <ul className="space-y-2">
                    {item.servicesCompleted.map((service, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-slate-700">{service}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 border-b border-slate-200 bg-slate-50">
                  <h4 className="text-slate-800 mb-3">Handover Checklist</h4>
                  <div className="space-y-2">
                    {handoverChecklist.map((item, idx) => (
                      <label key={idx} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300" defaultChecked />
                        <span className="text-slate-700">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="text-slate-800 mb-3">Maintenance Tips for Customer</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <ul className="space-y-2">
                      {maintenanceTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          <span className="text-slate-700">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-4">
                    <label className="block text-slate-700 mb-2">Next Service Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-slate-700 mb-2">Additional Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Any additional information for the customer..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button className="bg-blue-500 hover:bg-blue-600 text-white flex-1">
                      <Key className="w-4 h-4 mr-2" />
                      Complete Handover
                    </Button>
                    <Button variant="outline" className="border-slate-300">
                      <FileText className="w-4 h-4 mr-2" />
                      Print Report
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-800 mb-4">Today's Handovers</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-slate-700">Ready</span>
                  <span className="text-slate-900">3</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-slate-700">Completed</span>
                  <span className="text-slate-900">12</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h4 className="text-blue-900 mb-3">Customer Experience Tips</h4>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Explain all work performed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Show replaced parts if applicable</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Schedule next maintenance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Ensure customer satisfaction</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
