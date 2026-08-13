import React from 'react';
import { MessageCircle, Star, Phone, Mail, Send } from 'lucide-react';
import { Button } from './ui/button';

export function FollowUp() {
  const pendingFollowUps = [
    {
      orderId: 'ORD-001',
      customer: 'Budi Santoso',
      phone: '+62 812-3456-7890',
      email: 'budi.santoso@email.com',
      vehicle: 'Toyota Avanza 2020',
      completedDate: '10 Nov 2025',
      daysSince: 1,
      status: 'Pending'
    },
    {
      orderId: 'ORD-002',
      customer: 'Siti Rahayu',
      phone: '+62 813-4567-8901',
      email: 'siti.rahayu@email.com',
      vehicle: 'Honda Jazz 2019',
      completedDate: '11 Nov 2025',
      daysSince: 0,
      status: 'Pending'
    }
  ];

  const recentFeedback = [
    {
      customer: 'Ahmad Yani',
      rating: 5,
      comment: 'Excellent service! Very professional and fast.',
      date: '09 Nov 2025'
    },
    {
      customer: 'Dewi Lestari',
      rating: 4,
      comment: 'Good service, but waiting time was a bit long.',
      date: '08 Nov 2025'
    }
  ];

  const satisfactionStats = {
    total: 156,
    excellent: 98,
    good: 42,
    average: 12,
    poor: 4,
    averageRating: 4.5
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-500 rounded-lg p-2">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-slate-800">Customer Follow-up & Feedback</h1>
                <p className="text-slate-600">Step 9: Collect feedback and maintain relationships</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-6 border border-slate-200 text-center">
            <p className="text-slate-600 mb-2">Avg Rating</p>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="text-slate-900">{satisfactionStats.averageRating}</span>
            </div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200 text-center">
            <p className="text-emerald-700 mb-2">Excellent</p>
            <h3 className="text-emerald-900">{satisfactionStats.excellent}</h3>
          </div>
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 text-center">
            <p className="text-blue-700 mb-2">Good</p>
            <h3 className="text-blue-900">{satisfactionStats.good}</h3>
          </div>
          <div className="bg-amber-50 rounded-xl p-6 border border-amber-200 text-center">
            <p className="text-amber-700 mb-2">Average</p>
            <h3 className="text-amber-900">{satisfactionStats.average}</h3>
          </div>
          <div className="bg-red-50 rounded-xl p-6 border border-red-200 text-center">
            <p className="text-red-700 mb-2">Poor</p>
            <h3 className="text-red-900">{satisfactionStats.poor}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Follow-ups */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-slate-800">Pending Follow-ups</h3>
              </div>
              <div className="p-6 space-y-4">
                {pendingFollowUps.map((item, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-slate-900 mb-1">{item.customer}</h4>
                        <p className="text-slate-600">{item.vehicle}</p>
                        <p className="text-slate-500">Order: {item.orderId}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full border bg-amber-100 text-amber-700 border-amber-200">
                        {item.daysSince} {item.daysSince === 1 ? 'day' : 'days'} ago
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-slate-500 mb-1">Phone</p>
                        <p className="text-slate-900">{item.phone}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Email</p>
                        <p className="text-slate-900">{item.email}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                      <p className="text-slate-700 mb-3">Quick Survey Questions:</p>
                      <ul className="space-y-1 text-slate-600 text-sm">
                        <li>• How satisfied are you with our service?</li>
                        <li>• Was the repair completed to your satisfaction?</li>
                        <li>• Would you recommend us to others?</li>
                        <li>• Any suggestions for improvement?</li>
                      </ul>
                    </div>

                    <div className="flex gap-3">
                      <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                        <Phone className="w-4 h-4 mr-2" />
                        Call Customer
                      </Button>
                      <Button variant="outline" className="border-slate-300">
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </Button>
                      <Button variant="outline" className="border-slate-300">
                        <Send className="w-4 h-4 mr-2" />
                        SMS Survey
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Feedback */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-slate-800">Recent Feedback</h3>
              </div>
              <div className="p-6 space-y-4">
                {recentFeedback.map((feedback, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-slate-900">{feedback.customer}</h4>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < feedback.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-700 mb-2">{feedback.comment}</p>
                    <p className="text-slate-500 text-sm">{feedback.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-800 mb-4">Follow-up Schedule</h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-slate-700 mb-1">Same Day</p>
                  <p className="text-slate-900">2 customers</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-slate-700 mb-1">Next Day</p>
                  <p className="text-slate-900">5 customers</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-slate-700 mb-1">This Week</p>
                  <p className="text-slate-900">18 customers</p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
              <h4 className="text-emerald-900 mb-3">Loyalty Program</h4>
              <p className="text-emerald-800 mb-3">Offer special discounts to returning customers:</p>
              <ul className="space-y-2 text-emerald-700 text-sm">
                <li>• 5th visit: 10% discount</li>
                <li>• 10th visit: 20% discount</li>
                <li>• Referral bonus: Free oil change</li>
              </ul>
            </div>

            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h4 className="text-blue-900 mb-3">Follow-up Tips</h4>
              <ul className="space-y-2 text-blue-800 text-sm">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Contact within 24-48 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Be genuine and caring</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Address concerns promptly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Thank them for their business</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}